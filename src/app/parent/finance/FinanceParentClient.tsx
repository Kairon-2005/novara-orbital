'use client'


type FeeStatus = 'paid' | 'pending' | 'overdue'

type FeeItem = {
  id: string; label_zh: string
  category: 'tuition' | 'homestay' | 'insurance' | 'materials' | 'activity' | 'exam' | 'other'
  amount_sgd: number; due_date: string; status: FeeStatus; notes_zh?: string
}

import { useState, useMemo } from 'react'
import { useLocale } from '@/components/shared/LocaleProvider'
import type { Locale } from '@/lib/locale'
// ── Types (mirrors fee_items table) ───────────────────────────────────────────

// ── Shared fee data — same items the student sees, parent gets read + overview
// In production: same fee_items table, joined via student_id from parent_links.


const SGD_TO_CNY = 5.28

const STATUS_STYLE: Record<FeeStatus, { bg: string; color: string; zh: string; en: string }> = {
  paid:    { bg: '#F3FAF7', color: '#057A55', zh: '已付款', en: 'Paid' },
  pending: { bg: '#FFFBEB', color: '#B45309', zh: '待付款', en: 'Pending' },
  overdue: { bg: '#FDF2F2', color: '#E02424', zh: '已逾期', en: 'Overdue' },
}

const CAT_EMOJI: Record<string, string> = {
  tuition: '🏫', homestay: '🏠', insurance: '🛡', materials: '📎',
  activity: '🎽', exam: '📝', other: '📌',
}

const CAT_LABEL: Record<Locale, Record<string, string>> = {
  en: {
    tuition: 'Tuition', homestay: 'Homestay', insurance: 'Insurance',
    materials: 'Materials', activity: 'Activities', exam: 'Exam fees', other: 'Other',
  },
  zh: {
    tuition: '学费', homestay: '寄宿费', insurance: '保险',
    materials: '教材', activity: '活动费', exam: '考试费', other: '其他',
  },
}

const T = {
  en: {
    pageTitle: 'Fee planner',
    childFallback: 'Your child',
    rateLine: `Reference rate: 1 SGD ≈ ${SGD_TO_CNY} CNY`,
    overdueBadge: (amt: string) => `⚠ Overdue ${amt}`,
    // Stat cards
    totalYear: 'Total for the year',
    paid: 'Paid',
    pending: 'Pending',
    itemsCount: (n: number) => `${n} item${n === 1 ? '' : 's'}`,
    overdue: 'Overdue',
    settleSoon: 'Please settle soon',
    paymentCompletion: 'Payment completion',
    thisSchoolYear: 'This school year',
    // Progress bar
    annualProgress: 'Annual payment progress',
    paidLine: (amt: string, cnyAmt: string) => `Paid ${amt} (${cnyAmt})`,
    remainingLine: (amt: string, cnyAmt: string) => `Remaining ${amt} (${cnyAmt})`,
    // Fee list
    filterLabel: 'Filter:',
    filterAll: 'All',
    dueLabel: 'Due: ',
    // Sidebar
    dueSoonTitle: '⏰ Due soon',
    noPendingItems: 'No pending items',
    overdueShort: 'Overdue',
    inDays: (n: number) => `in ${n} days`,
    byCategoryTitle: '📊 By category',
    payTipTitle: '💡 Payment tips',
    payTipBody: 'Tuition can be paid via PayNow (UEN: T08CC1234A) or bank transfer. Exchange rates are indicative only — your bank’s rate applies.',
  },
  zh: {
    pageTitle: '费用规划',
    childFallback: '孩子',
    rateLine: `参考汇率：1 SGD ≈ ${SGD_TO_CNY} CNY`,
    overdueBadge: (amt: string) => `⚠ 逾期 ${amt}`,
    // Stat cards
    totalYear: '年度总费用',
    paid: '已付款',
    pending: '待付款',
    itemsCount: (n: number) => `${n} 项`,
    overdue: '已逾期',
    settleSoon: '请尽快处理',
    paymentCompletion: '付款完成度',
    thisSchoolYear: '本学年',
    // Progress bar
    annualProgress: '年度付款进度',
    paidLine: (amt: string, cnyAmt: string) => `已付 ${amt} (${cnyAmt})`,
    remainingLine: (amt: string, cnyAmt: string) => `剩余 ${amt} (${cnyAmt})`,
    // Fee list
    filterLabel: '筛选：',
    filterAll: '全部',
    dueLabel: '截止：',
    // Sidebar
    dueSoonTitle: '⏰ 即将到期',
    noPendingItems: '暂无待缴项目',
    overdueShort: '已逾期',
    inDays: (n: number) => `${n}天后`,
    byCategoryTitle: '📊 费用分类',
    payTipTitle: '💡 付款提示',
    payTipBody: '学费可通过PayNow（UEN: T08CC1234A）或电汇付款。汇率仅供参考，实际以银行汇率为准。',
  },
} satisfies Record<Locale, unknown>

