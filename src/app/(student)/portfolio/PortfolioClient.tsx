'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/db/client'
import { useToast } from '@/components/ui/toast'
import { useLocale } from '@/components/shared/LocaleProvider'
import type { Locale } from '@/lib/locale'
import { summarizeProgress, ALL_BADGES, XP_BY_CATEGORY } from '@/lib/gamification'
import type { MockAchievement, MockMilestone, MockDocument, AchievementCategory } from '@/types/models'
import { ADMISSION_DIMENSIONS, type PortfolioAssessment, type DimensionLevel, type ReadinessLevel } from '@/types/assessment'

// ── copy ─────────────────────────────────────────────────────────────────────

const T = {
  en: {
    cats: { competition: 'Competition', academic: 'Academic', cca: 'CCA', volunteer: 'Volunteer', award: 'Award', other: 'Other' },
    levels: { missing: 'Missing', weak: 'Weak', developing: 'Developing', competitive: 'Competitive', strong: 'Strong' },
    readiness: { early_stage: 'Early stage', developing: 'Developing', on_track: 'On track', competitive: 'Competitive', strong: 'Strong' },
    dims: {
      academic_strength: 'Academic Strength',
      programme_fit: 'Programme Fit',
      evidence_portfolio: 'Evidence Portfolio',
      communication_storytelling: 'Communication & Storytelling',
      initiative_impact: 'Initiative & Impact',
    } as Record<string, string>,
    lv: (n: number) => `Lv.${n}`,
    xpEarned: (xp: number, pct: number) => `${xp} XP earned · ${pct}% to next level`,
    levelUpHint: <>Complete milestones &amp; add achievements to level up</>,
    remove: 'Remove',
    newAchievement: 'New Achievement',
    category: 'Category',
    date: 'Date',
    titleReq: 'Title *',
    descOptional: 'Description (optional)',
    titlePlaceholder: 'e.g. Gold Medal — SMO Senior Division',
    descPlaceholder: 'Brief description…',
    cancel: 'Cancel',
    addXp: (xp: number) => `Add +${xp} XP`,
    assessUpdatedTitle: 'Assessment updated',
    assessUpdatedDesc: 'Your readiness has been re-evaluated.',
    assessFailedTitle: 'Assessment failed',
    tryAgain: 'Please try again.',
    networkError: 'Network error.',
    pageTitle: <>Portfolio &amp; Readiness</>,
    uploadDocument: 'Upload Document',
    addAchievement: '+ Add Achievement',
    newEvidenceNudge: <>You&apos;ve added evidence since your last assessment. Reassess to update your readiness across the five dimensions.</>,
    reassessing: 'Reassessing…',
    reassessNow: 'Reassess now',
    admissionReadiness: 'Admission Readiness',
    assessing: 'Assessing…',
    reassess: '↺ Reassess',
    runAssessment: '✦ Run assessment',
    overallReadiness: 'Overall readiness',
    noAssessmentYet: 'No assessment yet',
    noAssessmentHint: 'Run an AI assessment to score your readiness across the five admission dimensions.',
    awardsAchievements: <>Awards &amp; Achievements</>,
    cancelX: '✕ Cancel',
    add: '+ Add',
    allTab: (n: number) => `All (${n})`,
    noAchievements: 'No achievements here yet.',
    addOne: 'Add one →',
    badgesEarned: '🎖 Badges Earned',
    strengthsPriorities: <>Strengths &amp; Priorities</>,
    strengths: 'Strengths',
    biggestGaps: 'Biggest gaps',
    recommendedNextSteps: 'Recommended next steps',
    noAssessSidebar: 'Run an assessment to see your strongest areas and the highest-leverage gaps for',
    targetProgrammeFallback: 'your target programme',
    quickStats: 'Quick Stats',
    totalXp: 'Total XP',
    achievementsLabel: 'Achievements',
    badgesLabel: (e: number, t: number) => `Badges ${e}/${t}`,
  },
  zh: {
    cats: { competition: '竞赛', academic: '学业', cca: '课外活动', volunteer: '志愿服务', award: '奖项', other: '其他' },
    levels: { missing: '缺失', weak: '薄弱', developing: '发展中', competitive: '有竞争力', strong: '强' },
    readiness: { early_stage: '起步阶段', developing: '发展中', on_track: '进展顺利', competitive: '有竞争力', strong: '强' },
    dims: {
      academic_strength: '学术实力',
      programme_fit: '专业匹配度',
      evidence_portfolio: '材料与证据',
      communication_storytelling: '表达与叙事',
      initiative_impact: '主动性与影响力',
    } as Record<string, string>,
    lv: (n: number) => `Lv.${n}`,
    xpEarned: (xp: number, pct: number) => `已获得 ${xp} XP · 距下一等级还差 ${pct}%`,
    levelUpHint: <>完成里程碑、添加成就即可升级</>,
    remove: '删除',
    newAchievement: '新建成就',
    category: '类别',
    date: '日期',
    titleReq: '标题 *',
    descOptional: '描述（可选）',
    titlePlaceholder: '例如：SMO 高级组金牌',
    descPlaceholder: '简要描述…',
    cancel: '取消',
    addXp: (xp: number) => `添加 +${xp} XP`,
    assessUpdatedTitle: '评估已更新',
    assessUpdatedDesc: '你的准备度已重新评估。',
    assessFailedTitle: '评估失败',
    tryAgain: '请重试。',
    networkError: '网络错误。',
    pageTitle: <>档案与准备度</>,
    uploadDocument: '上传文件',
    addAchievement: '+ 添加成就',
    newEvidenceNudge: <>自上次评估以来你添加了新材料。重新评估即可更新五个维度的准备度。</>,
    reassessing: '正在重新评估…',
    reassessNow: '立即重新评估',
    admissionReadiness: '录取准备度',
    assessing: '评估中…',
    reassess: '↺ 重新评估',
    runAssessment: '✦ 开始评估',
    overallReadiness: '整体准备度',
    noAssessmentYet: '还没有评估记录',
    noAssessmentHint: '运行一次 AI 评估，从五个录取维度为你的准备度打分。',
    awardsAchievements: <>奖项与成就</>,
    cancelX: '✕ 取消',
    add: '+ 添加',
    allTab: (n: number) => `全部 (${n})`,
    noAchievements: '这里还没有成就。',
    addOne: '添加一个 →',
    badgesEarned: '🎖 已获得徽章',
    strengthsPriorities: <>优势与优先事项</>,
    strengths: '优势',
    biggestGaps: '最大差距',
    recommendedNextSteps: '建议下一步',
    noAssessSidebar: '运行一次评估，看看你的最强项，以及以下目标最值得补齐的差距：',
    targetProgrammeFallback: '你的目标专业',
    quickStats: '快速统计',
    totalXp: '总 XP',
    achievementsLabel: '成就',
    badgesLabel: (e: number, t: number) => `徽章 ${e}/${t}`,
  },
} satisfies Record<Locale, unknown>

