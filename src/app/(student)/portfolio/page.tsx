// Server Component — loads portfolio data and seeds the interactive client.
import { createServerClient } from '@/db/server'
import PortfolioClient from './PortfolioClient'
import {
  getStudentProfile,
  getActiveRoadmapMilestones,
  getAchievements,
  getStudentDocuments,
  getLatestAssessmentInfo,
  hasEvidenceSince,
} from '@/lib/data'

export default async function PortfolioPage() {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">Not authenticated.</p>

  const [profile, { milestones }, achievements, documents, latest] = await Promise.all([
    getStudentProfile(supabase, user.id),
    getActiveRoadmapMilestones(supabase, user.id),
    getAchievements(supabase, user.id),
    getStudentDocuments(supabase, user.id),
    getLatestAssessmentInfo(supabase, user.id),
  ])

  // The reassessment loop: flag when evidence has been added since the last run.
  const hasNewEvidence = latest ? await hasEvidenceSince(supabase, user.id, latest.createdAt) : false

  return (
    <PortfolioClient
      initialAchievements={achievements}
      milestones={milestones}
      documents={documents}
      userId={user.id}
      targetProgramme={profile?.target_programme ?? ''}
      initialAssessment={latest?.assessment ?? null}
      hasNewEvidence={hasNewEvidence}
    />
  )
}
