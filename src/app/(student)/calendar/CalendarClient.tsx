'use client'

import { useState, useMemo } from 'react'
import { createBrowserClient } from '@/db/client'
import { EditEventModal } from './EditEventModal'

// ── Types ─────────────────────────────────────────────────────────────────────

type EventType = 'exam' | 'deadline' | 'cca' | 'finance' | 'personal'

type CalEvent = {
  id: string
  title: string
  date: string   // YYYY-MM-DD
  type: EventType
  notes?: string
}

// ── Mock events (used as fallback / removed when DB is live) ────────────────

// ── Event styling ─────────────────────────────────────────────────────────────

const EVENT_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  exam:     { bg: '#FDF2F2', color: '#E02424', dot: '#E02424' },
  deadline: { bg: '#FFFBEB', color: '#B45309', dot: '#F59E0B' },
  cca:      { bg: '#F3FAF7', color: '#057A55', dot: '#057A55' },
  finance:  { bg: '#EBF5FF', color: '#1A56DB', dot: '#1A56DB' },
  personal: { bg: '#F5F3FF', color: '#7C3AED', dot: '#7C3AED' },
}

const EVENT_LABEL: Record<string, string> = {
  exam: 'Exam', deadline: 'Deadline', cca: 'CCA', finance: 'Finance', personal: 'Personal',
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// ── Calendar math helpers ─────────────────────────────────────────────────────

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }

// 0 = Monday … 6 = Sunday (ISO week)
function firstDayISO(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7 }

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function todayStr() {
  const t = new Date()
  return ymd(t.getFullYear(), t.getMonth(), t.getDate())
}

function daysUntil(dateStr: string, today: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - new Date(today).getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `In ${diff}d`
}

// ── Add Event Modal ───────────────────────────────────────────────────────────

