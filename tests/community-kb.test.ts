import { describe, it, expect } from 'vitest'
import { normalizeParsedDraft } from '@/lib/community'
import { reportToKbDoc } from '@/lib/community-kb'
import { parseKbDoc } from '@/lib/kb/chunk'

// ── normalizeParsedDraft (AI-extracted PDF → safe draft prefill) ──

describe('normalizeParsedDraft', () => {
  it('keeps valid fields and coerces types', () => {
    const draft = normalizeParsedDraft({
      level: 'undergraduate',
      institution: '  NUS ',
      programme: 'Computer Science',
      route: 'IB',
      result: 'offer',
      applyYear: '2026',
      grades: 'IB 42/45',
      admissionExperience: 'Long story.',
    })
    expect(draft.institution).toBe('NUS')
    expect(draft.applyYear).toBe(2026)
    expect(draft.route).toBe('IB')
  })

  it('drops invalid enum values and junk fields instead of failing', () => {
    const draft = normalizeParsedDraft({
      level: 'phd',
      route: 'SAT',
      result: 'maybe',
      applyYear: 'unknown',
      hacker: 'field',
    })
    expect(draft.level).toBeUndefined()
    expect(draft.route).toBeUndefined()
    expect(draft.result).toBeUndefined()
    expect(draft.applyYear).toBeUndefined()
    expect('hacker' in draft).toBe(false)
  })

  it('returns {} for non-object input', () => {
    expect(normalizeParsedDraft(null)).toEqual({})
    expect(normalizeParsedDraft('text')).toEqual({})
  })
})

// ── reportToKbDoc (published report → anonymized KB experience doc) ──

const REPORT = {
  id: 'abc-123',
  level: 'undergraduate' as const,
  institution: 'NUS',
  programme: 'Computer Science',
  route: 'Gaokao' as const,
  result: 'offer' as const,
  applyYear: 2026,
  scholarshipName: null,
  grades: 'Gaokao 660/750',
  englishTest: 'IELTS 7.0',
  standardizedTests: null,
  activities: 'NOI provincial first prize',
  admissionExperience: 'Submitted scores within 3 days of release; interview followed.',
  interviewExperience: 'Two professors, maths questions.',
  scholarshipExperience: null,
}

describe('reportToKbDoc', () => {
  it('produces a valid KB doc with experience category and detected university', () => {
    const md = reportToKbDoc(REPORT, '2026-06-12')
    const { meta, body } = parseKbDoc(md)
    expect(meta.id).toBe('report-abc-123')
    expect(meta.category).toBe('experience')
    expect(meta.university).toBe('NUS')
    expect(meta.lastVerified).toBe('2026-06-12')
    expect(body).toContain('Gaokao 660/750')
    expect(body).toContain('interview')
  })

  it('contains no author information and marks content as community-sourced', () => {
    const md = reportToKbDoc(REPORT, '2026-06-12')
    expect(md.toLowerCase()).not.toContain('author')
    expect(md.toLowerCase()).toContain('anecdotal')
  })

  it('omits empty sections', () => {
    const md = reportToKbDoc({ ...REPORT, interviewExperience: null, scholarshipExperience: null }, '2026-06-12')
    expect(md).not.toContain('## Interview experience')
    expect(md).not.toContain('## Scholarship experience')
  })
})
