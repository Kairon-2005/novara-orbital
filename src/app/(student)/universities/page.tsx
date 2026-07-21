import { createServerClient } from '@/db/server'
import { getLatestAssessment } from '@/lib/data'
import { buildPositioning, type CaseRow } from '@/lib/community/stats'
import { decidePositioning } from '@/lib/positioning'
import { checkSubmissionReadiness } from '@/lib/readiness-check'
import UniversityClient from './UniversityClient'
import type { TargetInsight, UniversityTarget } from './UniversityClient'

export default async function UniversitiesPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">Not authenticated.</p>

  const today = new Date().toISOString().slice(0, 10)
  const [{ data }, { data: profile }, { data: reports }, { data: docs }, { data: events }, assessment] =
    await Promise.all([
      supabase
        .from('university_targets')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('student_profiles')
        .select('target_university, target_programme, target_enrollment_year, current_curriculum, english_level')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('admission_reports')
        .select('institution, programme, route, result, verification_status, grades, english_test, standardized_tests')
        .eq('verification_status', 'verified')
        .limit(1000),
      supabase
        .from('student_documents')
        .select('file_name, file_type')
        .eq('student_id', user.id),
      supabase
        .from('calendar_events')
        .select('title, event_date')
        .eq('student_id', user.id),
      getLatestAssessment(supabase, user.id),
    ])

  const targets: UniversityTarget[] = (data ?? []).map(r => ({
    id:           r.id,
    name:         r.name,
    country:      r.country ?? '',
    programme:    r.programme ?? '',
    deadline:     r.deadline ?? null,
    requirements: r.requirements ?? '',
    notes:        r.notes ?? '',
    status:       r.status as UniversityTarget['status'],
    referenceLink: r.reference_link ?? '',
    applicationPlan: r.application_plan ?? null,
    planUpdatedAt: r.plan_updated_at ?? null,
  }))

  // Per-target agent-grade insights, computed from pure modules — no AI calls.
  const cases: CaseRow[] = (reports ?? []).map(r => ({
    institution: r.institution,
    programme: r.programme,
    route: r.route,
    result: r.result,
    verificationStatus: r.verification_status,
    grades: r.grades,
    englishTest: r.english_test,
    standardizedTests: r.standardized_tests,
  }))
  const uploadedDocs = (docs ?? []).map(d => ({ fileName: d.file_name, fileType: d.file_type }))
  const calendarEvents = (events ?? []).map(e => ({ title: e.title, date: e.event_date }))
  const insights: Record<string, TargetInsight> = {}
  for (const t of targets) {
    insights[t.id] = {
      positioning: decidePositioning({
        assessmentLevel: assessment?.overallLevel ?? null,
        positioning: buildPositioning(cases, { institution: t.name, programme: t.programme || null }),
      }),
      readiness: checkSubmissionReadiness({
        plan: t.applicationPlan,
        uploadedDocs,
        calendarEvents,
        profile: {
          curriculum: profile?.current_curriculum,
          englishLevel: profile?.english_level,
          targetYear: profile?.target_enrollment_year ? String(profile.target_enrollment_year) : null,
        },
        today,
      }),
    }
  }

  return (
    <UniversityClient
      initialTargets={targets}
      insights={insights}
      userId={user.id}
      profileDefaults={{
        university: profile?.target_university ?? '',
        programme: profile?.target_programme ?? '',
        enrollmentYear: profile?.target_enrollment_year ?? null,
      }}
    />
  )
}
