// Server Component — loads the student's plan and seeds the interactive client.
import { createServerClient } from '@/db/server'
import RoadmapClient from './RoadmapClient'
import {
  getStudentProfile,
  getActiveRoadmapMilestones,
  getAchievements,
  getStudentDocuments,
} from '@/lib/data'

export default async function RoadmapPage() {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">Not authenticated.</p>

  const [profile, { roadmapId, milestones }, achievements, documents] = await Promise.all([
    getStudentProfile(supabase, user.id),
    getActiveRoadmapMilestones(supabase, user.id),
    getAchievements(supabase, user.id),
    getStudentDocuments(supabase, user.id),
  ])

  // Planned enrolment year drives how many years the roadmap timeline spans.
  const currentYear = new Date().getFullYear()
  const enrollmentYear = profile?.target_enrollment_year ?? currentYear + 4

  return (
    <RoadmapClient
      initialMilestones={milestones}
      initialAchievements={achievements}
      documents={documents}
      roadmapId={roadmapId}
      userId={user.id}
      currentYear={currentYear}
      enrollmentYear={enrollmentYear}
    />
  )
}
