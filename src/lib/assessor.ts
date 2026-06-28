// The checker — the AI seam that scores a student's portfolio STRICTLY against a
// given Rubric and funnels the model's output through `normalizeAssessment` so
// callers always receive a complete, in-range, internally consistent assessment.
//
// The checker depends on the Rubric VALUE, not on the maker — it never touches
// the knowledge base. All grounding (official requirements, admission cases) was
// baked into the rubric by the maker (see rubric-maker.ts). That independence is
// what lets buildCheckerMessages be unit-tested against a hand-written rubric.

import { ai, withTimeout, parseJson } from '@/lib/ai'
import { normalizeAssessment } from '@/lib/assessment'
import { BAND_RANGE_LABEL } from '@/lib/rubric'
import type { PortfolioAssessment } from '@/types/assessment'
import type { AssessmentRubric } from '@/types/rubric'

export type AssessmentInput = {
  target: { university: string; programme: string; route?: string }
  profile: {
    currentYear: string
    currentSchool: string
    curriculum: string
    englishLevel: string
    interests: string
  }
  achievements: { category: string; title: string; description?: string }[]
  // Classified evidence the student has uploaded — drives the Evidence Portfolio
  // dimension and reinforces whichever dimensions each item is linked to.
  evidence: { type: string; summary: string; dimensions: string[]; relevance: string }[]
}

export type ChatMessage = { role: 'system' | 'user'; content: string }

const CHECKER_PROMPT = `You are an admissions analyst for Chinese international students applying to NUS / NTU.
Score the student's CURRENT readiness STRICTLY against the rubric provided below — do NOT invent your own standard.

For EACH of the five dimensions:
- Find the band whose descriptor best matches the student's profile, achievements and uploaded evidence.
- Choose a 0-100 score WITHIN that band's range (missing 0-20 · weak 21-40 · developing 41-60 · competitive 61-80 · strong 81-100).
- List as gaps the rubric's gap criteria for that dimension that the student does NOT yet meet.
Weight high-relevance evidence strongly toward the dimensions it is linked to.

Output strict JSON:
{
  "overallSummary": "<2-3 sentence plain-English summary of where the student stands>",
  "dimensionScores": [
    {
      "dimensionId": "<one of the rubric dimension ids>",
      "score": <0-100 integer>,
      "reasoning": "<1-2 sentences: which band the student lands in and why>",
      "strengths": ["<specific existing strength>"],
      "gaps": ["<specific unmet gap criterion>"],
      "suggestedActions": ["<concrete next action>"]
    }
  ],
  "topStrengths": ["<overall strength>"],
  "topGaps": ["<overall gap>"],
  "recommendedNextSteps": ["<highest-leverage next action>"],
  "confidence": "low" | "medium" | "high"
}

Rules:
- Include all five dimensions from the rubric.
- Keep each list to 1-3 specific, actionable items.
- NEVER state an admission probability or guarantee. Assess readiness and gaps only.
- If evidence is thin, say so and lower confidence rather than inventing achievements.`

/** Render a rubric into the prompt block the checker scores against (pure). */
function renderRubric(rubric: AssessmentRubric): string {
  const dims = rubric.dimensions.map(d => {
    const bands = d.bands
      .map(b => `- ${b.level} (${BAND_RANGE_LABEL[b.level]}): ${b.descriptor}`)
      .join('\n')
    const gaps = d.gapCriteria.length ? `\nGap criteria: ${d.gapCriteria.join('; ')}` : ''
    return `## ${d.dimensionId}\n${bands}${gaps}`
  }).join('\n\n')
  const { university, programme, route } = rubric.target
  const head = [university, programme, route].filter(Boolean).join(' · ')
  return `RUBRIC for ${head}:\n\n${dims}`
}

/** Assemble the checker's messages from a portfolio and a rubric (pure, testable). */
export function buildCheckerMessages(input: AssessmentInput, rubric: AssessmentRubric): ChatMessage[] {
  return [
    { role: 'system', content: CHECKER_PROMPT },
    { role: 'system', content: renderRubric(rubric) },
    { role: 'user', content: JSON.stringify(input) },
  ]
}

export async function assessPortfolio(input: AssessmentInput, rubric: AssessmentRubric): Promise<PortfolioAssessment> {
  const response = await withTimeout(ai.chat.completions.create({
    model: 'qwen-plus',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: buildCheckerMessages(input, rubric),
  }))

  const raw = parseJson<Parameters<typeof normalizeAssessment>[0]>(
    response.choices[0].message.content, 'assessPortfolio',
  )
  return normalizeAssessment(raw)
}
