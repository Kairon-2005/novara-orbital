import { describe, it, expect } from 'vitest'
import { parseCaseFilters } from '@/lib/community/query'

const parse = (qs: string) => parseCaseFilters(new URLSearchParams(qs))

describe('parseCaseFilters', () => {
  it('reads recognised filters and the verified-only flag', () => {
    expect(parse('institution=NUS&programme=Computer Science&route=IB&result=offer&level=undergraduate&year=2026&verified=1'))
      .toEqual({
        institution: 'NUS', programme: 'Computer Science', route: 'IB',
        result: 'offer', level: 'undergraduate', applyYear: 2026, verifiedOnly: true,
      })
  })

  it('ignores blank and invalid enum values', () => {
    expect(parse('institution=%20%20&route=Klingon&result=admitted&level=phd&year=nope&verified=0')).toEqual({})
  })
})
