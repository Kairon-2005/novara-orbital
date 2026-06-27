// GET /api/community/cases?institution=&programme=&route=&result=&level=&year=&verified=1
// The structured case-library query: filtered admission cases + positioning
// stats (computed over the VERIFIED subset). See docs/PRD-admission-cases.md §A.7.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { parseCaseFilters } from '@/lib/community/query'
import { computeCaseStats, type CaseRow } from '@/lib/community/stats'

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

  let query = supabase
    .from('admission_reports')
    .select('id, institution, programme, level, route, result, apply_year, grades, english_test, standardized_tests, scholarship_name, verification_status, upvotes, downvotes, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

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

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Query failed' }, { status: 500 })

  const rows = data ?? []
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
    upvotes: r.upvotes,
    downvotes: r.downvotes,
    createdAt: r.created_at,
  }))

  // Stats always reflect the VERIFIED subset (computeCaseStats filters internally).
  return NextResponse.json({ cases, stats: computeCaseStats(caseRows) })
}