// ── Category config ───────────────────────────────────────────────────────────

const CAT_CONFIG: Record<AchievementCategory, { label: string; emoji: string; bg: string; color: string }> = {
  competition: { label: 'Competition', emoji: '🏆', bg: '#FFFBEB', color: '#B45309' },
  academic:    { label: 'Academic',    emoji: '📚', bg: '#EBF5FF', color: '#1A56DB' },
  cca:         { label: 'CCA',         emoji: '⭐', bg: '#F3FAF7', color: '#057A55' },
  volunteer:   { label: 'Volunteer',   emoji: '🤝', bg: '#F5F3FF', color: '#7C3AED' },
  award:       { label: 'Award',       emoji: '🎖', bg: '#FDF2F2', color: '#E02424' },
  other:       { label: 'Other',       emoji: '📌', bg: '#F3F4F6', color: '#374151' },
}

// ── Assessment display config ─────────────────────────────────────────────────

const LEVEL_META: Record<DimensionLevel, { label: string; color: string }> = {
  missing:     { label: 'Missing',     color: '#9CA3AF' },
  weak:        { label: 'Weak',        color: '#E02424' },
  developing:  { label: 'Developing',  color: '#D97706' },
  competitive: { label: 'Competitive', color: '#1A56DB' },
  strong:      { label: 'Strong',      color: '#057A55' },
}

const DIM_NAME: Record<string, string> = Object.fromEntries(ADMISSION_DIMENSIONS.map(d => [d.id, d.name]))

// ── XP Ring chart ─────────────────────────────────────────────────────────────

