// POST /api/calendar/events  { events: ProposedEvent[] }
// Adopt AI-proposed application events into the student's calendar, idempotently
// (skips any that already exist). See docs/PRD-app-assistant-calendar.md §7.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { dedupeAgainstExisting, type ProposedEvent } from '@/lib/application-events'

const isIsoDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

export async function POST(request: Request) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { events } = await request.json().catch(() => ({})) as { events?: ProposedEvent[] }
  const clean = (Array.isArray(events) ? events : []).filter(
    (e) => e && typeof e.title === 'string' && e.title.trim() && isIsoDate(e.date),
  )
  if (clean.length === 0) return NextResponse.json({ added: 0, skipped: 0 })

  const { data: existing } = await supabase
    .from('calendar_events')
    .select('event_date, title')
    .eq('student_id', user.id)
  const toAdd = dedupeAgainstExisting(
    clean,
    (existing ?? []).map((e) => ({ date: e.event_date, title: e.title })),
  )
  if (toAdd.length === 0) return NextResponse.json({ added: 0, skipped: clean.length })

  const rows = toAdd.map((e) => ({
    student_id: user.id,
    title: e.title,
    event_date: e.date,
    type: 'application' as const,
    source: 'ai' as const,
    notes: e.sourceUrl
      ? `Source: ${e.sourceUrl}${e.notes ? ` · ${e.notes}` : ''}`
      : (e.notes ?? null),
  }))
  const { error } = await supabase.from('calendar_events').insert(rows)
  if (error) return NextResponse.json({ error: 'Failed to add events' }, { status: 500 })

  return NextResponse.json({ added: toAdd.length, skipped: clean.length - toAdd.length })
}
