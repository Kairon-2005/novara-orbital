import { describe, it, expect } from 'vitest'
import { staleDocs } from '@/lib/kb/stale'

const doc = (id: string, lastVerified: string) => ({ id, title: id, lastVerified })
const NOW = new Date('2026-06-12T00:00:00Z')

describe('staleDocs', () => {
  it('flags docs older than the max age and keeps fresh ones', () => {
    const result = staleDocs([doc('old', '2026-01-01'), doc('fresh', '2026-06-01')], NOW)
    expect(result.map((d) => d.id)).toEqual(['old'])
    expect(result[0].ageDays).toBe(162)
  })

  it('is exclusive at exactly the boundary', () => {
    expect(staleDocs([doc('edge', '2026-03-14')], NOW)).toEqual([]) // exactly 90 days
    expect(staleDocs([doc('over', '2026-03-13')], NOW)).toHaveLength(1) // 91 days
  })

  it('treats malformed dates as stale', () => {
    const result = staleDocs([doc('bad', 'not-a-date')], NOW)
    expect(result.map((d) => d.id)).toEqual(['bad'])
    expect(result[0].ageDays).toBeNull()
  })

  it('handles an empty corpus and sorts oldest first', () => {
    expect(staleDocs([], NOW)).toEqual([])
    const result = staleDocs([doc('a', '2026-02-01'), doc('b', '2025-12-01')], NOW)
    expect(result.map((d) => d.id)).toEqual(['b', 'a'])
  })
})
