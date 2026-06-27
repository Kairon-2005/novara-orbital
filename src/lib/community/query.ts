// Case-library query parsing (pure). Turns request query params into a validated
// filter object — invalid enums / blanks are dropped, never trusted. The route
// layer translates CaseFilters into a Supabase query. See PRD §A.7.

import { REPORT_ROUTES, REPORT_RESULTS } from '@/lib/community'
import type { ReportLevel, ReportRoute, ReportResult } from '@/types/database'

const LEVELS: ReportLevel[] = ['secondary', 'undergraduate']

export interface CaseFilters {
  institution?: string
  programme?: string
  route?: ReportRoute
  result?: ReportResult
  level?: ReportLevel
  applyYear?: number
  verifiedOnly?: boolean
}

export function parseCaseFilters(params: URLSearchParams): CaseFilters {
  const filters: CaseFilters = {}

  const institution = params.get('institution')?.trim()
  if (institution) filters.institution = institution

  const programme = params.get('programme')?.trim()
  if (programme) filters.programme = programme

  const route = params.get('route')
  if (route && REPORT_ROUTES.includes(route as ReportRoute)) filters.route = route as ReportRoute

  const result = params.get('result')
  if (result && REPORT_RESULTS.includes(result as ReportResult)) filters.result = result as ReportResult

  const level = params.get('level')
  if (level && LEVELS.includes(level as ReportLevel)) filters.level = level as ReportLevel

  const year = Number(params.get('year'))
  if (Number.isInteger(year) && year >= 2015 && year <= 2100) filters.applyYear = year

  const verified = params.get('verified')
  if (verified === '1' || verified === 'true') filters.verifiedOnly = true

  return filters
}
