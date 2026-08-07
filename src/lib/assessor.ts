// AI seam for the assessment module. Builds the dimension-rubric prompt, calls
// the model, and funnels the raw output through `normalizeAssessment` so callers
// always receive a complete, in-range, internally consistent assessment.
//
// Knowledge note: the generic rubric lives inline in the prompt; programme-
// specific NUS/NTU expectations are retrieved from the knowledge base and
// slot in as an extra grounding message (see docs/PRD-knowledge-base.md).

import { ai, withTimeout, parseJson } from '@/lib/ai'
import { AI_MODEL } from '@/lib/ai-config'
import { normalizeAssessment } from '@/lib/assessment'
import { ADMISSION_DIMENSIONS, type PortfolioAssessment } from '@/types/assessment'
import { searchKb } from '@/lib/kb/retrieve'
import { buildKbContext } from '@/lib/kb/context'
import { buildAssessmentKbQuery, kbFiltersForTarget, kbContextMessage } from '@/lib/kb/queries'

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

const DIMENSION_LIST = ADMISSION_DIMENSIONS
  .map(d => `- ${d.id}: ${d.name} — ${d.blurb}`)
  .join('\n')

const ASSESSMENT_PROMPT = `You are an admissions analyst for Chinese international students applying to NUS / NTU.
Assess the student's CURRENT readiness against these five dimensions:

${DIMENSION_LIST}

Score each dimension 0-100 based on the student's profile, achievements and uploaded evidence, judged against typical expectations for the target programme.
Each evidence item has a type, a summary, the dimensions it supports, and a relevance — weight high-relevance evidence strongly toward the dimensions it is linked to, and treat the breadth/quality of evidence as the Evidence Portfolio dimension.

Output strict JSON:
{
  "overallSummary": "<2-3 sentence plain-English summary of where the student stands>",
  "dimensionScores": [
    {
      "dimensionId": "<one of the ids above>",
      "score": <0-100 integer>,
      "reasoning": "<1-2 sentences: why this score>",
      "strengths": ["<specific existing strength>"],
      "gaps": ["<specific missing item>"],
      "suggestedActions": ["<concrete next action>"]
    }
  ],
  "topStrengths": ["<overall strength>"],
  "topGaps": ["<overall gap>"],
  "recommendedNextSteps": ["<highest-leverage next action>"],
  "confidence": "low" | "medium" | "high"
}

Rules:
- Include all five dimensions.
- Keep each list to 1-3 specific, actionable items.
- NEVER state an admission probability or guarantee. Assess readiness and gaps only.
- If evidence is thin, say so and lower confidence rather than inventing achievements.`

export async function assessPortfolio(input: AssessmentInput): Promise<PortfolioAssessment> {
  // Ground "typical expectations for the target programme" in retrieved
  // prerequisite / grade-profile facts when the KB has them.
  const kbHits = await searchKb(buildAssessmentKbQuery(input.target), kbFiltersForTarget(input.target.university))
  const grounding = kbContextMessage(buildKbContext(kbHits))

  const response = await withTimeout(ai.chat.completions.create({
    model: AI_MODEL,
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: [
      { role: 'system', content: ASSESSMENT_PROMPT },
      ...(grounding ? [{ role: 'system' as const, content: grounding }] : []),
      { role: 'user', content: JSON.stringify(input) },
    ],
  }))

  const raw = parseJson<Parameters<typeof normalizeAssessment>[0]>(
    response.choices[0].message.content, 'assessPortfolio',
  )
  return normalizeAssessment(raw)
}
