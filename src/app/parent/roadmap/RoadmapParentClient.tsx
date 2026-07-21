'use client'

import { useState, useMemo } from 'react'
import { summarizeProgress } from '@/lib/gamification'
import type { MockMilestone, MilestoneType, MockAchievement, MockDocument } from '@/types/models'

// ── Chinese labels ─────────────────────────────────────────────────────────────

const TYPE_ZH: Record<MilestoneType, string> = {
  exam:        '📝 考试',
  competition: '🏆 竞赛',
  cca:         '🎽 课外活动',
  application: '📋 申请',
  academic:    '📚 学术',
  other:       '📌 其他',
}

const TYPE_STYLE: Record<MilestoneType, { bg: string; color: string }> = {
  exam:        { bg: '#FDF2F2', color: '#E02424' },
  competition: { bg: '#FFFBEB', color: '#B45309' },
  cca:         { bg: '#F3FAF7', color: '#057A55' },
  application: { bg: '#F5F3FF', color: '#7C3AED' },
  academic:    { bg: '#EBF5FF', color: '#1A56DB' },
  other:       { bg: '#F3F4F6', color: '#6B7280' },
}

const MONTH_ZH = ['','一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']

// ── Milestone row (read-only parent view) ─────────────────────────────────────

function MilestoneRow({ m }: { m: MockMilestone }) {
  const ts = TYPE_STYLE[m.type]
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-[8px] hover:bg-[var(--bg)]">
      {/* Status dot */}
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border-2 ${
        m.completed
          ? 'bg-[var(--green)] border-[var(--green)]'
          : 'bg-white border-[var(--border)]'
      }`}>
        {m.completed && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-semibold leading-snug ${m.completed ? 'text-[var(--t300)] line-through' : 'text-[var(--t900)]'}`}>
          {m.title}
        </div>
        <div className="text-[11px] text-[var(--t500)] mt-0.5">{m.description}</div>
        <div className="text-[11px] text-[var(--t300)] mt-0.5">
          截止：{new Date(m.due_date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Type badge */}
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
        style={{ background: ts.bg, color: ts.color }}>
        {TYPE_ZH[m.type]}
      </span>
    </div>
  )
}

// ── Year block ────────────────────────────────────────────────────────────────

