'use client'

import { useState } from 'react'
import {
  MOCK_MILESTONES, MOCK_ACHIEVEMENTS, MOCK_DOCUMENTS,
  computeXP, getLevelInfo,
  type MockMilestone, type MilestoneType,
} from '@/lib/mock-data'

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

// ── Milestone row ─────────────────────────────────────────────────────────────

function MilestoneRow({ ms, onToggle, onDelete }: {
  ms: MockMilestone
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) {
  const tc = TYPE_CONFIG[ms.type]
  const today = new Date().toISOString().slice(0, 10)
  const isActive = !ms.completed && ms.due_date >= today

  return (
    <div className="flex items-start gap-[10px] px-[10px] py-[8px] rounded-[8px] transition-colors hover:bg-[var(--bg)] group">
      {/* Checkbox dot */}
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

      {/* Text */}
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

      {/* Tags + delete */}
      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
        {ms.completed && (
          <span className="text-[10px] font-semibold text-[var(--green)]">+50 XP</span>
        )}
        <span className="inline-flex items-center px-[7px] py-0.5 rounded-[5px] text-[10px] font-semibold"
          style={{ background: tc.bg, color: tc.color }}>
          {tc.label}
        </span>
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

function YearBlock({ year, yearLabel, subtitle, milestones, isCurrentYear, defaultOpen, onToggle, onDelete, onAdd }: {
  year: number; yearLabel: string; subtitle: string
  milestones: MockMilestone[]; isCurrentYear: boolean; defaultOpen: boolean
  onToggle: (id: string) => void; onDelete: (id: string) => void; onAdd: (m: MockMilestone) => void
}) {
  const [open, setOpen]         = useState(defaultOpen)
  const [showForm, setShowForm] = useState(false)

  const done    = milestones.filter(m => m.completed).length
  const total   = milestones.length
  const allDone = total > 0 && done === total

  // Group by type
  const byType: Record<string, MockMilestone[]> = {}
  for (const m of milestones) {
    ;(byType[m.type] = byType[m.type] ?? []).push(m)
  }

  const dotBg   = allDone ? 'var(--green)' : isCurrentYear ? 'var(--blue)' : '#E5E7EB'
  const dotText = allDone || isCurrentYear ? 'white' : 'var(--t500)'

  return (
    <div className="mb-[10px]">
      {/* Accordion header */}
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

      {/* Accordion body */}
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
                    <MilestoneRow key={m.id} ms={m} onToggle={onToggle} onDelete={onDelete} />
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

// ── Page ─────────────────────────────────────────────────────────────────────

const YEAR_META = [
  { year: 1, yearLabel: 'Year 1 — 2024/2025', subtitle: 'Foundation year · Establish academic baseline',       defaultOpen: false },
  { year: 2, yearLabel: 'Year 2 — 2025/2026', subtitle: 'Build competition profile · Start community service', defaultOpen: true  },
  { year: 3, yearLabel: 'Year 3 — 2026/2027', subtitle: 'IB final year preparation · University applications', defaultOpen: false },
  { year: 4, yearLabel: 'Year 4 — 2027/2028', subtitle: 'IB examinations · University offers · Gap year',      defaultOpen: false },
]

export default function RoadmapPage() {
  const [milestones, setMilestones] = useState<MockMilestone[]>(MOCK_MILESTONES)

  const xp  = computeXP(MOCK_ACHIEVEMENTS, milestones, MOCK_DOCUMENTS)
  const lvl = getLevelInfo(xp)

  const done  = milestones.filter(m => m.completed).length
  const total = milestones.length

  function handleToggle(id: string) {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, completed: !m.completed } : m))
  }
  function handleDelete(id: string) {
    setMilestones(prev => prev.filter(m => m.id !== id))
  }
  function handleAdd(m: MockMilestone) {
    setMilestones(prev => [...prev, m])
  }

  return (
    <div className="flex flex-col min-h-screen">

      {/* Topbar */}
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-50">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">Your Academic Roadmap</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">UCL Computer Science · IB Diploma · 4-year plan</div>
        </div>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[var(--border)] text-[var(--t500)] bg-white hover:border-[var(--blue)] hover:text-[var(--blue)] transition">
          Export PDF
        </button>
      </div>

      <div className="p-[28px_36px] flex-1">

        {/* Summary badges + XP pill */}
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

          {/* XP level widget */}
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

        {/* Year accordions */}
        {YEAR_META.map(meta => (
          <YearBlock
            key={meta.year}
            {...meta}
            milestones={milestones.filter(m => m.year === meta.year)}
            isCurrentYear={meta.year === 1}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onAdd={handleAdd}
          />
        ))}
      </div>
    </div>
  )
}
