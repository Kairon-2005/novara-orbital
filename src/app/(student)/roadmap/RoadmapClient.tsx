'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/db/client'
import { useToast } from '@/components/ui/toast'
import {
  computeXP, getLevelInfo,
  type MockMilestone, type MilestoneType, type MockAchievement, type MockDocument,
} from '@/lib/mock-data'
import type { GeneratedRoadmap, RoadmapYear } from '@/types/roadmap'

// ── Type config ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<MilestoneType, { label: string; bg: string; color: string }> = {
  exam:        { label: 'Exam',        bg: '#FDF2F2', color: '#E02424' },
  competition: { label: 'Competition', bg: '#FFFBEB', color: '#B45309' },
  cca:         { label: 'CCA',         bg: '#F3FAF7', color: '#057A55' },
  application: { label: 'Application', bg: '#EBF5FF', color: '#1A56DB' },
  academic:    { label: 'Academic',    bg: '#EBF5FF', color: '#1A56DB' },
  other:       { label: 'Other',       bg: '#F3F4F6', color: '#374151' },
}

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface RoadmapClientProps {
  initialMilestones:  MockMilestone[]
  initialAchievements: MockAchievement[]
  documents:          MockDocument[]
  roadmapId:          string | null
  userId:             string
}

// milestone type → calendar_events type
const CAL_TYPE: Record<MilestoneType, string> = {
  exam:        'exam',
  competition: 'personal',
  cca:         'cca',
  application: 'application',
  academic:    'personal',
  other:       'personal',
}

// ── Milestone row ─────────────────────────────────────────────────────────────

