import { describe, it, expect } from 'vitest'
import { buildKbContext, formatCitations } from '@/lib/kb/context'
import type { KbSearchHit } from '@/types/kb'

const hit = (over: Partial<KbSearchHit> = {}): KbSearchHit => ({
  chunkId: 'nus-admissions-routes#1',
  docId: 'nus-admissions-routes',
  title: 'NUS Admissions Routes',
  section: 'NUS Admissions Routes > Gaokao route',
  text: 'Gaokao applicants need IELTS 6.5.',
  score: 0.82,
  sourceUrls: ['https://www.nus.edu.sg/oam/x'],
  lastVerified: '2026-06-12',
  ...over,
})

describe('buildKbContext', () => {
  it('renders each hit with its section header and source title', () => {
    const ctx = buildKbContext([hit()])
    expect(ctx).toContain('NUS Admissions Routes > Gaokao route')
    expect(ctx).toContain('Gaokao applicants need IELTS 6.5.')
    expect(ctx).toContain('last verified 2026-06-12')
  })

  it('returns an empty string for no hits', () => {
    expect(buildKbContext([])).toBe('')
  })

  it('numbers multiple hits in order', () => {
    const ctx = buildKbContext([hit(), hit({ chunkId: 'b#0', title: 'NTU Fees', section: 'NTU Fees' })])
    expect(ctx.indexOf('[1]')).toBeGreaterThanOrEqual(0)
    expect(ctx.indexOf('[2]')).toBeGreaterThan(ctx.indexOf('[1]'))
    expect(ctx).toContain('NTU Fees')
  })
})

describe('formatCitations', () => {
  it('deduplicates citations by document', () => {
    const citations = formatCitations([hit(), hit({ chunkId: 'nus-admissions-routes#2' })])
    expect(citations).toHaveLength(1)
    expect(citations[0]).toEqual({
      docId: 'nus-admissions-routes',
      title: 'NUS Admissions Routes',
      sourceUrls: ['https://www.nus.edu.sg/oam/x'],
      lastVerified: '2026-06-12',
    })
  })

  it('keeps distinct documents in hit order', () => {
    const citations = formatCitations([hit(), hit({ docId: 'ntu-fees', title: 'NTU Fees' })])
    expect(citations.map((c) => c.docId)).toEqual(['nus-admissions-routes', 'ntu-fees'])
  })
})
