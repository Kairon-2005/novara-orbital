// POST /api/universities/plan  { targetId }
// Generates (or refreshes) the structured application plan for one target:
// application window, deadlines, document checklist, sources. KB-grounded
// for NUS/NTU; unverified + official URL otherwise. Persists to the target.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { fetchApplicationPlan } from '@/lib/ai'
import { runGuardedAi, quotaResponse } from '@/lib/ai-guard-server'

export async function POST(request: Request) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { targetId } = await request.json().catch(() => ({})) as { targetId?: string }
  if (!targetId) return NextResponse.json({ error: 'targetId is required' }, { status: 400 })

  const [{ data: target }, { data: profile }] = await Promise.all([
    supabase.from('university_targets').select('id, name, programme, application_plan').eq('id', targetId).maybeSingle(),
    supabase.from('student_profiles').select('target_enrollment_year').eq('user_id', user.id).maybeSingle(),
  ])
  if (!target) return NextResponse.json({ error: 'Target not found' }, { status: 404 })

  const enrollmentYear = profile?.target_enrollment_year ?? new Date().getFullYear() + 1

  try {
    const plan = await runGuardedAi(user.id, 'plan', () =>
      fetchApplicationPlan(target.name, target.programme ?? '', enrollmentYear))

    // Preserve the student's checked-off documents across refreshes (match by title).
    const previousDone = new Set(
      (target.application_plan?.documents ?? []).filter((d) => d.done).map((d) => d.title)
    )
    plan.documents = plan.documents.map((d) => previousDone.has(d.title) ? { ...d, done: true } : d)

    const planUpdatedAt = new Date().toISOString()
    await supabase
      .from('university_targets')
      .update({ application_plan: plan, plan_updated_at: planUpdatedAt })
      .eq('id', targetId)

    return NextResponse.json({ plan, planUpdatedAt })
  } catch (err) {
    const quota = quotaResponse(err)
    if (quota) return quota
    console.error('[universities/plan]', err)
    return NextResponse.json({ error: 'Plan generation failed. Please try again.' }, { status: 500 })
  }
}
