// Student profile access.
// Hides the one non-obvious fact about this table: `student_profiles` is keyed
// by `user_id` (its `id` is a separate surrogate key), so every read must filter
// on `user_id`. Centralising it here means no call site can get that wrong again.

import type { DB } from './client'

export async function getStudentProfile(supabase: DB, userId: string) {
  const { data } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}
