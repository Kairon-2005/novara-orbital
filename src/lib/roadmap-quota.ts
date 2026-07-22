import { SupabaseClient } from '@supabase/supabase-js'

// Free AI roadmap generations allowed per calendar year.
// Change this number to adjust the allowance (e.g. 1 -> 10).
export const FREE_GENERATIONS_PER_YEAR = 10

type QuotaRow = {
  last_free_generation_at: string | null
  free_used_this_year: number | null
  total_generations: number | null
}

// How many free generations the user has used in the current calendar year.
// The yearly counter resets whenever the calendar year rolls over.
function usedThisYear(row: QuotaRow | null): number {
  const lastYear = row?.last_free_generation_at
    ? new Date(row.last_free_generation_at).getFullYear()
    : null
  return lastYear === new Date().getFullYear() ? (row?.free_used_this_year ?? 0) : 0
}

/**
 * Read-only quota check. Does NOT consume a credit — call this BEFORE the
 * (expensive, fallible) AI generation so a failed generation never costs the
 * user a credit. Consume only once generation has succeeded.
 */
export async function getRoadmapQuota(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; usedThisYear: number }> {
  const { data } = await supabase
    .from('roadmap_generation_quota')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  const used = usedThisYear(data)
  return { allowed: used < FREE_GENERATIONS_PER_YEAR, usedThisYear: used }
}

/**
 * Consume one credit. Call this only AFTER a generation has succeeded.
 * Re-reads the row so a year rollover between check and consume is handled.
 */
export async function consumeRoadmapQuota(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data } = await supabase
    .from('roadmap_generation_quota')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  const used = usedThisYear(data)

  await supabase.from('roadmap_generation_quota').upsert({
    user_id: userId,
    first_generation_used: true,
    last_free_generation_at: new Date().toISOString().slice(0, 10),
    free_used_this_year: used + 1,
    total_generations: (data?.total_generations ?? 0) + 1,
  })
}
