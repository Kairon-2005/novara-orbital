import { describe, it, expect } from 'vitest'
import { extractorKind } from '@/lib/extract'
import { normalizeClassification } from '@/lib/evidence'

// ── extractorKind ─────────────────────────────────────────────

describe('extractorKind', () => {
  it('routes PDFs to the pdf extractor', () => {
    expect(extractorKind('application/pdf')).toBe('pdf')
  })
  it('routes any image to the OCR extractor', () => {
    expect(extractorKind('image/png')).toBe('image')
    expect(extractorKind('image/jpeg')).toBe('image')
  })
  it('treats everything else as plain text', () => {
    expect(extractorKind('text/plain')).toBe('text')
    expect(extractorKind('application/msword')).toBe('text')
  })
})

// ── normalizeClassification ───────────────────────────────────

describe('normalizeClassification', () => {
  it('keeps a valid evidence type', () => {
    expect(normalizeClassification({ evidenceType: 'certificate' }).evidenceType).toBe('certificate')
  })

  it('defaults an unknown evidence type to "other"', () => {
    expect(normalizeClassification({ evidenceType: 'banana' as never }).evidenceType).toBe('other')
  })

  it('drops linked dimensions that are not real admission dimensions', () => {
    const result = normalizeClassification({
      linkedDimensions: ['academic_strength', 'made_up_dimension'] as never,
    })
    expect(result.linkedDimensions).toEqual(['academic_strength'])
  })

  it('defaults relevance to medium when missing or invalid', () => {
    expect(normalizeClassification({}).relevance).toBe('medium')
    expect(normalizeClassification({ relevance: 'super' as never }).relevance).toBe('medium')
  })

  it('always returns arrays and a string summary, so the result is storable', () => {
    const result = normalizeClassification({})
    expect(result.extractedSkills).toEqual([])
    expect(result.suggestedUses).toEqual([])
    expect(result.linkedDimensions).toEqual([])
    expect(result.summary).toBe('')
  })
})
