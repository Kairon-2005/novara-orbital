// AI seam for evidence classification. Reads extracted text (or, when extraction
// failed, just the filename + type) and returns structured JSON the assistant and
// the assessment can reason over. Output is funnelled through normalizeClassification.

import { ai, withTimeout, parseJson } from '@/lib/ai'
import { AI_MODEL } from '@/lib/ai-config'
import { normalizeClassification } from '@/lib/evidence'
import { ADMISSION_DIMENSIONS } from '@/types/assessment'
import { EVIDENCE_TYPES, type EvidenceClassification } from '@/types/evidence'

const DIMENSION_IDS = ADMISSION_DIMENSIONS.map(d => d.id).join(', ')
const TYPE_IDS = EVIDENCE_TYPES.join(', ')

const CLASSIFY_PROMPT = `You classify a student's uploaded application evidence for NUS / NTU admissions.

Given the file name, type, and any extracted text, output strict JSON:
{
  "evidenceType": <one of: ${TYPE_IDS}>,
  "summary": "<1-2 sentence plain-English description of what this document is and shows>",
  "linkedDimensions": [<zero or more of: ${DIMENSION_IDS}>],
  "extractedSkills": ["<skill or achievement evidenced>"],
  "relevance": "low" | "medium" | "high",
  "suggestedUses": ["<how this could support an application>"]
}

Rules:
- Choose the single best evidenceType.
- Only link dimensions the evidence genuinely supports.
- If the text is empty or unclear, infer conservatively from the file name and lower the relevance.
- NEVER invent achievements that are not supported by the content.`

export async function classifyEvidence(input: {
  fileName: string
  fileType: string
  text: string
}): Promise<EvidenceClassification> {
  const response = await withTimeout(ai.chat.completions.create({
    model: AI_MODEL,
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: [
      { role: 'system', content: CLASSIFY_PROMPT },
      { role: 'user', content: JSON.stringify(input) },
    ],
  }))

  const raw = parseJson<Partial<EvidenceClassification>>(
    response.choices[0].message.content, 'classifyEvidence',
  )
  return normalizeClassification(raw)
}
