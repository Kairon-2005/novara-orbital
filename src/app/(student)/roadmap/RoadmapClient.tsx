'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/db/client'
import { useToast } from '@/components/ui/toast'
import { useLocale } from '@/components/shared/LocaleProvider'
import type { Locale } from '@/lib/locale'
import { summarizeProgress } from '@/lib/gamification'
import type { MockMilestone, MilestoneType, MockAchievement, MockDocument } from '@/types/models'
import type { GeneratedRoadmap, RoadmapYear } from '@/types/roadmap'

// ── copy ─────────────────────────────────────────────────────────────────────

const T = {
  en: {
    types: { exam: 'Exam', competition: 'Competition', cca: 'CCA', application: 'Application', academic: 'Academic', other: 'Other' },
    enrolmentSub: 'Target university enrolment 🎓',
    currentYearSub: 'Current year · build your foundation',
    yearsToGo: (n: number) => `${n} year${n === 1 ? '' : 's'} to enrolment`,
    continuingSub: 'Continuing milestones',
    yearLabel: (i: number, y: number) => `Year ${i} — ${y}`,
    markIncomplete: 'Mark incomplete',
    markComplete: 'Mark complete (+50 XP)',
    addToCalendar: 'Add to calendar',
    calAdded: '✓ Added',
    cal: 'Cal',
    deleteMilestone: 'Delete milestone',
    newMilestone: (y: number) => `New milestone — ${y}`,
    type: 'Type',
    dueDate: 'Due Date',
    titleReq: 'Title *',
    notesOptional: 'Notes (optional)',
    titlePlaceholder: 'e.g. Submit UCAS application',
    notesPlaceholder: 'Extra details…',
    cancel: 'Cancel',
    addMilestone: '+ Add Milestone',
    current: 'Current',
    complete: 'Complete',
    doneCount: (d: number, t: number) => `${d}/${t} done`,
    zeroMilestones: '0 milestones',
    noMilestonesYet: 'No milestones yet. Add one below.',
    aiPreviewTitle: 'AI-Generated Roadmap Preview',
    aiGenerating: 'Generating your personalised roadmap…',
    aiSummary: (ms: number, yrs: number) => `${ms} milestones across ${yrs} years`,
    aiCrafting: 'Qwen AI is crafting your roadmap…',
    adoptNote: 'Adopting will replace your current milestones with these AI suggestions.',
    dismiss: 'Dismiss',
    saving: 'Saving…',
    adopt: '✓ Adopt this roadmap',
    genFailed: 'Generation failed',
    emptyRoadmap: 'The AI returned an empty roadmap. Please try again.',
    networkError: 'Network error. Please try again.',
    adoptedTitle: '🚀 Roadmap adopted!',
    adoptedDesc: 'Your milestones are now being tracked.',
    saveFailed: 'Save failed',
    networkSaveError: 'Network error while saving.',
    updateFailedTitle: 'Could not update milestone',
    tryAgain: 'Please try again.',
    msCompleteTitle: '🎉 Milestone complete!',
    msCompleteDesc: '+50 XP — keep your orbit on track.',
    calFailedTitle: 'Could not add to calendar',
    calAddedTitle: 'Added to calendar',
    pageTitle: 'Your Academic Roadmap',
    pageSub: 'UCL Computer Science · IB Diploma · 4-year plan',
    generateWithAi: 'Generate with AI',
    exportPdf: 'Export PDF',
    milestonesDone: (d: number, t: number) => `${d}/${t} milestones done`,
  },
  zh: {
    types: { exam: '考试', competition: '竞赛', cca: '课外活动', application: '申请', academic: '学业', other: '其他' },
    enrolmentSub: '目标大学入学年 🎓',
    currentYearSub: '当前年份 · 打好基础',
    yearsToGo: (n: number) => `距入学还有 ${n} 年`,
    continuingSub: '后续里程碑',
    yearLabel: (i: number, y: number) => `第 ${i} 年 — ${y}`,
    markIncomplete: '标记为未完成',
    markComplete: '标记完成（+50 XP）',
    addToCalendar: '添加到日历',
    calAdded: '✓ 已添加',
    cal: '日历',
    deleteMilestone: '删除里程碑',
    newMilestone: (y: number) => `新建里程碑 — ${y}`,
    type: '类型',
    dueDate: '截止日期',
    titleReq: '标题 *',
    notesOptional: '备注（可选）',
    titlePlaceholder: '例如：提交 UCAS 申请',
    notesPlaceholder: '补充说明…',
    cancel: '取消',
    addMilestone: '+ 添加里程碑',
    current: '当前',
    complete: '已完成',
    doneCount: (d: number, t: number) => `已完成 ${d}/${t}`,
    zeroMilestones: '0 个里程碑',
    noMilestonesYet: '还没有里程碑，在下方添加一个吧。',
    aiPreviewTitle: 'AI 生成路线图预览',
    aiGenerating: '正在为你生成专属路线图…',
    aiSummary: (ms: number, yrs: number) => `${yrs} 年共 ${ms} 个里程碑`,
    aiCrafting: 'Qwen AI 正在为你规划路线图…',
    adoptNote: '采用后，这些 AI 建议将替换你当前的里程碑。',
    dismiss: '关闭',
    saving: '保存中…',
    adopt: '✓ 采用这份路线图',
    genFailed: '生成失败',
    emptyRoadmap: 'AI 返回了空的路线图，请重试。',
    networkError: '网络错误，请重试。',
    adoptedTitle: '🚀 路线图已采用！',
    adoptedDesc: '你的里程碑已开始跟踪。',
    saveFailed: '保存失败',
    networkSaveError: '保存时网络出错。',
    updateFailedTitle: '里程碑更新失败',
    tryAgain: '请重试。',
    msCompleteTitle: '🎉 里程碑完成！',
    msCompleteDesc: '+50 XP — 继续保持你的轨道。',
    calFailedTitle: '添加到日历失败',
    calAddedTitle: '已添加到日历',
    pageTitle: '你的学业路线图',
    pageSub: 'UCL 计算机科学 · IB 文凭 · 4 年规划',
    generateWithAi: 'AI 生成',
    exportPdf: '导出 PDF',
    milestonesDone: (d: number, t: number) => `已完成 ${d}/${t} 个里程碑`,
  },
} satisfies Record<Locale, unknown>

