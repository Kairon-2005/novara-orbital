// ─────────────────────────────────────────────────────────────────────────────
// Assessment Rubric domain
// ─────────────────────────────────────────────────────────────────────────────
// The Rubric is the refined, per-target scale the assessment scores against, and
// the seam between the maker (writes it) and the checker (reads it). For each of
// the five admission dimensions it describes every level band plus the gap
// criteria that separate them, grounded in knowledge-base cases for one target.

import type { AdmissionDimensionId, DimensionLevel } from './assessment'

export type RubricBand = {
  level: DimensionLevel
  /** What this band looks like for THIS target. */
  descriptor: string
}

export type RubricDimension = {
  dimensionId: AdmissionDimensionId
  /** One band per level, ordered missing → strong. */
  bands: RubricBand[]
  /** Concrete signals the checker treats as gaps when unmet. */
  gapCriteria: string[]
}

/** Knowledge-base provenance — which official docs / cases informed the rubric. */
export type RubricCitation = {
  title: string
  sourceUrls: string[]
  lastVerified: string
}

export type RubricTarget = {
  university: string
  programme: string
  route?: string
}

export type AssessmentRubric = {
  target: RubricTarget
  dimensions: RubricDimension[]
  citations: RubricCitation[]
  /** ISO timestamp the rubric was produced. */
  generatedAt: string
}
