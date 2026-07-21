import { describe, it, expect } from 'vitest'
import { sortProgrammeStats, provenanceFor, type ProgrammeStat } from '@/lib/programme-stats'

const row = (over: Partial<ProgrammeStat>): ProgrammeStat => ({
  id: 'x', university: 'NUS', programme: 'CS', country: 'Singapore',
  curriculumUrl: null, igpUrl: null,
  qsRankUniversity: null, qsRankSubject: null, theRankUniversity: null,
  gesMedianSalarySgd: null, gesEmploymentRate: null, gesYear: null,
  sources: {},
  ...over,
})

const ROWS = [
  row({ id: 'a', gesMedianSalarySgd: 6400, qsRankSubject: 4 }),
  row({ id: 'b', gesMedianSalarySgd: null, qsRankSubject: 39 }),
  row({ id: 'c', gesMedianSalarySgd: 4500, qsRankSubject: null }),
]

describe('sortProgrammeStats', () => {
  it('sorts salary descending with nulls last', () => {
    expect(sortProgrammeStats(ROWS, 'salary').map(r => r.id)).toEqual(['a', 'c', 'b'])
  })

  it('sorts subject rank ascending (better rank first) with nulls last', () => {
    expect(sortProgrammeStats(ROWS, 'subject_rank').map(r => r.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('provenanceFor', () => {
  it('returns the recorded source for a field, null when absent', () => {
    const r = row({ sources: { ges: { name: 'MOE GES 2025', url: 'https://moe.gov.sg/x', year: 2025 } } })
    expect(provenanceFor(r, 'ges')?.name).toBe('MOE GES 2025')
    expect(provenanceFor(r, 'qs_rank_subject')).toBeNull()
  })

  it('ignores malformed source entries', () => {
    const r = row({ sources: { ges: 'not-an-object' } })
    expect(provenanceFor(r, 'ges')).toBeNull()
  })
})
