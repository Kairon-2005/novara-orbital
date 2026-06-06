import { describe, it, expect } from 'vitest'
import { scoreToLevel, overallReadiness, normalizeAssessment } from '@/lib/assessment'
import { ADMISSION_DIMENSIONS } from '@/types/assessment'

// ── scoreToLevel ──────────────────────────────────────────────
// Bands per the PRD: 0–20 missing · 21–40 weak · 41–60 developing
//                    61–80 competitive · 81–100 strong

describe('scoreToLevel', () => {
  it('maps each band to its level', () => {
    expect(scoreToLevel(0)).toBe('missing')
    expect(scoreToLevel(20)).toBe('missing')
    expect(scoreToLevel(21)).toBe('weak')
    expect(scoreToLevel(40)).toBe('weak')
    expect(scoreToLevel(41)).toBe('developing')
    expect(scoreToLevel(60)).toBe('developing')
    expect(scoreToLevel(61)).toBe('competitive')
    expect(scoreToLevel(80)).toBe('competitive')
    expect(scoreToLevel(81)).toBe('strong')
    expect(scoreToLevel(100)).toBe('strong')
  })

  it('clamps out-of-range scores', () => {
    expect(scoreToLevel(-50)).toBe('missing')
    expect(scoreToLevel(250)).toBe('strong')
  })
})

// ── overallReadiness ──────────────────────────────────────────

describe('overallReadiness', () => {
  it('is early_stage when there are no scores', () => {
    expect(overallReadiness([])).toBe('early_stage')
  })

  it('is early_stage when all dimensions are very low', () => {
    expect(overallReadiness([{ score: 10 }, { score: 20 }, { score: 15 }])).toBe('early_stage')
  })

  it('is strong when all dimensions are very high', () => {
    expect(overallReadiness([{ score: 90 }, { score: 95 }, { score: 88 }])).toBe('strong')
  })

  it('lands on a middle band for mixed scores', () => {
    expect(overallReadiness([{ score: 60 }, { score: 60 }, { score: 60 }])).toBe('on_track')
  })
})

// ── normalizeAssessment ───────────────────────────────────────

describe('normalizeAssessment', () => {
  it('always returns all five dimensions even when the model omits some', () => {
    const result = normalizeAssessment({
      dimensionScores: [{ dimensionId: 'academic_strength', score: 70 }],
    })
    expect(result.dimensionScores).toHaveLength(ADMISSION_DIMENSIONS.length)
    const ids = result.dimensionScores.map(d => d.dimensionId).sort()
    expect(ids).toEqual(ADMISSION_DIMENSIONS.map(d => d.id).sort())
  })

  it('recomputes each dimension level from its score, ignoring a wrong model-supplied level', () => {
    const result = normalizeAssessment({
      dimensionScores: [{ dimensionId: 'academic_strength', score: 85, level: 'weak' }],
    })
    const academic = result.dimensionScores.find(d => d.dimensionId === 'academic_strength')!
    expect(academic.level).toBe('strong')
  })

  it('clamps out-of-range scores into 0–100', () => {
    const result = normalizeAssessment({
      dimensionScores: [
        { dimensionId: 'academic_strength', score: 150 },
        { dimensionId: 'programme_fit', score: -10 },
      ],
    })
    expect(result.dimensionScores.find(d => d.dimensionId === 'academic_strength')!.score).toBe(100)
    expect(result.dimensionScores.find(d => d.dimensionId === 'programme_fit')!.score).toBe(0)
  })

  it('derives overall readiness from the normalized dimension scores', () => {
    const result = normalizeAssessment({
      dimensionScores: ADMISSION_DIMENSIONS.map(d => ({ dimensionId: d.id, score: 90 })),
    })
    expect(result.overallLevel).toBe('strong')
  })

  it('defaults missing arrays and confidence so the result is always renderable', () => {
    const result = normalizeAssessment({})
    expect(result.topStrengths).toEqual([])
    expect(result.topGaps).toEqual([])
    expect(result.recommendedNextSteps).toEqual([])
    expect(result.confidence).toBe('medium')
    expect(result.overallSummary).toBe('')
  })
})
