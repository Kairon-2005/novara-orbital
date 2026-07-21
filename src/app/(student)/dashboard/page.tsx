import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/db/server'
import { getLocale } from '@/lib/locale-server'
import type { Locale } from '@/lib/locale'
import { buildProgressSnapshot } from '@/lib/progress'
import { getLatestAssessment } from '@/lib/data'
import { ADMISSION_DIMENSIONS, type DimensionLevel } from '@/types/assessment'
import { JourneyCard } from '@/components/ui/JourneyCard'
import InviteCodeButton from './InviteCodeButton'

// ── copy ─────────────────────────────────────────────────────────────────────

const T = {
  en: {
    fallbackName: 'Student',
    morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening',
    track: (c: string) => `${c} Track`,
    viewRoadmap: 'View Roadmap →',
    bannerTitle: 'Complete your profile to unlock all features',
    bannerDesc: 'Add your school, target university, and curriculum so the AI Planner can generate your personalised roadmap.',
    setUpProfile: 'Set up profile →',
    universityReadiness: 'University Readiness',
    trackProgress: '↑ Track your progress',
    completeOnboarding: 'Complete onboarding',
    nextDeadline: 'Next Deadline',
    noUpcomingEvents: 'No upcoming events',
    milestonesDone: 'Milestones Done',
    activeRoadmap: 'Active roadmap',
    generateYourRoadmap: 'Generate your roadmap',
    sgdTracked: 'SGD Tracked / yr',
    budget: (n: number) => `Budget: SGD ${n}k`,
    addFeeItems: 'Add fee items',
    aiRoadmap: 'AI Roadmap',
    viewFull: 'View full →',
    onTrack: 'On Track ✓',
    noDueDate: 'No due date',
    noRoadmapYet: 'No roadmap generated yet',
    generateAiRoadmap: 'Generate AI Roadmap →',
    milestonesTitle: (d: string) => `${d} — Milestones`,
    remaining: (n: number) => `${n} remaining`,
    noMilestonesPeriod: 'No milestones for this period.',
    generateToSeeMilestones: 'Generate a roadmap to see your milestones.',
    upcomingDeadlines: 'Upcoming Deadlines',
    calendarLink: 'Calendar →',
    noUpcomingDeadlines: 'No upcoming deadlines',
    daysBadge: (d: number) => `${d}d`,
    portfolioReadiness: 'Portfolio Readiness',
    dims: { strong: 'Strong', competitive: 'Competitive', developing: 'Developing', weak: 'Weak ⚠', missing: 'Missing' },
    assessPrefix: 'Run a ', assessLink: 'portfolio assessment', assessSuffix: ' to see your five-dimension breakdown.',
    aiRecommendation: '💡 AI Recommendation',
    aiRecFallback: 'Complete your profile to get personalised recommendations.',
    completeOnboardingScore: 'Complete onboarding to see your readiness score.',
    shareWithParent: 'Share with Parent',
    shareDesc: 'Give your parent this invite code to link their account and view your roadmap and fees.',
    done: 'Done', active: 'Active', due: (d: string) => `Due ${d}`,
  },
  zh: {
    fallbackName: '同学',
    morning: '早上好', afternoon: '下午好', evening: '晚上好',
    track: (c: string) => `${c} 课程`,
    viewRoadmap: '查看路线图 →',
    bannerTitle: '完善个人资料，解锁全部功能',
    bannerDesc: '填写你的学校、目标大学和课程体系，AI 规划师就能为你生成专属的学习路线图。',
    setUpProfile: '完善资料 →',
    universityReadiness: '大学准备度',
    trackProgress: '↑ 持续追踪进度',
    completeOnboarding: '请先完成入门设置',
    nextDeadline: '下一个截止日期',
    noUpcomingEvents: '暂无近期日程',
    milestonesDone: '已完成里程碑',
    activeRoadmap: '路线图进行中',
    generateYourRoadmap: '生成你的路线图',
    sgdTracked: '每年费用（新币）',
    budget: (n: number) => `预算：${n}k 新币`,
    addFeeItems: '添加费用项目',
    aiRoadmap: 'AI 学习路线图',
    viewFull: '查看完整 →',
    onTrack: '进度正常 ✓',
    noDueDate: '无截止日期',
    noRoadmapYet: '还没有生成路线图',
    generateAiRoadmap: '生成 AI 学习路线图 →',
    milestonesTitle: (d: string) => `${d} — 里程碑`,
    remaining: (n: number) => `剩余 ${n} 项`,
    noMilestonesPeriod: '本阶段暂无里程碑。',
    generateToSeeMilestones: '生成路线图后即可查看里程碑。',
    upcomingDeadlines: '近期截止日期',
    calendarLink: '日历 →',
    noUpcomingDeadlines: '暂无近期截止日期',
    daysBadge: (d: number) => `${d}天`,
    portfolioReadiness: '档案准备度',
    dims: { strong: '优势', competitive: '有竞争力', developing: '发展中', weak: '薄弱 ⚠', missing: '缺失' },
    assessPrefix: '完成一次', assessLink: '档案评估', assessSuffix: '，即可查看五个维度的详细分析。',
    aiRecommendation: '💡 AI 建议',
    aiRecFallback: '完善个人资料后，即可获得个性化建议。',
    completeOnboardingScore: '完成入门设置后即可查看准备度评分。',
    shareWithParent: '与家长共享',
    shareDesc: '把这个邀请码发给家长，绑定账号后即可查看你的路线图和费用。',
    done: '完成', active: '进行中', due: (d: string) => `截止 ${d}`,
  },
} satisfies Record<Locale, unknown>

