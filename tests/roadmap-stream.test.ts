import { describe, it, expect } from 'vitest'
import { extractCompleteYears, parseStreamedRoadmap } from '@/lib/roadmap-stream'

const year = (y: number, title = 'AMC 10') =>
  `{"year":${y},"yearLabel":"Year ${y}","keyMilestone":"k","milestones":[{"type":"competition","title":"${title}","description":"d","month":4}]}`

describe('extractCompleteYears', () => {
  it('returns [] before the years array has started', () => {
    expect(extractCompleteYears('{"yea')).toEqual([])
    expect(extractCompleteYears('{"years"')).toEqual([])
  })

  it('returns only years that have closed', () => {
    const buffer = `{"years":[${year(2026)},${year(2027)},{"year":2028,"yearLab`
    const years = extractCompleteYears(buffer) as Array<{ year: number }>
    expect(years.map(y => y.year)).toEqual([2026, 2027])
  })

  it('grows monotonically as the stream arrives', () => {
    const full = `{"years":[${year(2026)},${year(2027)}]}`
    let seen = 0
    for (let i = 1; i <= full.length; i++) {
      const count = extractCompleteYears(full.slice(0, i)).length
      expect(count).toBeGreaterThanOrEqual(seen)
      seen = count
    }
    expect(seen).toBe(2)
  })

  it('is not confused by braces or brackets inside string values', () => {
    const tricky = `{"years":[{"year":2026,"yearLabel":"a {b} [c]","keyMilestone":"}]","milestones":[]}]}`
    const years = extractCompleteYears(tricky) as Array<{ yearLabel: string; keyMilestone: string }>
    expect(years).toHaveLength(1)
    expect(years[0].yearLabel).toBe('a {b} [c]')
    expect(years[0].keyMilestone).toBe('}]')
  })

  it('is not confused by escaped quotes', () => {
    const escaped = `{"years":[{"year":2026,"yearLabel":"say \\"hi\\"","milestones":[]}]}`
    const years = extractCompleteYears(escaped) as Array<{ yearLabel: string }>
    expect(years).toHaveLength(1)
    expect(years[0].yearLabel).toBe('say "hi"')
  })

  it('stops at the end of the years array and ignores later objects', () => {
    const buffer = `{"years":[${year(2026)}],"other":{"year":9999}}`
    const years = extractCompleteYears(buffer) as Array<{ year: number }>
    expect(years.map(y => y.year)).toEqual([2026])
  })
})

describe('parseStreamedRoadmap', () => {
  it('parses a complete body whole', () => {
    const full = `{"years":[${year(2026)}],"extra":true}`
    expect(parseStreamedRoadmap(full)).toEqual(JSON.parse(full))
  })

  // The salvage path: a cut-off stream still yields the years that completed.
  it('salvages complete years from a truncated body', () => {
    const cut = `{"years":[${year(2026)},${year(2027)},{"year":2028`
    const parsed = parseStreamedRoadmap(cut) as { years: Array<{ year: number }> }
    expect(parsed.years.map(y => y.year)).toEqual([2026, 2027])
  })

  it('yields no years when nothing completed', () => {
    expect(parseStreamedRoadmap('{"years":[{"yea')).toEqual({ years: [] })
  })
})
