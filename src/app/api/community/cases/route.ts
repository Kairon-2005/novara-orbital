// GET /api/community/cases?institution=&programme=&route=&result=&level=&year=&verified=1
// The structured case-library query: filtered admission cases + positioning
// stats (computed over the VERIFIED subset). See docs/PRD-admission-cases.md §A.7.

import { NextResponse } from 'next/server'
import { createRouteClient, createAdminClient } from '@/db/server'
import { parseCaseFilters } from '@/lib/community/query'
import { computeCaseStats, type CaseRow } from '@/lib/community/stats'
import { decideTrustTier, type TrustTier } from '@/lib/trust-tier'
import type { ReportLevel, ReportRoute, ReportResult, VerificationStatus } from '@/types/database'

export async function GET(request: Request) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const url = new URL(request.url)
  const filters = parseCaseFilters(url.searchParams)
  const savedOnly = url.searchParams.get('saved') === '1'

  // 我的收藏: restrict to the caller's saved cases.
  let savedIds: string[] | null = null
  if (savedOnly) {
    const { data: saves } = await supabase.from('report_saves').select('report_id').eq('user_id', user.id)
    savedIds = (saves ?? []).map((s) => s.report_id)
    if (savedIds.length === 0) {
      return NextResponse.json({ cases: [], stats: computeCaseStats([]) })
    }
  }

  // 我的记录 (own, any status) vs another user's pen name (their non-anonymous only).
  const mine = url.searchParams.get('mine') === '1'
  const penName = url.searchParams.get('penName')?.trim()
  let authorId: string | null = mine ? user.id : null
  if (!mine && penName) {
    const { data: prof } = await supabase.from('profiles').select('id').eq('pen_name', penName).maybeSingle()
    if (!prof) return NextResponse.json({ cases: [], stats: computeCaseStats([]) })
    authorId = prof.id
  }

  // staff_reviewed_at exists only after the MS6 migration — fall back gracefully.
  const buildQuery = (withTierCols: boolean) => {
    let q = supabase
      .from('admission_reports')
      .select(
        'id, institution, programme, level, route, result, apply_year, grades, english_test, standardized_tests, scholarship_name, verification_status, upvotes, downvotes, created_at'
        + (withTierCols ? ', author_id, staff_reviewed_at' : ''),
      )
      .order('created_at', { ascending: false })
      .limit(300)
    return q
  }
  const applyFilters = (query: ReturnType<typeof buildQuery>) => {
    if (!mine) query = query.eq('moderation_status', 'approved') // 我的记录 shows the author's own rows in any status
    if (authorId) query = query.eq('author_id', authorId)
    if (!mine && penName) query = query.eq('anonymous', false)   // never attribute anonymous posts to a pen name

    if (filters.institution) query = query.ilike('institution', `%${filters.institution}%`)
    if (filters.programme) query = query.ilike('programme', `%${filters.programme}%`)
    if (filters.route) query = query.eq('route', filters.route)
    if (filters.result) query = query.eq('result', filters.result)
    if (filters.level) query = query.eq('level', filters.level)
    if (filters.applyYear) query = query.eq('apply_year', filters.applyYear)
    if (filters.verifiedOnly) query = query.eq('verification_status', 'verified')
    if (savedIds) query = query.in('id', savedIds)
    return query
  }

  let tierCols = true
  let { data, error } = await applyFilters(buildQuery(true))
  if (error) {
    tierCols = false
    ;({ data, error } = await applyFilters(buildQuery(false)))
  }
  if (error) return NextResponse.json({ error: 'Query failed' }, { status: 500 })

  // The dynamic select string defeats supabase's type inference — type the
  // row shape explicitly (it mirrors the select list above).
  type Row = {
    id: string; institution: string; programme: string | null; level: ReportLevel
    route: ReportRoute; result: ReportResult; apply_year: number
    grades: string | null; english_test: string | null; standardized_tests: string | null
    scholarship_name: string | null; verification_status: VerificationStatus
    upvotes: number; downvotes: number; created_at: string
    author_id?: string; staff_reviewed_at?: string | null
  }
  const rows: Row[] = (data ?? []) as unknown as Row[]

  // Trust tiers: which authors hold a verified school mailbox? (service-role
  // lookup — the table is owner-scoped under RLS; only the tier is exposed.)
  const authorInstitution = new Map<string, string>()
  if (tierCols && rows.length > 0) {
    try {
      const authorIds = Array.from(new Set(rows.map(r => r.author_id).filter((a): a is string => Boolean(a))))
      const { data: emails } = await createAdminClient()
        .from('school_email_verifications')
        .select('user_id, institution')
        .in('user_id', authorIds)
        .not('verified_at', 'is', null)
      for (const e of emails ?? []) authorInstitution.set(e.user_id, e.institution)
    } catch { /* pre-migration: table absent — tiers degrade to verification status */ }
  }
  const tierFor = (r: Row): TrustTier => decideTrustTier({
    verificationStatus: r.verification_status,
    staffReviewedAt: r.staff_reviewed_at ?? null,
    authorVerifiedInstitution: r.author_id ? authorInstitution.get(r.author_id) ?? null : null,
    reportInstitution: r.institution,
  })
  const caseRows: CaseRow[] = rows.map((r) => ({
    institution: r.institution,
    programme: r.programme,
    route: r.route,
    result: r.result,
    verificationStatus: r.verification_status,
    grades: r.grades,
    englishTest: r.english_test,
    standardizedTests: r.standardized_tests,
  }))

  const cases = rows.map((r) => ({
    id: r.id,
    institution: r.institution,
    programme: r.programme,
    level: r.level,
    route: r.route,
    result: r.result,
    applyYear: r.apply_year,
    grades: r.grades,
    englishTest: r.english_test,
    standardizedTests: r.standardized_tests,
    scholarshipName: r.scholarship_name,
    verificationStatus: r.verification_status,
    trustTier: tierFor(r),
    upvotes: r.upvotes,
    downvotes: r.downvotes,
    createdAt: r.created_at,
  }))

  // Stats always reflect the VERIFIED subset (computeCaseStats filters internally).
  return NextResponse.json({ cases, stats: computeCaseStats(caseRows) })
}
