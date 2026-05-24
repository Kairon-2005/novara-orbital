import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/db/server'

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
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', session.user.id)
    .single()

  // Get linked child
  const { data: link } = await supabase
    .from('parent_links')
    .select('student_id')
    .eq('parent_id', session.user.id)
    .maybeSingle()

  const childId = link?.student_id ?? null
  const parentName = profile?.display_name ?? '家长'
  const parentInitial = parentName[0] ?? '家'

  // If no child linked yet
  if (!childId) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-50">
          <div>
            <div className="font-display font-bold text-[17px] text-[var(--t900)]">您好，{parentName} 👋</div>
            <div className="text-[11px] text-[var(--t500)] mt-0.5">{todayCN()}</div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="text-[40px] mb-4">👪</div>
            <div className="font-display font-bold text-[18px] text-[var(--t900)] mb-2">尚未连接学生账户</div>
            <div className="text-[13px] text-[var(--t500)]">请向您的孩子索取6位邀请码以完成连接。</div>
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

  const childName    = childProfileRes.data?.display_name ?? '学生'
  const childInitial = childName[0] ?? '威'
  const sp           = childSpRes.data
  const readiness    = readinessRes.data
  const events       = eventsRes.data ?? []
  const achievements = achievementsRes.data ?? []
  const fees         = feesRes.data ?? []
  const comms        = commsRes.data ?? []

  const readinessScore = readiness?.score ?? 0
  const totalFees = fees.reduce((s, f) => s + Number(f.amount_sgd), 0)
  const paidFees  = fees.filter(f => f.paid).reduce((s, f) => s + Number(f.amount_sgd), 0)
  const budgetPct = totalFees > 0 ? Math.round((paidFees / totalFees) * 100) : 0

  const gap = readiness?.gap_analysis ?? ''
  const aiRec = gap.split('.').slice(0, 2).join('.').trim() || '请完成学生档案以获取个性化建议。'

  const scores = {
    academic:    Math.min(100, readinessScore + 18),
    competition: Math.min(100, readinessScore),
    community:   Math.max(0,   readinessScore - 40),
  }

  const achivementsIconMap: Record<string, string> = {
    competition: '🏆', academic: '📚', cca: '🎵', volunteer: '🤝', award: '🥇', other: '⭐',
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ fontFamily: "'Noto Sans SC', 'Inter', sans-serif" }}>

      {/* ── Topbar ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-50">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">
            您好，{parentName} 👋
          </div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">{todayCN()}</div>
        </div>
        <button className="inline-flex items-center px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border-[1.5px] text-white bg-[#C81E1E] border-[#C81E1E] hover:bg-[#B91C1C] transition">
          切换语言
        </button>
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
              {[sp?.current_school, sp?.current_year && `第${sp.current_year}年级`, sp?.current_curriculum && `${sp.current_curriculum}课程`, sp?.target_university && `目标：${sp.target_university}`].filter(Boolean).join(' · ') || '请完成学生档案'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-[var(--t300)]">最后更新</div>
            <div className="text-[12px] font-semibold text-[var(--t700)]">今天</div>
          </div>
        </div>

        {/* Main 2-col grid */}
        <div className="grid gap-5" style={{ gridTemplateColumns: '1.6fr 1fr', alignItems: 'start' }}>

          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* University readiness */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-[18px] py-[14px] border-b border-[var(--border)] flex items-center justify-between">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)]">📊 大学申请准备进度</div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[var(--blue-50)] text-[var(--blue)]">
                  目标：{sp?.target_university ?? '新加坡国立大学'}
                </span>
              </div>
              <div className="p-[16px_18px]">
                {readiness ? (
                  <>
                    <div className="flex items-center gap-5 mb-4">
                      <div className="text-center">
                        <div className="font-display font-extrabold text-[48px] text-[var(--blue)] leading-none">{readinessScore}</div>
                        <div className="text-[12px] text-[var(--t300)] mt-0.5">/ 100分</div>
                      </div>
                      <div className="flex-1">
                        <ProgressBar pct={readinessScore} height={10} />
                        <div className="flex flex-col gap-2 mt-4">
                          {[
                            { label: '学术成绩', pct: scores.academic,    color: 'var(--green)', tag: '优秀',    tagColor: 'text-[var(--green)]' },
                            { label: '竞赛经历', pct: scores.competition, color: 'var(--blue)',  tag: '良好',    tagColor: 'text-[var(--blue)]' },
                            { label: '社区服务', pct: scores.community,   color: 'var(--red)',   tag: scores.community < 40 ? '需加强 ⚠' : '一般', tagColor: scores.community < 40 ? 'text-[var(--red)]' : 'text-[var(--t500)]' },
                          ].map(row => (
                            <div key={row.label} className="flex items-center justify-between">
                              <span className="text-[12px] text-[var(--t500)]">{row.label}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-[100px] bg-[#F3F4F6] rounded-full h-[5px]">
                                  <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color }} />
                                </div>
                                <span className={`text-[11px] font-semibold ${row.tagColor}`}>{row.tag}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="px-3.5 py-2.5 bg-[#FFFBEB] rounded-[8px] border-l-[3px] border-[#F59E0B]">
                      <div className="text-[12px] font-semibold text-[var(--amber)]">💡 AI建议</div>
                      <div className="text-[12px] text-[var(--t700)] mt-1 leading-relaxed">{aiRec}</div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-[13px] text-[var(--t500)]">请先完成学生资料填写以查看进度。</div>
                )}
              </div>
            </div>

            {/* School notices */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-[18px] py-[14px] border-b border-[var(--border)] flex items-center justify-between">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)]">📬 最新学校通知</div>
                {comms.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[var(--red-50)] text-[var(--red)]">
                    {comms.length}条通知
                  </span>
                )}
              </div>
              <div className="px-[18px] py-[10px]">
                {comms.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {comms.map((c, i) => (
                      <div key={c.id} className={`border rounded-[8px] px-3.5 py-3 ${i === 0 ? 'border-[var(--blue-100)] bg-[var(--blue-50)]' : 'border-[var(--border)] bg-white'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[12px] font-bold ${i === 0 ? 'text-[var(--blue)]' : 'text-[var(--t300)]'}`}>{i === 0 ? '📩 新通知' : '已读'}</span>
                          <span className="text-[11px] text-[var(--t300)]">{new Date(c.submitted_at).toLocaleDateString('zh-CN')}</span>
                        </div>
                        <div className="text-[12px] text-[var(--t700)] leading-relaxed">{c.chinese_summary}</div>
                        {i === 0 && (
                          <Link href="/parent/comms" className="mt-2 block text-[12px] font-semibold text-[var(--blue)] hover:underline">
                            查看完整翻译 →
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-5 text-center text-[13px] text-[var(--t500)]">暂无学校通知。上传通知以获取中文翻译。</div>
                )}
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* Upcoming deadlines */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-[18px] py-[14px] border-b border-[var(--border)]">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)]">⏰ 近30天重要日期</div>
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
                            {days}天后
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-5 text-center text-[13px] text-[var(--t500)]">近期无重要日期。</div>
                )}
              </div>
            </div>

            {/* Recent achievements */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-[18px] py-[14px] border-b border-[var(--border)] flex items-center justify-between">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)]">🏆 最近成就</div>
                <Link href="/parent/dashboard" className="text-[var(--blue)] text-[12px] font-medium hover:underline">查看全部</Link>
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
                  <div className="py-4 text-center text-[13px] text-[var(--t500)]">暂无成就记录。</div>
                )}
              </div>
            </div>

            {/* Finance summary */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-[18px] py-[14px] border-b border-[var(--border)] flex items-center justify-between">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)]">💰 财务概览</div>
                <Link href="/parent/finance" className="text-[var(--blue)] text-[12px] font-medium hover:underline">查看详情</Link>
              </div>
              <div className="px-[18px] py-3">
                {totalFees > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-[11px] text-[var(--t300)]">本年度已付</div>
                        <div className="font-display font-bold text-[18px] text-[var(--t900)]">SGD {paidFees.toLocaleString()}</div>
                        <div className="text-[11px] text-[var(--t300)]">¥ {Math.round(paidFees * 5.28).toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-[var(--t300)]">年度总费用</div>
                        <div className="font-display font-bold text-[18px] text-[var(--t500)]">SGD {totalFees.toLocaleString()}</div>
                      </div>
                    </div>
                    <ProgressBar pct={budgetPct} color="var(--green)" />
                    <div className="text-[11px] text-[var(--t300)] mt-1.5 text-right">
                      已使用 {budgetPct}% · 剩余 SGD {(totalFees - paidFees).toLocaleString()}
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center text-[13px] text-[var(--t500)]">暂无费用记录。</div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
