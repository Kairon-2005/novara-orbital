'use client'

import { useState, useMemo } from 'react'
import { createBrowserClient } from '@/db/client'
import { useLocale } from '@/components/shared/LocaleProvider'
import type { Locale } from '@/lib/locale'
import { EditEventModal } from './EditEventModal'

// ── Types ─────────────────────────────────────────────────────────────────────

type EventType = 'exam' | 'deadline' | 'cca' | 'finance' | 'personal'

type CalEvent = {
  id: string
  title: string
  date: string   // YYYY-MM-DD
  type: EventType
  notes?: string
  start_time?: string  // HH:MM
  end_time?: string    // HH:MM
}

// ── copy ─────────────────────────────────────────────────────────────────────

const T = {
  en: {
    eventLabels: { exam: 'Exam', deadline: 'Deadline', cca: 'CCA', finance: 'Finance', personal: 'Personal' } as Record<string, string>,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    monthYear: (m: string, y: number) => `${m} ${y}`,
    today: 'Today',
    tomorrow: 'Tomorrow',
    inDays: (d: number) => `In ${d}d`,
    addEvent: 'Add Event',
    titleReq: 'Title *',
    titlePlaceholder: 'e.g. IB Mock Exam — Chemistry',
    dateReq: 'Date *',
    type: 'Type',
    notes: 'Notes',
    notesPlaceholder: 'Optional details…',
    cancel: 'Cancel',
    pageTitle: 'Calendar',
    pageSub: (m: string, y: number, n: number) => `${m} ${y} · ${n} event${n !== 1 ? 's' : ''} this month`,
    exportIcs: 'Export .ics',
    addEventBtn: '+ Add Event',
    addAnyway: 'Add Anyway',
    todayBtn: 'Today',
    more: (n: number) => `+${n} more`,
    upcoming: 'Upcoming · next 60 days',
    all: 'All',
    noUpcoming: 'No events in the next 60 days.',
    thisMonth: 'This month',
    views: { month: 'Month', week: 'Week', day: 'Day' } as Record<string, string>,
  },
  zh: {
    eventLabels: { exam: '考试', deadline: '截止日期', cca: '课外活动', finance: '费用', personal: '个人' } as Record<string, string>,
    days: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    months: ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'],
    monthYear: (m: string, y: number) => `${y}年${m}`,
    today: '今天',
    tomorrow: '明天',
    inDays: (d: number) => `${d} 天后`,
    addEvent: '添加日程',
    titleReq: '标题 *',
    titlePlaceholder: '例如：IB 模拟考试 — 化学',
    dateReq: '日期 *',
    type: '类型',
    notes: '备注',
    notesPlaceholder: '补充说明（可选）…',
    cancel: '取消',
    pageTitle: '日历',
    pageSub: (m: string, y: number, n: number) => `${y}年${m} · 本月 ${n} 个日程`,
    exportIcs: '导出 .ics',
    addEventBtn: '+ 添加日程',
    addAnyway: '仍然添加',
    todayBtn: '今天',
    more: (n: number) => `还有 ${n} 项`,
    upcoming: '近期 · 未来 60 天',
    all: '全部',
    noUpcoming: '未来 60 天没有日程。',
    thisMonth: '本月',
    views: { month: '月', week: '周', day: '日' } as Record<string, string>,
  },
} satisfies Record<Locale, unknown>

// ── Mock events (used as fallback / removed when DB is live) ────────────────

// ── Event styling ─────────────────────────────────────────────────────────────

const EVENT_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  exam:     { bg: '#FDF2F2', color: '#E02424', dot: '#E02424' },
  deadline: { bg: '#FFFBEB', color: '#B45309', dot: '#F59E0B' },
  cca:      { bg: '#F3FAF7', color: '#057A55', dot: '#057A55' },
  finance:  { bg: '#EBF5FF', color: '#1A56DB', dot: '#1A56DB' },
  personal: { bg: '#F5F3FF', color: '#7C3AED', dot: '#7C3AED' },
}

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

