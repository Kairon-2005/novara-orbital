import { describe, it, expect } from 'vitest'
import { computeCaseStats, buildPositioning } from '@/lib/community/stats'
import type { CaseRow } from '@/lib/community/stats'

const row = (over: Partial<CaseRow> = {}): CaseRow => ({
  institution: 'NUS',
  programme: 'Computer Science',
  route: 'IB',
  result: 'offer',
  verificationStatus: 'verified',
  grades: 'IB 42/45',
  englishTest: 'IELTS 7.5',
  standardizedTests: null,
  ...over,
})

describe('computeCaseStats', () => {
  it('counts only verified cases and breaks down by result', () => {
    const stats = computeCaseStats([
      row({ result: 'offer' }),
      row({ result: 'rejected' }),
      row({ result: 'offer', verificationStatus: 'unverified' }), // excluded
      row({ result: 'waitlist', verificationStatus: 'mismatch' }), // excluded
    ])
    expect(stats.total).toBe(2)
    expect(stats.byResult.offer).toBe(1)
    expect(stats.byResult.rejected).toBe(1)
    expect(stats.byResult.waitlist).toBe(0)
  })

  it('computes offer rate over decided cases (excludes interview), guarding empty sets', () => {
    const stats = computeCaseStats([
      row({ result: 'offer' }),
      row({ result: 'offer' }),
      row({ result: 'rejected' }),
      row({ result: 'interview' }), // a stage, not a decided outcome
    ])
    expect(stats.offerRate).toBeCloseTo(2 / 3) // 2 offers of 3 decided
    expect(computeCaseStats([]).offerRate).toBe(0) // no NaN
  })

  it('breaks down by application route', () => {
    const stats = computeCaseStats([row({ route: 'IB' }), row({ route: 'IB' }), row({ route: 'A-Level' })])
    expect(stats.byRoute.IB).toBe(2)
    expect(stats.byRoute['A-Level']).toBe(1)
  })
})

describe('buildPositioning', () => {
  it('filters to the target institution + programme and lists comparable offer backgrounds', () => {
    const cases = [
      row({ institution: 'NUS', programme: 'Computer Science', result: 'offer', grades: 'IB 43/45' }),
      row({ institution: 'NUS', programme: 'Business', result: 'offer' }),       // different programme
      row({ institution: 'NTU', programme: 'Computer Science', result: 'offer' }), // different institution
      row({ institution: 'NUS', programme: 'Computer Science', result: 'rejected' }),
    ]
    const pos = buildPositioning(cases, { institution: 'nus', programme: 'computer science' })
    expect(pos.stats.total).toBe(2) // the two NUS CS cases
    expect(pos.stats.byResult.offer).toBe(1)
    expect(pos.comparableBackgrounds).toContain('IB · IB 43/45 · IELTS 7.5') // offer BG line only
    expect(pos.comparableBackgrounds).toHaveLength(1) // rejection not listed as a "comparable offer"
  })
})
