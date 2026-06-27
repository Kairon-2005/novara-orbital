// Positioning / aggregation domain logic (pure). Turns a set of admission cases
// into the Offer多多-style stats shown in the Cases tab. Only VERIFIED cases are
// counted — unverified/mismatch data never skews positioning. See
// docs/PRD-admission-cases.md §A.5 / A.7.

import { formatBgLine } from '@/lib/community'
import type { ReportResult, ReportRoute, VerificationStatus } from '@/types/database'
import { REPORT_RESULTS } from '@/lib/community'

export interface CaseRow {
  institution: string
  programme: string | null
  route: ReportRoute
  result: ReportResult
  verificationStatus: VerificationStatus
  grades: string | null
  englishTest: string | null
  standardizedTests: string | null
}

export interface CaseStats {
  total: number
  byResult: Record<ReportResult, number>
  /** offers ÷ decided outcomes (offer + rejected + waitlist); 0 when none decided. */
  offerRate: number
  byRoute: Record<string, number>
}

export interface PositioningTarget {
  institution: string
  programme?: string | null
}

export interface Positioning {
  stats: CaseStats
  /** Compact BG lines of the verified offers at this target — what got in. */
  comparableBackgrounds: string[]
}

const DECIDED: ReportResult[] = ['offer', 'rejected', 'waitlist']

function emptyByResult(): Record<ReportResult, number> {
  return REPORT_RESULTS.reduce(
    (acc, r) => ({ ...acc, [r]: 0 }),
    {} as Record<ReportResult, number>,
  )
}

/** Aggregate stats over the verified cases in `cases`. */
export function computeCaseStats(cases: CaseRow[]): CaseStats {
  const verified = cases.filter((c) => c.verificationStatus === 'verified')

  const byResult = emptyByResult()
  const byRoute: Record<string, number> = {}
  for (const c of verified) {
    byResult[c.result] += 1
    byRoute[c.route] = (byRoute[c.route] ?? 0) + 1
  }

  const decided = DECIDED.reduce((sum, r) => sum + byResult[r], 0)
  const offerRate = decided === 0 ? 0 : byResult.offer / decided

  return { total: verified.length, byResult, offerRate, byRoute }
}

/** Stats + comparable offer backgrounds for one institution/programme target. */
export function buildPositioning(cases: CaseRow[], target: PositioningTarget): Positioning {
  const institution = target.institution.trim().toLowerCase()
  const programme = target.programme?.trim().toLowerCase()

  const matching = cases.filter((c) =>
    c.institution.toLowerCase() === institution &&
    (!programme || (c.programme ?? '').toLowerCase() === programme),
  )

  const comparableBackgrounds = matching
    .filter((c) => c.verificationStatus === 'verified' && c.result === 'offer')
    .map((c) => formatBgLine(c))
    .filter(Boolean)

  return { stats: computeCaseStats(matching), comparableBackgrounds }
}