function XPRing({ xp, progress_pct, level, emoji, name, color }: {
  xp: number; progress_pct: number; level: number; emoji: string; name: string; color: string
}) {
  const t = T[useLocale()]
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
          <div className="text-[10px] font-semibold text-[var(--t300)] mt-0.5">{t.lv(level)}</div>
        </div>
      </div>
      <div className="flex-1">
        <h3 className="font-display font-bold text-[18px] text-[var(--t900)] mb-1">{name}</h3>
        <p className="text-[13px] text-[var(--t500)] leading-relaxed mb-2">
          {t.xpEarned(xp, progress_pct)}
        </p>
        <div className="h-[7px] bg-[#F3F4F6] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress_pct}%`, background: color }}
          />
        </div>
        <div className="text-[11px] text-[var(--t300)] mt-1">
          {t.levelUpHint}
        </div>
      </div>
    </div>
  )
}

// ── Achievement item ──────────────────────────────────────────────────────────

function AchievementItem({ a, onDelete }: {
  a: MockAchievement; onDelete: (id: string) => void
}) {
  const t = T[useLocale()]
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
            {t.cats[a.category]}
          </span>
          <span className="text-[10px] text-[var(--t300)]">{a.date}</span>
          <span className="text-[10px] font-semibold text-[var(--green)]">+{a.xp} XP</span>
        </div>
      </div>
      <button
        onClick={() => onDelete(a.id)}
        className="text-[var(--t300)] hover:text-[var(--red)] transition flex-shrink-0 mt-0.5"
        title={t.remove}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  )
}

// ── Add Achievement form ──────────────────────────────────────────────────────

const XP_MAP = XP_BY_CATEGORY

