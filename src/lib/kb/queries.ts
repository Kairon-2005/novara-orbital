// Retrieval-query builders for AI features (pure).
// Each AI capability builds one KB query from what it knows about the student;
// the resulting context is appended to the prompt via kbContextMessage.

import { detectKbUniversity } from './university'
import type { KbFilters } from '@/types/kb'

const FEATURE_LIMIT = 5

export function kbFiltersForTarget(targetUniversity: string): KbFilters {
  return { university: detectKbUniversity(targetUniversity ?? '') ?? undefined, limit: FEATURE_LIMIT }
}

/** Roadmap generation: pathways, deadlines and requirements for the student's route. */
export function buildRoadmapKbQuery(profile: {
  targetUniversity?: string
  targetProgramme?: string
  currentCurriculum?: string
}): string {
  return [
    profile.targetUniversity,
    profile.targetProgramme,
    profile.currentCurriculum,
    'admission requirements deadlines application timeline pathway',
  ].filter(Boolean).join(' ')
}

/** Assessment: what the target programme actually expects. */
export function buildAssessmentKbQuery(target: { university?: string; programme?: string }): string {
  return [
    target.university,
    target.programme,
    'prerequisites subject requirements indicative grade profile competitiveness',
  ].filter(Boolean).join(' ')
}

/** Extra system message grounding the model in retrieved KB facts. */
export function kbContextMessage(contextBlock: string): string {
  if (!contextBlock) return ''
  return `The following facts were retrieved from a curated knowledge base of verified official sources (NUS/NTU/MOE). Prefer them over your own knowledge for dates, scores, requirements and fees; if they conflict with what you believe, the knowledge base wins.

${contextBlock}`
}
