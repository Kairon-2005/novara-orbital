// NUS/NTU detection + grounded-prompt building (pure).
// Used by fetchUniversityRequirements to decide when RAG applies.

import type { KbUniversity } from '@/types/kb'

const NUS_NAMES = ['national university of singapore', '新加坡国立大学', '新国大', '国大']
const NTU_NAMES = ['nanyang technological university', '南洋理工大学', '南洋理工']

export function detectKbUniversity(name: string): KbUniversity | null {
  const lower = name.toLowerCase().trim()
  // Acronyms must stand alone (word-bounded), so "Venus" doesn't match NUS.
  if (/\bnus\b/.test(lower) || NUS_NAMES.some((n) => lower.includes(n))) return 'NUS'
  if (/\bntu\b/.test(lower) || NTU_NAMES.some((n) => lower.includes(n))) return 'NTU'
  return null
}

/** System prompt for a requirements answer grounded in retrieved KB context. */
export function buildGroundedRequirementsPrompt(contextBlock: string): string {
  return `You are an expert university admissions counsellor for Chinese international students in Singapore.
Answer using ONLY the knowledge base context below, which was curated from official university sources.
Rules:
- Be specific: exact scores, subjects, dates and fees from the context.
- Cite which context entry each fact comes from using its [n] number.
- If something the user needs is not covered by the context, say so explicitly rather than guessing.
- Return a concise plain-text summary (no markdown headers, short paragraphs), under 300 words.
Cover where possible: (1) academic entry requirements, (2) English language requirements, (3) deadlines, (4) key documents, (5) one tip for Chinese international applicants.

${contextBlock}`
}
