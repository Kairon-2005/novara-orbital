import { describe, it, expect } from 'vitest'
import { normalizeRubric } from '@/lib/rubric'
import { ADMISSION_DIMENSIONS } from '@/types/assessment'

// The Rubric is the seam between the maker and the checker. normalizeRubric
// defends the checker from a sloppy maker the way normalizeAssessment defends
// the UI from a sloppy checker: every dimension present, every band present and
// in canonical order, never trusted from the model.

const TARGET = { university: 'NUS', programme: 'Computer Science', route: 'A-Level' }
const NOW = '2026-06-28T00:00:00Z'
const BANDS = ['missing', 'weak', 'developing', 'competitive', 'strong'] as const

describe('normalizeRubric', () => {
  it('guarantees all five dimensions, each with five bands ordered missing→strong', () => {
    const rubric = normalizeRubric({}, TARGET, NOW)
    expect(rubric.dimensions.map(d => d.dimensionId)).toEqual(ADMISSION_DIMENSIONS.map(d => d.id))
    for (const dim of rubric.dimensions) {
      expect(dim.bands.map(b => b.level)).toEqual([...BANDS])
    }
  })

  it('maps model descriptors and gap criteria into canonical band order', () => {
    const raw = {
      dimensions: [
        {
          dimensionId: 'academic_strength',
          bands: [
            { level: 'strong', descriptor: 'Top 1% grades, olympiad medals' },
            { level: 'missing', descriptor: 'No grades on file' },
          ],
          gapCriteria: ['No predicted A-Level grades', 'No subject prerequisites met'],
        },
      ],
    }
    const rubric = normalizeRubric(raw, TARGET, NOW)
    const acad = rubric.dimensions.find(d => d.dimensionId === 'academic_strength')!

    expect(acad.bands.map(b => b.level)).toEqual([...BANDS]) // re-ordered to canonical
    expect(acad.bands.find(b => b.level === 'strong')!.descriptor).toBe('Top 1% grades, olympiad medals')
    expect(acad.bands.find(b => b.level === 'missing')!.descriptor).toBe('No grades on file')
    expect(acad.bands.find(b => b.level === 'weak')!.descriptor).toBe('') // unspecified → empty
    expect(acad.gapCriteria).toEqual(['No predicted A-Level grades', 'No subject prerequisites met'])
  })

  it('keeps well-formed citations and drops malformed ones', () => {
    const raw = {
      citations: [
        { title: 'NUS CS prerequisites', sourceUrls: ['https://nus.edu.sg/cs'], lastVerified: '2026-05-01' },
        { title: 'missing urls' },        // no sourceUrls → dropped
        'not an object',                  // junk → dropped
      ],
    }
    const rubric = normalizeRubric(raw, TARGET, NOW)
    expect(rubric.citations).toEqual([
      { title: 'NUS CS prerequisites', sourceUrls: ['https://nus.edu.sg/cs'], lastVerified: '2026-05-01' },
    ])
  })

  it('echoes the target and stamps generatedAt', () => {
    const rubric = normalizeRubric({}, TARGET, NOW)
    expect(rubric.target).toEqual(TARGET)
    expect(rubric.generatedAt).toBe(NOW)
  })
})
