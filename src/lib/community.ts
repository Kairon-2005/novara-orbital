// Community v2 domain logic (pure): admission-report validation, anonymity
// display, compact background lines, and feed filtering.
// See docs/PRD-community.md. DB shapes live in src/types/database.ts.

import type { ReportLevel, ReportRoute, ReportResult } from '@/types/database'

export const REPORT_ROUTES: ReportRoute[] = ['IB', 'A-Level', 'AP', 'Gaokao', 'O-Level', 'AEIS', 'DSA', 'Poly', 'Other']
export const REPORT_RESULTS: ReportResult[] = ['offer', 'rejected', 'waitlist', 'interview']

const MIN_EXPERIENCE_CHARS = 50
const MIN_APPLY_YEAR = 2015
const MAX_YEARS_AHEAD = 2

// ── Validation ────────────────────────────────────────────────

export interface ReportDraft {
  level: ReportLevel
  institution: string
  programme?: string
  route: ReportRoute
  result: ReportResult
  applyYear: number
  scholarshipName?: string
  grades?: string
  englishTest?: string
  standardizedTests?: string
  activities?: string
  admissionExperience: string
  interviewExperience?: string
  scholarshipExperience?: string
  anonymous?: boolean
}

export interface ValidationResult {
  valid: boolean
  errors: Partial<Record<keyof ReportDraft, string>>
}

export function validateReport(draft: ReportDraft, currentYear: number): ValidationResult {
  const errors: ValidationResult['errors'] = {}

  if (!draft.institution?.trim()) {
    errors.institution = 'School / university name is required.'
  }
  if (draft.level === 'undergraduate' && !draft.programme?.trim()) {
    errors.programme = 'Programme is required for undergraduate reports.'
  }
  if (!REPORT_ROUTES.includes(draft.route)) {
    errors.route = 'Choose an application route.'
  }
  if (!REPORT_RESULTS.includes(draft.result)) {
    errors.result = 'Choose a result.'
  }
  if (
    !Number.isInteger(draft.applyYear) ||
    draft.applyYear < MIN_APPLY_YEAR ||
    draft.applyYear > currentYear + MAX_YEARS_AHEAD
  ) {
    errors.applyYear = `Application year must be between ${MIN_APPLY_YEAR} and ${currentYear + MAX_YEARS_AHEAD}.`
  }
  if ((draft.admissionExperience?.trim().length ?? 0) < MIN_EXPERIENCE_CHARS) {
    errors.admissionExperience = `Please write at least ${MIN_EXPERIENCE_CHARS} characters — concrete details are what make a report useful.`
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

// ── AI-extracted draft normalisation ──────────────────────────
// The PDF-prefill route asks the model for ReportDraft-shaped JSON; this
// whitelists and coerces it so junk output can only ever produce a partial
// prefill, never a crash or an injected field.

const STRING_FIELDS = [
  'institution', 'programme', 'scholarshipName', 'grades', 'englishTest',
  'standardizedTests', 'activities', 'admissionExperience',
  'interviewExperience', 'scholarshipExperience',
] as const

export function normalizeParsedDraft(raw: unknown): Partial<ReportDraft> {
  if (typeof raw !== 'object' || raw === null) return {}
  const source = raw as Record<string, unknown>
  const draft: Partial<ReportDraft> = {}

  for (const field of STRING_FIELDS) {
    const value = source[field]
    if (typeof value === 'string' && value.trim()) draft[field] = value.trim()
  }
  if (source.level === 'secondary' || source.level === 'undergraduate') {
    draft.level = source.level
  }
  if (REPORT_ROUTES.includes(source.route as ReportRoute)) {
    draft.route = source.route as ReportRoute
  }
  if (REPORT_RESULTS.includes(source.result as ReportResult)) {
    draft.result = source.result as ReportResult
  }
  const year = Number(source.applyYear)
  if (Number.isInteger(year) && year >= MIN_APPLY_YEAR && year <= 2100) {
    draft.applyYear = year
  }
  return draft
}

// ── Anonymity display ─────────────────────────────────────────

export interface AuthorDisplay {
  name: string
  isOwn: boolean
}

/**
 * Anonymous reports stay anonymous for everyone — including in what we render
 * for the author — but the author gets an isOwn marker ("Your report").
 * Non-anonymous posts show the author's chosen pen name; `display_name` is never
 * exposed, so a non-anonymous author who set no pen name stays "Anonymous".
 */
export function displayAuthor(
  report: { authorId: string; anonymous: boolean; penName: string | null },
  viewerId: string
): AuthorDisplay {
  return {
    name: report.anonymous ? 'Anonymous' : (report.penName?.trim() || 'Anonymous'),
    isOwn: report.authorId === viewerId,
  }
}

// ── Background line ───────────────────────────────────────────

/** Compact, comparable one-liner for report cards: "IB · IB 42/45 · IELTS 7.0". */
export function formatBgLine(report: {
  route: ReportRoute | string
  grades: string | null
  englishTest: string | null
  standardizedTests: string | null
}): string {
  return [report.route, report.grades, report.englishTest, report.standardizedTests]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' · ')
}

// ── Feed filtering ────────────────────────────────────────────

export interface ReportView {
  id: string
  level: ReportLevel
  institution: string
  programme: string | null
  route: ReportRoute
  result: ReportResult
  applyYear: number
}

export interface ReportFilters {
  level?: ReportLevel
  route?: ReportRoute
  result?: ReportResult
  applyYear?: number
  institution?: string
}

export function applyReportFilters<T extends ReportView>(reports: T[], filters: ReportFilters): T[] {
  const needle = filters.institution?.trim().toLowerCase()
  return reports.filter((r) =>
    (!filters.level || r.level === filters.level) &&
    (!filters.route || r.route === filters.route) &&
    (!filters.result || r.result === filters.result) &&
    (!filters.applyYear || r.applyYear === filters.applyYear) &&
    (!needle || r.institution.toLowerCase().includes(needle))
  )
}
