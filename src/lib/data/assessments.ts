// Portfolio assessment access. Returns the most recent assessment's structured
// result, or null if the student has never run one.

import type { DB } from './client'
import type { PortfolioAssessment } from '@/types/assessment'

export async function getLatestAssessment(supabase: DB, userId: string): Promise<PortfolioAssessment | null> {
  const { data } = await supabase
    .from('portfolio_assessments')
    .select('result')
    .eq('student_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.result ?? null
}