type Dict = (typeof T)[Locale]

// ── helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86_400_000))
}

function greeting(t: Dict) {
  const h = new Date().getHours()
  if (h < 12) return t.morning
  if (h < 17) return t.afternoon
  return t.evening
}

function todayLabel(locale: Locale) {
  return new Date().toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-SG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ── stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon, num, numColor, label, sub, subColor,
}: {
  icon: React.ReactNode
  num: string
  numColor?: string
  label: string
  sub: string
  subColor?: string
}) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-[10px] p-[18px_20px] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="mb-3">{icon}</div>
      <div className={`font-display font-extrabold text-[28px] leading-none ${numColor ?? 'text-[var(--t900)]'}`}>
        {num}
      </div>
      <div className="text-[12px] text-[var(--t500)] mt-1">{label}</div>
      <div className={`text-[11px] font-semibold mt-2 ${subColor ?? 'text-[var(--t300)]'}`}>{sub}</div>
    </div>
  )
}

// ── deadline row ──────────────────────────────────────────────────────────────

function DeadlineRow({ title, sub, days, t }: { title: string; sub: string; days: number; t: Dict }) {
  const urgent   = days <= 14
  const moderate = days <= 30

  const dotColor = urgent ? 'bg-[var(--red)]' : moderate ? 'bg-[#F59E0B]' : 'bg-[var(--blue)]'
  const bg       = urgent ? 'bg-[var(--red-50)]' : ''
  const badge    = urgent
    ? 'bg-[var(--red-50)] text-[var(--red)]'
    : moderate
    ? 'bg-[#FFFBEB] text-[var(--amber)]'
    : 'bg-[#F3F4F6] text-[var(--t500)]'

  return (
    <div className={`flex items-center gap-2.5 px-2 py-[9px] rounded-[7px] ${bg}`}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[var(--t900)] truncate">{title}</div>
        <div className="text-[11px] text-[var(--t300)]">{sub}</div>
      </div>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold whitespace-nowrap ${badge}`}>
        {t.daysBadge(days)}
      </span>
    </div>
  )
}

// ── milestone row ─────────────────────────────────────────────────────────────

function MilestoneRow({
  title, status, due, t,
}: {
  title: string
  status: 'done' | 'active' | 'pending'
  due?: string | null
  t: Dict
}) {
  const dotClass =
    status === 'done'
      ? 'bg-[var(--green)] border-[var(--green)]'
      : status === 'active'
      ? 'bg-[var(--blue)] border-[var(--blue)]'
      : 'bg-white border-[var(--border)]'
  const rowBg = status === 'active' ? 'bg-[var(--blue-50)] rounded-[8px]' : ''
  const textClass = status === 'done' ? 'line-through text-[var(--t300)]' : status === 'active' ? 'text-[var(--blue)] font-medium' : 'text-[var(--t700)]'
  const badge =
    status === 'done'
      ? <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[var(--green-50)] text-[var(--green)]">{t.done}</span>
      : status === 'active'
      ? <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[var(--blue-50)] text-[var(--blue)]">{t.active}</span>
      : <span className="text-[11px] text-[var(--t300)]">{due ? t.due(due) : ''}</span>

  return (
    <div className={`flex items-start gap-2.5 px-3 py-[9px] mb-1 ${rowBg}`}>
      <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${dotClass}`}>
        {status === 'done' && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M5 12l5 5L19 7"/></svg>
        )}
        {status === 'active' && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="4" fill="white"/></svg>
        )}
      </div>
      <div className={`flex-1 text-[13px] leading-[1.45] ${textClass}`}>{title}</div>
      {badge}
    </div>
  )
}

// ── progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct, color = 'var(--blue)' }: { pct: number; color?: string }) {
  return (
    <div className="bg-[#F3F4F6] rounded-full h-[7px] overflow-hidden">
      <div className="h-full rounded-full transition-[width_.3s]" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locale = getLocale('en')
  const t = T[locale]

  // ── fetch all data in parallel ──────────────────────────────────────────
  const [profileRes, spRes, roadmapRes, quotaRes, readinessRes, eventsRes, feesRes, achievementsRes] =
    await Promise.all([
      supabase.from('profiles').select('display_name').eq('id', user.id).single(),
      supabase.from('student_profiles')
        .select('current_school, current_year, current_curriculum, target_university, target_programme, onboarding_done, invite_code')
        .eq('user_id', user.id).maybeSingle(),
      supabase.from('roadmaps').select('id, raw_json, generated_at')
        .eq('student_id', user.id).eq('status', 'active').order('generated_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('roadmap_generation_quota').select('total_generations').eq('user_id', user.id).maybeSingle(),
      supabase.from('readiness_scores').select('score, gap_analysis').eq('student_id', user.id).maybeSingle(),
      supabase.from('calendar_events')
        .select('title, event_date, type')
        .eq('student_id', user.id)
        .gte('event_date', new Date().toISOString().slice(0, 10))
        .order('event_date').limit(5),
      supabase.from('fee_items')
        .select('amount_sgd, paid, due_date')
        .eq('student_id', user.id),
      supabase.from('achievements')
        .select('title, category, date')
        .eq('student_id', user.id)
        .order('date', { ascending: false }),
    ])

  const displayName = profileRes.data?.display_name ?? t.fallbackName
  const firstName   = displayName.split(' ')[0]
  const sp          = spRes.data
  const roadmap     = roadmapRes.data
  const readiness   = readinessRes.data
  const events      = eventsRes.data ?? []
  const fees        = feesRes.data ?? []

  // milestones — fetch current month + upcoming if roadmap exists
  let milestones: Array<{ id: string; title: string; due_date: string | null; completed: boolean; month: number | null; year: number }> = []
  if (roadmap) {
    const now = new Date()
    const { data: ms } = await supabase
      .from('milestones')
      .select('id, title, due_date, completed, month, year')
      .eq('roadmap_id', roadmap.id)
      .or(`year.eq.${now.getFullYear()},year.eq.${now.getFullYear() + 1}`)
      .order('year').order('month', { ascending: true })
      .limit(8)
    milestones = ms ?? []
  }

  // ── derived stats — all progress facts come from the snapshot module ─────
  const assessment = await getLatestAssessment(supabase, user.id)

  const snapshot = buildProgressSnapshot({
    student: {
      displayName,
      school: sp?.current_school,
      curriculum: sp?.current_curriculum,
      targetUniversity: sp?.target_university,
      targetProgramme: sp?.target_programme,
    },
    milestones: milestones.map(m => ({ title: m.title, dueDate: m.due_date, completed: m.completed })),
    targets: [],
    assessment,
    readinessScore: readiness?.score,
    achievements: achievementsRes.data ?? [],
    upcomingEvents: events.map(e => ({ title: e.title, date: e.event_date, type: e.type })),
    today: new Date().toISOString().slice(0, 10),
  })

  const readinessScore = readiness?.score ?? 0
  const totalMilestones = snapshot.milestones.total
  const doneMilestones  = snapshot.milestones.done
  const journey = snapshot.journey

  const nextDeadline = events[0]
  const daysToNext   = nextDeadline ? daysUntil(nextDeadline.event_date) : null

  const totalFees = fees.reduce((s, f) => s + Number(f.amount_sgd), 0)
  const paidFees  = fees.filter(f => f.paid).reduce((s, f) => s + Number(f.amount_sgd), 0)

  const gap = readiness?.gap_analysis ?? ''
  const aiRec = gap.split('.').slice(0, 2).join('.').trim() || t.aiRecFallback

  const dimLabel: Record<DimensionLevel, { tag: string; cls: string; color: string }> = {
    strong:      { tag: t.dims.strong,     cls: 'text-[var(--green)]', color: 'var(--green)' },
    competitive: { tag: t.dims.competitive, cls: 'text-[var(--blue)]',  color: 'var(--blue)' },
    developing:  { tag: t.dims.developing, cls: 'text-[var(--blue)]',  color: 'var(--blue)' },
    weak:        { tag: t.dims.weak,     cls: 'text-[var(--red)]',   color: 'var(--red)' },
    missing:     { tag: t.dims.missing,    cls: 'text-[var(--t300)]',  color: '#9CA3AF' },
  }

  const cnFont = locale === 'zh' ? ' font-cn' : ''

  return (
    <div className={`flex flex-col min-h-screen${cnFont}`}>

      {/* ── Topbar ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-50">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">
            {greeting(t)}, {firstName} 👋
          </div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">
            {todayLabel(locale)}
            {sp?.current_school && ` · ${sp.current_school}`}
            {sp?.current_year   && ` · ${sp.current_year}`}
            {sp?.current_curriculum && ` · ${t.track(sp.current_curriculum)}`}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/roadmap" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition">
            {t.viewRoadmap}
          </Link>
        </div>
      </div>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <div className="p-[28px_36px] flex-1">

        {/* Journey hero — gamified progress toward the dream university */}
        <JourneyCard journey={journey} dreamUniversity={sp?.target_university} lang={locale} />

        {/* Profile completion banner — shown until onboarding_done */}
        {!sp?.onboarding_done && (
          <div className="mb-5 flex items-center gap-4 bg-[var(--amber-50,#FFFBEB)] border border-[#F59E0B]/30 rounded-[10px] px-5 py-3.5">
            <div className="w-9 h-9 bg-[#FEF3C7] rounded-[9px] flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-[var(--amber)]">{t.bannerTitle}</div>
              <div className="text-[12px] text-[var(--t500)] mt-0.5">{t.bannerDesc}</div>
            </div>
            <Link href="/onboarding" className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[12px] font-semibold bg-[var(--amber)] text-white hover:opacity-90 transition whitespace-nowrap">
              {t.setUpProfile}
            </Link>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={
              <div className="w-9 h-9 bg-[var(--blue-50)] rounded-[9px] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
            }
            num={readinessScore ? `${readinessScore}%` : '—'}
            numColor="text-[var(--blue)]"
            label={t.universityReadiness}
            sub={readinessScore ? t.trackProgress : t.completeOnboarding}
            subColor={readinessScore ? 'text-[var(--green)]' : 'text-[var(--t300)]'}
          />
          <StatCard
            icon={
              <div className="w-9 h-9 bg-[var(--red-50)] rounded-[9px] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              </div>
            }
            num={daysToNext !== null ? String(daysToNext) : '—'}
            numColor="text-[var(--red)]"
            label={nextDeadline ? nextDeadline.title : t.nextDeadline}
            sub={nextDeadline ? nextDeadline.event_date : t.noUpcomingEvents}
          />
          <StatCard
            icon={
              <div className="w-9 h-9 bg-[var(--green-50)] rounded-[9px] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              </div>
            }
            num={totalMilestones ? `${doneMilestones}/${totalMilestones}` : '—'}
            numColor="text-[var(--green)]"
            label={t.milestonesDone}
            sub={roadmap ? t.activeRoadmap : t.generateYourRoadmap}
            subColor="text-[var(--green)]"
          />
          <StatCard
            icon={
              <div className="w-9 h-9 bg-[#FFFBEB] rounded-[9px] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
            }
            num={totalFees ? `${Math.round(paidFees / 1000)}k` : '—'}
            numColor="text-[#B45309]"
            label={t.sgdTracked}
            sub={totalFees ? t.budget(Math.round(totalFees / 1000)) : t.addFeeItems}
          />
        </div>

        {/* Main 2-col grid */}
        <div className="grid gap-5 grid-cols-1 items-start lg:grid-cols-[1.6fr_1fr]">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* Roadmap progress card */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-[18px] py-[14px] border-b border-[var(--border)] flex items-center justify-between">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)] flex items-center gap-[7px]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  {t.aiRoadmap}{sp?.target_university ? ` — ${sp.target_university}` : ''}
                </div>
                <Link href="/roadmap" className="text-[var(--blue)] text-[12px] font-medium px-2 py-1.5 hover:bg-[var(--blue-50)] rounded-[6px] transition">
                  {t.viewFull}
                </Link>
              </div>
              <div className="p-[16px_18px]">
                {roadmap ? (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] text-[var(--t500)]">
                        {sp?.current_curriculum ? t.track(sp.current_curriculum) : t.activeRoadmap}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[var(--blue-50)] text-[var(--blue)]">
                        {t.onTrack}
                      </span>
                    </div>
                    <ProgressBar pct={totalMilestones ? Math.round((doneMilestones / totalMilestones) * 100) : 0} />
                    {/* Next up — real upcoming milestones from the snapshot */}
                    {snapshot.milestones.next.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                        {snapshot.milestones.next.map(m => (
                          <div key={m.title} className="px-3 py-2.5 rounded-[8px] bg-[var(--blue-50)] border border-[var(--blue-100)]">
                            <div className="text-[11px] font-bold text-[var(--blue)] truncate">{m.title}</div>
                            <div className="text-[10px] mt-0.5 text-[var(--t500)]">{m.dueDate ?? t.noDueDate}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-[13px] text-[var(--t500)] mb-3">{t.noRoadmapYet}</div>
                    <Link href="/roadmap" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition">
                      {t.generateAiRoadmap}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Milestones card */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-[18px] py-[14px] border-b border-[var(--border)] flex items-center justify-between">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)]">
                  {t.milestonesTitle(new Date().toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-SG', { month: 'long', year: 'numeric' }))}
                </div>
                {totalMilestones > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[#F3F4F6] text-[var(--t500)]">
                    {t.remaining(totalMilestones - doneMilestones)}
                  </span>
                )}
              </div>
              <div className="px-[18px] py-3">
                {milestones.length > 0 ? (
                  milestones.slice(0, 6).map(m => (
                    <MilestoneRow
                      key={m.id}
                      title={m.title}
                      status={m.completed ? 'done' : 'pending'}
                      due={m.due_date}
                      t={t}
                    />
                  ))
                ) : (
                  <div className="text-center py-6 text-[13px] text-[var(--t500)]">
                    {roadmap ? t.noMilestonesPeriod : t.generateToSeeMilestones}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* Upcoming deadlines */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-[18px] py-[14px] border-b border-[var(--border)] flex items-center justify-between">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)] flex items-center gap-[7px]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  {t.upcomingDeadlines}
                </div>
                <Link href="/calendar" className="text-[var(--blue)] text-[12px] font-medium hover:underline">
                  {t.calendarLink}
                </Link>
              </div>
              <div className="px-[18px] py-[10px]">
                {events.length > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    {events.slice(0, 5).map(ev => (
                      <DeadlineRow
                        key={ev.title + ev.event_date}
                        title={ev.title}
                        sub={ev.event_date}
                        days={daysUntil(ev.event_date)}
                        t={t}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-5 text-center text-[13px] text-[var(--t500)]">{t.noUpcomingDeadlines}</div>
                )}
              </div>
            </div>

            {/* Portfolio readiness */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-[18px] py-[14px] border-b border-[var(--border)] flex items-center justify-between">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)]">{t.portfolioReadiness}</div>
                <span className="font-display font-extrabold text-[22px] text-[var(--blue)]">
                  {readinessScore || '—'}
                  {readinessScore > 0 && <span className="text-[13px] font-medium text-[var(--t300)]">/100</span>}
                </span>
              </div>
              <div className="p-[16px_18px]">
                {readiness || snapshot.readiness ? (
                  <>
                    <ProgressBar pct={readinessScore || journey.pct} />
                    {snapshot.readiness ? (
                      <div className="flex flex-col gap-2 mt-3.5">
                        {snapshot.readiness.dimensions.map(dim => {
                          const meta = ADMISSION_DIMENSIONS.find(d => d.id === dim.id)
                          const look = dimLabel[dim.level]
                          return (
                            <div key={dim.id} className="flex items-center justify-between">
                              <span className="text-[12px] text-[var(--t500)]">{meta?.name ?? dim.id}</span>
                              <div className="flex items-center gap-1.5">
                                <div className="w-20 bg-[#F3F4F6] rounded-full h-[5px]">
                                  <div className="h-full rounded-full" style={{ width: `${dim.score}%`, background: look.color }} />
                                </div>
                                <span className={`text-[11px] font-semibold ${look.cls}`}>{look.tag}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="mt-3.5 text-[12px] text-[var(--t500)]">
                        {t.assessPrefix}<Link href="/portfolio" className="text-[var(--blue)] font-medium hover:underline">{t.assessLink}</Link>{t.assessSuffix}
                      </div>
                    )}
                    <div className="mt-3.5 px-3 py-2.5 bg-[#FFFBEB] rounded-[8px] border-l-[3px] border-[#F59E0B]">
                      <div className="text-[12px] font-semibold text-[var(--amber)]">{t.aiRecommendation}</div>
                      <div className="text-[12px] text-[var(--t500)] mt-1 leading-relaxed">{aiRec}</div>
                    </div>
                  </>
                ) : (
                  <div className="py-5 text-center text-[13px] text-[var(--t500)]">
                    {t.completeOnboardingScore}
                  </div>
                )}
              </div>
            </div>

            {/* Share with Parent — invite code */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-[18px] py-[14px] border-b border-[var(--border)]">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)] flex items-center gap-[7px]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                  {t.shareWithParent}
                </div>
              </div>
              <div className="px-[18px] py-[14px]">
                <p className="text-[12px] text-[var(--t500)] mb-3 leading-relaxed">
                  {t.shareDesc}
                </p>
                {sp?.invite_code ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 font-mono font-bold text-[22px] text-[var(--blue)] tracking-[0.25em] bg-[var(--blue-50)] rounded-[8px] px-4 py-2.5 text-center">
                      {sp.invite_code}
                    </div>
                  </div>
                ) : (
                  <InviteCodeButton />
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
