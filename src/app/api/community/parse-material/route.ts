// POST /api/community/parse-material
// Upload an application material (PDF/image/text); the AI extracts a
// ReportDraft-shaped prefill so the student doesn't have to type their
// admission report by hand. The file is parsed in-memory and discarded —
// nothing is stored, and only the whitelisted draft fields are returned.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { chatJson } from '@/lib/ai'
import { extractText } from '@/lib/extract'
import { parseMaterial } from '@/lib/community/parse'

const MAX_BYTES = 10 * 1024 * 1024

export async function POST(request: Request) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 })
  }

  const text = await extractText(Buffer.from(await file.arrayBuffer()), file.type)
  if (!text) {
    return NextResponse.json({ error: 'Could not extract text from this file' }, { status: 422 })
  }

  try {
    const draft = await parseMaterial(text, chatJson)
    return NextResponse.json({ draft })
  } catch (err) {
    console.error('[community/parse-material]', err)
    return NextResponse.json({ error: 'AI extraction failed. Please fill the form manually.' }, { status: 500 })
  }
}
