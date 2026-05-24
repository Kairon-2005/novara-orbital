'use client'

import { useState, useMemo } from 'react'
import { MOCK_CHILD_PROFILE } from '@/lib/mock-data'

// ── Types (mirrors fee_items table) ───────────────────────────────────────────

type FeeStatus = 'paid' | 'pending' | 'overdue'

type FeeItem = {
  id: string
  label_zh: string
  category: 'tuition' | 'homestay' | 'insurance' | 'materials' | 'activity' | 'exam' | 'other'
  amount_sgd: number
  due_date: string
  status: FeeStatus
  notes_zh?: string
}

// ── Shared fee data — same items the student sees, parent gets read + overview
// In production: same fee_items table, joined via student_id from parent_links.

const FEES: FeeItem[] = [
  { id: 'f1', label_zh: '2026年第二学期学费',      category: 'tuition',   amount_sgd: 9500, due_date: '2026-04-01', status: 'paid',    notes_zh: 'ACS International IB课程' },
  { id: 'f2', label_zh: '5月寄宿家庭费',            category: 'homestay',  amount_sgd: 950,  due_date: '2026-05-01', status: 'paid'  },
  { id: 'f3', label_zh: '6月寄宿家庭费',            category: 'homestay',  amount_sgd: 950,  due_date: '2026-06-01', status: 'pending' },
  { id: 'f4', label_zh: '年度学生健康保险',          category: 'insurance', amount_sgd: 1200, due_date: '2026-07-15', status: 'pending', notes_zh: 'AXA国际外籍人士保险，8月续期' },
  { id: 'f5', label_zh: '2026年IB考试费用',         category: 'exam',      amount_sgd: 2800, due_date: '2026-03-15', status: 'paid',    notes_zh: '7门科目 × IB费用标准' },
  { id: 'f6', label_zh: '2026年第三学期学费',        category: 'tuition',   amount_sgd: 9500, due_date: '2026-07-01', status: 'pending' },
  { id: 'f7', label_zh: '教材及文具费',              category: 'materials', amount_sgd: 320,  due_date: '2026-04-10', status: 'paid'  },
  { id: 'f8', label_zh: '理科实验室押金（逾期）',    category: 'activity',  amount_sgd: 150,  due_date: '2026-04-01', status: 'overdue', notes_zh: '请联系谭老师处理' },
]

const SGD_TO_CNY = 5.28

const STATUS_STYLE: Record<FeeStatus, { bg: string; color: string; zh: string }> = {
  paid:    { bg: '#F3FAF7', color: '#057A55', zh: '已付款' },
  pending: { bg: '#FFFBEB', color: '#B45309', zh: '待付款' },
  overdue: { bg: '#FDF2F2', color: '#E02424', zh: '已逾期' },
}

const CAT_EMOJI: Record<string, string> = {
  tuition: '🏫', homestay: '🏠', insurance: '🛡', materials: '📎',
  activity: '🎽', exam: '📝', other: '📌',
}

const CAT_ZH: Record<string, string> = {
  tuition: '学费', homestay: '寄宿费', insurance: '保险',
  materials: '教材', activity: '活动费', exam: '考试费', other: '其他',
}

function sgd(n: number) { return `SGD ${n.toLocaleString()}` }
function cny(n: number) { return `¥ ${Math.round(n * SGD_TO_CNY).toLocaleString()}` }

