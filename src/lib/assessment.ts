// ─────────────────────────────────────────────────────────────────────────────
// Portfolio Assessment — scoring core
// ─────────────────────────────────────────────────────────────────────────────
// The deep module that turns a student's profile + evidence into a structured,
// dimension-based readiness assessment. The pure scoring logic below is the
// testable heart; `assessPortfolio` (in ai.ts-land, see assessor.ts) is a thin
// AI seam that funnels the model's output through `normalizeAssessment`.

import {
  ADMISSION_DIMENSIONS,
  type DimensionLevel,
  type DimensionScore,
  type PortfolioAssessment,
  type ReadinessLevel,
  type Confidence,
} from '@/types/assessment'

// ── Score → level ─────────────────────────────────────────────

/** Map a 0–100 dimension score onto its level band (clamps out-of-range input). */
export function scoreToLevel(score: number): DimensionLevel {
  const s = clampScore(score)
  if (s <= 20) return 'missing'
  if (s <= 40) return 'weak'
  if (s <= 60) return 'developing'
  if (s <= 80) return 'competitive'
  return 'strong'
}

/** Derive an overall readiness level from the dimension scores (their average). */
export function overallReadiness(scores: { score: number }[]): ReadinessLevel {
  if (scores.length === 0) return 'early_stage'
  const avg = scores.reduce((sum, d) => sum + d.score, 0) / scores.length
  if (avg <= 30) return 'early_stage'
  if (avg <= 50) return 'developing'
  if (avg <= 65) return 'on_track'
  if (avg <= 80) return 'competitive'
  return 'strong'
}

// ── Normalisation ─────────────────────────────────────────────
// Defends the rest of the app from a sloppy model response: guarantees all five
// dimensions exist, scores are in range, each level is recomputed from its score
// (never trusted from the model), and overall readiness is derived consistently.

type RawAssessment = Partial<Omit<PortfolioAssessment, 'dimensionScores'>> & {
  dimensionScores?: Partial<DimensionScore>[]
}

export function normalizeAssessment(raw: RawAssessment): PortfolioAssessment {
  const byId = new Map<string, Partial<DimensionScore>>()
  for (const d of raw.dimensionScores ?? []) {
    if (d?.dimensionId) byId.set(d.dimensionId, d)
  }

  const dimensionScores: DimensionScore[] = ADMISSION_DIMENSIONS.map(dim => {
    const d = byId.get(dim.id) ?? {}
    const score = clampScore(d.score)
    return {
      dimensionId: dim.id,
      score,
      level: scoreToLevel(score),                                  // derived, never trusted
      reasoning: typeof d.reasoning === 'string' ? d.reasoning : '',
      strengths: stringArray(d.strengths),
      gaps: stringArray(d.gaps),
      suggestedActions: stringArray(d.suggestedActions),
    }
  })

  return {
    overallLevel: overallReadiness(dimensionScores),
    overallSummary: typeof raw.overallSummary === 'string' ? raw.overallSummary : '',
    dimensionScores,
    topStrengths: stringArray(raw.topStrengths),
    topGaps: stringArray(raw.topGaps),
    recommendedNextSteps: stringArray(raw.recommendedNextSteps),
    confidence: isConfidence(raw.confidence) ? raw.confidence : 'medium',
  }
}

// ── Local helpers ─────────────────────────────────────────────

function clampScore(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

function isConfidence(value: unknown): value is Confidence {
  return value === 'low' || value === 'medium' || value === 'high'
}
