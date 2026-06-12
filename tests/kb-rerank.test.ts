import { describe, it, expect } from 'vitest'
import { lexicalRerank, lexicalOverlap } from '@/lib/kb/rerank'
import type { KbSearchHit } from '@/types/kb'

const hit = (chunkId: string, text: string, score: number, section = 'Doc'): KbSearchHit => ({
  chunkId,
  docId: chunkId.split('#')[0],
  title: 'Doc',
  section,
  text,
  score,
  sourceUrls: [],
  lastVerified: '2026-06-12',
})

describe('lexicalOverlap', () => {
  it('scores exact rare tokens (numbers, test names) higher than common words', () => {
    const withScore = lexicalOverlap('ielts 6.5 requirement', 'Gaokao applicants need IELTS 6.5 overall.')
    const without = lexicalOverlap('ielts 6.5 requirement', 'General admission information for students.')
    expect(withScore).toBeGreaterThan(without)
    expect(without).toBe(0)
  })

  it('matches case-insensitively and through the section trail', () => {
    expect(lexicalOverlap('GAOKAO', 'gaokao route details')).toBeGreaterThan(0)
  })
})

describe('lexicalRerank', () => {
  it('promotes a lexical exact-match above a slightly higher dense score', () => {
    const hits = [
      hit('a#0', 'General overview of admission pathways.', 0.80),
      hit('b#0', 'AP Calculus BC score of 5 is required.', 0.78),
    ]
    const ranked = lexicalRerank(hits, 'AP Calculus BC requirement', 2)
    expect(ranked[0].chunkId).toBe('b#0')
  })

  it('preserves dense order when no lexical signal exists', () => {
    const hits = [
      hit('a#0', 'Alpha text.', 0.9),
      hit('b#0', 'Beta text.', 0.7),
      hit('c#0', 'Gamma text.', 0.5),
    ]
    expect(lexicalRerank(hits, 'unrelated query terms', 3).map((h) => h.chunkId)).toEqual(['a#0', 'b#0', 'c#0'])
  })

  it('truncates to the requested limit', () => {
    const hits = [hit('a#0', 'x', 0.9), hit('b#0', 'y', 0.8), hit('c#0', 'z', 0.7)]
    expect(lexicalRerank(hits, 'q', 2)).toHaveLength(2)
  })

  it('handles empty input', () => {
    expect(lexicalRerank([], 'q', 5)).toEqual([])
  })
})
