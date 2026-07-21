import { NextResponse } from 'next/server'
import { createRouteClient, createAdminClient } from '@/db/server'
import { chatJson } from '@/lib/ai'
import { critiqueEssay } from '@/lib/essay-critique'
import { runGuardedAi, quotaResponse } from '@/lib/ai-guard-server'
import { getLatestAssessment } from '@/lib/data'

// POST /api/essays/[id]/feedback — agent-grade critique of the student's OWN
// draft, grounded in their real records. Feedback only, never rewritten prose
// (enforced in lib/essay-critique). Daily-capped via ai-guard.

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // RLS scopes this read to the owner — a foreign id just comes back empty.
  const { data: essay } = await supabase
    .from('essays')
    .select('id, title, prompt, content, target_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!essay) return NextResponse.json({ error: 'Essay not found' }, { status: 404 })
  if (!essay.content.trim() || essay.content.trim().length < 80) {
    return NextResponse.json({ error: 'Write at least a rough draft first (80+ characters).' }, { status: 400 })
  }

  const [{ data: achievements }, { data: target }, assessment] = await Promise.all([
    supabase.from('achievements').select('title, category').eq('student_id', user.id).limit(30),
    essay.target_id
      ? supabase.from('university_targets').select('name, programme').eq('id', essay.target_id).maybeSingle()
      : Promise.resolve({ data: null }),
    getLatestAssessment(supabase, user.id),
  ])

  const assessmentSummary = assessment
    ? `${assessment.overallLevel}; weakest: ${
        [...assessment.dimensionScores].sort((a, b) => a.score - b.score)[0]?.dimensionId ?? 'n/a'
      }`
    : null

  try {
    const feedback = await runGuardedAi(user.id, 'essay_feedback', () =>
      critiqueEssay(chatJson, {
        essay: { title: essay.title, prompt: essay.prompt, content: essay.content },
        target: target ? { university: target.name, programme: target.programme ?? '' } : null,
        achievements: achievements ?? [],
        assessmentSummary,
      }))

    // Server-side insert (no user INSERT policy on essay_feedback by design).
    const admin = createAdminClient()
    const { data: saved, error } = await admin
      .from('essay_feedback')
      .insert({ essay_id: essay.id, content_snapshot: essay.content, feedback })
      .select('id, created_at')
      .single()
    if (error) throw error

    return NextResponse.json({ feedback, id: saved.id, createdAt: saved.created_at })
  } catch (err) {
    const quota = quotaResponse(err)
    if (quota) return quota
    console.error('[essays/feedback]', err)
    return NextResponse.json({ error: 'Critique failed. Please try again.' }, { status: 500 })
  }
}
