// Roadmap + milestone access. Hides the two-step "find the active roadmap, then
// load its milestones" dance and the row→view-model mapping behind one call.

import type { DB } from './client'
import type { MockMilestone } from '@/types/models'

export async function getActiveRoadmap(supabase: DB, userId: string) {
  const { data } = await supabase
    .from('roadmaps')
    .select('id')
    .eq('student_id', userId)
    .eq('status', 'active')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function getRoadmapMilestones(supabase: DB, roadmapId: string): Promise<MockMilestone[]> {
  const { data } = await supabase
    .from('milestones')
    .select('*')
    .eq('roadmap_id', roadmapId)
    .order('due_date', { ascending: true })

  return (data ?? []).map(m => ({
    id:          m.id,
    year:        m.year,
    month:       m.month ?? 1,
    type:        m.type,
    title:       m.title,
    description: m.description ?? '',
    due_date:    m.due_date ?? '',
    completed:   m.completed ?? false,
  }))
}

/** The common "give me this student's active plan" need, in one call. */
export async function getActiveRoadmapMilestones(
  supabase: DB,
  userId: string,
): Promise<{ roadmapId: string | null; milestones: MockMilestone[] }> {
  const roadmap = await getActiveRoadmap(supabase, userId)
  if (!roadmap) return { roadmapId: null, milestones: [] }
  return { roadmapId: roadmap.id, milestones: await getRoadmapMilestones(supabase, roadmap.id) }
}
