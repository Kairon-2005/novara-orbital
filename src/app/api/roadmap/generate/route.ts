// POST /api/roadmap/generate
// Streams a personalised roadmap preview from Qwen as Server-Sent Events.
// Does NOT write to the database — the client shows the result and the user
// must explicitly click "Adopt" before anything is saved.
//
// Events: `year` (one completed year, repeated), `done` (the full roadmap),
// `error` (generation failed). Failures BEFORE the stream opens are plain JSON
// with a real status code, so the client must branch on content-type.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { getRoadmapQuota, consumeRoadmapQuota, FREE_GENERATIONS_PER_YEAR } from '@/lib/roadmap-quota'
import { getLatestAssessment } from '@/lib/data'
import { generateRoadmapStream } from '@/lib/ai'
import type { ExistingMilestone, RoadmapAssessmentContext } from '@/lib/ai'
import type { StudentProfile } from '@/types/roadmap'
import { ADMISSION_DIMENSIONS } from '@/types/assessment'

const DIM_NAME: Record<string, string> = Object.fromEntries(ADMISSION_DIMENSIONS.map(d => [d.id, d.name]))

// Roadmap generation is the slowest request in the app. Declared here as well as
// in vercel.json because route segment config is what Next.js actually applies —
// and because the internal budget has to be read against it. Overrun is not a
// slow response, it is the platform killing the function mid-flight.
// Budget: KB_TIMEOUT_MS (6s) + AI_STREAM_BUDGET_MS (50s) = 56s, inside this cap.
// Raising this requires a Vercel plan that allows it; raise AI_STREAM_BUDGET_MS
// in src/lib/ai.ts to match, keeping ~10s of headroom for retrieval + overhead.
export const maxDuration = 60

export async function POST() {
  const supabase = createRouteClient()

  // ── Auth ──────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // ── Quota check (read-only — credit is consumed AFTER success) ─
  // Consuming up-front meant any transient AI failure (timeout, bad JSON,
  // missing key) still burned a free credit, so repeated failures silently
  // exhausted the allowance. We now charge only once generation succeeds.
  const quota = await getRoadmapQuota(supabase, user.id)
  if (!quota.allowed) {
    return NextResponse.json(
      { error: 'quota_exceeded', message: `You have used all ${FREE_GENERATIONS_PER_YEAR} free AI generations for this year. Upgrade to generate again.` },
      { status: 402 }
    )
  }

  // ── Fetch student profile ─────────────────────────────────────
  const { data: sp, error: spErr } = await supabase
    .from('student_profiles')
    .select('current_year, current_school, current_curriculum, target_university, target_programme, interests, budget_range, english_level, target_enrollment_year')
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

  // ── Latest assessment → roadmap should target the weak dimensions ─
  const latest = await getLatestAssessment(supabase, user.id)
  let assessment: RoadmapAssessmentContext | undefined
  if (latest) {
    assessment = {
      overallLevel: latest.overallLevel,
      topGaps: latest.topGaps,
      // Only feed the dimensions worth working on, so the AI spends milestones on gaps.
      dimensions: latest.dimensionScores
        .filter(d => d.level === 'missing' || d.level === 'weak' || d.level === 'developing')
        .map(d => ({ name: DIM_NAME[d.dimensionId] ?? d.dimensionId, level: d.level, gaps: d.gaps })),
    }
  }

  // ── Stream from Qwen AI ───────────────────────────────────────
  const currentYear = new Date().getFullYear()
  const enrollmentYear = sp.target_enrollment_year ?? currentYear + 4

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))

      try {
        // Sent first so the client can render streamed years as a real
        // GeneratedRoadmap rather than inventing a placeholder profile.
        send('start', { generatedFor: profile })

        const roadmap = await generateRoadmapStream(
          profile,
          existingMilestones,
          { currentYear, enrollmentYear },
          assessment,
          year => send('year', year),
        )
        // Only now that we have a usable roadmap do we charge the credit.
        await consumeRoadmapQuota(supabase, user.id)
        send('done', { roadmap })
      } catch (err) {
        // The response is already 200 by the time we get here, so the failure
        // has to travel as an event — the client treats it the same as a
        // non-OK response.
        console.error('[roadmap/generate]', err)
        send('error', { error: 'AI generation failed. Please try again.' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Tells Vercel/nginx not to buffer the response — without it the whole
      // point of streaming is lost to an intermediary holding the bytes.
      'X-Accel-Buffering': 'no',
    },
  })
}
