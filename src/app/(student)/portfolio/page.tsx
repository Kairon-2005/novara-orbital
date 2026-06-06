// Server Component — loads portfolio data and seeds the interactive client.
import { createServerClient } from '@/db/server'
import PortfolioClient from './PortfolioClient'
import {
  getStudentProfile,
  getActiveRoadmapMilestones,
  getAchievements,
  getStudentDocuments,
  getLatestAssessment,
} from '@/lib/data'

export default async function PortfolioPage() {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">Not authenticated.</p>

  const [profile, { milestones }, achievements, documents, assessment] = await Promise.all([
    getStudentProfile(supabase, user.id),
    getActiveRoadmapMilestones(supabase, user.id),
    getAchievements(supabase, user.id),
    getStudentDocuments(supabase, user.id),
    getLatestAssessment(supabase, user.id),
  ])

  return (
    <PortfolioClient
      initialAchievements={achievements}
      milestones={milestones}
      documents={documents}
      userId={user.id}
      targetProgramme={profile?.target_programme ?? ''}
      initialAssessment={assessment}
    />
  )
}
