import { describe, it, expect } from 'vitest'
import { parseKbDoc, chunkDoc } from '@/lib/kb/chunk'

const DOC = `---
id: nus-admissions-routes
title: "NUS Admissions Routes"
category: university-official
university: NUS
topic: admissions
source_urls:
  - https://www.nus.edu.sg/oam/a
  - https://www.nus.edu.sg/oam/b
last_verified: "2026-06-12"
refresh: quarterly
language: en
---

# NUS Admissions Routes

Intro paragraph.
`

// ── parseKbDoc ────────────────────────────────────────────────

describe('parseKbDoc', () => {
  it('parses frontmatter into KbDocMeta and returns the body', () => {
    const { meta, body } = parseKbDoc(DOC)
    expect(meta).toEqual({
      id: 'nus-admissions-routes',
      title: 'NUS Admissions Routes',
      category: 'university-official',
      university: 'NUS',
      topic: 'admissions',
      sourceUrls: ['https://www.nus.edu.sg/oam/a', 'https://www.nus.edu.sg/oam/b'],
      lastVerified: '2026-06-12',
      refresh: 'quarterly',
      language: 'en',
    })
    expect(body).toContain('# NUS Admissions Routes')
    expect(body).not.toContain('---')
  })
})

// ── chunkDoc ──────────────────────────────────────────────────

const docWith = (body: string) => parseKbDoc(`${DOC.trimEnd().split('\n\n')[0]}\n\n${body}\n`)

describe('chunkDoc', () => {
  it('splits at ## headings, one chunk per section', () => {
    const { meta, body } = docWith(`# Title\n\nIntro.\n\n## Gaokao route\n\nGaokao facts.\n\n## IB route\n\nIB facts.`)
    const chunks = chunkDoc(meta, body)
    expect(chunks.map((c) => c.section)).toEqual([
      'NUS Admissions Routes',
      'NUS Admissions Routes > Gaokao route',
      'NUS Admissions Routes > IB route',
    ])
    expect(chunks[1].text).toContain('Gaokao facts.')
    expect(chunks[1].text).not.toContain('IB facts.')
  })

  it('gives every chunk deterministic ids and the doc metadata', () => {
    const { meta, body } = docWith(`Intro.\n\n## A\n\nText a.`)
    const chunks = chunkDoc(meta, body)
    expect(chunks.map((c) => c.id)).toEqual(['nus-admissions-routes#0', 'nus-admissions-routes#1'])
    expect(chunks[0].docId).toBe('nus-admissions-routes')
    expect(chunks[0].meta.title).toBe('NUS Admissions Routes')
  })

  it('splits an oversized section into multiple chunks under the cap', () => {
    const para = `${'Fact sentence. '.repeat(60)}`.trim() // ~900 chars
    const { meta, body } = docWith(`## Big section\n\n${para}\n\n${para}\n\n${para}`)
    const chunks = chunkDoc(meta, body, { maxChars: 1000 })
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) {
      expect(c.text.length).toBeLessThanOrEqual(1000)
      expect(c.section).toContain('Big section')
    }
  })

  it('drops empty sections and keeps chunk indexes contiguous', () => {
    const { meta, body } = docWith(`## Empty\n\n## Real\n\nContent.`)
    const chunks = chunkDoc(meta, body)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].index).toBe(0)
    expect(chunks[0].text).toContain('Content.')
  })
})