function daysUntil(dateStr: string, today: string, t: (typeof T)[Locale]) {
  const diff = Math.ceil((new Date(dateStr).getTime() - new Date(today).getTime()) / 86_400_000)
  if (diff === 0) return t.today
  if (diff === 1) return t.tomorrow
  return t.inDays(diff)
}

// ── Add Event Modal ───────────────────────────────────────────────────────────

function AddEventModal({ onAdd, onClose, existingEvents }: { onAdd: (e: CalEvent) => void | Promise<void>; onClose: () => void; existingEvents: CalEvent[] }) {
  const t = T[useLocale()]
  const [title,      setTitle]      = useState('')
  const [date,       setDate]       = useState(todayStr())
  const [type,       setType]       = useState<EventType>('personal')
  const [notes,      setNotes]      = useState('')
  const [startTime,  setStartTime]  = useState('09:00')
  const [endTime,    setEndTime]    = useState('10:00')
  const [conflictWith, setConflictWith] = useState<CalEvent | null>(null)

  function submit(e: React.FormEvent) {
  e.preventDefault()
  if (!title.trim() || !date) return

  const conflict = existingEvents.find(ev => {
    if (ev.date !== date) return false
    if (!ev.start_time || !ev.end_time) return false
    return startTime < ev.end_time && endTime > ev.start_time
  })

  if (conflict && !conflictWith) {
    setConflictWith(conflict)
    return
  }

  onAdd({ id: `ev-${Date.now()}`, title: title.trim(), date, type, notes: notes.trim() || undefined, start_time: startTime, end_time: endTime })
  onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="bg-white rounded-[12px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-[420px] border border-[var(--border)]">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <span className="font-display font-bold text-[15px] text-[var(--t900)]">{t.addEvent}</span>
          <button onClick={onClose} className="text-[var(--t400)] hover:text-[var(--t900)] text-[20px] leading-none">×</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">{t.titleReq}</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              placeholder={t.titlePlaceholder}
              className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] text-[var(--t900)] focus:outline-none focus:border-[var(--blue)] placeholder:text-[var(--t300)]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">{t.dateReq}</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] text-[var(--t900)] focus:outline-none focus:border-[var(--blue)]" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">{t.type}</label>
              <select value={type} onChange={e => setType(e.target.value as EventType)}
                className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] text-[var(--t900)] focus:outline-none focus:border-[var(--blue)] bg-white cursor-pointer">
                {Object.keys(t.eventLabels).map(v => <option key={v} value={v}>{t.eventLabels[v]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">Start Time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] text-[var(--t900)] focus:outline-none focus:border-[var(--blue)]" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">End Time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] text-[var(--t900)] focus:outline-none focus:border-[var(--blue)]" />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">{t.notes}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder={t.notesPlaceholder}
              className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] text-[var(--t900)] focus:outline-none focus:border-[var(--blue)] resize-none placeholder:text-[var(--t300)]" />
          </div>
          {conflictWith && (
            <div className="p-3 rounded-[8px] bg-amber-50 border border-amber-200 text-[12px] text-amber-800">
              ⚠️ This conflicts with <span className="font-bold">{conflictWith.title}</span> ({conflictWith.start_time?.slice(0,5)}–{conflictWith.end_time?.slice(0,5)}). Add anyway?
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-[8px] text-[13px] font-semibold text-[var(--t700)] border border-[var(--border)] bg-white hover:bg-[var(--bg)]">
              {t.cancel}
            </button>
            <button type="submit"
              className="px-4 py-2 rounded-[8px] text-[13px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)]">
              {conflictWith ? t.addAnyway : t.addEvent}
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
  const locale = useLocale()
  const t = T[locale]
  const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-SG'
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
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">{t.pageTitle}</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">{t.pageSub(t.months[viewMonth], viewYear, monthCount)}</div>
        </div>
        <div className="flex items-center border border-[var(--border)] rounded-[8px] overflow-hidden">
          {(['month', 'week', 'day'] as const).map(v => (
            <button key={v} onClick={() => setCalView(v)}
              className={`px-3 py-1.5 text-[12px] font-semibold transition ${
                calView === v
                  ? 'bg-[var(--blue)] text-white'
                  : 'bg-white text-[var(--t700)] hover:bg-[var(--bg)]'
              }`}>
              {t.views[v]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/calendar/export" download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold border-[1.5px] border-[var(--border)] text-[var(--t700)] bg-white hover:bg-[var(--bg)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {t.exportIcs}
          </a>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)]">
            {t.addEventBtn}
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
                <span className="font-display font-bold text-[18px] text-[var(--t900)] min-w-[160px] text-center">{t.monthYear(t.months[viewMonth], viewYear)}</span>
                <button onClick={() => navigate(1)} className="px-2.5 py-1 rounded-[7px] border border-[var(--border)] bg-white text-[var(--t700)] text-[13px] font-semibold hover:bg-[var(--bg)]">›</button>
                <button onClick={() => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()) }}
                  className="ml-1 px-3 py-1 rounded-[7px] border border-[var(--border)] bg-white text-[var(--t700)] text-[12px] font-semibold hover:bg-[var(--bg)]">
                  {t.todayBtn}
                </button>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-medium text-[var(--t500)]">
                {([['#E02424','exam'],['#F59E0B','deadline'],['#057A55','cca'],['#1A56DB','finance']] as const).map(([c, k]) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: c }} />{t.eventLabels[k]}
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
                          {d.toLocaleDateString(dateLocale, { weekday: 'short' })}
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
                        const evs = (byDate[dateStr] ?? []).filter(ev => {
                          if (!ev.start_time) return hour === '09:00' // 没有时间的 event 默认显示在 09:00
                          return ev.start_time.startsWith(hour.slice(0, 2))
                        })
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
                                  {ev.start_time && ev.end_time && (
                                    <span className="opacity-70 ml-1">{ev.start_time.slice(0,5)}–{ev.end_time.slice(0,5)}</span>
                                  )}
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
                  {t.days.map(d => (
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
                        {evs.length > 2 && <div className="text-[10px] text-[var(--t300)] font-medium">{t.more(evs.length - 2)}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
          
          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Upcoming events */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
              <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">{t.upcoming}</div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {['All', ...Object.keys(t.eventLabels)].map(ft => (
                  <button key={ft} onClick={() => setFilter(ft)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border-[1.5px] transition-all ${
                      filterType === ft
                        ? 'bg-[var(--blue-50)] text-[var(--blue)] border-[var(--blue)]'
                        : 'bg-white text-[var(--t700)] border-[var(--border)] hover:bg-[var(--bg)]'
                    }`}>
                    {ft === 'All' ? t.all : t.eventLabels[ft]}
                  </button>
                ))}
              </div>

              {upcoming.length === 0 ? (
                <div className="py-6 text-center text-[13px] text-[var(--t300)]">{t.noUpcoming}</div>
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
                            {new Date(ev.date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', weekday: 'short' })}
                          </div>
                        </div>
                        <div className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[5px] flex-shrink-0"
                          style={{ background: s.bg, color: s.color }}>
                          {daysUntil(ev.date, today, t)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Month stats */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
              <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">{t.thisMonth}</div>
              {Object.keys(t.eventLabels).map(k => {
                const count = events.filter(ev => {
                  const [y, m] = ev.date.split('-').map(Number)
                  return y === viewYear && m === viewMonth + 1 && ev.type === k
                }).length
                const s = EVENT_STYLE[k]
                return (
                  <div key={k} className="flex items-center justify-between py-1.5">
                    <span className="flex items-center gap-2 text-[12px] text-[var(--t700)]">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />{t.eventLabels[k]}
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
        existingEvents={events}
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
            start_time: ev.start_time ?? null,
            end_time: ev.end_time ?? null,
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