function sgd(n: number) { return `SGD ${n.toLocaleString()}` }
function cny(n: number) { return `¥ ${Math.round(n * SGD_TO_CNY).toLocaleString()}` }

function FeeRow({ fee }: { fee: FeeItem }) {
  const locale = useLocale()
  const t = T[locale]
  const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-SG'
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
          {t.dueLabel}{new Date(fee.due_date).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-display font-bold text-[14px] text-[var(--t900)]">{sgd(fee.amount_sgd)}</div>
        <div className="text-[11px] text-[var(--t300)]">{cny(fee.amount_sgd)}</div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1"
          style={{ background: s.bg, color: s.color }}>{s[locale]}</span>
      </div>
    </div>
  )
}

interface FinanceParentClientProps {
  initialFees: Array<{ id: string; name: string; amount_sgd: number; due_date: string; category: string; paid: boolean; paid_date: string | null }>
}

export default function FinanceParentClient({ initialFees }: FinanceParentClientProps) {
  const locale = useLocale()
  const t = T[locale]
  const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-SG'
  const catLabel = CAT_LABEL[locale]
  const today = new Date().toISOString().slice(0, 10)
  const mappedFees: FeeItem[] = initialFees.map(f => ({
    id: f.id,
    label_zh: f.name,
    category: f.category as FeeItem['category'],
    amount_sgd: f.amount_sgd,
    due_date: f.due_date,
    status: (f.paid ? 'paid' : f.due_date < today ? 'overdue' : 'pending') as FeeStatus,
  }))
  const [fees] = useState<FeeItem[]>(mappedFees)
  const [filter, setFilter] = useState<FeeStatus | 'all'>('all')
  const child = { display_name: 'Your child', display_name_cn: '孩子', current_school: '' }
  const childLabel = locale === 'zh' ? child.display_name_cn : t.childFallback

  const filtered = useMemo(() => {
    const arr = filter === 'all' ? fees : fees.filter(f => f.status === filter)
    const order: FeeStatus[] = ['overdue', 'pending', 'paid']
    return [...arr].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))
  }, [filter])

  const total   = fees.reduce((s, f) => s + f.amount_sgd, 0)
  const paid    = fees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount_sgd, 0)
  const pending = fees.filter(f => f.status === 'pending').reduce((s, f) => s + f.amount_sgd, 0)
  const overdue = fees.filter(f => f.status === 'overdue').reduce((s, f) => s + f.amount_sgd, 0)
  const pct     = total > 0 ? Math.round((paid / total) * 100) : 0

  const upcoming = fees
    .filter(f => f.status !== 'paid' && f.due_date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 4)

  const byCat = useMemo(() => {
    const m: Record<string, number> = {}
    fees.forEach(f => { m[f.category] = (m[f.category] ?? 0) + f.amount_sgd })
    return m
  }, [])

  return (
    <div className="flex flex-col min-h-screen" style={{ fontFamily: "'Noto Sans SC', 'Inter', sans-serif" }}>

      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-40">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">{t.pageTitle}</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">
            {childLabel} · {child.current_school} · {t.rateLine}
          </div>
        </div>
        {overdue > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#FDF2F2] text-[#E02424] text-[12px] font-semibold border border-[#FECACA]">
            {t.overdueBadge(sgd(overdue))}
          </span>
        )}
      </div>

      <div className="p-[28px_36px] flex-1">

        {/* Stat cards */}
        <div className="grid gap-4 mb-5 grid-cols-2 lg:grid-cols-4">
          {[
            { label: t.totalYear, val: sgd(total),   sub: cny(total),       color: 'var(--t900)' },
            { label: t.paid,    val: sgd(paid),    sub: t.itemsCount(fees.filter(f=>f.status==='paid').length),    color: '#057A55' },
            { label: t.pending,    val: sgd(pending), sub: t.itemsCount(fees.filter(f=>f.status==='pending').length), color: '#B45309' },
            overdue > 0
              ? { label: t.overdue, val: sgd(overdue), sub: t.settleSoon, color: '#E02424' }
              : { label: t.paymentCompletion, val: `${pct}%`, sub: t.thisSchoolYear, color: '#1A56DB' },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-[18px_20px]">
              <div className="text-[11px] text-[var(--t500)] mb-1">{s.label}</div>
              <div className="font-display font-bold text-[20px] leading-none mb-0.5" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[11px] text-[var(--t300)]">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="bg-white border border-[var(--border)] rounded-[10px] px-5 py-4 mb-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-[var(--t900)]">{t.annualProgress}</span>
            <span className="text-[12px] font-bold text-[var(--green)]">{pct}%</span>
          </div>
          <div className="h-[10px] bg-[#F3F4F6] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--green)' }} />
          </div>
          <div className="flex justify-between text-[11px] text-[var(--t300)] mt-1.5">
            <span>{t.paidLine(sgd(paid), cny(paid))}</span>
            <span>{t.remainingLine(sgd(total - paid), cny(total - paid))}</span>
          </div>
        </div>

        <div className="grid gap-5 grid-cols-1 items-start lg:grid-cols-[1fr_280px]">

          {/* Fee list */}
          <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--t300)] uppercase tracking-wide mr-1">{t.filterLabel}</span>
              {(['all','overdue','pending','paid'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium border-[1.5px] transition-all ${
                    filter === f
                      ? 'bg-[var(--blue-50)] text-[var(--blue)] border-[var(--blue)]'
                      : 'bg-white text-[var(--t700)] border-[var(--border)] hover:bg-[var(--bg)]'
                  }`}>
                  {f === 'all' ? t.filterAll : STATUS_STYLE[f][locale]}
                </button>
              ))}
            </div>
            {filtered.map(fee => <FeeRow key={fee.id} fee={fee} />)}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Upcoming */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">{t.dueSoonTitle}</div>
              {upcoming.length === 0 ? (
                <div className="text-[12px] text-[var(--t300)] text-center py-3">{t.noPendingItems}</div>
              ) : upcoming.map(f => {
                const daysLeft = Math.ceil((new Date(f.due_date).getTime() - Date.now()) / 86_400_000)
                return (
                  <div key={f.id} className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
                    <div>
                      <div className="text-[12px] font-semibold text-[var(--t900)] leading-snug">{f.label_zh}</div>
                      <div className="text-[11px] text-[var(--t500)]">
                        {new Date(f.due_date).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[12px] font-bold text-[var(--t900)]">{sgd(f.amount_sgd)}</div>
                      <div className={`text-[10px] font-semibold ${daysLeft <= 14 ? 'text-[#E02424]' : 'text-[var(--t300)]'}`}>
                        {daysLeft <= 0 ? t.overdueShort : t.inDays(daysLeft)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* By category */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">{t.byCategoryTitle}</div>
              {Object.entries(byCat).map(([cat, amt]) => (
                <div key={cat} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                  <span className="flex items-center gap-2 text-[12px] text-[var(--t700)]">{CAT_EMOJI[cat]} {catLabel[cat]}</span>
                  <div className="text-right">
                    <div className="text-[12px] font-bold text-[var(--t900)]">{sgd(amt)}</div>
                    <div className="text-[10px] text-[var(--t300)]">{cny(amt)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[var(--blue-50)] border border-[var(--blue-100)] rounded-[10px] p-4">
              <div className="text-[12px] font-semibold text-[var(--blue)] mb-1">{t.payTipTitle}</div>
              <div className="text-[12px] text-[var(--t700)] leading-relaxed">
                {t.payTipBody}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
