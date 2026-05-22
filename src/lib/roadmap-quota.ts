import { SupabaseClient } from '@supabase/supabase-js'

type QuotaResult = 'allowed' | 'blocked'

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
  const lastFreeYear = data?.last_free_generation_at
    ? new Date(data.last_free_generation_at).getFullYear()
    : null

  const isFreeOnboarding = !data || !data.first_generation_used
  const isFreeAnnual = data?.first_generation_used && lastFreeYear !== currentYear

  if (!isFreeOnboarding && !isFreeAnnual) return 'blocked'

  // Consume quota
  await supabase.from('roadmap_generation_quota').upsert({
    user_id: userId,
    first_generation_used: true,
    last_free_generation_at: isFreeAnnual
      ? new Date().toISOString().slice(0, 10)
      : (data?.last_free_generation_at ?? new Date().toISOString().slice(0, 10)),
    total_generations: (data?.total_generations ?? 0) + 1,
  })

  return 'allowed'
}
