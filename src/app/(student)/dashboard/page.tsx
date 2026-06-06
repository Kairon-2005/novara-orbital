import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/db/server'
import { computeJourney } from '@/lib/gamification'
import { JourneyCard } from '@/components/ui/JourneyCard'
import InviteCodeButton from './InviteCodeButton'

// ── helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86_400_000))
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayLabel() {
  return new Date().toLocaleDateString('en-SG', {
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

function DeadlineRow({ title, sub, days }: { title: string; sub: string; days: number }) {
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
        {days}d
      </span>
    </div>
  )
}

// ── milestone row ─────────────────────────────────────────────────────────────

function MilestoneRow({
  title, status, due,
}: {
  title: string
  status: 'done' | 'active' | 'pending'
  due?: string | null
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
      ? <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[var(--green-50)] text-[var(--green)]">Done</span>
      : status === 'active'
      ? <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[var(--blue-50)] text-[var(--blue)]">Active</span>
      : <span className="text-[11px] text-[var(--t300)]">{due ? `Due ${due}` : ''}</span>

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
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id),
    ])

  const displayName = profileRes.data?.display_name ?? 'Student'
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

  // ── derived stats ────────────────────────────────────────────────────────
  const readinessScore = readiness?.score ?? 0
  const totalMilestones = milestones.length
  const doneMilestones  = milestones.filter(m => m.completed).length
  const achievementsCount = achievementsRes.count ?? 0

  const journey = computeJourney({
    readinessScore,
    milestonesDone: doneMilestones,
    milestonesTotal: totalMilestones,
    achievements: achievementsCount,
  })

  const nextDeadline = events[0]
  const daysToNext   = nextDeadline ? daysUntil(nextDeadline.event_date) : null

  const totalFees = fees.reduce((s, f) => s + Number(f.amount_sgd), 0)
  const paidFees  = fees.filter(f => f.paid).reduce((s, f) => s + Number(f.amount_sgd), 0)

  const gap = readiness?.gap_analysis ?? ''
  const aiRec = gap.split('.').slice(0, 2).join('.').trim() || 'Complete your profile to get personalised recommendations.'

  // readiness sub-scores (mock from gap text or default)
  const scores = {
    academic:    Math.min(100, readinessScore + 18),
    competition: Math.min(100, readinessScore + 0),
    community:   Math.max(0,   readinessScore - 40),
    leadership:  Math.min(100, readinessScore - 15),
  }

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Topbar ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-50">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">
            {greeting()}, {firstName} 👋
          </div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">
            {todayLabel()}
            {sp?.current_school && ` · ${sp.current_school}`}
            {sp?.current_year   && ` · ${sp.current_year}`}
            {sp?.current_curriculum && ` · ${sp.current_curriculum} Track`}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/homestay" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border-[1.5px] border-[var(--blue)] text-[var(--blue)] bg-white hover:bg-[var(--blue-50)] transition">
            Find Homestay
          </Link>
          <Link href="/roadmap" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition">
            View Roadmap →
          </Link>
        </div>
      </div>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <div className="p-[28px_36px] flex-1">

        {/* Journey hero — gamified progress toward the dream university */}
        <JourneyCard journey={journey} dreamUniversity={sp?.target_university} lang="en" />

        {/* Profile completion banner — shown until onboarding_done */}
        {!sp?.onboarding_done && (
          <div className="mb-5 flex items-center gap-4 bg-[var(--amber-50,#FFFBEB)] border border-[#F59E0B]/30 rounded-[10px] px-5 py-3.5">
            <div className="w-9 h-9 bg-[#FEF3C7] rounded-[9px] flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-[var(--amber)]">Complete your profile to unlock all features</div>
              <div className="text-[12px] text-[var(--t500)] mt-0.5">Add your school, target university, and curriculum so the AI Planner can generate your personalised roadmap.</div>
            </div>
            <Link href="/onboarding" className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[12px] font-semibold bg-[var(--amber)] text-white hover:opacity-90 transition whitespace-nowrap">
              Set up profile →
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
            label="University Readiness"
            sub={readinessScore ? '↑ Track your progress' : 'Complete onboarding'}
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
            label={nextDeadline ? nextDeadline.title : 'Next Deadline'}
            sub={nextDeadline ? nextDeadline.event_date : 'No upcoming events'}
          />
          <StatCard
            icon={
              <div className="w-9 h-9 bg-[var(--green-50)] rounded-[9px] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              </div>
            }
            num={totalMilestones ? `${doneMilestones}/${totalMilestones}` : '—'}
            numColor="text-[var(--green)]"
            label="Milestones Done"
            sub={roadmap ? 'Active roadmap' : 'Generate your roadmap'}
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
            label="SGD Tracked / yr"
            sub={totalFees ? `Budget: SGD ${Math.round(totalFees / 1000)}k` : 'Add fee items'}
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
                  AI Roadmap{sp?.target_university ? ` — ${sp.target_university}` : ''}
                </div>
                <Link href="/roadmap" className="text-[var(--blue)] text-[12px] font-medium px-2 py-1.5 hover:bg-[var(--blue-50)] rounded-[6px] transition">
                  View full →
                </Link>
              </div>
              <div className="p-[16px_18px]">
                {roadmap ? (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] text-[var(--t500)]">
                        {sp?.current_curriculum ? `${sp.current_curriculum} Track` : 'Active roadmap'}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[var(--blue-50)] text-[var(--blue)]">
                        On Track ✓
                      </span>
                    </div>
                    <ProgressBar pct={totalMilestones ? Math.round((doneMilestones / totalMilestones) * 100) : 0} />
                    {/* Year progression */}
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {['Year 1', 'Year 2', 'Year 3', 'Year 4'].map((yr, i) => {
                        const done  = i === 0
                        const curr  = i === 1
                        return (
                          <div key={yr} className={`text-center px-2 py-2.5 rounded-[8px] ${
                            done ? 'bg-[var(--blue)]' : curr ? 'bg-[var(--blue-50)] border-2 border-[var(--blue)]' : 'bg-[var(--bg)] border border-[var(--border)]'
                          }`}>
                            <div className={`text-[11px] font-bold ${done ? 'text-white' : curr ? 'text-[var(--blue)]' : 'text-[var(--t300)]'}`}>{yr}</div>
                            <div className={`text-[10px] mt-0.5 ${done ? 'text-white/75' : curr ? 'text-[var(--blue)]' : 'text-[var(--t300)]'}`}>
                              {done ? 'Complete' : curr ? 'In progress' : 'Upcoming'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-[13px] text-[var(--t500)] mb-3">No roadmap generated yet</div>
                    <Link href="/roadmap" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition">
                      Generate AI Roadmap →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Milestones card */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-[18px] py-[14px] border-b border-[var(--border)] flex items-center justify-between">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)]">
                  {new Date().toLocaleString('en-SG', { month: 'long', year: 'numeric' })} — Milestones
                </div>
                {totalMilestones > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[#F3F4F6] text-[var(--t500)]">
                    {totalMilestones - doneMilestones} remaining
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
                    />
                  ))
                ) : (
                  <div className="text-center py-6 text-[13px] text-[var(--t500)]">
                    {roadmap ? 'No milestones for this period.' : 'Generate a roadmap to see your milestones.'}
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
                  Upcoming Deadlines
                </div>
                <Link href="/calendar" className="text-[var(--blue)] text-[12px] font-medium hover:underline">
                  Calendar →
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
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-5 text-center text-[13px] text-[var(--t500)]">No upcoming deadlines</div>
                )}
              </div>
            </div>

            {/* Portfolio readiness */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-[18px] py-[14px] border-b border-[var(--border)] flex items-center justify-between">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)]">Portfolio Readiness</div>
                <span className="font-display font-extrabold text-[22px] text-[var(--blue)]">
                  {readinessScore || '—'}
                  {readinessScore > 0 && <span className="text-[13px] font-medium text-[var(--t300)]">/100</span>}
                </span>
              </div>
              <div className="p-[16px_18px]">
                {readiness ? (
                  <>
                    <ProgressBar pct={readinessScore} />
                    <div className="flex flex-col gap-2 mt-3.5">
                      {[
                        { label: 'Academic Results',   pct: scores.academic,    color: 'var(--green)', tag: 'Strong',  tagColor: 'text-[var(--green)]' },
                        { label: 'Competitions',        pct: scores.competition, color: 'var(--blue)',  tag: 'Good',    tagColor: 'text-[var(--blue)]' },
                        { label: 'Community Service',   pct: scores.community,   color: 'var(--red)',   tag: scores.community < 40 ? 'Weak ⚠' : 'Average', tagColor: scores.community < 40 ? 'text-[var(--red)]' : 'text-[var(--blue)]' },
                        { label: 'Leadership / CCA',    pct: scores.leadership,  color: 'var(--blue)',  tag: 'Average', tagColor: 'text-[var(--blue)]' },
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between">
                          <span className="text-[12px] text-[var(--t500)]">{row.label}</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-20 bg-[#F3F4F6] rounded-full h-[5px]">
                              <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color }} />
                            </div>
                            <span className={`text-[11px] font-semibold ${row.tagColor}`}>{row.tag}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3.5 px-3 py-2.5 bg-[#FFFBEB] rounded-[8px] border-l-[3px] border-[#F59E0B]">
                      <div className="text-[12px] font-semibold text-[var(--amber)]">💡 AI Recommendation</div>
                      <div className="text-[12px] text-[var(--t500)] mt-1 leading-relaxed">{aiRec}</div>
                    </div>
                  </>
                ) : (
                  <div className="py-5 text-center text-[13px] text-[var(--t500)]">
                    Complete onboarding to see your readiness score.
                  </div>
                )}
              </div>
            </div>

            {/* Share with Parent — invite code */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-[18px] py-[14px] border-b border-[var(--border)]">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)] flex items-center gap-[7px]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                  Share with Parent
                </div>
              </div>
              <div className="px-[18px] py-[14px]">
                <p className="text-[12px] text-[var(--t500)] mb-3 leading-relaxed">
                  Give your parent this invite code to link their account and view your roadmap and fees.
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
