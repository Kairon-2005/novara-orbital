// Server Component — fetches milestones from Supabase and seeds the client.
import { createServerClient } from '@/db/server'
import RoadmapClient from './RoadmapClient'
import { achievementXP, type MockMilestone, type MockAchievement, type MockDocument } from '@/lib/mock-data'

export default async function RoadmapPage() {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">Not authenticated.</p>

  // Planned enrolment year drives the roadmap timeline length
  const { data: sp } = await supabase
    .from('student_profiles')
    .select('target_enrollment_year')
    .eq('user_id', user.id)
    .maybeSingle()

  // Fetch active roadmap
  const { data: roadmap } = await supabase
    .from('roadmaps')
    .select('id')
    .eq('student_id', user.id)
    .eq('status', 'active')
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()

  // Fetch milestones for that roadmap
  const { data: dbMilestones } = roadmap
    ? await supabase
        .from('milestones')
        .select('*')
        .eq('roadmap_id', roadmap.id)
        .order('due_date', { ascending: true })
    : { data: [] }

  // Fetch achievements (for XP)
  const { data: dbAchievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('student_id', user.id)

  // Fetch documents (for XP)
  const { data: dbDocs } = await supabase
    .from('student_documents')
    .select('id, file_name, file_type, upload_date, storage_path')
    .eq('student_id', user.id)

  // Map DB rows → MockMilestone shape (keeps client JSX untouched)
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

  const achievements: MockAchievement[] = (dbAchievements ?? []).map(a => ({
    id:          a.id,
    category:    a.category as MockAchievement['category'],
    title:       a.title,
    date:        a.date,
    description: a.description ?? '',
    xp:          achievementXP(a.category as MockAchievement['category'], a.xp),
  }))

  const documents: MockDocument[] = (dbDocs ?? []).map(d => ({
    id:            d.id,
    file_name:     d.file_name,
    file_type:     d.file_type as MockDocument['file_type'],
    upload_date:   d.upload_date,
    size_kb:       0,
    parent_access: false,
  }))

  const currentYear = new Date().getFullYear()
  const enrollmentYear = sp?.target_enrollment_year ?? currentYear + 4

  return (
    <RoadmapClient
      initialMilestones={milestones}
      initialAchievements={achievements}
      documents={documents}
      roadmapId={roadmap?.id ?? null}
      userId={user.id}
      currentYear={currentYear}
      enrollmentYear={enrollmentYear}
    />
  )
}
