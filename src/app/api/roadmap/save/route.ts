// POST /api/roadmap/save
// Called when the user clicks "Adopt" after previewing an AI-generated roadmap.
// Archives any existing active roadmap, creates a new one, and bulk-inserts milestones.
// Calendar events are NOT created here — calendar is managed manually by the user.

import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { createClient } from '@supabase/supabase-js'
import type { GeneratedRoadmap } from '@/types/roadmap'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(req: NextRequest) {
  const supabase = createRouteClient()

  // ── Auth ──────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // ── Body ──────────────────────────────────────────────────────
  let roadmap: GeneratedRoadmap
  try {
    const body = await req.json() as { roadmap: GeneratedRoadmap }
    roadmap = body.roadmap
    if (!roadmap?.years?.length) throw new Error('empty')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // ── Archive any existing active roadmap ───────────────────────
  await supabaseAdmin
    .from('roadmaps')
    .update({ status: 'archived' })
    .eq('student_id', user.id)
    .eq('status', 'active')

  // ── Insert new roadmap ────────────────────────────────────────
  const { data: newRoadmap, error: roadmapErr } = await supabaseAdmin
    .from('roadmaps')
    .insert({
      student_id:   user.id,
      status:       'active',
      generated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (roadmapErr || !newRoadmap) {
    console.error('[roadmap/save] roadmap insert error', roadmapErr)
    return NextResponse.json({ error: 'Failed to save roadmap' }, { status: 500 })
  }

  // ── Bulk-insert milestones ────────────────────────────────────
  const milestoneRows = roadmap.years.flatMap(yr =>
    yr.milestones.map(ms => ({
      roadmap_id:  newRoadmap.id,
      year:        yr.year,
      month:       ms.month    ?? 1,
      type:        ms.type,
      title:       ms.title,
      description: ms.description,
      due_date:    ms.dueDate  ?? null,
      completed:   false,
    }))
  )

  if (milestoneRows.length > 0) {
    const { error: msErr } = await supabaseAdmin
      .from('milestones')
      .insert(milestoneRows)

    if (msErr) {
      console.error('[roadmap/save] milestones insert error', msErr)
      // roadmap row already created — return partial success so client can reload
      return NextResponse.json({ ok: true, roadmapId: newRoadmap.id, warning: 'Some milestones failed to save' })
    }
  }

  return NextResponse.json({ ok: true, roadmapId: newRoadmap.id })
}
