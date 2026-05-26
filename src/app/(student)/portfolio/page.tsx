// Server Component — fetches achievements, milestones, documents from Supabase.
import { createServerClient } from '@/db/server'
import PortfolioClient from './PortfolioClient'
import type { MockAchievement, MockMilestone, MockDocument } from '@/lib/mock-data'

export default async function PortfolioPage() {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">Not authenticated.</p>

  // Fetch all in parallel
  const [
    { data: dbAchievements },
    { data: roadmap },
    { data: dbDocs },
    { data: sp },
  ] = await Promise.all([
    supabase.from('achievements').select('*').eq('student_id', user.id),
    supabase.from('roadmaps').select('id').eq('student_id', user.id).eq('status', 'active').order('generated_at', { ascending: false }).limit(1).single(),
    supabase.from('student_documents').select('id, file_name, file_type, upload_date').eq('student_id', user.id),
    supabase.from('student_profiles').select('target_programme').eq('id', user.id).single(),
  ])

  // Fetch milestones for active roadmap (needs roadmap id first)
  const { data: dbMilestones } = roadmap
    ? await supabase.from('milestones').select('*').eq('roadmap_id', roadmap.id)
    : { data: [] }

  const achievements: MockAchievement[] = (dbAchievements ?? []).map(a => ({
    id:          a.id,
    category:    a.category as MockAchievement['category'],
    title:       a.title,
    date:        a.date,
    description: a.description ?? '',
    xp:          50,
  }))

  const milestones: MockMilestone[] = (dbMilestones ?? []).map(m => ({
    id:          m.id,
    year:        m.year,
    month:       m.month ?? 1,
    type:        m.type as MockMilestone['type'],
    title:       m.title,
    description: m.description ?? '',
    due_date:    m.due_date ?? '',
    completed:   m.completed ?? false,
  }))

  const documents: MockDocument[] = (dbDocs ?? []).map(d => ({
    id:            d.id,
    file_name:     d.file_name,
    file_type:     d.file_type as MockDocument['file_type'],
    upload_date:   d.upload_date,
    size_kb:       0,
    parent_access: false,
  }))

  return (
    <PortfolioClient
      initialAchievements={achievements}
      milestones={milestones}
      documents={documents}
      userId={user.id}
      targetProgramme={sp?.target_programme ?? ''}
    />
  )
}
