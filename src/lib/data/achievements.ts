// Achievement access. Returns ready-to-render view models with XP already
// resolved (stored value, or derived from the category), so callers never deal
// with the stored-vs-derived XP rule.

import type { DB } from './client'
import { achievementXP } from '@/lib/gamification'
import type { MockAchievement } from '@/types/models'

export async function getAchievements(supabase: DB, userId: string): Promise<MockAchievement[]> {
  const { data } = await supabase
    .from('achievements')
    .select('*')
    .eq('student_id', userId)

  return (data ?? []).map(a => ({
    id:          a.id,
    category:    a.category,
    title:       a.title,
    date:        a.date,
    description: a.description ?? '',
    xp:          achievementXP(a.category, a.xp),
  }))
}

export async function countAchievements(supabase: DB, userId: string): Promise<number> {
  const { count } = await supabase
    .from('achievements')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', userId)
  return count ?? 0
}
