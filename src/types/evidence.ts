// ─────────────────────────────────────────────────────────────────────────────
// Evidence
// ─────────────────────────────────────────────────────────────────────────────
// A file is not just a file — it is potential application evidence. After upload
// it is classified into a structured JSON shape the AI assistant can read,
// analyse and reason over.

import type { AdmissionDimensionId } from '@/types/assessment'

export type EvidenceType =
  | 'transcript' | 'predicted_grade' | 'exam_result' | 'certificate'
  | 'competition' | 'project' | 'activity' | 'recommendation'
  | 'essay' | 'reflection' | 'language_test' | 'identity_document'
  | 'school_notice' | 'financial_document' | 'other'

export const EVIDENCE_TYPES: EvidenceType[] = [
  'transcript', 'predicted_grade', 'exam_result', 'certificate',
  'competition', 'project', 'activity', 'recommendation',
  'essay', 'reflection', 'language_test', 'identity_document',
  'school_notice', 'financial_document', 'other',
]

export type EvidenceRelevance = 'low' | 'medium' | 'high'

// The structured JSON produced for each uploaded file.
export type EvidenceClassification = {
  evidenceType: EvidenceType
  summary: string
  linkedDimensions: AdmissionDimensionId[]
  extractedSkills: string[]
  relevance: EvidenceRelevance
  suggestedUses: string[]
}
