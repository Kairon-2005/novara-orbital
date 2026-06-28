// Portfolio assessment access. Returns the most recent assessment's structured
// result, or null if the student has never run one.

import type { DB } from './client'
import type { PortfolioAssessment, ReadinessLevel, Confidence } from '@/types/assessment'
import type { AssessmentRubric } from '@/types/rubric'

// View models for the history list + report-detail page. The detail report
// carries the rubric it was scored against (null for pre-split reports).
export type AssessmentReportSummary = {
  id: string
  overallLevel: ReadinessLevel
  confidence: Confidence
  overallSummary: string
  createdAt: string
}

export type AssessmentReport = {
  id: string
  assessment: PortfolioAssessment
  rubric: AssessmentRubric | null
  createdAt: string
}

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

// Latest assessment plus when it was produced — used to detect evidence added since.
export async function getLatestAssessmentInfo(
  supabase: DB,
  userId: string,
): Promise<{ assessment: PortfolioAssessment; createdAt: string } | null> {
  const { data } = await supabase
    .from('portfolio_assessments')
    .select('result, created_at')
    .eq('student_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.result ? { assessment: data.result, createdAt: data.created_at } : null
}

// Every past report, newest first — the history list. Summaries are derived from
// the stored result so the list can never drift from the report it links to.
export async function getAssessmentHistory(supabase: DB, userId: string): Promise<AssessmentReportSummary[]> {
  const { data } = await supabase
    .from('portfolio_assessments')
    .select('id, result, created_at')
    .eq('student_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []).map(row => ({
    id: row.id,
    overallLevel: row.result.overallLevel,
    confidence: row.result.confidence,
    overallSummary: row.result.overallSummary,
    createdAt: row.created_at,
  }))
}

// One full report plus the rubric it was scored against. Scoped to the owner —
// defence in depth alongside RLS.
export async function getAssessmentById(supabase: DB, userId: string, id: string): Promise<AssessmentReport | null> {
  const { data } = await supabase
    .from('portfolio_assessments')
    .select('id, result, rubric, created_at')
    .eq('student_id', userId)
    .eq('id', id)
    .maybeSingle()
  return data?.result
    ? { id: data.id, assessment: data.result, rubric: data.rubric, createdAt: data.created_at }
    : null
}
