import { describe, it, expect } from 'vitest'
import { assembleDoc } from '@/lib/kb/wiki'
import type { KbPointPayload } from '@/lib/kb/store'

const payload = (over: Partial<KbPointPayload>): KbPointPayload => ({
  chunkId: 'doc-a#0',
  docId: 'doc-a',
  title: 'Doc A',
  section: 'Doc A',
  text: 'intro',
  category: 'university-official',
  university: 'NUS',
  topic: 'admissions',
  sourceUrls: ['https://example.org'],
  lastVerified: '2026-06-12',
  ...over,
})

describe('assembleDoc', () => {
  it('groups chunks into sections, merging split chunks of the same section', () => {
    const doc = assembleDoc([
      payload({ chunkId: 'doc-a#0', section: 'Doc A', text: 'intro' }),
      payload({ chunkId: 'doc-a#1', section: 'Doc A > Part 1', text: 'first half' }),
      payload({ chunkId: 'doc-a#2', section: 'Doc A > Part 1', text: 'second half' }),
      payload({ chunkId: 'doc-a#3', section: 'Doc A > Part 2', text: 'other' }),
    ])
    expect(doc?.title).toBe('Doc A')
    expect(doc?.sections.map((s) => s.section)).toEqual(['Doc A', 'Doc A > Part 1', 'Doc A > Part 2'])
    expect(doc?.sections[1].text).toBe('first half\n\nsecond half')
    expect(doc?.sourceUrls).toEqual(['https://example.org'])
    expect(doc?.lastVerified).toBe('2026-06-12')
  })

  it('returns null for an unknown doc (no chunks)', () => {
    expect(assembleDoc([])).toBeNull()
  })
})
