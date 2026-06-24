import { createServerClient } from '@/db/server'
import CommunityClient from './CommunityClient'
import type { ReportRowView } from './CommunityClient'

// Community v2 — structured admission reports (录取汇报).
// See docs/PRD-community.md. Anonymous by default; secondary + undergraduate only.

export default async function CommunityPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">Not authenticated.</p>

  const [{ data: reports }, { data: myUpvotes }, { data: commentRows }] = await Promise.all([
    supabase
      .from('admission_reports')
      .select('*')
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('report_upvotes').select('report_id').eq('user_id', user.id),
    supabase.from('report_comments').select('report_id').eq('moderation_status', 'approved'),
  ])

  // Resolve display names only for authors who opted out of anonymity.
  const namedAuthorIds = Array.from(new Set(
    (reports ?? []).filter((r) => !r.anonymous).map((r) => r.author_id)
  ))
  const { data: authorProfiles } = namedAuthorIds.length > 0
    ? await supabase.from('profiles').select('id, display_name').in('id', namedAuthorIds)
    : { data: [] as { id: string; display_name: string }[] }
  const nameById = new Map((authorProfiles ?? []).map((p) => [p.id, p.display_name]))

  const upvoted = new Set((myUpvotes ?? []).map((u) => u.report_id))
  const commentCount = new Map<string, number>()
  for (const c of commentRows ?? []) {
    commentCount.set(c.report_id, (commentCount.get(c.report_id) ?? 0) + 1)
  }

  const rows: ReportRowView[] = (reports ?? []).map((r) => ({
    id: r.id,
    authorId: r.author_id,
    authorName: nameById.get(r.author_id) ?? 'Anonymous',
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
    verified: r.verified,
    upvotes: r.upvotes,
    upvotedByMe: upvoted.has(r.id),
    commentCount: commentCount.get(r.id) ?? 0,
    createdAt: r.created_at,
  }))

  return <CommunityClient initialReports={rows} userId={user.id} />
}
