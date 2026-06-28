// The maker — the AI seam that produces a Rubric for a target. It specialises
// the authored GENERIC_BASELINE_STANDARD into target-specific band descriptors
// and gap criteria, grounded in retrieved knowledge-base cases (official
// requirements + verified admission outcomes), and funnels the model's output
// through `normalizeRubric`.
//
// The maker OWNS knowledge-base retrieval for the assessment path — the checker
// never touches it. buildRubricMessages assembles the prompt purely so the
// baseline + cases that reach the model can be unit-tested without the model.

import { ai, withTimeout, parseJson } from '@/lib/ai'
import { normalizeRubric } from '@/lib/rubric'
import { searchKb } from '@/lib/kb/retrieve'
import { buildKbContext } from '@/lib/kb/context'
import { buildAssessmentKbQuery, kbFiltersForTarget, kbContextMessage } from '@/lib/kb/queries'
import type { AssessmentRubric, RubricTarget } from '@/types/rubric'

export type ChatMessage = { role: 'system' | 'user'; content: string }

// Target-independent ladder the maker specialises. Concrete, programme-specific
// descriptors are the maker's job; this is the generic skeleton it starts from.
const GENERIC_BASELINE_STANDARD = `GENERIC CANDIDATE-READINESS STANDARD (target-independent; specialise per programme):

academic_strength — grades, curriculum rigour, subject relevance, trend.
  missing: no grades or transcript on file.
  weak: below typical entry; key subjects missing or low.
  developing: near typical entry; some rigour; minor gaps.
  competitive: at or above typical entry; relevant subjects strong.
  strong: top of cohort; top grades in all prerequisite subjects; rising trend.

programme_fit — alignment of interests and experience with the target programme.
  missing: no stated interest related to the programme.
  weak: vague or generic interest, little programme-specific exposure.
  developing: clear interest, some related coursework or reading.
  competitive: focused interest backed by relevant projects or exposure.
  strong: deep, demonstrated commitment closely matched to the programme.

evidence_portfolio — quality, relevance and credibility of documented achievements.
  missing: no evidence uploaded.
  weak: sparse or low-relevance evidence.
  developing: some relevant evidence, uneven quality.
  competitive: solid, verifiable, programme-relevant evidence across areas.
  strong: rich, credible, high-relevance evidence covering most dimensions.

communication_storytelling — clarity of motivation and connecting experiences.
  missing: nothing written.
  weak: unclear or generic motivation.
  developing: understandable narrative with gaps.
  competitive: clear, coherent motivation linking experiences to goals.
  strong: compelling, specific, well-structured personal narrative.

initiative_impact — leadership, self-driven projects, real-world impact.
  missing: none evident.
  weak: passive participation only.
  developing: some initiative or minor leadership.
  competitive: clear leadership or self-driven projects with outcomes.
  strong: significant, sustained initiative with measurable real-world impact.`

const MAKER_PROMPT = `You are an admissions standards designer. Produce a scoring RUBRIC (细化量表) for ONE target programme.
SPECIALISE the generic standard below using the knowledge-base cases (official requirements, indicative grade profiles, real admission outcomes) for THIS target: make every band descriptor concrete and programme-specific (name the subjects, grade profiles, competitions, and evidence typical at that band). Do NOT score any individual student — describe the standard only.

${GENERIC_BASELINE_STANDARD}

Output strict JSON:
{
  "dimensions": [
    {
      "dimensionId": "<academic_strength|programme_fit|evidence_portfolio|communication_storytelling|initiative_impact>",
      "bands": [ { "level": "missing|weak|developing|competitive|strong", "descriptor": "<concrete, target-specific>" } ],
      "gapCriteria": ["<concrete signal that this dimension is below competitive for this target>"]
    }
  ],
  "citations": [ { "title": "<knowledge-base doc you used>", "sourceUrls": ["<url>"], "lastVerified": "<date>" } ]
}

Rules:
- Include all five dimensions and all five bands (missing → strong) for each.
- Ground descriptors in the knowledge-base cases; cite the docs you relied on. If the knowledge base is empty, fall back to the generic standard and return no citations.
- Keep each band descriptor to one or two sentences.`

/** Assemble the maker's messages from a target and retrieved KB context (pure, testable). */
export function buildRubricMessages(target: RubricTarget, kbContext: string): ChatMessage[] {
  const grounding = kbContext ? kbContextMessage(kbContext) : ''
  return [
    { role: 'system', content: MAKER_PROMPT },
    ...(grounding ? [{ role: 'system' as const, content: grounding }] : []),
    { role: 'user', content: JSON.stringify(target) },
  ]
}

export async function makeRubric(target: RubricTarget): Promise<AssessmentRubric> {
  // The maker is the only place the assessment path touches the knowledge base.
  const kbHits = await searchKb(buildAssessmentKbQuery(target), kbFiltersForTarget(target.university))
  const kbContext = buildKbContext(kbHits)

  const response = await withTimeout(ai.chat.completions.create({
    model: 'qwen-plus',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: buildRubricMessages(target, kbContext),
  }))

  const raw = parseJson<unknown>(response.choices[0].message.content, 'makeRubric')
  return normalizeRubric(raw, target, new Date().toISOString())
}