function YearBlock({ year, milestones, defaultOpen }: {
  year: number; milestones: MockMilestone[]; defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const done  = milestones.filter(m => m.completed).length
  const total = milestones.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  // Group by type
  const byType = milestones.reduce<Record<string, MockMilestone[]>>((acc, m) => {
    const k = m.type;
    (acc[k] ??= []).push(m)
    return acc
  }, {})

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 bg-white border border-[var(--border)] rounded-[10px] ${open ? 'rounded-b-none border-b-0' : ''} hover:bg-[var(--bg)] transition-colors`}
      >
        <div className="w-7 h-7 rounded-full bg-[var(--blue)] flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0">
          {year}
        </div>
        <div className="flex-1 text-left">
          <div className="font-display font-bold text-[14px] text-[var(--t900)]">第 {year} 学年</div>
          <div className="text-[11px] text-[var(--t500)]">{done}/{total} 完成 · {pct}%</div>
        </div>
        {/* Progress pill */}
        <div className="w-[80px]">
          <div className="h-[5px] bg-[#F3F4F6] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[var(--green)] transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className="text-[var(--t300)] text-[14px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border border-[var(--border)] border-t-0 rounded-b-[10px] bg-white pb-2">
          {Object.entries(byType).map(([type, ms]) => (
            <div key={type} className="mt-3">
              <div className="px-4 mb-1.5">
                <span className="text-[10px] font-bold text-[var(--t300)] uppercase tracking-[.07em]">
                  {TYPE_ZH[type as MilestoneType] ?? type}
                </span>
              </div>
              {ms.map(m => <MilestoneRow key={m.id} m={m} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface RoadmapParentClientProps {
  milestones: MockMilestone[]
  achievements: MockAchievement[]
  documents: MockDocument[]
  child: { displayName: string; school: string | null; curriculum: string | null }
}

export default function RoadmapParentClient({ milestones, achievements, documents, child }: RoadmapParentClientProps) {
  const { xp, level, badges } = summarizeProgress({ achievements, milestones, documents })

  const byYear = useMemo(() => {
    const m: Record<number, MockMilestone[]> = {}
    milestones.forEach(ms => { (m[ms.year] ??= []).push(ms) })
    return m
  }, [milestones])

  const years = Object.keys(byYear).map(Number).sort()
  const completedCount = milestones.filter(m => m.completed).length
  const totalCount     = milestones.length

  return (
    <div className="flex flex-col min-h-screen" style={{ fontFamily: "'Noto Sans SC', 'Inter', sans-serif" }}>

      {/* Topbar */}
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-40">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">学习路线图</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">
            {[child.displayName, child.school, child.curriculum && `${child.curriculum}课程`].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--t500)]">
          <span className="px-2 py-1 bg-[var(--bg)] rounded-[6px] font-semibold text-[var(--t700)]">👁 仅查看</span>
        </div>
      </div>

      <div className="p-[28px_36px] flex-1">
        <div className="grid gap-5 grid-cols-1 items-start lg:grid-cols-[1fr_280px]">

          {/* ── LEFT: Year blocks ──────────────────────────────────────────── */}
          <div>
            {years.map(year => (
              <YearBlock
                key={year}
                year={year}
                milestones={byYear[year]}
                defaultOpen={year === 1}
              />
            ))}
          </div>

          {/* ── RIGHT: Summary sidebar ─────────────────────────────────────── */}
          <div className="space-y-4">

            {/* XP / Level card */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
              <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">🎮 成长等级</div>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-[32px]">{level.emoji}</div>
                <div>
                  <div className="font-display font-bold text-[15px] text-[var(--t900)]">{level.name}</div>
                  <div className="text-[11px] text-[var(--t500)]">等级 {level.level} · {xp} XP</div>
                </div>
              </div>
              <div className="h-[6px] bg-[#F3F4F6] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${level.progress_pct}%`, background: level.color }} />
              </div>
              <div className="text-[11px] text-[var(--t300)] mt-1 text-right">{level.progress_pct}% → 下一等级</div>
            </div>

            {/* Progress summary */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
              <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">📊 完成情况</div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="text-center p-3 bg-[var(--green-50)] rounded-[8px]">
                  <div className="font-display font-bold text-[22px] text-[var(--green)]">{completedCount}</div>
                  <div className="text-[11px] text-[var(--t500)]">已完成</div>
                </div>
                <div className="text-center p-3 bg-[var(--bg)] rounded-[8px]">
                  <div className="font-display font-bold text-[22px] text-[var(--t500)]">{totalCount - completedCount}</div>
                  <div className="text-[11px] text-[var(--t500)]">待完成</div>
                </div>
              </div>
              {/* By type breakdown */}
              {(Object.entries(TYPE_ZH) as [MilestoneType, string][]).map(([t, zh]) => {
                const n = milestones.filter(m => m.type === t).length
                if (n === 0) return null
                const done = milestones.filter(m => m.type === t && m.completed).length
                return (
                  <div key={t} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                    <span className="text-[12px] text-[var(--t700)]">{zh}</span>
                    <span className="text-[12px] font-bold text-[var(--t900)]">{done}/{n}</span>
                  </div>
                )
              })}
            </div>

            {/* Earned badges */}
            {badges.length > 0 && (
              <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">🏅 获得徽章</div>
                <div className="flex flex-wrap gap-2">
                  {badges.map(b => (
                    <div key={b.id} className="flex flex-col items-center gap-1 p-2 bg-[var(--bg)] rounded-[8px] min-w-[56px]">
                      <span className="text-[20px]">{b.emoji}</span>
                      <span className="text-[9px] font-semibold text-[var(--t500)] text-center leading-tight">{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Note for parent */}
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] p-4">
              <div className="text-[12px] font-semibold text-[#B45309] mb-1">💡 提示</div>
              <div className="text-[12px] text-[#78350F] leading-relaxed">
                路线图由孩子自行编辑。您可以查看进度，但无法直接修改。如需讨论，请通过沟通中心与孩子联系。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
