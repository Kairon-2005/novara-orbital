// POST /api/translate-notice
// Accepts a multipart/form-data upload with:
//   file    — PDF or image (school notice)
//   studentId — UUID of the student this notice belongs to
//
// Flow:
//   1. Read file buffer
//   2. Extract text (PDF → pdf-parse; image → Tesseract.js)
//   3. Translate + summarise via existing ai.ts helper (Qwen)
//   4. Insert row to school_communications table (service role key)
//   5. Return { ok: true, id }

import { createRouteClient } from '@/db/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { translateToChineseWithSummary } from '@/lib/ai'
import { decideNoticeTarget } from '@/lib/notice-target'

// Service role client — bypasses RLS so we can insert on behalf of any student.
// NEVER expose the service role key to the browser.
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  // Authenticate caller
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData   = await req.formData()
    const file       = formData.get('file') as File | null

    // The target student is derived from the SESSION, never from the form
    // (the service-role insert below bypasses RLS, so this check is the gate).
    const [{ data: callerProfile }, { data: link }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase.from('parent_links').select('student_id').eq('parent_id', user.id).maybeSingle(),
    ])
    const target = decideNoticeTarget({
      callerId: user.id,
      callerRole: callerProfile?.role ?? null,
      linkedStudentId: link?.student_id ?? null,
      requestedStudentId: formData.get('studentId') as string | null,
    })
    if (!target.ok) return Response.json({ error: target.error }, { status: target.status })
    const studentId = target.studentId

    if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

    // ── Extract text ─────────────────────────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer())
    let extractedText = ''

    if (file.type === 'application/pdf') {
      // pdf-parse — install with: npm install pdf-parse @types/pdf-parse
      try {
        // @ts-ignore — install: npm install pdf-parse @types/pdf-parse
        const pdfParse = (await import('pdf-parse')).default
        const result   = await pdfParse(buffer)
        extractedText  = result.text.trim()
      } catch {
        return Response.json({ error: 'Failed to parse PDF. Install pdf-parse.' }, { status: 500 })
      }
    } else if (file.type.startsWith('image/')) {
      // Tesseract.js — install with: npm install tesseract.js
      try {
        // @ts-ignore — install: npm install tesseract.js
        const { createWorker } = await import('tesseract.js')
        const worker = await createWorker('eng')
        const { data: { text } } = await worker.recognize(buffer)
        await worker.terminate()
        extractedText = text.trim()
      } catch {
        return Response.json({ error: 'Failed to OCR image. Install tesseract.js.' }, { status: 500 })
      }
    } else {
      // Treat as plain text
      extractedText = buffer.toString('utf-8').trim()
    }

    if (!extractedText) {
      return Response.json({ error: 'Could not extract text from file.' }, { status: 422 })
    }

    // ── AI translation ───────────────────────────────────────────────────────
    const { translation, summary } = await translateToChineseWithSummary(extractedText)

    // ── Persist to DB ────────────────────────────────────────────────────────
    const { data, error } = await supabaseAdmin
      .from('school_communications')
      .insert({
        student_id:          studentId,
        original_text:       extractedText,
        chinese_translation: translation,
        chinese_summary:     summary,
        source_type:         file.type === 'application/pdf' ? 'pdf' : 'text',
      })
      .select('id')
      .single()

    if (error) throw error

    return Response.json({ ok: true, id: data.id })
  } catch (err) {
    console.error('[translate-notice]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
