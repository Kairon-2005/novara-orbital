import { createServerClient } from '@/db/server'
import { getLocale } from '@/lib/locale-server'
import CommunityClient from './CommunityClient'
import type { ReportRowView } from './CommunityClient'

// Community v2 — structured admission reports (录取汇报).
// See docs/PRD-community.md. Anonymous by default; secondary + undergraduate only.

const T = {
  en: { notAuthenticated: 'Not authenticated.' },
  zh: { notAuthenticated: '未登录。' },
}

export default async function CommunityPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">{T[getLocale('en')].notAuthenticated}</p>

  const [{ data: reports }, { data: myUpvotes }, { data: commentRows }, { data: mySaves }] = await Promise.all([
    supabase
      .from('admission_reports')
      .select('*')
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('report_votes').select('report_id, value').eq('user_id', user.id),
    supabase.from('report_comments').select('report_id').eq('moderation_status', 'approved'),
    supabase.from('report_saves').select('report_id').eq('user_id', user.id),
  ])

  // Resolve display names only for authors who opted out of anonymity.
  const namedAuthorIds = Array.from(new Set(
    (reports ?? []).filter((r) => !r.anonymous).map((r) => r.author_id)
  ))
  const { data: authorProfiles } = namedAuthorIds.length > 0
    ? await supabase.from('profiles').select('id, pen_name').in('id', namedAuthorIds)
    : { data: [] as { id: string; pen_name: string | null }[] }
  const nameById = new Map((authorProfiles ?? []).map((p) => [p.id, p.pen_name]))

  const myVoteById = new Map((myUpvotes ?? []).map((u) => [u.report_id, u.value]))
  const saved = new Set((mySaves ?? []).map((s) => s.report_id))
  const commentCount = new Map<string, number>()
  for (const c of commentRows ?? []) {
    commentCount.set(c.report_id, (commentCount.get(c.report_id) ?? 0) + 1)
  }

  const rows: ReportRowView[] = (reports ?? []).map((r) => ({
    id: r.id,
    authorId: r.author_id,
    penName: nameById.get(r.author_id) ?? null,
    anonymous: r.anonymous,
    level: r.level,
    institution: r.institution,
    programme: r.programme,
    route: r.route,
    result: r.result,
    applyYear: r.apply_year,
    scholarshipName: r.scholarship_name,
    grades: r.grades,
    englishTest: r.english_test,
    standardizedTests: r.standardized_tests,
    activities: r.activities,
    admissionExperience: r.admission_experience,
    interviewExperience: r.interview_experience,
    scholarshipExperience: r.scholarship_experience,
    verificationStatus: r.verification_status,
    upvotes: r.upvotes,
    downvotes: r.downvotes,
    myVote: myVoteById.get(r.id) ?? 0,
    savedByMe: saved.has(r.id),
    commentCount: commentCount.get(r.id) ?? 0,
    createdAt: r.created_at,
  }))

  return <CommunityClient initialReports={rows} userId={user.id} />
}
