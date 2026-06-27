// Material parsing (auto-fill) domain logic. The LLM is injected as a ChatJson
// seam — this module does no I/O and never imports openai/supabase, so it is
// unit-testable with a fake. The route layer supplies the real chat adapter.
// See docs/PRD-admission-cases.md §A.5.

import { normalizeParsedDraft, type ReportDraft } from '@/lib/community'
import type { ChatJson } from '@/lib/community/verify'

export const PARSE_PROMPT = `You read a student's application material (resume / offer letter / application summary) and extract fields for an admission report. The scope is secondary-school or undergraduate admission only.

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

/** Extract a (whitelisted, coerced) draft prefill from raw material text. */
export async function parseMaterial(text: string, chat: ChatJson): Promise<Partial<ReportDraft>> {
  const raw = await chat(PARSE_PROMPT, text)
  return normalizeParsedDraft(raw)
}