type Dict = (typeof T)[Locale]

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
  currentYear:        number
  enrollmentYear:     number
}

// Builds the timeline columns: every calendar year from now to enrolment,
// plus any year a milestone actually falls in (so nothing is hidden).
function buildYearMetas(currentYear: number, enrollmentYear: number, milestoneYears: number[], t: Dict) {
  const end = Math.max(enrollmentYear, currentYear)
  const set = new Set<number>()
  for (let y = currentYear; y <= end; y++) set.add(y)
  for (const y of milestoneYears) if (Number.isFinite(y)) set.add(y)
  const years = Array.from(set).sort((a, b) => a - b)
  return years.map((y, i) => {
    const toGo = enrollmentYear - y
    const subtitle =
      y === enrollmentYear ? t.enrolmentSub
      : y === currentYear  ? t.currentYearSub
      : toGo > 0           ? t.yearsToGo(toGo)
      :                      t.continuingSub
    return {
      year: y,
      yearLabel: t.yearLabel(i + 1, y),
      subtitle,
      defaultOpen: y === currentYear,
    }
  })
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
  const t = T[useLocale()]
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
        title={ms.completed ? t.markIncomplete : t.markComplete}
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
          {t.types[ms.type]}
        </span>
        {/* Add to calendar */}
        {ms.due_date && (
          <button
            onClick={handleCal}
            title={t.addToCalendar}
            className="opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5 text-[10px] font-semibold px-[6px] py-0.5 rounded-[5px]"
            style={{
              background: calAdded ? 'var(--green-50)' : 'var(--blue-50)',
              color:      calAdded ? 'var(--green)'    : 'var(--blue)',
            }}
          >
            {calAdded ? t.calAdded : (
              <>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {t.cal}
              </>
            )}
          </button>
        )}
        <button
          onClick={() => onDelete(ms.id)}
          className="opacity-0 group-hover:opacity-100 text-[var(--t300)] hover:text-[var(--red)] transition ml-0.5"
          title={t.deleteMilestone}
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
  const t = T[useLocale()]
  const [title, setTitle] = useState('')
  const [type, setType]   = useState<MilestoneType>('academic')
  const [desc, setDesc]   = useState('')
  const [due, setDue]     = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const dueDate = due || `${year}-12-31`
    const month   = due ? parseInt(due.slice(5, 7)) : 12
    onAdd({ id: `m${Date.now()}`, year, month, type, title: title.trim(), description: desc.trim() || 'No description.', due_date: dueDate, completed: false })
    setTitle(''); setDesc(''); setDue('')
  }

  const inputCls = "w-full px-3 py-2.5 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] bg-white text-[var(--t900)] focus:outline-none focus:border-[var(--blue)] placeholder:text-[var(--t300)]"

  return (
    <form onSubmit={submit} className="mt-3 mb-1 p-4 bg-[var(--blue-50)] border border-[var(--blue-100)] rounded-[10px] flex flex-col gap-3">
      <div className="font-display font-semibold text-[12px] text-[var(--blue)]">{t.newMilestone(year)}</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">{t.type}</label>
          <select value={type} onChange={e => setType(e.target.value as MilestoneType)} className={inputCls} style={{ cursor: 'pointer' }}>
            {Object.keys(TYPE_CONFIG).map(k => <option key={k} value={k}>{t.types[k as MilestoneType]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">{t.dueDate}</label>
          <input type="date" value={due} onChange={e => setDue(e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">{t.titleReq}</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t.titlePlaceholder} className={inputCls} />
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">{t.notesOptional}</label>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder={t.notesPlaceholder} className={inputCls} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-[7px] text-[12px] font-semibold text-[var(--t500)] hover:bg-white transition">{t.cancel}</button>
        <button type="submit" className="px-4 py-2 rounded-[7px] text-[12px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition">{t.addMilestone}</button>
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
  const t = T[useLocale()]
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
        <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold transition-all"
          style={{ background: dotBg, color: dotText }}>
          {`'${String(year).slice(-2)}`}
        </div>
        <div className="flex-1">
          <div className="font-display font-bold text-[14px] text-[var(--t900)] flex items-center gap-2">
            {yearLabel}
            {isCurrentYear && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--blue)] text-white">{t.current}</span>
            )}
          </div>
          <div className="text-[12px] text-[var(--t500)]">{subtitle}</div>
        </div>
        <div className="flex items-center gap-2">
          {allDone ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[var(--green-50)] text-[var(--green)]">{t.complete}</span>
          ) : total > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[var(--blue-50)] text-[var(--blue)]">{t.doneCount(done, total)}</span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[#F3F4F6] text-[var(--t500)]">{t.zeroMilestones}</span>
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
              return (
                <div key={type} className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-[var(--t300)] uppercase tracking-widest">{t.types[type as MilestoneType]}</span>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                  </div>
                  {items.map(m => (
                    <MilestoneRow key={m.id} ms={m} onToggle={onToggle} onDelete={onDelete} onAddToCalendar={onAddToCalendar} />
                  ))}
                </div>
              )
            })
          ) : (
            <div className="py-4 text-center text-[12px] text-[var(--t500)]">{t.noMilestonesYet}</div>
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
              {t.addMilestone}
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
  const t = T[useLocale()]
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
            <div className="font-display font-bold text-[16px] text-[var(--t900)]">{t.aiPreviewTitle}</div>
            <div className="text-[12px] text-[var(--t500)] mt-0.5">
              {loading ? t.aiGenerating : t.aiSummary(totalMs, roadmap?.years.length ?? 0)}
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
              <p className="text-[13px] text-[var(--t500)]">{t.aiCrafting}</p>
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
                        {t.types[ms.type as MilestoneType] ?? t.types.other}
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
            <p className="text-[11px] text-[var(--t500)]">{t.adoptNote}</p>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={onClose} className="px-4 py-2 rounded-[8px] text-[12px] font-semibold border border-[var(--border)] text-[var(--t500)] hover:bg-[var(--bg)] transition">
                {t.dismiss}
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
                    {t.saving}
                  </>
                ) : t.adopt}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RoadmapClient({
  initialMilestones, initialAchievements, documents, roadmapId, userId, currentYear, enrollmentYear,
}: RoadmapClientProps) {
  const supabase = createBrowserClient()
  const router   = useRouter()
  const toast    = useToast()
  const locale   = useLocale()
  const t        = T[locale]
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
        // Close the modal so the error surfaces as a toast instead of a blank dialog.
        setShowAiModal(false)
        setAiError(json.message ?? json.error ?? t.genFailed)
        return
      }
      if (!json.roadmap?.years?.length) {
        setShowAiModal(false)
        setAiError(t.emptyRoadmap)
        return
      }
      setAiRoadmap(json.roadmap)
    } catch {
      setShowAiModal(false)
      setAiError(t.networkError)
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
        toast({ title: t.adoptedTitle, description: t.adoptedDesc, variant: 'success' })
        // Reload to pull fresh milestones from DB
        router.refresh()
      } else {
        const json = await res.json() as { error?: string }
        setAiError(json.error ?? t.saveFailed)
      }
    } catch {
      setAiError(t.networkSaveError)
    } finally {
      setAiSaving(false)
    }
  }

  const { xp, level: lvl } = summarizeProgress({ achievements: initialAchievements, milestones, documents })

  const yearMetas = buildYearMetas(currentYear, enrollmentYear, milestones.map(m => m.year), t)

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
      toast({ title: t.updateFailedTitle, description: t.tryAgain, variant: 'error' })
      return
    }
    if (next) {
      toast({ title: t.msCompleteTitle, description: t.msCompleteDesc, variant: 'success' })
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
      ? { title: t.calFailedTitle, description: t.tryAgain, variant: 'error' }
      : { title: t.calAddedTitle, description: m.title, variant: 'success' })
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
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">{t.pageTitle}</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">{t.pageSub}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateAi}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
            </svg>
            {t.generateWithAi}
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[var(--border)] text-[var(--t500)] bg-white hover:border-[var(--blue)] hover:text-[var(--blue)] transition">
            {t.exportPdf}
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
              { text: t.milestonesDone(done, total), bg: done === total && total > 0 ? 'var(--green-50)' : 'var(--blue-50)', color: done === total && total > 0 ? 'var(--green)' : 'var(--blue)' },
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

        {yearMetas.map(meta => (
          <YearBlock
            key={meta.year}
            {...meta}
            milestones={milestones.filter(m => m.year === meta.year)}
            isCurrentYear={meta.year === currentYear}
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
