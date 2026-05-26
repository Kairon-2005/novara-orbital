// Server Component — fetches calendar_events and passes to interactive client.
import { createServerClient } from '@/db/server'
import CalendarClient from './CalendarClient'

export type CalEvent = {
  id: string
  title: string
  date: string
  type: 'exam' | 'deadline' | 'cca' | 'finance' | 'personal'
  notes?: string
}

export default async function CalendarPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">Not authenticated.</p>

  const { data: dbEvents } = await supabase
    .from('calendar_events')
    .select('id, title, event_date, type, notes')
    .eq('student_id', user.id)
    .order('event_date', { ascending: true })

  // Map DB type enum → CalEvent type
  const TYPE_MAP: Record<string, CalEvent['type']> = {
    exam: 'exam', application: 'deadline', cca: 'cca',
    finance: 'finance', health: 'personal', personal: 'personal', system: 'deadline',
  }

  const events: CalEvent[] = (dbEvents ?? []).map(e => ({
    id:    e.id,
    title: e.title,
    date:  e.event_date,
    type:  TYPE_MAP[e.type] ?? 'personal',
    notes: e.notes ?? undefined,
  }))

  return <CalendarClient initialEvents={events} userId={user.id} />
}
