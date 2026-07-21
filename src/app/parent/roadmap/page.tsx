// Server Component — fetches child's milestones via parent_links.
import { createServerClient } from '@/db/server'
import RoadmapParentClient from './RoadmapParentClient'
import type { MockMilestone, MockAchievement, MockDocument } from '@/types/models'

export default async function ParentRoadmapPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">Not authenticated.</p>

  // Get linked child
  const { data: link } = await supabase
    .from('parent_links')
    .select('student_id')
    .eq('parent_id', user.id)
    .single()

  if (!link) {
    return (
      <div className="p-10 text-center text-[var(--t500)]">
        No linked student. Share your child&apos;s invite code to connect.
      </div>
    )
  }

  const childId = link.student_id

  // Child profile for display — real school/curriculum, not placeholders
  const [{ data: childProfile }, { data: childSp }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', childId).single(),
    supabase.from('student_profiles').select('current_school, current_curriculum').eq('user_id', childId).maybeSingle(),
  ])

  // Active roadmap + milestones
  const { data: roadmap } = await supabase
    .from('roadmaps')
    .select('id')
    .eq('student_id', childId)
    .eq('status', 'active')
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()

  const { data: dbMilestones } = roadmap
    ? await supabase
        .from('milestones')
        .select('*')
        .eq('roadmap_id', roadmap.id)
        .order('due_date', { ascending: true })
    : { data: [] }

  const { data: dbAchievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('student_id', childId)

  const milestones: MockMilestone[] = (dbMilestones ?? []).map(m => ({
    id: m.id, year: m.year, month: m.month ?? 1,
    type: m.type as MockMilestone['type'], title: m.title,
    description: m.description ?? '', due_date: m.due_date ?? '',
    completed: m.completed ?? false,
  }))

  const achievements: MockAchievement[] = (dbAchievements ?? []).map(a => ({
    id: a.id, category: a.category as MockAchievement['category'],
    title: a.title, date: a.date, description: a.description ?? '', xp: 50,
  }))

  return (
    <RoadmapParentClient
      milestones={milestones}
      achievements={achievements}
      documents={[]}
      child={{
        displayName: childProfile?.display_name ?? '学生',
        school: childSp?.current_school ?? null,
        curriculum: childSp?.current_curriculum ?? null,
      }}
    />
  )
}
