import { describe, it, expect } from 'vitest'
import { validateReport, displayAuthor, formatBgLine, applyReportFilters } from '@/lib/community'
import type { ReportDraft, ReportView } from '@/lib/community'

const draft = (over: Partial<ReportDraft> = {}): ReportDraft => ({
  level: 'undergraduate',
  institution: 'NUS',
  programme: 'Computer Science',
  route: 'IB',
  result: 'offer',
  applyYear: 2026,
  admissionExperience: 'Applied early, focused my essays on a robotics project and my IB HL subjects matched the prerequisites well.',
  ...over,
})

// ── validateReport ────────────────────────────────────────────

describe('validateReport', () => {
  it('accepts a complete undergraduate report', () => {
    expect(validateReport(draft(), 2026)).toEqual({ valid: true, errors: {} })
  })

  it('requires institution and a substantial experience text', () => {
    const r = validateReport(draft({ institution: '  ', admissionExperience: 'too short' }), 2026)
    expect(r.valid).toBe(false)
    expect(Object.keys(r.errors).sort()).toEqual(['admissionExperience', 'institution'])
  })

  it('requires programme for undergraduate but not for secondary', () => {
    expect(validateReport(draft({ programme: '' }), 2026).errors.programme).toBeTruthy()
    expect(validateReport(draft({ level: 'secondary', programme: '' }), 2026).valid).toBe(true)
  })

  it('bounds applyYear to a sane window around now', () => {
    expect(validateReport(draft({ applyYear: 2014 }), 2026).errors.applyYear).toBeTruthy()
    expect(validateReport(draft({ applyYear: 2029 }), 2026).errors.applyYear).toBeTruthy()
    expect(validateReport(draft({ applyYear: 2027 }), 2026).valid).toBe(true)
  })
})

// ── displayAuthor ─────────────────────────────────────────────

describe('displayAuthor', () => {
  const report = { authorId: 'u1', anonymous: true, authorName: 'Wei Zhang' }

  it('hides the name of an anonymous report from other viewers', () => {
    expect(displayAuthor(report, 'u2')).toEqual({ name: 'Anonymous', isOwn: false })
  })

  it('keeps anonymity but marks the report as own for its author', () => {
    expect(displayAuthor(report, 'u1')).toEqual({ name: 'Anonymous', isOwn: true })
  })

  it('shows the real name when the author opted out of anonymity', () => {
    expect(displayAuthor({ ...report, anonymous: false }, 'u2')).toEqual({ name: 'Wei Zhang', isOwn: false })
  })
})

// ── formatBgLine ──────────────────────────────────────────────

describe('formatBgLine', () => {
  it('joins available background fields compactly', () => {
    expect(formatBgLine({ route: 'IB', grades: 'IB 42/45', englishTest: 'IELTS 7.0', standardizedTests: null }))
      .toBe('IB · IB 42/45 · IELTS 7.0')
  })

  it('falls back to the route alone when no background was given', () => {
    expect(formatBgLine({ route: 'Gaokao', grades: null, englishTest: null, standardizedTests: null })).toBe('Gaokao')
  })
})

// ── applyReportFilters ────────────────────────────────────────

const view = (over: Partial<ReportView>): ReportView => ({
  id: 'r1',
  level: 'undergraduate',
  institution: 'NUS',
  programme: 'Computer Science',
  route: 'IB',
  result: 'offer',
  applyYear: 2026,
  ...over,
} as ReportView)

describe('applyReportFilters', () => {
  const reports = [
    view({ id: 'a', institution: 'NUS', route: 'IB', result: 'offer', applyYear: 2026 }),
    view({ id: 'b', institution: 'NTU', route: 'Gaokao', result: 'rejected', applyYear: 2025 }),
    view({ id: 'c', institution: 'ACS (Independent)', level: 'secondary', route: 'AEIS', result: 'offer', applyYear: 2026 }),
  ]

  it('filters by level, route, result and year', () => {
    expect(applyReportFilters(reports, { level: 'secondary' }).map((r) => r.id)).toEqual(['c'])
    expect(applyReportFilters(reports, { route: 'Gaokao' }).map((r) => r.id)).toEqual(['b'])
    expect(applyReportFilters(reports, { result: 'offer' }).map((r) => r.id)).toEqual(['a', 'c'])
    expect(applyReportFilters(reports, { applyYear: 2025 }).map((r) => r.id)).toEqual(['b'])
  })

  it('matches institution case-insensitively as a substring', () => {
    expect(applyReportFilters(reports, { institution: 'acs' }).map((r) => r.id)).toEqual(['c'])
  })

  it('combines filters and returns all reports for an empty filter', () => {
    expect(applyReportFilters(reports, {})).toHaveLength(3)
    expect(applyReportFilters(reports, { result: 'offer', applyYear: 2026, institution: 'nus' }).map((r) => r.id)).toEqual(['a'])
  })
})