function AddAchievementForm({ onAdd, onCancel }: {
  onAdd: (a: MockAchievement) => void; onCancel: () => void
}) {
  const t = T[useLocale()]
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
      <div className="font-display font-semibold text-[13px] text-[var(--blue)]">{t.newAchievement}</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">{t.category}</label>
          <select value={category} onChange={e => setCategory(e.target.value as AchievementCategory)} className={inputCls} style={{ cursor: 'pointer' }}>
            {Object.entries(CAT_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.emoji} {t.cats[k as AchievementCategory]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">{t.date}</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">{t.titleReq}</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t.titlePlaceholder} className={inputCls} />
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">{t.descOptional}</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder={t.descPlaceholder} className={`${inputCls} resize-none`} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-[7px] text-[12px] font-semibold text-[var(--t500)] hover:bg-white transition">
          {t.cancel}
        </button>
        <button type="submit" className="px-4 py-2 rounded-[7px] text-[12px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition">
          {t.addXp(XP_MAP[category])}
        </button>
      </div>
    </form>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

const CATEGORY_TABS: Array<'all' | AchievementCategory> = [
  'all', 'competition', 'academic', 'cca', 'volunteer', 'award', 'other',
]

interface PortfolioClientProps {
  initialAchievements: MockAchievement[]
  milestones:          MockMilestone[]
  documents:           MockDocument[]
  userId:              string
  targetProgramme:     string
  initialAssessment:   PortfolioAssessment | null
  hasNewEvidence:      boolean
}

export default function PortfolioClient({
  initialAchievements, milestones, documents, userId, targetProgramme, initialAssessment, hasNewEvidence,
}: PortfolioClientProps) {
  const supabase = createBrowserClient()
  const toast = useToast()
  const locale = useLocale()
  const t = T[locale]
  const [achievements, setAchievements] = useState<MockAchievement[]>(initialAchievements)
  const [activeTab, setActiveTab]       = useState<'all' | AchievementCategory>('all')
  const [showForm, setShowForm]         = useState(false)
  const [assessment, setAssessment]     = useState<PortfolioAssessment | null>(initialAssessment)
  const [assessing, setAssessing]       = useState(false)
  const [reassessed, setReassessed]     = useState(false)

  const { xp, level: lvl, badges } = summarizeProgress({ achievements, milestones, documents })
  const earnedIds = new Set(badges.map(b => b.id))

  const displayed = activeTab === 'all'
    ? achievements
    : achievements.filter(a => a.category === activeTab)

  async function handleDelete(id: string) {
    setAchievements(prev => prev.filter(a => a.id !== id))
    await supabase.from('achievements').delete().eq('id', id)
  }

  async function handleAdd(a: MockAchievement) {
    const { data } = await supabase
      .from('achievements')
      .insert({
        student_id:  userId,
        category:    a.category,
        title:       a.title,
        date:        a.date,
        description: a.description,
        xp:          a.xp,
      })
      .select('id')
      .single()
    setAchievements(prev => [{ ...a, id: data?.id ?? a.id }, ...prev])
    setShowForm(false)
    await handleAssess()
  }

  async function handleAssess() {
    setAssessing(true)
    try {
      const res = await fetch('/api/portfolio/assess', { method: 'POST' })
      const json = await res.json() as { assessment?: PortfolioAssessment; error?: string }
      if (res.ok && json.assessment) {
        setAssessment(json.assessment)
        setReassessed(true)
        toast({ title: t.assessUpdatedTitle, description: t.assessUpdatedDesc, variant: 'success' })
      } else {
        toast({ title: t.assessFailedTitle, description: json.error ?? t.tryAgain, variant: 'error' })
      }
    } catch {
      toast({ title: t.assessFailedTitle, description: t.networkError, variant: 'error' })
    } finally {
      setAssessing(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">

      {/* Topbar */}
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-50">
        <div className="font-display font-bold text-[17px] text-[var(--t900)]">{t.pageTitle}</div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[var(--border)] text-[var(--t700)] bg-white hover:border-[var(--blue)] hover:text-[var(--blue)] transition">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            {t.uploadDocument}
          </button>
          <button
            onClick={() => { setShowForm(true); setActiveTab('all') }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition"
          >
            {t.addAchievement}
          </button>
        </div>
      </div>

      <div className="p-[28px_36px] flex-1">

        {/* Evidence → reassessment loop: nudge when new evidence has been added */}
        {hasNewEvidence && !reassessed && assessment && (
          <div className="mb-5 flex items-center gap-3 bg-[var(--blue-50)] border border-[var(--blue-100)] rounded-[10px] px-4 py-3">
            <div className="text-[18px]">📄</div>
            <div className="flex-1 text-[12.5px] text-[var(--t700)]">
              {t.newEvidenceNudge}
            </div>
            <button
              onClick={handleAssess}
              disabled={assessing}
              className="flex-shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-[8px] bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] disabled:opacity-50 transition"
            >
              {assessing ? t.reassessing : t.reassessNow}
            </button>
          </div>
        )}

        <div className="grid gap-6 grid-cols-1 items-start lg:grid-cols-[1fr_320px]">

          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-5">

            {/* Readiness card */}
            <div className="bg-white border border-[var(--border)] rounded-[12px] p-[20px_22px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-display font-bold text-[13px] text-[var(--t900)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  {t.admissionReadiness}
                </div>
                <button
                  onClick={handleAssess}
                  disabled={assessing}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-[6px] bg-[var(--blue-50)] text-[var(--blue)] hover:bg-[var(--blue-100)] disabled:opacity-50 transition"
                >
                  {assessing ? (
                    <>
                      <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      {t.assessing}
                    </>
                  ) : assessment ? t.reassess : t.runAssessment}
                </button>
              </div>

              <XPRing {...lvl} xp={xp} />

              {assessment ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] text-[var(--t500)]">{t.overallReadiness}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
                      style={{ background: 'var(--blue)' }}>
                      {t.readiness[assessment.overallLevel]}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {assessment.dimensionScores.map(d => {
                      const meta = LEVEL_META[d.level]
                      return (
                        <div key={d.dimensionId} className="flex items-center gap-3" title={d.reasoning}>
                          <div className="text-[12px] font-medium text-[var(--t700)] flex-shrink-0" style={{ width: 150 }}>{t.dims[d.dimensionId] ?? DIM_NAME[d.dimensionId]}</div>
                          <div className="flex-1 h-[8px] bg-[var(--bg)] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${d.score}%`, background: meta.color }} />
                          </div>
                          <div className="text-[11px] font-bold w-[78px] text-right flex-shrink-0" style={{ color: meta.color }}>{t.levels[d.level]}</div>
                        </div>
                      )
                    })}
                  </div>
                  {assessment.overallSummary && (
                    <p className="text-[12px] text-[var(--t500)] leading-relaxed mt-3 pt-3 border-t border-[var(--border)]">{assessment.overallSummary}</p>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <div className="text-[13px] text-[var(--t500)] mb-1">{t.noAssessmentYet}</div>
                  <div className="text-[12px] text-[var(--t300)]">{t.noAssessmentHint}</div>
                </div>
              )}
            </div>

            {/* Achievements card */}
            <div className="bg-white border border-[var(--border)] rounded-[12px] p-[20px_22px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between mb-4">
                <div className="font-display font-bold text-[13px] text-[var(--t900)] flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
                  {t.awardsAchievements}
                  <span className="text-[11px] font-normal text-[var(--t500)]">({achievements.length})</span>
                </div>
                <button onClick={() => setShowForm(v => !v)} className="text-[12px] font-semibold text-[var(--blue)] hover:underline">
                  {showForm ? t.cancelX : t.add}
                </button>
              </div>

              {/* Category tabs */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {CATEGORY_TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold border-[1.5px] transition ${
                      activeTab === tab
                        ? 'bg-[var(--blue)] text-white border-[var(--blue)]'
                        : 'bg-white text-[var(--t500)] border-[var(--border)] hover:border-[var(--blue)] hover:text-[var(--blue)]'
                    }`}
                  >
                    {tab === 'all'
                      ? t.allTab(achievements.length)
                      : `${CAT_CONFIG[tab].emoji} ${t.cats[tab]} (${achievements.filter(a => a.category === tab).length})`}
                  </button>
                ))}
              </div>

              {showForm && <AddAchievementForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />}

              <div className="flex flex-col gap-2">
                {displayed.length === 0 ? (
                  <div className="py-8 text-center text-[13px] text-[var(--t500)]">
                    {t.noAchievements}{' '}
                    <button onClick={() => setShowForm(true)} className="text-[var(--blue)] font-medium hover:underline">{t.addOne}</button>
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
                <span>{t.badgesEarned}</span>
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

            {/* Strengths & priorities (from the latest assessment) */}
            <div className="bg-white border border-[var(--border)] rounded-[12px] p-[20px_22px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="font-display font-bold text-[13px] text-[var(--t900)] flex items-center gap-2 mb-3">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--blue)" strokeWidth="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                {t.strengthsPriorities}
              </div>

              {assessment ? (
                <div className="flex flex-col gap-3">
                  {assessment.topStrengths.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-[var(--green)] uppercase tracking-wider mb-1">{t.strengths}</div>
                      <ul className="space-y-1">
                        {assessment.topStrengths.map((s, i) => (
                          <li key={i} className="text-[12px] text-[var(--t700)] flex gap-1.5"><span className="text-[var(--green)]">✓</span>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {assessment.topGaps.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-[var(--amber)] uppercase tracking-wider mb-1">{t.biggestGaps}</div>
                      <ul className="space-y-1">
                        {assessment.topGaps.map((g, i) => (
                          <li key={i} className="text-[12px] text-[var(--t700)] flex gap-1.5"><span className="text-[var(--amber)]">→</span>{g}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {assessment.recommendedNextSteps.length > 0 && (
                    <div className="rounded-[8px] p-3 bg-[var(--blue-50)] border border-[var(--blue-100)]">
                      <div className="text-[10px] font-bold text-[var(--blue)] uppercase tracking-wider mb-1">{t.recommendedNextSteps}</div>
                      <ul className="space-y-1">
                        {assessment.recommendedNextSteps.map((r, i) => (
                          <li key={i} className="text-[12px] text-[var(--t700)] flex gap-1.5"><span className="text-[var(--blue)]">{i + 1}.</span>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[12px] text-[var(--t500)] leading-relaxed">
                  {t.noAssessSidebar}{' '}
                  <span className="font-semibold text-[var(--t700)]">{targetProgramme || t.targetProgrammeFallback}</span>.
                </p>
              )}
            </div>

            {/* Quick stats */}
            <div className="bg-white border border-[var(--border)] rounded-[12px] p-[20px_22px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="font-display font-bold text-[13px] text-[var(--t900)] mb-3">{t.quickStats}</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t.totalXp,      value: String(xp),                            color: lvl.color },
                  { label: `${t.lv(lvl.level)} ${lvl.name}`, value: lvl.emoji,              color: lvl.color },
                  { label: t.achievementsLabel, value: String(achievements.length),            color: '#1A56DB' },
                  { label: t.badgesLabel(badges.length, ALL_BADGES.length), value: '🎖',  color: '#B45309' },
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