function MilestoneRow({ ms, onToggle, onDelete, onAddToCalendar }: {
  ms: MockMilestone
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onAddToCalendar: (id: string) => void
}) {
  const [calAdded, setCalAdded] = useState(false)
  const tc = TYPE_CONFIG[ms.type]
  const today = new Date().toISOString().slice(0, 10)
  const isActive = !ms.completed && ms.due_date >= today

  function handleCal() {
    onAddToCalendar(ms.id)
    setCalAdded(true)
    setTimeout(() => setCalAdded(false), 2000)
  }

  return (
    <div className="flex items-start gap-[10px] px-[10px] py-[8px] rounded-[8px] transition-colors hover:bg-[var(--bg)] group">
      <button
        onClick={() => onToggle(ms.id)}
        title={ms.completed ? 'Mark incomplete' : 'Mark complete (+50 XP)'}
        className="w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-[2px] transition-all"
        style={{
          background:  ms.completed ? 'var(--green)' : isActive ? 'var(--blue)' : 'white',
          borderColor: ms.completed ? 'var(--green)' : isActive ? 'var(--blue)' : 'var(--border)',
        }}
      >
        {ms.completed && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <path d="M5 12l5 5L19 7"/>
          </svg>
        )}
        {isActive && !ms.completed && (
          <svg width="6" height="6" viewBox="0 0 12 12">
            <circle cx="6" cy="6" r="4" fill="white"/>
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div
          className="text-[13px] leading-[1.4]"
          style={{
            color: ms.completed ? 'var(--t300)' : isActive ? 'var(--blue)' : 'var(--t700)',
            textDecoration: ms.completed ? 'line-through' : 'none',
            fontWeight: isActive && !ms.completed ? 500 : 400,
          }}
        >
          {ms.title}
        </div>
        <div className="text-[11px] text-[var(--t300)] mt-[2px]">
          {ms.due_date}
          {ms.description ? ` · ${ms.description.slice(0, 65)}${ms.description.length > 65 ? '…' : ''}` : ''}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
        {ms.completed && (
          <span className="text-[10px] font-semibold text-[var(--green)]">+50 XP</span>
        )}
        <span className="inline-flex items-center px-[7px] py-0.5 rounded-[5px] text-[10px] font-semibold"
          style={{ background: tc.bg, color: tc.color }}>
          {tc.label}
        </span>
        {/* Add to calendar */}
        {ms.due_date && (
          <button
            onClick={handleCal}
            title="Add to calendar"
            className="opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5 text-[10px] font-semibold px-[6px] py-0.5 rounded-[5px]"
            style={{
              background: calAdded ? 'var(--green-50)' : 'var(--blue-50)',
              color:      calAdded ? 'var(--green)'    : 'var(--blue)',
            }}
          >
            {calAdded ? '✓ Added' : (
              <>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Cal
              </>
            )}
          </button>
        )}
        <button
          onClick={() => onDelete(ms.id)}
          className="opacity-0 group-hover:opacity-100 text-[var(--t300)] hover:text-[var(--red)] transition ml-0.5"
          title="Delete milestone"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Add Milestone inline form ─────────────────────────────────────────────────

function AddMilestoneForm({ year, onAdd, onCancel }: {
  year: number; onAdd: (m: MockMilestone) => void; onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [type, setType]   = useState<MilestoneType>('academic')
  const [desc, setDesc]   = useState('')
  const [due, setDue]     = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const dueDate = due || `202${4 + year}-12-31`
    const month   = due ? parseInt(due.slice(5, 7)) : 12
    onAdd({ id: `m${Date.now()}`, year, month, type, title: title.trim(), description: desc.trim() || 'No description.', due_date: dueDate, completed: false })
    setTitle(''); setDesc(''); setDue('')
  }

  const inputCls = "w-full px-3 py-2.5 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] bg-white text-[var(--t900)] focus:outline-none focus:border-[var(--blue)] placeholder:text-[var(--t300)]"

  return (
    <form onSubmit={submit} className="mt-3 mb-1 p-4 bg-[var(--blue-50)] border border-[var(--blue-100)] rounded-[10px] flex flex-col gap-3">
      <div className="font-display font-semibold text-[12px] text-[var(--blue)]">New milestone — Year {year}</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">Type</label>
          <select value={type} onChange={e => setType(e.target.value as MilestoneType)} className={inputCls} style={{ cursor: 'pointer' }}>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">Due Date</label>
          <input type="date" value={due} onChange={e => setDue(e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Submit UCAS application" className={inputCls} />
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">Notes (optional)</label>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Extra details…" className={inputCls} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-[7px] text-[12px] font-semibold text-[var(--t500)] hover:bg-white transition">Cancel</button>
        <button type="submit" className="px-4 py-2 rounded-[7px] text-[12px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition">+ Add Milestone</button>
      </div>
    </form>
  )
}

// ── Year accordion block ──────────────────────────────────────────────────────

function YearBlock({ year, yearLabel, subtitle, milestones, isCurrentYear, defaultOpen, onToggle, onDelete, onAdd, onAddToCalendar }: {
  year: number; yearLabel: string; subtitle: string
  milestones: MockMilestone[]; isCurrentYear: boolean; defaultOpen: boolean
  onToggle: (id: string) => void; onDelete: (id: string) => void; onAdd: (m: MockMilestone) => void
  onAddToCalendar: (id: string) => void
}) {
  const [open, setOpen]         = useState(defaultOpen)
  const [showForm, setShowForm] = useState(false)

  const done    = milestones.filter(m => m.completed).length
  const total   = milestones.length
  const allDone = total > 0 && done === total

  const byType: Record<string, MockMilestone[]> = {}
  for (const m of milestones) {
    ;(byType[m.type] = byType[m.type] ?? []).push(m)
  }

  const dotBg   = allDone ? 'var(--green)' : isCurrentYear ? 'var(--blue)' : '#E5E7EB'
  const dotText = allDone || isCurrentYear ? 'white' : 'var(--t500)'

  return (
    <div className="mb-[10px]">
      <div
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-3 px-[18px] py-[14px] bg-white border border-[var(--border)] cursor-pointer hover:border-[var(--blue-100)] select-none transition-all ${
          open ? 'rounded-t-[10px] border-b-transparent' : 'rounded-[10px]'
        }`}
      >
        <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold transition-all"
          style={{ background: dotBg, color: dotText }}>
          {year}
        </div>
        <div className="flex-1">
          <div className="font-display font-bold text-[14px] text-[var(--t900)] flex items-center gap-2">
            {yearLabel}
            {isCurrentYear && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--blue)] text-white">Current</span>
            )}
          </div>
          <div className="text-[12px] text-[var(--t500)]">{subtitle}</div>
        </div>
        <div className="flex items-center gap-2">
          {allDone ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[var(--green-50)] text-[var(--green)]">Complete</span>
          ) : total > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[var(--blue-50)] text-[var(--blue)]">{done}/{total} done</span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[#F3F4F6] text-[var(--t500)]">0 milestones</span>
          )}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t300)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>
      {open && (
        <div className="bg-white border border-[var(--border)] border-t-0 rounded-b-[10px] px-[18px] pb-[16px]">
          {Object.entries(byType).length > 0 ? (
            Object.entries(byType).map(([type, items]) => {
              const tc = TYPE_CONFIG[type as MilestoneType]
              return (
                <div key={type} className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-[var(--t300)] uppercase tracking-widest">{tc.label}</span>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                  </div>
                  {items.map(m => (
                    <MilestoneRow key={m.id} ms={m} onToggle={onToggle} onDelete={onDelete} onAddToCalendar={onAddToCalendar} />
                  ))}
                </div>
              )
            })
          ) : (
            <div className="py-4 text-center text-[12px] text-[var(--t500)]">No milestones yet. Add one below.</div>
          )}
          {showForm ? (
            <AddMilestoneForm
              year={year}
              onAdd={m => { onAdd(m); setShowForm(false) }}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-[7px] border-[1.5px] border-dashed border-[var(--border)] text-[12px] font-medium text-[var(--t300)] hover:border-[var(--blue)] hover:text-[var(--blue)] transition"
            >
              + Add Milestone
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── AI Roadmap Preview Modal ──────────────────────────────────────────────────

function AiRoadmapModal({
  roadmap,
  loading,
  saving,
  onAdopt,
  onClose,
}: {
  roadmap: GeneratedRoadmap | null
  loading: boolean
  saving: boolean
  onAdopt: () => void
  onClose: () => void
}) {
  const totalMs = roadmap?.years.reduce((n, y) => n + y.milestones.length, 0) ?? 0

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[680px] mx-4 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="font-display font-bold text-[16px] text-[var(--t900)]">AI-Generated Roadmap Preview</div>
            <div className="text-[12px] text-[var(--t500)] mt-0.5">
              {loading ? 'Generating your personalised roadmap…' : `${totalMs} milestones across ${roadmap?.years.length ?? 0} years`}
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--t300)] hover:text-[var(--t700)] p-1 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <svg className="animate-spin w-8 h-8 text-[var(--blue)]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              <p className="text-[13px] text-[var(--t500)]">Qwen AI is crafting your roadmap…</p>
            </div>
          )}
          {!loading && roadmap && roadmap.years.map((yr: RoadmapYear) => (
            <div key={yr.year} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-full bg-[var(--blue)] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                  {String(yr.year).slice(-2)}
                </span>
                <div>
                  <div className="font-display font-semibold text-[13px] text-[var(--t900)]">{yr.yearLabel}</div>
                  <div className="text-[11px] text-[var(--t500)]">{yr.keyMilestone}</div>
                </div>
              </div>
              <div className="ml-9 space-y-1.5">
                {yr.milestones.map((ms, i) => {
                  const tc = TYPE_CONFIG[ms.type as MilestoneType] ?? TYPE_CONFIG.other
                  return (
                    <div key={i} className="flex items-start gap-2 bg-[var(--bg)] rounded-[7px] px-3 py-2">
                      <span className="inline-flex items-center px-[6px] py-0.5 rounded-[4px] text-[10px] font-semibold flex-shrink-0 mt-0.5"
                        style={{ background: tc.bg, color: tc.color }}>
                        {tc.label}
                      </span>
                      <div>
                        <div className="text-[12px] font-medium text-[var(--t900)]">{ms.title}</div>
                        {ms.dueDate && <div className="text-[10px] text-[var(--t300)]">{ms.dueDate}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {!loading && roadmap && (
          <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
            <p className="text-[11px] text-[var(--t500)]">Adopting will replace your current milestones with these AI suggestions.</p>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={onClose} className="px-4 py-2 rounded-[8px] text-[12px] font-semibold border border-[var(--border)] text-[var(--t500)] hover:bg-[var(--bg)] transition">
                Dismiss
              </button>
              <button
                onClick={onAdopt}
                disabled={saving}
                className="px-4 py-2 rounded-[8px] text-[12px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Saving…
                  </>
                ) : '✓ Adopt this roadmap'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

const YEAR_META = [
  { year: 1, yearLabel: 'Year 1 — 2024/2025', subtitle: 'Foundation year · Establish academic baseline',       defaultOpen: false },
  { year: 2, yearLabel: 'Year 2 — 2025/2026', subtitle: 'Build competition profile · Start community service', defaultOpen: true  },
  { year: 3, yearLabel: 'Year 3 — 2026/2027', subtitle: 'IB final year preparation · University applications', defaultOpen: false },
  { year: 4, yearLabel: 'Year 4 — 2027/2028', subtitle: 'IB examinations · University offers · Gap year',      defaultOpen: false },
]

export default function RoadmapClient({
  initialMilestones, initialAchievements, documents, roadmapId, userId,
}: RoadmapClientProps) {
  const supabase = createBrowserClient()
  const router   = useRouter()
  const toast    = useToast()
  const [milestones, setMilestones] = useState<MockMilestone[]>(initialMilestones)

  // ── AI generate state ─────────────────────────────────────────
  const [showAiModal, setShowAiModal]   = useState(false)
  const [aiLoading, setAiLoading]       = useState(false)
  const [aiSaving, setAiSaving]         = useState(false)
  const [aiRoadmap, setAiRoadmap]       = useState<GeneratedRoadmap | null>(null)
  const [aiError, setAiError]           = useState<string | null>(null)

  async function handleGenerateAi() {
    setShowAiModal(true)
    setAiLoading(true)
    setAiRoadmap(null)
    setAiError(null)

    try {
      const res = await fetch('/api/roadmap/generate', { method: 'POST' })
      const json = await res.json() as { roadmap?: GeneratedRoadmap; error?: string; message?: string }

      if (!res.ok) {
        setAiError(json.message ?? json.error ?? 'Generation failed')
        setAiLoading(false)
        return
      }
      setAiRoadmap(json.roadmap ?? null)
    } catch {
      setAiError('Network error. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleAdoptRoadmap() {
    if (!aiRoadmap) return
    setAiSaving(true)

    try {
      const res = await fetch('/api/roadmap/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roadmap: aiRoadmap }),
      })
      if (res.ok) {
        setShowAiModal(false)
        toast({ title: '🚀 Roadmap adopted!', description: 'Your milestones are now being tracked.', variant: 'success' })
        // Reload to pull fresh milestones from DB
        router.refresh()
      } else {
        const json = await res.json() as { error?: string }
        setAiError(json.error ?? 'Save failed')
      }
    } catch {
      setAiError('Network error while saving.')
    } finally {
      setAiSaving(false)
    }
  }

  const xp  = computeXP(initialAchievements, milestones, documents)
  const lvl = getLevelInfo(xp)

  const done  = milestones.filter(m => m.completed).length
  const total = milestones.length

  async function handleToggle(id: string) {
    const m = milestones.find(x => x.id === id)
    if (!m) return
    const next = !m.completed
    setMilestones(prev => prev.map(x => x.id === id ? { ...x, completed: next } : x))
    const { error } = await supabase.from('milestones').update({ completed: next }).eq('id', id)
    if (error) {
      // Revert the optimistic update on failure
      setMilestones(prev => prev.map(x => x.id === id ? { ...x, completed: !next } : x))
      toast({ title: 'Could not update milestone', description: 'Please try again.', variant: 'error' })
      return
    }
    if (next) {
      toast({ title: '🎉 Milestone complete!', description: '+50 XP — keep your orbit on track.', variant: 'success' })
    }
  }

  async function handleDelete(id: string) {
    setMilestones(prev => prev.filter(x => x.id !== id))
    await supabase.from('milestones').delete().eq('id', id)
  }

  async function handleAddToCalendar(id: string) {
    const m = milestones.find(x => x.id === id)
    if (!m || !m.due_date) return
    const { error } = await supabase.from('calendar_events').insert({
      student_id: userId,
      title:      m.title,
      event_date: m.due_date,
      type:       CAL_TYPE[m.type] as 'exam' | 'application' | 'cca' | 'finance' | 'health' | 'personal' | 'system',
      source:     'manual' as const,
      notes:      m.description || null,
    })
    toast(error
      ? { title: 'Could not add to calendar', description: 'Please try again.', variant: 'error' }
      : { title: 'Added to calendar', description: m.title, variant: 'success' })
  }

  async function handleAdd(m: MockMilestone) {
    if (!roadmapId) {
      // No roadmap yet — optimistic local-only add
      setMilestones(prev => [...prev, m])
      return
    }
    const { data } = await supabase
      .from('milestones')
      .insert({
        roadmap_id:  roadmapId,
        year:        m.year,
        month:       m.month,
        type:        m.type,
        title:       m.title,
        description: m.description,
        due_date:    m.due_date,
        completed:   false,
      })
      .select('id')
      .single()
    setMilestones(prev => [...prev, { ...m, id: data?.id ?? m.id }])
  }

  return (
    <div className="flex flex-col min-h-screen">
      {showAiModal && (
        <AiRoadmapModal
          roadmap={aiRoadmap}
          loading={aiLoading}
          saving={aiSaving}
          onAdopt={handleAdoptRoadmap}
          onClose={() => setShowAiModal(false)}
        />
      )}

      {aiError && !showAiModal && (
        <div className="fixed bottom-4 right-4 z-[300] bg-[var(--red-50)] border border-red-200 text-[var(--red)] text-[12px] px-4 py-3 rounded-[10px] shadow">
          {aiError}
          <button onClick={() => setAiError(null)} className="ml-3 font-bold">✕</button>
        </div>
      )}

      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-50">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">Your Academic Roadmap</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">UCL Computer Science · IB Diploma · 4-year plan</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateAi}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
            </svg>
            Generate with AI
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[var(--border)] text-[var(--t500)] bg-white hover:border-[var(--blue)] hover:text-[var(--blue)] transition">
            Export PDF
          </button>
        </div>
      </div>

      <div className="p-[28px_36px] flex-1">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              { text: '🎓 UCL Computer Science', bg: 'var(--blue-50)', color: 'var(--blue)' },
              { text: '📚 IB Diploma', bg: 'var(--blue-50)', color: 'var(--blue)' },
              { text: '🏫 ACS International', bg: 'var(--blue-50)', color: 'var(--blue)' },
              { text: `${done}/${total} milestones done`, bg: done === total && total > 0 ? 'var(--green-50)' : 'var(--blue-50)', color: done === total && total > 0 ? 'var(--green)' : 'var(--blue)' },
            ].map(b => (
              <span key={b.text} className="inline-flex items-center px-2.5 py-1 rounded-[6px] text-[11px] font-semibold"
                style={{ background: b.bg, color: b.color }}>
                {b.text}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 bg-white border border-[var(--border)] rounded-[10px] px-4 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <div className="text-[20px]">{lvl.emoji}</div>
            <div>
              <div className="font-display font-bold text-[13px] text-[var(--t900)]">
                Lv.{lvl.level} {lvl.name}
                <span className="ml-1.5 text-[11px] font-normal text-[var(--t500)]">{xp} XP</span>
              </div>
              <div className="w-[130px] h-[5px] bg-[#F3F4F6] rounded-full mt-1 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${lvl.progress_pct}%`, background: lvl.color }} />
              </div>
            </div>
            <span className="text-[11px] text-[var(--t300)]">{lvl.progress_pct}%</span>
          </div>
        </div>

        {YEAR_META.map(meta => (
          <YearBlock
            key={meta.year}
            {...meta}
            milestones={milestones.filter(m => m.year === meta.year)}
            isCurrentYear={meta.year === 1}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onAdd={handleAdd}
            onAddToCalendar={handleAddToCalendar}
          />
        ))}
      </div>
    </div>
  )
}
