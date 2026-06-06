// Evidence classification — normalisation core (pure, testable).
// Defends the app from a sloppy model response: guarantees a valid evidence type,
// only real admission dimensions, sane arrays, and a valid relevance level.

import { ADMISSION_DIMENSIONS, type AdmissionDimensionId } from '@/types/assessment'
import {
  EVIDENCE_TYPES,
  type EvidenceClassification,
  type EvidenceType,
  type EvidenceRelevance,
} from '@/types/evidence'

const VALID_DIMENSIONS = new Set<string>(ADMISSION_DIMENSIONS.map(d => d.id))
const VALID_TYPES = new Set<string>(EVIDENCE_TYPES)

export function normalizeClassification(raw: Partial<EvidenceClassification>): EvidenceClassification {
  return {
    evidenceType: VALID_TYPES.has(raw.evidenceType as string) ? raw.evidenceType as EvidenceType : 'other',
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    linkedDimensions: Array.isArray(raw.linkedDimensions)
      ? raw.linkedDimensions.filter((d): d is AdmissionDimensionId => VALID_DIMENSIONS.has(d as string))
      : [],
    extractedSkills: stringArray(raw.extractedSkills),
    relevance: isRelevance(raw.relevance) ? raw.relevance : 'medium',
    suggestedUses: stringArray(raw.suggestedUses),
  }
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

function isRelevance(value: unknown): value is EvidenceRelevance {
  return value === 'low' || value === 'medium' || value === 'high'
}
