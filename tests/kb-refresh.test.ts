import { describe, it, expect } from 'vitest'
import { stripHtml, contentFingerprint, compareSnapshots } from '@/lib/kb/refresh'

describe('stripHtml', () => {
  it('removes tags, scripts and styles, keeping visible text', () => {
    const html = `<html><head><style>.a{color:red}</style><script>alert(1)</script></head>
      <body><h1>Admissions</h1><p>IELTS <b>6.5</b> required.</p></body></html>`
    const text = stripHtml(html)
    expect(text).toContain('Admissions')
    expect(text).toContain('IELTS 6.5 required.')
    expect(text).not.toContain('alert')
    expect(text).not.toContain('color:red')
    expect(text).not.toContain('<')
  })

  it('collapses whitespace so formatting-only changes do not register', () => {
    expect(stripHtml('<p>a</p>\n\n   <p>b</p>')).toBe(stripHtml('<p>a</p> <p>b</p>'))
  })
})

describe('contentFingerprint', () => {
  it('is stable for identical text and differs for different text', () => {
    expect(contentFingerprint('abc')).toBe(contentFingerprint('abc'))
    expect(contentFingerprint('abc')).not.toBe(contentFingerprint('abd'))
  })
})

describe('compareSnapshots', () => {
  const prev = { 'https://a': 'h1', 'https://b': 'h2', 'https://gone': 'h3' }
  const next = { 'https://a': 'h1', 'https://b': 'CHANGED', 'https://new': 'h4' }

  it('classifies urls as changed, added, removed or unchanged', () => {
    expect(compareSnapshots(prev, next)).toEqual({
      changed: ['https://b'],
      added: ['https://new'],
      removed: ['https://gone'],
      unchanged: ['https://a'],
    })
  })

  it('handles an empty previous snapshot (first run: everything added)', () => {
    const result = compareSnapshots({}, { 'https://a': 'h1' })
    expect(result.added).toEqual(['https://a'])
    expect(result.changed).toEqual([])
  })
})