function FeeRow({ fee }: { fee: FeeItem }) {
  const s = STATUS_STYLE[fee.status]
  return (
    <div className={`flex items-center gap-4 px-4 py-3.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)] ${fee.status === 'overdue' ? 'bg-[#FDF2F2]/40' : ''}`}>
      <div className="text-[18px] flex-shrink-0">{CAT_EMOJI[fee.category] ?? '📌'}</div>
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-semibold leading-snug ${fee.status === 'overdue' ? 'text-[#E02424]' : 'text-[var(--t900)]'}`}>
          {fee.label_zh}
        </div>
        {fee.notes_zh && <div className="text-[11px] text-[var(--t500)] mt-0.5">{fee.notes_zh}</div>}
        <div className="text-[11px] text-[var(--t300)] mt-0.5">
          截止：{new Date(fee.due_date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-display font-bold text-[14px] text-[var(--t900)]">{sgd(fee.amount_sgd)}</div>
        <div className="text-[11px] text-[var(--t300)]">{cny(fee.amount_sgd)}</div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1"
          style={{ background: s.bg, color: s.color }}>{s.zh}</span>
      </div>
    </div>
  )
}

export default function ParentFinancePage() {
  const [filter, setFilter] = useState<FeeStatus | 'all'>('all')
  const child = MOCK_CHILD_PROFILE

  const filtered = useMemo(() => {
    const arr = filter === 'all' ? FEES : FEES.filter(f => f.status === filter)
    const order: FeeStatus[] = ['overdue', 'pending', 'paid']
    return [...arr].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))
  }, [filter])

  const total   = FEES.reduce((s, f) => s + f.amount_sgd, 0)
  const paid    = FEES.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount_sgd, 0)
  const pending = FEES.filter(f => f.status === 'pending').reduce((s, f) => s + f.amount_sgd, 0)
  const overdue = FEES.filter(f => f.status === 'overdue').reduce((s, f) => s + f.amount_sgd, 0)
  const pct     = total > 0 ? Math.round((paid / total) * 100) : 0

  const upcoming = FEES
    .filter(f => f.status !== 'paid' && f.due_date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 4)

  const byCat = useMemo(() => {
    const m: Record<string, number> = {}
    FEES.forEach(f => { m[f.category] = (m[f.category] ?? 0) + f.amount_sgd })
    return m
  }, [])

  return (
    <div className="flex flex-col min-h-screen" style={{ fontFamily: "'Noto Sans SC', 'Inter', sans-serif" }}>

      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-40">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">费用规划</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">
            {child.display_name_cn} · {child.current_school} · 参考汇率：1 SGD ≈ {SGD_TO_CNY} CNY
          </div>
        </div>
        {overdue > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#FDF2F2] text-[#E02424] text-[12px] font-semibold border border-[#FECACA]">
            ⚠ 逾期 {sgd(overdue)}
          </span>
        )}
      </div>

      <div className="p-[28px_36px] flex-1">

        {/* Stat cards */}
        <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { zh: '年度总费用', val: sgd(total),   sub: cny(total),       color: 'var(--t900)' },
            { zh: '已付款',    val: sgd(paid),    sub: `${FEES.filter(f=>f.status==='paid').length} 项`,    color: '#057A55' },
            { zh: '待付款',    val: sgd(pending), sub: `${FEES.filter(f=>f.status==='pending').length} 项`, color: '#B45309' },
            overdue > 0
              ? { zh: '已逾期', val: sgd(overdue), sub: '请尽快处理', color: '#E02424' }
              : { zh: '付款完成度', val: `${pct}%`, sub: '本学年', color: '#1A56DB' },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-[18px_20px]">
              <div className="text-[11px] text-[var(--t500)] mb-1">{s.zh}</div>
              <div className="font-display font-bold text-[20px] leading-none mb-0.5" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[11px] text-[var(--t300)]">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="bg-white border border-[var(--border)] rounded-[10px] px-5 py-4 mb-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-[var(--t900)]">年度付款进度</span>
            <span className="text-[12px] font-bold text-[var(--green)]">{pct}%</span>
          </div>
          <div className="h-[10px] bg-[#F3F4F6] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--green)' }} />
          </div>
          <div className="flex justify-between text-[11px] text-[var(--t300)] mt-1.5">
            <span>已付 {sgd(paid)} ({cny(paid)})</span>
            <span>剩余 {sgd(total - paid)} ({cny(total - paid)})</span>
          </div>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 280px', alignItems: 'start' }}>

          {/* Fee list */}
          <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--t300)] uppercase tracking-wide mr-1">筛选：</span>
              {(['all','overdue','pending','paid'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium border-[1.5px] transition-all ${
                    filter === f
                      ? 'bg-[var(--blue-50)] text-[var(--blue)] border-[var(--blue)]'
                      : 'bg-white text-[var(--t700)] border-[var(--border)] hover:bg-[var(--bg)]'
                  }`}>
                  {f === 'all' ? '全部' : STATUS_STYLE[f].zh}
                </button>
              ))}
            </div>
            {filtered.map(fee => <FeeRow key={fee.id} fee={fee} />)}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Upcoming */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">⏰ 即将到期</div>
              {upcoming.length === 0 ? (
                <div className="text-[12px] text-[var(--t300)] text-center py-3">暂无待缴项目</div>
              ) : upcoming.map(f => {
                const daysLeft = Math.ceil((new Date(f.due_date).getTime() - Date.now()) / 86_400_000)
                return (
                  <div key={f.id} className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
                    <div>
                      <div className="text-[12px] font-semibold text-[var(--t900)] leading-snug">{f.label_zh}</div>
                      <div className="text-[11px] text-[var(--t500)]">
                        {new Date(f.due_date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[12px] font-bold text-[var(--t900)]">{sgd(f.amount_sgd)}</div>
                      <div className={`text-[10px] font-semibold ${daysLeft <= 14 ? 'text-[#E02424]' : 'text-[var(--t300)]'}`}>
                        {daysLeft <= 0 ? '已逾期' : `${daysLeft}天后`}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* By category */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">📊 费用分类</div>
              {Object.entries(byCat).map(([cat, amt]) => (
                <div key={cat} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                  <span className="flex items-center gap-2 text-[12px] text-[var(--t700)]">{CAT_EMOJI[cat]} {CAT_ZH[cat]}</span>
                  <div className="text-right">
                    <div className="text-[12px] font-bold text-[var(--t900)]">{sgd(amt)}</div>
                    <div className="text-[10px] text-[var(--t300)]">{cny(amt)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[var(--blue-50)] border border-[var(--blue-100)] rounded-[10px] p-4">
              <div className="text-[12px] font-semibold text-[var(--blue)] mb-1">💡 付款提示</div>
              <div className="text-[12px] text-[var(--t700)] leading-relaxed">
                学费可通过PayNow（UEN: T08CC1234A）或电汇付款。汇率仅供参考，实际以银行汇率为准。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
