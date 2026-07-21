import type { Metadata } from 'next'
import { createAdminClient } from '@/db/server'
import { decideShareAccess } from '@/lib/progress-share'
import { buildProgressSnapshot, toPublicProgressCard, type ApplicationStatus, type PublicProgressCard } from '@/lib/progress'
import { getLatestAssessment } from '@/lib/data'

// Public 申请进度 card — opened from a WeChat family group, no account needed.
// The token IS the credential: unguessable, expiring, revocable. Data access
// goes through the service role, then through toPublicProgressCard so only the
// coarse projection (statuses, counts, stage, readiness level) ever renders.

export const metadata: Metadata = {
  title: '申请进度 — Novara',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

const STATUS_ZH: Record<ApplicationStatus, { label: string; cls: string }> = {
  researching: { label: '调研中', cls: 'bg-[#F3F4F6] text-[#4B5563]' },
  applied:     { label: '已递交', cls: 'bg-[var(--blue-50)] text-[var(--blue)]' },
  offer:       { label: '已录取 🎉', cls: 'bg-[#DEF7EC] text-[#057A55]' },
  rejected:    { label: '未通过', cls: 'bg-[#FDE8E8] text-[#E02424]' },
  enrolled:    { label: '已入学', cls: 'bg-[#DEF7EC] text-[#057A55]' },
}

const READINESS_ZH: Record<string, string> = {
  early_stage: '起步阶段', developing: '发展中', on_track: '步入正轨',
  competitive: '有竞争力', strong: '实力强劲',
}

function ExpiredCard({ reason }: { reason: 'expired' | 'revoked' | 'not_found' }) {
  return (
    <main className="min-h-screen bg-[#F6F7FB] flex items-center justify-center p-6" style={{ fontFamily: "'Noto Sans SC', 'Inter', sans-serif" }}>
      <div className="bg-white rounded-[14px] shadow-sm border border-[#E5E7EB] max-w-[360px] w-full p-8 text-center">
        <div className="text-[36px] mb-3">⏳</div>
        <h1 className="font-bold text-[17px] text-[#111827] mb-2">
          {reason === 'revoked' ? '分享已被撤销' : '链接已过期或无效'}
        </h1>
        <p className="text-[13px] text-[#6B7280] leading-relaxed">
          请联系家长重新生成分享链接。
        </p>
      </div>
    </main>
  )
}

function Card({ card }: { card: PublicProgressCard }) {
  const msPct = card.milestones.total > 0
    ? Math.round((card.milestones.done / card.milestones.total) * 100) : 0
  return (
    <main className="min-h-screen bg-[#F6F7FB] flex justify-center p-4 sm:p-6" style={{ fontFamily: "'Noto Sans SC', 'Inter', sans-serif" }}>
      <div className="w-full max-w-[420px]">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1A56DB] to-[#7C3AED] rounded-t-[14px] px-6 pt-7 pb-6 text-white">
          <div className="text-[12px] opacity-80 mb-1">留学申请进度</div>
          <h1 className="font-bold text-[22px]">{card.student.displayName}</h1>
          {card.student.targetUniversity && (
            <div className="text-[13px] mt-1 opacity-90">🎯 目标：{card.student.targetUniversity}</div>
          )}
          <div className="mt-4 inline-flex items-center gap-2 bg-white/15 rounded-full px-3.5 py-1.5">
            <span className="text-[15px]">🚀</span>
            <span className="text-[13px] font-semibold">当前阶段：{card.journey.stage.zh}</span>
          </div>
        </div>

        <div className="bg-white rounded-b-[14px] shadow-sm border border-t-0 border-[#E5E7EB] px-6 py-5 flex flex-col gap-5">
          {/* Milestones */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="text-[13px] font-bold text-[#111827]">里程碑进度</h2>
              <span className="text-[12px] font-semibold text-[#1A56DB]">{card.milestones.done}/{card.milestones.total}</span>
            </div>
            <div className="bg-[#F3F4F6] rounded-full h-[8px] overflow-hidden">
              <div className="h-full rounded-full bg-[#1A56DB]" style={{ width: `${msPct}%` }} />
            </div>
          </section>

          {/* Readiness level */}
          {card.readinessLevel && (
            <section className="flex items-center justify-between">
              <h2 className="text-[13px] font-bold text-[#111827]">综合准备度</h2>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-bold text-white bg-[#1A56DB]">
                {READINESS_ZH[card.readinessLevel] ?? card.readinessLevel}
              </span>
            </section>
          )}

          {/* Applications */}
          {card.applications.length > 0 && (
            <section>
              <h2 className="text-[13px] font-bold text-[#111827] mb-2">目标院校</h2>
              <div className="flex flex-col gap-2">
                {card.applications.map(a => (
                  <div key={a.name + a.deadline} className="flex items-center justify-between border border-[#E5E7EB] rounded-[10px] px-3.5 py-2.5">
                    <div>
                      <div className="text-[13px] font-semibold text-[#111827]">{a.name}</div>
                      <div className="text-[11px] text-[#6B7280] mt-0.5">
                        {[a.country, a.deadline && `截止 ${a.deadline}`].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${STATUS_ZH[a.status].cls}`}>
                      {STATUS_ZH[a.status].label}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Upcoming deadlines */}
          {card.upcomingDeadlines.length > 0 && (
            <section>
              <h2 className="text-[13px] font-bold text-[#111827] mb-2">近期重要日期</h2>
              <div className="flex flex-col gap-1.5">
                {card.upcomingDeadlines.map(d => (
                  <div key={d.title + d.date} className="flex items-center justify-between text-[12px]">
                    <span className="text-[#4B5563]">{d.title}</span>
                    <span className="font-semibold text-[#B45309]">{d.date}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <footer className="border-t border-[#E5E7EB] pt-3 text-center">
            <div className="text-[11px] text-[#9CA3AF]">
              由 Novara 生成 · {card.generatedAt} · 仅展示进度概览
            </div>
          </footer>
        </div>
      </div>
    </main>
  )
}

export default async function SharedProgressPage({ params }: { params: { token: string } }) {
  const token = params.token
  // Cheap sanity gate before touching the DB
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return <ExpiredCard reason="not_found" />

  const admin = createAdminClient()
  const { data: share } = await admin
    .from('progress_shares')
    .select('student_id, expires_at, revoked_at')
    .eq('token', token)
    .maybeSingle()

  const access = decideShareAccess(
    share ? { expiresAt: share.expires_at, revokedAt: share.revoked_at } : null,
    new Date().toISOString(),
  )
  if (access !== 'ok') return <ExpiredCard reason={access} />

  const studentId = share!.student_id
  const today = new Date().toISOString().slice(0, 10)

  const [{ data: profile }, { data: sp }, { data: targets }, { data: events }, { data: roadmap }] =
    await Promise.all([
      admin.from('profiles').select('display_name').eq('id', studentId).single(),
      admin.from('student_profiles').select('current_school, current_curriculum, target_university').eq('user_id', studentId).maybeSingle(),
      admin.from('university_targets').select('name, country, programme, status, deadline').eq('student_id', studentId),
      admin.from('calendar_events').select('title, event_date, type').eq('student_id', studentId).gte('event_date', today).order('event_date').limit(4),
      admin.from('roadmaps').select('id').eq('student_id', studentId).eq('status', 'active').order('generated_at', { ascending: false }).limit(1).maybeSingle(),
    ])

  let milestones: Array<{ title: string; due_date: string | null; completed: boolean }> = []
  if (roadmap?.id) {
    const { data: ms } = await admin.from('milestones').select('title, due_date, completed').eq('roadmap_id', roadmap.id)
    milestones = ms ?? []
  }
  const assessment = await getLatestAssessment(admin, studentId)

  const snapshot = buildProgressSnapshot({
    student: {
      displayName: profile?.display_name ?? '学生',
      school: sp?.current_school,
      curriculum: sp?.current_curriculum,
      targetUniversity: sp?.target_university,
    },
    milestones: milestones.map(m => ({ title: m.title, dueDate: m.due_date, completed: m.completed })),
    targets: (targets ?? []).map(t => ({
      name: t.name, country: t.country, programme: t.programme,
      status: t.status as ApplicationStatus, deadline: t.deadline,
    })),
    assessment,
    achievements: [],
    upcomingEvents: (events ?? []).map(e => ({ title: e.title, date: e.event_date, type: e.type })),
    today,
  })

  return <Card card={toPublicProgressCard(snapshot)} />
}