function AddEventModal({ onAdd, onClose }: { onAdd: (e: CalEvent) => void | Promise<void>; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [date,  setDate]  = useState(todayStr())
  const [type,  setType]  = useState<EventType>('personal')
  const [notes, setNotes] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return
    onAdd({ id: `ev-${Date.now()}`, title: title.trim(), date, type, notes: notes.trim() || undefined })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="bg-white rounded-[12px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-[420px] border border-[var(--border)]">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <span className="font-display font-bold text-[15px] text-[var(--t900)]">Add Event</span>
          <button onClick={onClose} className="text-[var(--t400)] hover:text-[var(--t900)] text-[20px] leading-none">×</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="e.g. IB Mock Exam — Chemistry"
              className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] text-[var(--t900)] focus:outline-none focus:border-[var(--blue)] placeholder:text-[var(--t300)]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] text-[var(--t900)] focus:outline-none focus:border-[var(--blue)]" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">Type</label>
              <select value={type} onChange={e => setType(e.target.value as EventType)}
                className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] text-[var(--t900)] focus:outline-none focus:border-[var(--blue)] bg-white cursor-pointer">
                {Object.entries(EVENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Optional details…"
              className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] text-[var(--t900)] focus:outline-none focus:border-[var(--blue)] resize-none placeholder:text-[var(--t300)]" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-[8px] text-[13px] font-semibold text-[var(--t700)] border border-[var(--border)] bg-white hover:bg-[var(--bg)]">
              Cancel
            </button>
            <button type="submit"
              className="px-4 py-2 rounded-[8px] text-[13px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)]">
              Add Event
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Reminder Banner ───────────────────────────────────────────────────────────

function ReminderBanner({ reminders, onDismiss }: {
  reminders: { event: CalEvent; daysLeft: number }[]
  onDismiss: (id: string) => void
}) {
  if (reminders.length === 0) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-9 py-3 space-y-1">
      {reminders.map(({ event, daysLeft }) => (
        <div key={event.id} className="flex items-center justify-between">
          <span className="text-[13px] text-amber-800 font-medium">
            ⚠️ <span className="font-bold">{event.title}</span> is {daysLeft === 0 ? 'today!' : daysLeft === 1 ? 'tomorrow!' : `in ${daysLeft} days!`}
          </span>
          <button
            onClick={() => onDismiss(event.id)}
            className="text-amber-500 hover:text-amber-800 text-[18px] leading-none ml-4">
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface CalendarClientProps {
  initialEvents: CalEvent[]
  userId: string
}

export default function CalendarClient({ initialEvents, userId }: CalendarClientProps) {
  const supabase = createBrowserClient()
  const now = new Date()
  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [events, setEvents]       = useState<CalEvent[]>(initialEvents)
  const [showModal, setShowModal] = useState(false)
  const [filterType, setFilter]   = useState('All')
  const [calView, setCalView] = useState<'month' | 'week' | 'day'>('month')
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const today = todayStr()

  const reminders = useMemo(() => {
    return events
      .filter(ev => {
        if (dismissedIds.has(ev.id)) return false
        const diff = Math.ceil((new Date(ev.date).getTime() - new Date(today).getTime()) / 86_400_000)
        return diff >= 0 && diff <= 30
      })
      .map(ev => {
        const diff = Math.ceil((new Date(ev.date).getTime() - new Date(today).getTime()) / 86_400_000)
        return { event: ev, daysLeft: diff }
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
  }, [events, today, dismissedIds])

  // Mark reminders as sent in DB
  useMemo(() => {
    reminders.forEach(({ event, daysLeft }) => {
      const updates: Record<string, boolean> = {}
      if (daysLeft <= 30) updates.reminder_sent_30d = true
      if (daysLeft <= 7)  updates.reminder_sent_7d  = true
      if (daysLeft <= 3)  updates.reminder_sent_3d  = true
      if (daysLeft <= 1)  updates.reminder_sent_1d  = true

      if (Object.keys(updates).length > 0) {
        supabase
          .from('calendar_events')
          .update(updates)
          .eq('id', event.id)
          .then()
      }
    })
  }, [reminders])

  // Build 42-cell calendar grid
  const cells = useMemo(() => {
    const first   = firstDayISO(viewYear, viewMonth)
    const total   = daysInMonth(viewYear, viewMonth)
    const prevTot = daysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1)
    const result: { dateStr: string; day: number; current: boolean }[] = []

    for (let i = first - 1; i >= 0; i--) {
      const pm = viewMonth === 0 ? 11 : viewMonth - 1
      const py = viewMonth === 0 ? viewYear - 1 : viewYear
      result.push({ dateStr: ymd(py, pm, prevTot - i), day: prevTot - i, current: false })
    }
    for (let d = 1; d <= total; d++) {
      result.push({ dateStr: ymd(viewYear, viewMonth, d), day: d, current: true })
    }
    const nm = viewMonth === 11 ? 0 : viewMonth + 1
    const ny = viewMonth === 11 ? viewYear + 1 : viewYear
    let nd = 1
    while (result.length < 42) result.push({ dateStr: ymd(ny, nm, nd++), day: nd - 1, current: false })
    return result
  }, [viewYear, viewMonth])

  const weekDays = useMemo(() => {
  const date = new Date(selectedDate)
  const day = (date.getDay() + 6) % 7 // Monday = 0
  const monday = new Date(date)
  monday.setDate(date.getDate() - day)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return ymd(d.getFullYear(), d.getMonth(), d.getDate())
  })
}, [selectedDate])

const dayHours = useMemo(() =>
  Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
[])

  const byDate = useMemo(() => {
    const m: Record<string, CalEvent[]> = {}
    events.forEach(ev => { (m[ev.date] ??= []).push(ev) })
    return m
  }, [events])

  const upcoming = useMemo(() => {
    const limit = new Date(today)
    limit.setDate(limit.getDate() + 60)
    return events
      .filter(ev => {
        const d = new Date(ev.date)
        return d >= new Date(today) && d <= limit && (filterType === 'All' || ev.type === filterType)
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [events, today, filterType])

  function navigate(dir: -1 | 1) {
    setViewMonth(m => {
      const nm = m + dir
      if (nm < 0)  { setViewYear(y => y - 1); return 11 }
      if (nm > 11) { setViewYear(y => y + 1); return 0  }
      return nm
    })
  }

  const monthCount = events.filter(ev => {
    const [y, m] = ev.date.split('-').map(Number)
    return y === viewYear && m === viewMonth + 1
  }).length

  return (
    <div className="flex flex-col min-h-screen">

      {/* Topbar */}
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-40">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">Calendar</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">{MONTHS[viewMonth]} {viewYear} · {monthCount} event{monthCount !== 1 ? 's' : ''} this month</div>
        </div>
        <div className="flex items-center border border-[var(--border)] rounded-[8px] overflow-hidden">
          {(['month', 'week', 'day'] as const).map(v => (
            <button key={v} onClick={() => setCalView(v)}
              className={`px-3 py-1.5 text-[12px] font-semibold capitalize transition ${
                calView === v
                  ? 'bg-[var(--blue)] text-white'
                  : 'bg-white text-[var(--t700)] hover:bg-[var(--bg)]'
              }`}>
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/calendar/export" download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold border-[1.5px] border-[var(--border)] text-[var(--t700)] bg-white hover:bg-[var(--bg)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export .ics
          </a>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)]">
            + Add Event
          </button>
        </div>
      </div>

      <ReminderBanner
        reminders={reminders}
        onDismiss={id => setDismissedIds(prev => new Set(prev).add(id))}
      />

      <div className="p-[28px_36px] flex-1">
        <div className="grid gap-6 grid-cols-1 items-start lg:grid-cols-[1fr_300px]">

          {/* ── Calendar grid ───────────────────────────────────────────────── */}
          <div>
            {/* Nav bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button onClick={() => navigate(-1)} className="px-2.5 py-1 rounded-[7px] border border-[var(--border)] bg-white text-[var(--t700)] text-[13px] font-semibold hover:bg-[var(--bg)]">‹</button>
                <span className="font-display font-bold text-[18px] text-[var(--t900)] min-w-[160px] text-center">{MONTHS[viewMonth]} {viewYear}</span>
                <button onClick={() => navigate(1)} className="px-2.5 py-1 rounded-[7px] border border-[var(--border)] bg-white text-[var(--t700)] text-[13px] font-semibold hover:bg-[var(--bg)]">›</button>
                <button onClick={() => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()) }}
                  className="ml-1 px-3 py-1 rounded-[7px] border border-[var(--border)] bg-white text-[var(--t700)] text-[12px] font-semibold hover:bg-[var(--bg)]">
                  Today
                </button>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-medium text-[var(--t500)]">
                {[['#E02424','Exam'],['#F59E0B','Deadline'],['#057A55','CCA'],['#1A56DB','Finance']].map(([c, l]) => (
                  <span key={l} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}
                  </span>
                ))}
              </div>
            </div>

            {calView !== 'month' && (
              <div className="border border-[var(--border)] rounded-[10px] overflow-hidden">
                <div className="grid border-b border-[var(--border)]"
                  style={{ gridTemplateColumns: calView === 'week' ? '60px repeat(7, 1fr)' : '60px 1fr' }}>
                  <div className="border-r border-[var(--border)] bg-[var(--bg)]" />
                  {(calView === 'week' ? weekDays : [selectedDate]).map(dateStr => {
                    const isToday = dateStr === today
                    const d = new Date(dateStr)
                    return (
                      <div key={dateStr}
                        className={`py-2 text-center border-r border-[var(--border)] last:border-r-0 ${isToday ? 'bg-[var(--blue-50)]' : 'bg-[var(--bg)]'}`}>
                        <div className="text-[10px] font-bold text-[var(--t300)] uppercase">
                          {d.toLocaleDateString('en-SG', { weekday: 'short' })}
                        </div>
                        <div className={`text-[14px] font-bold mt-0.5 ${isToday ? 'text-[var(--blue)]' : 'text-[var(--t700)]'}`}>
                          {d.getDate()}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="overflow-y-auto max-h-[600px]">
                  {dayHours.map(hour => (
                    <div key={hour} className="grid border-b border-[var(--border)] last:border-b-0"
                      style={{ gridTemplateColumns: calView === 'week' ? '60px repeat(7, 1fr)' : '60px 1fr' }}>
                      <div className="px-2 py-1 text-[10px] text-[var(--t300)] border-r border-[var(--border)] bg-[var(--bg)] flex items-start pt-1">
                        {hour}
                      </div>
                      {(calView === 'week' ? weekDays : [selectedDate]).map(dateStr => {
                        const evs = byDate[dateStr] ?? []
                        return (
                          <div key={dateStr}
                            onClick={() => setShowModal(true)}
                            className="min-h-[48px] border-r border-[var(--border)] last:border-r-0 p-[2px] cursor-pointer hover:bg-[var(--blue-50)] transition-colors">
                            {evs.map(ev => {
                              const s = EVENT_STYLE[ev.type]
                              return (
                                <div key={ev.id}
                                  onClick={e => { e.stopPropagation(); setEditingEvent(ev) }}
                                  className="text-[10px] font-medium px-[4px] py-[2px] rounded-[4px] mb-[2px] cursor-pointer hover:opacity-80 truncate"
                                  style={{ background: s.bg, color: s.color }}>
                                  {ev.title}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {calView === 'month' && (
              <div>
                {/* Day headers */}
                <div className="grid gap-[5px] mb-[5px]" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {DAYS.map(d => (
                    <div key={d} className="text-center text-[10px] font-bold text-[var(--t300)] py-[6px] uppercase tracking-[.07em]">{d}</div>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid gap-[5px]" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {cells.map((cell, i) => {
                    const evs    = byDate[cell.dateStr] ?? []
                    const isToday = cell.dateStr === today
                    const isOther = !cell.current

                    return (
                      <div key={i}
                        onClick={() => cell.current && setShowModal(true)}
                        className={[
                          'min-h-[78px] p-[7px_8px] rounded-[8px] flex flex-col gap-[3px] border transition-colors',
                          isToday ? 'border-[var(--blue)] bg-[var(--blue-50)]'
                                  : isOther ? 'border-[#F3F4F6] bg-[#FAFAFA]'
                                  : 'border-[var(--border)] bg-white hover:border-[var(--blue-100)] cursor-pointer',
                        ].join(' ')}>
                        {isToday ? (
                          <div className="w-[22px] h-[22px] rounded-full bg-[var(--blue)] flex items-center justify-center text-[12px] font-bold text-white">
                            {cell.day}
                          </div>
                        ) : (
                          <div className={`text-[13px] font-semibold leading-none ${isOther ? 'text-[var(--t300)]' : 'text-[var(--t700)]'}`}>
                            {cell.day}
                          </div>
                        )}
                        {evs.slice(0, 2).map(ev => {
                          const s = EVENT_STYLE[ev.type]
                          return (
                            <div key={ev.id}
                              onClick={e => { e.stopPropagation(); setEditingEvent(ev) }}
                              className="text-[10px] font-medium px-[5px] py-[2px] rounded-[4px] overflow-hidden text-ellipsis whitespace-nowrap leading-[1.5] cursor-pointer hover:opacity-80"
                              style={{ background: s.bg, color: s.color }}>
                              {ev.title}
                            </div>
                          )
                        })}
                        {evs.length > 2 && <div className="text-[10px] text-[var(--t300)] font-medium">+{evs.length - 2} more</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}


          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Upcoming events */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
              <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">Upcoming · next 60 days</div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {['All', ...Object.keys(EVENT_LABEL)].map(t => (
                  <button key={t} onClick={() => setFilter(t)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border-[1.5px] transition-all ${
                      filterType === t
                        ? 'bg-[var(--blue-50)] text-[var(--blue)] border-[var(--blue)]'
                        : 'bg-white text-[var(--t700)] border-[var(--border)] hover:bg-[var(--bg)]'
                    }`}>
                    {t === 'All' ? 'All' : EVENT_LABEL[t]}
                  </button>
                ))}
              </div>

              {upcoming.length === 0 ? (
                <div className="py-6 text-center text-[13px] text-[var(--t300)]">No events in the next 60 days.</div>
              ) : (
                <div className="space-y-1.5">
                  {upcoming.map(ev => {
                    const s = EVENT_STYLE[ev.type]
                    return (
                      <div key={ev.id} className="flex items-start gap-3 p-2.5 rounded-[8px] hover:bg-[var(--bg)]">
                        <div className="w-[9px] h-[9px] rounded-full mt-1.5 flex-shrink-0" style={{ background: s.dot }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold text-[var(--t900)] leading-snug truncate">{ev.title}</div>
                          <div className="text-[11px] text-[var(--t500)] mt-0.5">
                            {new Date(ev.date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', weekday: 'short' })}
                          </div>
                        </div>
                        <div className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[5px] flex-shrink-0"
                          style={{ background: s.bg, color: s.color }}>
                          {daysUntil(ev.date, today)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Month stats */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
              <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">This month</div>
              {Object.entries(EVENT_LABEL).map(([t, l]) => {
                const count = events.filter(ev => {
                  const [y, m] = ev.date.split('-').map(Number)
                  return y === viewYear && m === viewMonth + 1 && ev.type === t
                }).length
                const s = EVENT_STYLE[t]
                return (
                  <div key={t} className="flex items-center justify-between py-1.5">
                    <span className="flex items-center gap-2 text-[12px] text-[var(--t700)]">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />{l}
                    </span>
                    <span className="text-[12px] font-bold text-[var(--t900)]">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {showModal && <AddEventModal
        onAdd={async ev => {
          setEvents(p => [...p, ev])
          const TYPE_DB: Record<string, string> = {
            exam: 'exam', deadline: 'application', cca: 'cca', finance: 'finance', personal: 'personal',
          }
          await supabase.from('calendar_events').insert({
            student_id: userId,
            title: ev.title,
            event_date: ev.date,
            type: (TYPE_DB[ev.type] ?? 'personal') as 'exam' | 'cca' | 'application' | 'finance' | 'health' | 'personal' | 'system',
            source: 'manual',
            notes: ev.notes ?? null,
          })
        }}
        onClose={() => setShowModal(false)}
      />}

      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}

          onDelete={async (id) => {
            setEvents(p => p.filter(e => e.id !== id))

            await supabase
              .from('calendar_events')
              .delete()
              .eq('id', id)
          }}

          onSave={async (updated) => {
            setEvents(p => p.map(e => e.id === updated.id ? updated : e))
            const TYPE_DB: Record<string, string> = {
              exam: 'exam', deadline: 'application', cca: 'cca', finance: 'finance', personal: 'personal',
            }
            await supabase
              .from('calendar_events')
              .update({
                title: updated.title,
                event_date: updated.date,
                type: (TYPE_DB[updated.type] ?? 'personal') as 'exam' | 'cca' | 'application' | 'finance' | 'health' | 'personal' | 'system',
                notes: updated.notes ?? null,
              })
              .eq('id', updated.id)
          }}
      />
      )} 
    </div>
  )
}
