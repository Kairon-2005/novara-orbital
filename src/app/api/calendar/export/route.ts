// GET /api/calendar/export
// Streams the authenticated student's calendar_events as an RFC 5545
// iCalendar (.ics) file for import into Google Calendar / Apple Calendar.

import { createRouteClient } from '@/db/server'

export const dynamic = 'force-dynamic'

// Escape per RFC 5545 §3.3.11 (TEXT): backslash, semicolon, comma, newline.
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// 'YYYY-MM-DD' → 'YYYYMMDD'
function toICSDate(date: string): string {
  return date.replace(/-/g, '')
}

// DTEND for an all-day VEVENT is exclusive, so it must be the day after.
function nextDayICS(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

export async function GET() {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: events } = await supabase
    .from('calendar_events')
    .select('id, title, event_date, type, notes')
    .eq('student_id', user.id)
    .order('event_date', { ascending: true })

  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Novara//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Novara Deadlines',
  ]

  for (const e of events ?? []) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@novara.app`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${toICSDate(e.event_date)}`,
      `DTEND;VALUE=DATE:${nextDayICS(e.event_date)}`,
      `SUMMARY:${escapeText(e.title)}`,
    )
    if (e.notes) lines.push(`DESCRIPTION:${escapeText(e.notes)}`)
    if (e.type) lines.push(`CATEGORIES:${escapeText(String(e.type).toUpperCase())}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  // RFC 5545 mandates CRLF line endings.
  const body = lines.join('\r\n') + '\r\n'

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="novara-calendar.ics"',
      'Cache-Control': 'no-store',
    },
  })
}
