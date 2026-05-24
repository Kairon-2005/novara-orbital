'use client'

import { useState } from 'react'
import {
  MOCK_ACHIEVEMENTS, MOCK_MILESTONES, MOCK_DOCUMENTS,
  computeXP, getLevelInfo, computeBadges, ALL_BADGES,
  type MockAchievement, type AchievementCategory,
} from '@/lib/mock-data'

// ── Category config ───────────────────────────────────────────────────────────

const CAT_CONFIG: Record<AchievementCategory, { label: string; emoji: string; bg: string; color: string }> = {
  competition: { label: 'Competition', emoji: '🏆', bg: '#FFFBEB', color: '#B45309' },
  academic:    { label: 'Academic',    emoji: '📚', bg: '#EBF5FF', color: '#1A56DB' },
  cca:         { label: 'CCA',         emoji: '⭐', bg: '#F3FAF7', color: '#057A55' },
  volunteer:   { label: 'Volunteer',   emoji: '🤝', bg: '#F5F3FF', color: '#7C3AED' },
  award:       { label: 'Award',       emoji: '🎖', bg: '#FDF2F2', color: '#E02424' },
  other:       { label: 'Other',       emoji: '📌', bg: '#F3F4F6', color: '#374151' },
}

const READINESS_BARS = [
  { label: 'Academic Results',    pct: 82, fill: '#1A56DB' },
  { label: 'English Proficiency', pct: 61, fill: '#D97706' },
  { label: 'CCA & Leadership',    pct: 75, fill: '#057A55' },
  { label: 'Interview Readiness', pct: 58, fill: '#D97706' },
  { label: 'Financial Planning',  pct: 88, fill: '#057A55' },
]

// ── XP Ring chart ─────────────────────────────────────────────────────────────

function XPRing({ xp, progress_pct, level, emoji, name, color }: {
  xp: number; progress_pct: number; level: number; emoji: string; name: string; color: string
}) {
  const r = 42
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - progress_pct / 100)

  return (
    <div className="flex items-center gap-6 pb-5 mb-5 border-b border-[var(--border)]">
      <div className="relative w-[100px] h-[100px] flex-shrink-0">
        <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="#E5E7EB" strokeWidth="10" />
          <circle
            cx="50" cy="50" r={r} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-[22px] leading-none">{emoji}</div>
          <div className="text-[10px] font-semibold text-[var(--t300)] mt-0.5">Lv.{level}</div>
        </div>
      </div>
      <div className="flex-1">
        <h3 className="font-display font-bold text-[18px] text-[var(--t900)] mb-1">{name}</h3>
        <p className="text-[13px] text-[var(--t500)] leading-relaxed mb-2">
          {xp} XP earned · {progress_pct}% to next level
        </p>
        <div className="h-[7px] bg-[#F3F4F6] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress_pct}%`, background: color }}
          />
        </div>
        <div className="text-[11px] text-[var(--t300)] mt-1">
          Complete milestones &amp; add achievements to level up
        </div>
      </div>
    </div>
  )
}

// ── Achievement item ──────────────────────────────────────────────────────────

