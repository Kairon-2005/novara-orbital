// POST /api/community/parse-material
// Upload an application material (PDF/image/text); the AI extracts a
// ReportDraft-shaped prefill so the student doesn't have to type their
// admission report by hand. The file is parsed in-memory and discarded —
// nothing is stored, and only the whitelisted draft fields are returned.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { ai, withTimeout, parseJson } from '@/lib/ai'
import { extractText } from '@/lib/extract'
import { normalizeParsedDraft } from '@/lib/community'

const MAX_BYTES = 10 * 1024 * 1024

const PARSE_PROMPT = `You read a student's application material (resume / offer letter / application summary) and extract fields for an admission report. The scope is secondary-school or undergraduate admission only.

Output strict JSON with any of these fields you can infer (omit what you can't):
{
  "level": "secondary" | "undergraduate",
  "institution": "<school or university applied/admitted to>",
  "programme": "<programme/major>",
  "route": "IB" | "A-Level" | "AP" | "Gaokao" | "O-Level" | "AEIS" | "DSA" | "Poly" | "Other",
  "result": "offer" | "rejected" | "waitlist" | "interview",
  "applyYear": <number>,
  "scholarshipName": "<scholarship if any>",
  "grades": "<concise grades/GPA line>",
  "englishTest": "<e.g. IELTS 7.0 (W6.5)>",
  "standardizedTests": "<e.g. SAT 1520, AP Calc BC 5>",
  "activities": "<one line of key activities>",
  "admissionExperience": "<2-4 sentence factual summary of the application, written impersonally>"
}

Rules: never invent facts not present in the document; NEVER include the student's name, contact details, school ID or any other personal identifier in any field.`

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
    const response = await withTimeout(ai.chat.completions.create({
      model: 'qwen-plus',
      response_format: { type: 'json_object' },
      temperature: 0.1,
      messages: [
        { role: 'system', content: PARSE_PROMPT },
        { role: 'user', content: text },
      ],
    }))
    const draft = normalizeParsedDraft(
      parseJson<unknown>(response.choices[0].message.content, 'parseMaterial')
    )
    return NextResponse.json({ draft })
  } catch (err) {
    console.error('[community/parse-material]', err)
    return NextResponse.json({ error: 'AI extraction failed. Please fill the form manually.' }, { status: 500 })
  }
}
