// POST /api/roadmap/generate
// Calls Qwen AI to generate a personalised roadmap preview.
// Does NOT write to the database — the client shows the result and the user
// must explicitly click "Adopt" before anything is saved.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { checkAndConsumeQuota } from '@/lib/roadmap-quota'
import { generateRoadmap } from '@/lib/ai'
import type { ExistingMilestone } from '@/lib/ai'
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
    .eq('user_id', user.id)
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

  // ── Fetch existing milestones (for context-aware generation) ─
  const { data: activeRoadmap } = await supabase
    .from('roadmaps')
    .select('id')
    .eq('student_id', user.id)
    .eq('status', 'active')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let existingMilestones: ExistingMilestone[] = []
  if (activeRoadmap?.id) {
    const { data: dbMilestones } = await supabase
      .from('milestones')
      .select('type, title, due_date, completed')
      .eq('roadmap_id', activeRoadmap.id)
      .order('due_date', { ascending: true })
    existingMilestones = (dbMilestones ?? []).map(m => ({
      type:      m.type,
      title:     m.title,
      due_date:  m.due_date ?? undefined,
      completed: m.completed ?? false,
    }))
  }

  // ── Call Qwen AI ──────────────────────────────────────────────
  try {
    const roadmap = await generateRoadmap(profile, existingMilestones)
    return NextResponse.json({ roadmap })
  } catch (err) {
    console.error('[roadmap/generate]', err)
    return NextResponse.json({ error: 'AI generation failed. Please try again.' }, { status: 500 })
  }
}
