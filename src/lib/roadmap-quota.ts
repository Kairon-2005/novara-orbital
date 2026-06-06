import { SupabaseClient } from '@supabase/supabase-js'

type QuotaResult = 'allowed' | 'blocked'

// Free AI roadmap generations allowed per calendar year.
// Change this number to adjust the allowance (e.g. 1 -> 10).
export const FREE_GENERATIONS_PER_YEAR = 10

export async function checkAndConsumeQuota(
  supabase: SupabaseClient,
  userId: string
): Promise<QuotaResult> {
  const { data } = await supabase
    .from('roadmap_generation_quota')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  const currentYear = new Date().getFullYear()
  const lastYear = data?.last_free_generation_at
    ? new Date(data.last_free_generation_at).getFullYear()
    : null

  // The yearly counter resets whenever the calendar year rolls over.
  const usedThisYear = lastYear === currentYear ? (data?.free_used_this_year ?? 0) : 0

  if (usedThisYear >= FREE_GENERATIONS_PER_YEAR) return 'blocked'

  // Consume one credit
  await supabase.from('roadmap_generation_quota').upsert({
    user_id: userId,
    first_generation_used: true,
    last_free_generation_at: new Date().toISOString().slice(0, 10),
    free_used_this_year: usedThisYear + 1,
    total_generations: (data?.total_generations ?? 0) + 1,
  })

  return 'allowed'
}