function AchievementItem({ a, onDelete }: {
  a: MockAchievement; onDelete: (id: string) => void
}) {
  const cfg = CAT_CONFIG[a.category]
  return (
    <div className="flex items-start gap-[10px] p-[10px_12px] rounded-[8px] bg-[var(--bg)]">
      <div className="text-[20px] flex-shrink-0 mt-[1px]">{cfg.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[13px] text-[var(--t900)]">{a.title}</div>
        <div className="text-[11px] text-[var(--t500)] mt-0.5 leading-relaxed">
          {a.description.slice(0, 90)}{a.description.length > 90 ? '…' : ''}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-semibold"
            style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </span>
          <span className="text-[10px] text-[var(--t300)]">{a.date}</span>
          <span className="text-[10px] font-semibold text-[var(--green)]">+{a.xp} XP</span>
        </div>
      </div>
      <button
        onClick={() => onDelete(a.id)}
        className="text-[var(--t300)] hover:text-[var(--red)] transition flex-shrink-0 mt-0.5"
        title="Remove"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  )
}

// ── Add Achievement form ──────────────────────────────────────────────────────

const XP_MAP: Record<AchievementCategory, number> = {
  competition: 60, academic: 40, cca: 35, volunteer: 30, award: 50, other: 20,
}

function AddAchievementForm({ onAdd, onCancel }: {
  onAdd: (a: MockAchievement) => void; onCancel: () => void
}) {
  const [title, setTitle]       = useState('')
  const [category, setCategory] = useState<AchievementCategory>('competition')
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10))
  const [desc, setDesc]         = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onAdd({
      id: `a${Date.now()}`,
      category,
      title: title.trim(),
      date,
      description: desc.trim() || 'No description.',
      xp: XP_MAP[category],
    })
  }

  const inputCls = "w-full px-3 py-2.5 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] text-[var(--t900)] bg-white focus:outline-none focus:border-[var(--blue)] placeholder:text-[var(--t300)]"

  return (
    <form onSubmit={submit} className="mb-4 p-4 bg-[var(--blue-50)] border border-[var(--blue-100)] rounded-[10px] flex flex-col gap-3">
      <div className="font-display font-semibold text-[13px] text-[var(--blue)]">New Achievement</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value as AchievementCategory)} className={inputCls} style={{ cursor: 'pointer' }}>
            {Object.entries(CAT_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.emoji} {v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Gold Medal — SMO Senior Division" className={inputCls} />
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">Description (optional)</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Brief description…" className={`${inputCls} resize-none`} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-[7px] text-[12px] font-semibold text-[var(--t500)] hover:bg-white transition">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 rounded-[7px] text-[12px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition">
          Add +{XP_MAP[category]} XP
        </button>
      </div>
    </form>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

const CATEGORY_TABS: Array<'all' | AchievementCategory> = [
  'all', 'competition', 'academic', 'cca', 'volunteer', 'award', 'other',
]

export default function PortfolioPage() {
  const [achievements, setAchievements] = useState<MockAchievement[]>(MOCK_ACHIEVEMENTS)
  const [activeTab, setActiveTab]       = useState<'all' | AchievementCategory>('all')
  const [showForm, setShowForm]         = useState(false)

  const xp     = computeXP(achievements, MOCK_MILESTONES, MOCK_DOCUMENTS)
  const lvl    = getLevelInfo(xp)
  const badges = computeBadges(achievements, MOCK_MILESTONES, MOCK_DOCUMENTS)
  const earnedIds = new Set(badges.map(b => b.id))

  const displayed = activeTab === 'all'
    ? achievements
    : achievements.filter(a => a.category === activeTab)

  function handleDelete(id: string) { setAchievements(prev => prev.filter(a => a.id !== id)) }
  function handleAdd(a: MockAchievement) { setAchievements(prev => [a, ...prev]); setShowForm(false) }

  return (
    <div className="flex flex-col min-h-screen">

      {/* Topbar */}
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-50">
        <div className="font-display font-bold text-[17px] text-[var(--t900)]">Portfolio &amp; Readiness</div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[var(--border)] text-[var(--t700)] bg-white hover:border-[var(--blue)] hover:text-[var(--blue)] transition">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Upload Document
          </button>
          <button
            onClick={() => { setShowForm(true); setActiveTab('all') }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition"
          >
            + Add Achievement
          </button>
        </div>
      </div>

      <div className="p-[28px_36px] flex-1">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>

          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-5">

            {/* Readiness card */}
            <div className="bg-white border border-[var(--border)] rounded-[12px] p-[20px_22px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-display font-bold text-[13px] text-[var(--t900)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  Admission Readiness Score
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--blue-50)] text-[var(--blue)]">Updated today</span>
              </div>

              <XPRing {...lvl} xp={xp} />

              <div className="flex flex-col gap-3">
                {READINESS_BARS.map(row => (
                  <div key={row.label} className="flex items-center gap-3">
                    <div className="text-[12px] font-medium text-[var(--t700)] flex-shrink-0" style={{ width: 130 }}>{row.label}</div>
                    <div className="flex-1 h-[8px] bg-[var(--bg)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.fill }} />
                    </div>
                    <div className="text-[12px] font-bold text-[var(--t700)] w-8 text-right flex-shrink-0">{row.pct}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements card */}
            <div className="bg-white border border-[var(--border)] rounded-[12px] p-[20px_22px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between mb-4">
                <div className="font-display font-bold text-[13px] text-[var(--t900)] flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
                  Awards &amp; Achievements
                  <span className="text-[11px] font-normal text-[var(--t500)]">({achievements.length})</span>
                </div>
                <button onClick={() => setShowForm(v => !v)} className="text-[12px] font-semibold text-[var(--blue)] hover:underline">
                  {showForm ? '✕ Cancel' : '+ Add'}
                </button>
              </div>

              {/* Category tabs */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {CATEGORY_TABS.map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold border-[1.5px] transition ${
                      activeTab === t
                        ? 'bg-[var(--blue)] text-white border-[var(--blue)]'
                        : 'bg-white text-[var(--t500)] border-[var(--border)] hover:border-[var(--blue)] hover:text-[var(--blue)]'
                    }`}
                  >
                    {t === 'all'
                      ? `All (${achievements.length})`
                      : `${CAT_CONFIG[t].emoji} ${CAT_CONFIG[t].label} (${achievements.filter(a => a.category === t).length})`}
                  </button>
                ))}
              </div>

              {showForm && <AddAchievementForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />}

              <div className="flex flex-col gap-2">
                {displayed.length === 0 ? (
                  <div className="py-8 text-center text-[13px] text-[var(--t500)]">
                    No achievements here yet.{' '}
                    <button onClick={() => setShowForm(true)} className="text-[var(--blue)] font-medium hover:underline">Add one →</button>
                  </div>
                ) : (
                  displayed.map(a => <AchievementItem key={a.id} a={a} onDelete={handleDelete} />)
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-5">

            {/* Badges */}
            <div className="bg-white border border-[var(--border)] rounded-[12px] p-[20px_22px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="font-display font-bold text-[13px] text-[var(--t900)] mb-3 flex items-center justify-between">
                <span>🎖 Badges Earned</span>
                <span className="text-[11px] font-normal text-[var(--t500)]">{badges.length}/{ALL_BADGES.length}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {ALL_BADGES.map(b => {
                  const earned = earnedIds.has(b.id)
                  return (
                    <div
                      key={b.id}
                      title={`${b.name}: ${b.description}`}
                      className={`flex flex-col items-center gap-1 p-2 rounded-[8px] text-center transition ${
                        earned ? 'bg-[#FFFBEB] border border-[#F59E0B]/30' : 'bg-[var(--bg)] opacity-40 grayscale'
                      }`}
                    >
                      <div className="text-[18px]">{b.emoji}</div>
                      <div className="text-[9px] font-semibold text-[var(--t700)] leading-tight">{b.name}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="bg-white border border-[var(--border)] rounded-[12px] p-[20px_22px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="font-display font-bold text-[13px] text-[var(--t900)] mb-4 flex items-center gap-2">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--blue)" strokeWidth="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                Recommendations
              </div>
              {[
                {
                  icon: <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>,
                  stroke: 'var(--blue)', labelColor: 'var(--blue)', labelText: 'Top Priority',
                  bg: 'linear-gradient(135deg,var(--blue-50),#F0FDF4)', border: 'var(--blue-100)',
                  text: 'Interview readiness at 58% is below UCAS threshold. Practice STAR framework responses weekly.',
                },
                {
                  icon: <path d="M5 13l4 4L19 7"/>,
                  stroke: 'var(--green)', labelColor: 'var(--green)', labelText: 'Strength',
                  bg: 'linear-gradient(135deg,var(--green-50),var(--blue-50))', border: 'var(--green-50)',
                  text: 'SMO Silver and EE Grade A place you in top 10%. Lead with these in your personal statement.',
                },
                {
                  icon: <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>,
                  stroke: 'var(--amber)', labelColor: 'var(--amber)', labelText: 'Suggestion',
                  bg: 'linear-gradient(135deg,var(--amber-50),var(--blue-50))', border: '#F59E0B33',
                  text: 'Add 10+ h/month community service. UCL and NUS both heavily weight sustained community impact.',
                },
              ].map((tip, i) => (
                <div key={i} className="rounded-[10px] p-[14px_16px] mb-2.5 border" style={{ background: tip.bg, borderColor: tip.border }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={tip.stroke} strokeWidth="2">{tip.icon}</svg>
                    <span className="text-[11px] font-bold" style={{ color: tip.labelColor }}>{tip.labelText}</span>
                  </div>
                  <p className="text-[12px] text-[var(--t700)] leading-relaxed">{tip.text}</p>
                </div>
              ))}
            </div>

            {/* Quick stats */}
            <div className="bg-white border border-[var(--border)] rounded-[12px] p-[20px_22px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="font-display font-bold text-[13px] text-[var(--t900)] mb-3">Quick Stats</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total XP',     value: String(xp),                            color: lvl.color },
                  { label: `Lv.${lvl.level} ${lvl.name}`, value: lvl.emoji,              color: lvl.color },
                  { label: 'Achievements', value: String(achievements.length),            color: '#1A56DB' },
                  { label: `Badges ${badges.length}/${ALL_BADGES.length}`, value: '🎖',  color: '#B45309' },
                ].map((s, i) => (
                  <div key={i} className="bg-[var(--bg)] rounded-[8px] p-3 text-center">
                    <div className="font-display font-extrabold text-[22px] leading-none" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[11px] text-[var(--t500)] mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
