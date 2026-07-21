import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/db/server'
import { getLocale } from '@/lib/locale-server'
import { buildProgressSnapshot } from '@/lib/progress'
import { getLatestAssessment } from '@/lib/data'
import { JourneyCard } from '@/components/ui/JourneyCard'
import ShareProgressButton from './ShareProgressButton'

// Labels for the dimension-based assessment (zh strings are the originals)
const DIM_NAME_ZH: Record<string, string> = {
  academic_strength: '学术实力',
  programme_fit: '专业匹配度',
  evidence_portfolio: '材料与证据',
  communication_storytelling: '表达与叙事',
  initiative_impact: '主动性与影响力',
}
const DIM_NAME_EN: Record<string, string> = {
  academic_strength: 'Academic strength',
  programme_fit: 'Programme fit',
  evidence_portfolio: 'Evidence & portfolio',
  communication_storytelling: 'Communication & storytelling',
  initiative_impact: 'Initiative & impact',
}
const READINESS_ZH: Record<string, string> = {
  early_stage: '起步阶段', developing: '发展中', on_track: '步入正轨',
  competitive: '有竞争力', strong: '实力强劲',
}
const READINESS_EN: Record<string, string> = {
  early_stage: 'Early stage', developing: 'Developing', on_track: 'On track',
  competitive: 'Competitive', strong: 'Strong',
}
const DIM_LEVEL_ZH: Record<string, string> = {
  missing: '缺失', weak: '薄弱', developing: '发展中', competitive: '有竞争力', strong: '强',
}
const DIM_LEVEL_EN: Record<string, string> = {
  missing: 'Missing', weak: 'Weak', developing: 'Developing', competitive: 'Competitive', strong: 'Strong',
}
const DIM_LEVEL_COLOR: Record<string, string> = {
  missing: '#9CA3AF', weak: '#E02424', developing: '#D97706', competitive: '#1A56DB', strong: '#057A55',
}

// ── copy ─────────────────────────────────────────────────────────────────────

const T = {
  en: {
    hello: (n: string) => `Hello, ${n} 👋`,
    parentFallback: 'Parent', parentInitialFallback: 'P',
    noChildTitle: 'No student account linked',
    noChildBody: 'Ask your child for their 6-digit invite code to connect.',
    studentFallback: 'Student', studentInitialFallback: 'S',
    aiRecFallback: 'Complete the student profile to get personalized recommendations.',
    yearN: (n: string | number) => `Year ${n}`,
    curriculum: (c: string) => `${c} curriculum`,
    goal: (u: string) => `Goal: ${u}`,
    completeProfile: 'Complete the student profile',
    lastUpdated: 'Last updated', today: 'Today',
    readinessTitle: '📊 University Application Readiness',
    defaultUni: 'National University of Singapore',
    overallReadiness: 'Overall readiness',
    outOf100: '/ 100',
    assessmentHint: 'Once your child completes an AI profile assessment, a detailed five-dimension analysis appears here.',
    aiSuggestion: '💡 AI Suggestion',
    fillProfileFirst: 'Complete the student profile to see progress here.',
    noticesTitle: '📬 Latest School Notices',
    noticesCount: (n: number) => `${n} notice${n === 1 ? '' : 's'}`,
    newNotice: '📩 New', read: 'Read',
    viewTranslation: 'View full translation →',
    noNotices: 'No school notices yet. Upload one to get a Chinese translation.',
    datesTitle: '⏰ Key Dates · Next 30 Days',
    inDays: (n: number) => `in ${n} days`,
    noDates: 'No key dates coming up.',
    achievementsTitle: '🏆 Recent Achievements', viewAll: 'View all',
    noAchievements: 'No achievements yet.',
    financeTitle: '💰 Finance Overview', viewDetails: 'View details',
    paidThisYear: 'Paid this year', totalYear: 'Total for the year',
    budgetLine: (pct: number, remaining: string) => `${pct}% paid · SGD ${remaining} remaining`,
    noFees: 'No fee records yet.',
  },
  zh: {
    hello: (n: string) => `您好，${n} 👋`,
    parentFallback: '家长', parentInitialFallback: '家',
    noChildTitle: '尚未连接学生账户',
    noChildBody: '请向您的孩子索取6位邀请码以完成连接。',
    studentFallback: '学生', studentInitialFallback: '威',
    aiRecFallback: '请完成学生档案以获取个性化建议。',
    yearN: (n: string | number) => `第${n}年级`,
    curriculum: (c: string) => `${c}课程`,
    goal: (u: string) => `目标：${u}`,
    completeProfile: '请完成学生档案',
    lastUpdated: '最后更新', today: '今天',
    readinessTitle: '📊 大学申请准备进度',
    defaultUni: '新加坡国立大学',
    overallReadiness: '综合准备度',
    outOf100: '/ 100分',
    assessmentHint: '孩子完成一次AI档案评估后，这里会显示五个维度的详细分析。',
    aiSuggestion: '💡 AI建议',
    fillProfileFirst: '请先完成学生资料填写以查看进度。',
    noticesTitle: '📬 最新学校通知',
    noticesCount: (n: number) => `${n}条通知`,
    newNotice: '📩 新通知', read: '已读',
    viewTranslation: '查看完整翻译 →',
    noNotices: '暂无学校通知。上传通知以获取中文翻译。',
    datesTitle: '⏰ 近30天重要日期',
    inDays: (n: number) => `${n}天后`,
    noDates: '近期无重要日期。',
    achievementsTitle: '🏆 最近成就', viewAll: '查看全部',
    noAchievements: '暂无成就记录。',
    financeTitle: '💰 财务概览', viewDetails: '查看详情',
    paidThisYear: '本年度已付', totalYear: '年度总费用',
    budgetLine: (pct: number, remaining: string) => `已使用 ${pct}% · 剩余 SGD ${remaining}`,
    noFees: '暂无费用记录。',
  },
}

// ── helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86_400_000))
}

function todayCN() {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const days = ['日','一','二','三','四','五','六']
  return `${y}年${m}月${day}日 星期${days[d.getDay()]} · 北京时间 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function todayEN() {
  const d = new Date()
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

// ── ProgressBar ───────────────────────────────────────────────────────────────

function ProgressBar({ pct, color = 'var(--blue)', height = 7 }: { pct: number; color?: string; height?: number }) {
  return (
    <div className="bg-[#F3F4F6] rounded-full overflow-hidden" style={{ height }}>
      <div className="h-full rounded-full transition-[width_.3s]" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function ParentDashboardPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locale = getLocale('zh')
  const t = T[locale]
  const DIM_NAME  = locale === 'zh' ? DIM_NAME_ZH : DIM_NAME_EN
  const READINESS = locale === 'zh' ? READINESS_ZH : READINESS_EN
  const DIM_LEVEL = locale === 'zh' ? DIM_LEVEL_ZH : DIM_LEVEL_EN
  const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-SG'
  const todayLine = locale === 'zh' ? todayCN() : todayEN()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  // Get linked child
  const { data: link } = await supabase
    .from('parent_links')
    .select('student_id')
    .eq('parent_id', user.id)
    .maybeSingle()

  const childId = link?.student_id ?? null
  const parentName = profile?.display_name ?? t.parentFallback
  const parentInitial = parentName[0] ?? t.parentInitialFallback

  // If no child linked yet
  if (!childId) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-50">
          <div>
            <div className="font-display font-bold text-[17px] text-[var(--t900)]">{t.hello(parentName)}</div>
            <div className="text-[11px] text-[var(--t500)] mt-0.5">{todayLine}</div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="text-[40px] mb-4">👪</div>
            <div className="font-display font-bold text-[18px] text-[var(--t900)] mb-2">{t.noChildTitle}</div>
            <div className="text-[13px] text-[var(--t500)]">{t.noChildBody}</div>
          </div>
        </div>
      </div>
    )
  }

  // Fetch all child data in parallel
  const [childProfileRes, childSpRes, readinessRes, eventsRes, achievementsRes, feesRes, commsRes] =
    await Promise.all([
      supabase.from('profiles').select('display_name').eq('id', childId).single(),
      supabase.from('student_profiles')
        .select('current_school, current_year, current_curriculum, target_university')
        .eq('user_id', childId).maybeSingle(),
      supabase.from('readiness_scores').select('score, gap_analysis').eq('student_id', childId).maybeSingle(),
      supabase.from('calendar_events')
        .select('title, event_date, type')
        .eq('student_id', childId)
        .gte('event_date', new Date().toISOString().slice(0, 10))
        .order('event_date').limit(4),
      supabase.from('achievements')
        .select('id, title, category, date')
        .eq('student_id', childId)
        .order('date', { ascending: false })
        .limit(3),
      supabase.from('fee_items')
        .select('amount_sgd, paid, name, due_date')
        .eq('student_id', childId)
        .order('due_date'),
      supabase.from('school_communications')
        .select('id, chinese_summary, submitted_at, chinese_translation')
        .eq('student_id', childId)
        .order('submitted_at', { ascending: false })
        .limit(3),
    ])

  const childName    = childProfileRes.data?.display_name ?? t.studentFallback
  const childInitial = childName[0] ?? t.studentInitialFallback
  const sp           = childSpRes.data
  const readiness    = readinessRes.data
  const events       = eventsRes.data ?? []
  const achievements = achievementsRes.data ?? []
  const fees         = feesRes.data ?? []
  const comms        = commsRes.data ?? []

  const readinessScore = readiness?.score ?? 0

  // Child milestone progress — feeds the journey hero so parents see real tracking
  let childMilestones: Array<{ title: string; due_date: string | null; completed: boolean }> = []
  const { data: childRoadmap } = await supabase
    .from('roadmaps').select('id')
    .eq('student_id', childId).eq('status', 'active')
    .order('generated_at', { ascending: false }).limit(1).maybeSingle()
  if (childRoadmap?.id) {
    const { data: ms } = await supabase
      .from('milestones').select('title, due_date, completed').eq('roadmap_id', childRoadmap.id)
    childMilestones = ms ?? []
  }
  // Latest dimension-based assessment (parents can read via RLS)
  const childAssessment = await getLatestAssessment(supabase, childId)

  // One snapshot — the same 申请进度 truth the student sees and the share card renders
  const snapshot = buildProgressSnapshot({
    student: {
      displayName: childName,
      school: sp?.current_school,
      curriculum: sp?.current_curriculum,
      targetUniversity: sp?.target_university,
    },
    milestones: childMilestones.map(m => ({ title: m.title, dueDate: m.due_date, completed: m.completed })),
    targets: [],
    assessment: childAssessment,
    readinessScore,
    achievements: achievements.map(a => ({ title: a.title, category: a.category, date: a.date })),
    upcomingEvents: events.map(e => ({ title: e.title, date: e.event_date, type: e.type })),
    today: new Date().toISOString().slice(0, 10),
  })
  const journey = snapshot.journey

  const totalFees = fees.reduce((s, f) => s + Number(f.amount_sgd), 0)
  const paidFees  = fees.filter(f => f.paid).reduce((s, f) => s + Number(f.amount_sgd), 0)
  const budgetPct = totalFees > 0 ? Math.round((paidFees / totalFees) * 100) : 0

  const gap = readiness?.gap_analysis ?? ''
  const aiRec = gap.split('.').slice(0, 2).join('.').trim() || t.aiRecFallback

  const achivementsIconMap: Record<string, string> = {
    competition: '🏆', academic: '📚', cca: '🎵', volunteer: '🤝', award: '🥇', other: '⭐',
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ fontFamily: "'Noto Sans SC', 'Inter', sans-serif" }}>

      {/* ── Topbar ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-50">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">
            {t.hello(parentName)}
          </div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">{todayLine}</div>
        </div>
        <ShareProgressButton />
      </div>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <div className="p-[28px_36px] flex-1">

        {/* Child info banner */}
        <div className="bg-[var(--blue-50)] border border-[var(--blue-100)] rounded-[10px] px-5 py-3.5 mb-[22px] flex items-center gap-4">
          <div className="w-11 h-11 bg-[var(--blue)] rounded-full flex items-center justify-center text-white font-display font-extrabold text-[20px] flex-shrink-0">
            {childInitial}
          </div>
          <div className="flex-1">
            <div className="font-display font-bold text-[16px] text-[var(--t900)]">
              {childName}
            </div>
            <div className="text-[12px] text-[var(--t500)] mt-0.5">
              {[sp?.current_school, sp?.current_year && t.yearN(sp.current_year), sp?.current_curriculum && t.curriculum(sp.current_curriculum), sp?.target_university && t.goal(sp.target_university)].filter(Boolean).join(' · ') || t.completeProfile}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-[var(--t300)]">{t.lastUpdated}</div>
            <div className="text-[12px] font-semibold text-[var(--t700)]">{t.today}</div>
          </div>
        </div>

        {/* Journey hero — your child's progress toward the dream university */}
        <JourneyCard journey={journey} dreamUniversity={sp?.target_university} lang={locale} />

        {/* Main 2-col grid */}
        <div className="grid gap-5 grid-cols-1 items-start lg:grid-cols-[1.6fr_1fr]">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* University readiness */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-[18px] py-[14px] border-b border-[var(--border)] flex items-center justify-between">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)]">{t.readinessTitle}</div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[var(--blue-50)] text-[var(--blue)]">
                  {t.goal(sp?.target_university ?? t.defaultUni)}
                </span>
              </div>
              <div className="p-[16px_18px]">
                {childAssessment ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[12px] text-[var(--t500)]">{t.overallReadiness}</span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-bold text-white bg-[var(--blue)]">
                        {READINESS[childAssessment.overallLevel] ?? childAssessment.overallLevel}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {childAssessment.dimensionScores.map(d => (
                        <div key={d.dimensionId} className="flex items-center justify-between">
                          <span className="text-[12px] text-[var(--t500)]">{DIM_NAME[d.dimensionId] ?? d.dimensionId}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-[120px] bg-[#F3F4F6] rounded-full h-[6px]">
                              <div className="h-full rounded-full" style={{ width: `${d.score}%`, background: DIM_LEVEL_COLOR[d.level] }} />
                            </div>
                            <span className="text-[11px] font-semibold w-[42px] text-right" style={{ color: DIM_LEVEL_COLOR[d.level] }}>
                              {DIM_LEVEL[d.level] ?? d.level}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : readiness ? (
                  <>
                    <div className="flex items-center gap-5 mb-4">
                      <div className="text-center">
                        <div className="font-display font-extrabold text-[48px] text-[var(--blue)] leading-none">{readinessScore}</div>
                        <div className="text-[12px] text-[var(--t300)] mt-0.5">{t.outOf100}</div>
                      </div>
                      <div className="flex-1">
                        <ProgressBar pct={readinessScore} height={10} />
                        <div className="mt-4 text-[12px] text-[var(--t500)] leading-relaxed">
                          {t.assessmentHint}
                        </div>
                      </div>
                    </div>
                    <div className="px-3.5 py-2.5 bg-[#FFFBEB] rounded-[8px] border-l-[3px] border-[#F59E0B]">
                      <div className="text-[12px] font-semibold text-[var(--amber)]">{t.aiSuggestion}</div>
                      <div className="text-[12px] text-[var(--t700)] mt-1 leading-relaxed">{aiRec}</div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-[13px] text-[var(--t500)]">{t.fillProfileFirst}</div>
                )}
              </div>
            </div>

            {/* School notices */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-[18px] py-[14px] border-b border-[var(--border)] flex items-center justify-between">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)]">{t.noticesTitle}</div>
                {comms.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[var(--red-50)] text-[var(--red)]">
                    {t.noticesCount(comms.length)}
                  </span>
                )}
              </div>
              <div className="px-[18px] py-[10px]">
                {comms.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {comms.map((c, i) => (
                      <div key={c.id} className={`border rounded-[8px] px-3.5 py-3 ${i === 0 ? 'border-[var(--blue-100)] bg-[var(--blue-50)]' : 'border-[var(--border)] bg-white'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[12px] font-bold ${i === 0 ? 'text-[var(--blue)]' : 'text-[var(--t300)]'}`}>{i === 0 ? t.newNotice : t.read}</span>
                          <span className="text-[11px] text-[var(--t300)]">{new Date(c.submitted_at).toLocaleDateString(dateLocale)}</span>
                        </div>
                        <div className="text-[12px] text-[var(--t700)] leading-relaxed">{c.chinese_summary}</div>
                        {i === 0 && (
                          <Link href="/parent/comms" className="mt-2 block text-[12px] font-semibold text-[var(--blue)] hover:underline">
                            {t.viewTranslation}
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-5 text-center text-[13px] text-[var(--t500)]">{t.noNotices}</div>
                )}
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* Upcoming deadlines */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-[18px] py-[14px] border-b border-[var(--border)]">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)]">{t.datesTitle}</div>
              </div>
              <div className="px-[18px] py-[10px]">
                {events.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {events.map(ev => {
                      const days = daysUntil(ev.event_date)
                      const urgent   = days <= 14
                      const moderate = days <= 30
                      const dotColor = urgent ? 'bg-[var(--red)]' : moderate ? 'bg-[#F59E0B]' : 'bg-[var(--blue)]'
                      const badge    = urgent ? 'bg-[var(--red-50)] text-[var(--red)]' : moderate ? 'bg-[#FFFBEB] text-[var(--amber)]' : 'bg-[var(--blue-50)] text-[var(--blue)]'
                      return (
                        <div key={ev.title + ev.event_date} className={`flex items-center gap-2.5 p-2 rounded-[7px] ${urgent ? 'bg-[var(--red-50)]' : ''}`}>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-semibold text-[var(--t900)] truncate">{ev.title}</div>
                            <div className="text-[10px] text-[var(--t300)]">{ev.event_date}</div>
                          </div>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[6px] text-[10px] font-semibold whitespace-nowrap ${badge}`}>
                            {t.inDays(days)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-5 text-center text-[13px] text-[var(--t500)]">{t.noDates}</div>
                )}
              </div>
            </div>

            {/* Recent achievements */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-[18px] py-[14px] border-b border-[var(--border)] flex items-center justify-between">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)]">{t.achievementsTitle}</div>
                <Link href="/parent/dashboard" className="text-[var(--blue)] text-[12px] font-medium hover:underline">{t.viewAll}</Link>
              </div>
              <div className="px-[18px] py-[10px]">
                {achievements.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {achievements.map((a, i) => (
                      <div key={a.id} className={`flex gap-2.5 items-start p-2 rounded-[7px] ${i === 0 ? 'bg-[var(--green-50)]' : ''}`}>
                        <span className="text-[20px]">{achivementsIconMap[a.category] ?? '⭐'}</span>
                        <div>
                          <div className="text-[12px] font-semibold text-[var(--t900)]">{a.title}</div>
                          <div className="text-[11px] text-[var(--t300)]">{a.date} · {a.category}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-[13px] text-[var(--t500)]">{t.noAchievements}</div>
                )}
              </div>
            </div>

            {/* Finance summary */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-[18px] py-[14px] border-b border-[var(--border)] flex items-center justify-between">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)]">{t.financeTitle}</div>
                <Link href="/parent/finance" className="text-[var(--blue)] text-[12px] font-medium hover:underline">{t.viewDetails}</Link>
              </div>
              <div className="px-[18px] py-3">
                {totalFees > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-[11px] text-[var(--t300)]">{t.paidThisYear}</div>
                        <div className="font-display font-bold text-[18px] text-[var(--t900)]">SGD {paidFees.toLocaleString()}</div>
                        <div className="text-[11px] text-[var(--t300)]">¥ {Math.round(paidFees * 5.28).toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-[var(--t300)]">{t.totalYear}</div>
                        <div className="font-display font-bold text-[18px] text-[var(--t500)]">SGD {totalFees.toLocaleString()}</div>
                      </div>
                    </div>
                    <ProgressBar pct={budgetPct} color="var(--green)" />
                    <div className="text-[11px] text-[var(--t300)] mt-1.5 text-right">
                      {t.budgetLine(budgetPct, (totalFees - paidFees).toLocaleString())}
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center text-[13px] text-[var(--t500)]">{t.noFees}</div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
