// POST /api/roadmap/generate
// Calls Qwen AI to generate a personalised roadmap preview.
// Does NOT write to the database — the client shows the result and the user
// must explicitly click "Adopt" before anything is saved.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { checkAndConsumeQuota } from '@/lib/roadmap-quota'
import { generateRoadmap } from '@/lib/ai'
import type { StudentProfile } from '@/types/roadmap'

export async function POST() {
  const supabase = createRouteClient()

  // ── Auth ──────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // ── Quota check (consumed only once per generate) ─────────────
  const quota = await checkAndConsumeQuota(supabase, user.id)
  if (quota === 'blocked') {
    return NextResponse.json(
      { error: 'quota_exceeded', message: 'You have used your free AI generation for this year. Upgrade to generate again.' },
      { status: 402 }
    )
  }

  // ── Fetch student profile ─────────────────────────────────────
  const { data: sp, error: spErr } = await supabase
    .from('student_profiles')
    .select('current_year, current_school, current_curriculum, target_university, target_programme, interests, budget_range, english_level')
    .eq('id', user.id)
    .single()

  if (spErr || !sp) {
    return NextResponse.json({ error: 'Profile not found. Complete onboarding first.' }, { status: 400 })
  }

  const profile: StudentProfile = {
    currentYear:       sp.current_year        ?? '',
    currentSchool:     sp.current_school       ?? '',
    currentCurriculum: sp.current_curriculum   ?? '',
    targetUniversity:  sp.target_university    ?? '',
    targetProgramme:   sp.target_programme     ?? '',
    interests:         sp.interests            ?? '',
    budgetRange:       sp.budget_range         ?? '',
    englishLevel:      sp.english_level        ?? '',
  }

  // ── Call Qwen AI ──────────────────────────────────────────────
  try {
    const roadmap = await generateRoadmap(profile)
    return NextResponse.json({ roadmap })
  } catch (err) {
    console.error('[roadmap/generate]', err)
    return NextResponse.json({ error: 'AI generation failed. Please try again.' }, { status: 500 })
  }
}
