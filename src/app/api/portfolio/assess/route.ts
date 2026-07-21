// POST /api/portfolio/assess
// Runs a fresh dimension-based readiness assessment from the student's onboarding
// profile + achievements + evidence, persists it, and returns the result.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { getStudentProfile, getAchievements, getEvidenceForAssessment } from '@/lib/data'
import { assessPortfolio } from '@/lib/assessor'
import { runGuardedAi, quotaResponse } from '@/lib/ai-guard-server'

export async function POST() {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const [profile, achievements, evidence] = await Promise.all([
    getStudentProfile(supabase, user.id),
    getAchievements(supabase, user.id),
    getEvidenceForAssessment(supabase, user.id),
  ])

  if (!profile) {
    return NextResponse.json({ error: 'Complete onboarding first.' }, { status: 400 })
  }

  try {
    const assessment = await runGuardedAi(user.id, 'assess', () => assessPortfolio({
      target: {
        university: profile.target_school ?? profile.target_university ?? '',
        programme:  profile.programme_category ?? profile.target_programme ?? '',
        route:      profile.application_route ?? profile.current_curriculum ?? undefined,
      },
      profile: {
        currentYear:   profile.current_year      ?? '',
        currentSchool: profile.current_school     ?? '',
        curriculum:    profile.current_curriculum ?? '',
        englishLevel:  profile.english_level      ?? '',
        interests:     profile.interests          ?? '',
      },
      achievements: achievements.map(a => ({ category: a.category, title: a.title, description: a.description })),
      evidence,
    }))

    await supabase.from('portfolio_assessments').insert({
      student_id:      user.id,
      overall_level:   assessment.overallLevel,
      overall_summary: assessment.overallSummary,
      confidence:      assessment.confidence,
      result:          assessment,
    })

    return NextResponse.json({ assessment })
  } catch (err) {
    const quota = quotaResponse(err)
    if (quota) return quota
    console.error('[portfolio/assess]', err)
    return NextResponse.json({ error: 'Assessment failed. Please try again.' }, { status: 500 })
  }
}
