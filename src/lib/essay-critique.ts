// 文书工作室 critique core. The model critiques the student's OWN draft against
// their real records — it never writes or rewrites prose. That rule is enforced
// twice: the prompt forbids drafting, and normalizeEssayFeedback structurally
// drops any rewritten-text field and truncates bullets long enough to smuggle
// prose. I/O stays behind the injected ChatJson seam (same pattern as
// lib/community/verify).

import type { ChatJson } from '@/lib/community/verify'

export type EssayFeedback = {
  overall: string
  structure: string[]
  specificity: string[]
  evidenceAlignment: string[]
  cliches: string[]
  revisionPriorities: string[]
}

const MAX_ITEMS = 8
const MAX_ITEM_CHARS = 300

function cleanList(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .slice(0, MAX_ITEMS)
    .map(x => (x.length > MAX_ITEM_CHARS ? x.slice(0, MAX_ITEM_CHARS) + '…' : x))
}

export function normalizeEssayFeedback(raw: unknown): EssayFeedback {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    overall: typeof r.overall === 'string' ? r.overall.slice(0, 1200) : '',
    structure: cleanList(r.structure),
    specificity: cleanList(r.specificity),
    evidenceAlignment: cleanList(r.evidenceAlignment),
    cliches: cleanList(r.cliches),
    revisionPriorities: cleanList(r.revisionPriorities),
  }
}

const CRITIQUE_SYSTEM = `You are an experienced university-admissions essay coach reviewing a high-school student's OWN draft.

HARD RULES:
- NEVER write, rewrite, or draft essay prose for the student. Do not include any rewritten sentences, model answers, or "improved versions". Critique only.
- Ground feedback in the student's actual records provided. If the essay claims something their records support better with a concrete example, point at that record.
- Flag generic claims and clichés admissions officers see constantly.
- Be direct and specific; every point must be actionable.
- Answer in the same language the essay is written in.

Return STRICT JSON:
{
  "overall": "2-4 sentence honest read of the draft",
  "structure": ["observations about flow/organisation"],
  "specificity": ["each generic claim, quoted, with what concrete detail to replace it"],
  "evidenceAlignment": ["where the student's real achievements/records could strengthen or contradict the essay"],
  "cliches": ["clichéd phrases, quoted"],
  "revisionPriorities": ["ordered, most important first"]
}`

export async function critiqueEssay(
  chat: ChatJson,
  input: {
    essay: { title: string; prompt: string; content: string }
    target: { university: string; programme: string } | null
    achievements: Array<{ title: string; category: string }>
    assessmentSummary: string | null
  },
): Promise<EssayFeedback> {
  const user = [
    input.target ? `Target: ${input.target.university} — ${input.target.programme}` : 'Target: (not linked)',
    `Essay prompt: ${input.essay.prompt || '(none given)'}`,
    `Documented achievements: ${input.achievements.map(a => `${a.title} (${a.category})`).join('; ') || '(none recorded)'}`,
    input.assessmentSummary ? `Latest portfolio assessment: ${input.assessmentSummary}` : 'No portfolio assessment yet.',
    '',
    `--- ESSAY DRAFT: ${input.essay.title} ---`,
    input.essay.content,
  ].join('\n')

  const raw = await chat(CRITIQUE_SYSTEM, user)
  return normalizeEssayFeedback(raw)
}
