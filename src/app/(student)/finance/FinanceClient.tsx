'use client'

import { useState, useMemo } from 'react'
import { createBrowserClient } from '@/db/client'
import { useLocale } from '@/components/shared/LocaleProvider'
import type { Locale } from '@/lib/locale'
import type { DbFeeItem, DbExpense } from './page'

// ── Types (mirrors finance_items + expense_logs tables) ───────────────────────

type FeeStatus = 'paid' | 'pending' | 'overdue'

type FeeItem = {
  id: string
  label: string
  category: 'tuition' | 'homestay' | 'insurance' | 'materials' | 'activity' | 'exam' | 'other'
  amount: number          // SGD
  due_date: string        // YYYY-MM-DD
  status: FeeStatus
  notes?: string
}

type Expense = {
  id: string
  label: string
  category: 'food' | 'transport' | 'books' | 'entertainment' | 'clothing' | 'other'
  amount: number
  date: string            // YYYY-MM-DD
}

// ── copy ─────────────────────────────────────────────────────────────────────

const T = {
  en: {
    status: { paid: 'Paid', pending: 'Pending', overdue: 'Overdue' },
    feeCats: { tuition: 'Tuition', homestay: 'Homestay', insurance: 'Insurance', materials: 'Materials', activity: 'Activity', exam: 'Exam', other: 'Other' },
    expCats: { food: 'food', transport: 'transport', books: 'books', entertainment: 'entertainment', clothing: 'clothing', other: 'other' },
    expCatOptions: { food: 'Food', transport: 'Transport', books: 'Books', entertainment: 'Entertainment', clothing: 'Clothing', other: 'Other' },
    due: (d: string) => `Due: ${d}`,
    markPaid: 'Mark paid',
    logExpense: 'Log Expense',
    descriptionReq: 'Description *',
    descPlaceholder: 'e.g. Hawker lunch × 3',
    category: 'Category',
    amountReq: 'Amount (SGD) *',
    date: 'Date',
    cancel: 'Cancel',
    pageTitle: 'Finance',
    pageSub: 'School fees · Expenses · Budget tracker',
    addLogExpense: '+ Log Expense',
    totalFees: 'Total Fees (AY 2026)',
    allFeeItems: 'All fee items',
    paid: 'Paid',
    items: (n: number) => `${n} items`,
    pending: 'Pending',
    itemsDue: (n: number) => `${n} items due`,
    overdue: 'Overdue',
    requiresAction: 'Requires immediate action',
    monthlySpending: 'Monthly Spending',
    ofBudget: (b: string) => `of ${b} budget`,
    feesTab: '🏫 School Fees',
    expensesTab: '💳 Expense Log',
    show: 'Show:',
    all: 'All',
    feeBreakdown: 'Fee Breakdown',
    upcomingPayments: 'Upcoming Payments',
    overdueShort: 'Overdue',
    daysLeft: (d: number) => `${d}d left`,
    recentExpenses: (m: string) => `Recent Expenses — ${m}`,
    monthlyBudget: 'Monthly Budget',
    spentOf: (spent: string, budget: string) => `Spent ${spent} of ${budget} allowance`,
    pctUsed: (p: number) => `${p}% used`,
    tipTitle: '💡 Tip',
    tipBody: 'Your parents can view an overview of your school fees when you share documents with them. Expense logs remain private unless you choose to share.',
  },
  zh: {
    status: { paid: '已缴', pending: '待缴', overdue: '逾期' },
    feeCats: { tuition: '学费', homestay: '寄宿费', insurance: '保险', materials: '教材费', activity: '活动费', exam: '考试费', other: '其他' },
    expCats: { food: '餐饮', transport: '交通', books: '书籍', entertainment: '娱乐', clothing: '服饰', other: '其他' },
    expCatOptions: { food: '餐饮', transport: '交通', books: '书籍', entertainment: '娱乐', clothing: '服饰', other: '其他' },
    due: (d: string) => `截止：${d}`,
    markPaid: '标记已缴',
    logExpense: '记一笔开销',
    descriptionReq: '描述 *',
    descPlaceholder: '例如：食阁午餐 × 3',
    category: '类别',
    amountReq: '金额（新币）*',
    date: '日期',
    cancel: '取消',
    pageTitle: '费用管理',
    pageSub: '学费 · 日常开销 · 预算追踪',
    addLogExpense: '+ 记开销',
    totalFees: '费用总额（2026 学年）',
    allFeeItems: '全部费用项目',
    paid: '已缴',
    items: (n: number) => `${n} 项`,
    pending: '待缴',
    itemsDue: (n: number) => `${n} 项待缴`,
    overdue: '逾期',
    requiresAction: '需要立即处理',
    monthlySpending: '本月开销',
    ofBudget: (b: string) => `预算 ${b}`,
    feesTab: '🏫 学校费用',
    expensesTab: '💳 开销记录',
    show: '筛选：',
    all: '全部',
    feeBreakdown: '费用构成',
    upcomingPayments: '近期待缴',
    overdueShort: '已逾期',
    daysLeft: (d: number) => `剩 ${d} 天`,
    recentExpenses: (m: string) => `近期开销 — ${m}`,
    monthlyBudget: '每月预算',
    spentOf: (spent: string, budget: string) => `已花费 ${spent}，零用钱预算 ${budget}`,
    pctUsed: (p: number) => `已使用 ${p}%`,
    tipTitle: '💡 小贴士',
    tipBody: '当你与家长共享文件时，他们可以查看学费概览。开销记录默认保密，除非你选择共享。',
  },
} satisfies Record<Locale, unknown>

// Monthly allowance budget targets (SGD)
const BUDGET_TARGETS: Record<string, number> = {
  food: 200, transport: 120, books: 80, entertainment: 60, clothing: 50, other: 40,
}

// ── Styling ───────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<FeeStatus, { bg: string; color: string; label: string }> = {
  paid:    { bg: '#F3FAF7', color: '#057A55', label: 'Paid'    },
  pending: { bg: '#FFFBEB', color: '#B45309', label: 'Pending' },
  overdue: { bg: '#FDF2F2', color: '#E02424', label: 'Overdue' },
}

const CAT_EMOJI: Record<string, string> = {
  tuition: '🏫', homestay: '🏠', insurance: '🛡', materials: '📎',
  activity: '🎽', exam: '📝', other: '📌',
  food: '🍜', transport: '🚌', books: '📚', entertainment: '🎮', clothing: '👕',
}

const EXP_COLORS: Record<string, string> = {
  food: '#1A56DB', transport: '#057A55', books: '#7C3AED',
  entertainment: '#B45309', clothing: '#E02424', other: '#6B7280',
}

function formatSGD(n: number) {
  return `SGD ${n.toLocaleString('en-SG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// ── Components ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-[18px_20px]">
      <div className="text-[11px] text-[var(--t500)] mb-1">{label}</div>
      <div className="font-display font-bold text-[22px] leading-none mb-1" style={{ color: color ?? 'var(--t900)' }}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-[var(--t300)]">{sub}</div>}
    </div>
  )
}

function FeeRow({ fee, onMarkPaid }: { fee: FeeItem; onMarkPaid: (id: string) => void }) {
  const locale = useLocale()
  const t = T[locale]
  const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-SG'
  const s = STATUS_STYLE[fee.status]
  const overdue = fee.status === 'overdue'

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-[8px] hover:bg-[var(--bg)] border-b border-[var(--border)] last:border-0 ${overdue ? 'bg-[#FDF2F2]/50' : ''}`}>
      <div className="text-[18px] flex-shrink-0">{CAT_EMOJI[fee.category] ?? '📌'}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[var(--t900)] leading-snug">{fee.label}</div>
        {fee.notes && <div className="text-[11px] text-[var(--t500)] mt-0.5">{fee.notes}</div>}
        <div className="text-[11px] text-[var(--t300)] mt-0.5">
          {t.due(new Date(fee.due_date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }))}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-display font-bold text-[14px] text-[var(--t900)]">{formatSGD(fee.amount)}</div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1"
          style={{ background: s.bg, color: s.color }}>
          {t.status[fee.status]}
        </span>
      </div>
      {fee.status !== 'paid' && (
        <button onClick={() => onMarkPaid(fee.id)}
          className="px-3 py-1.5 rounded-[7px] text-[11px] font-semibold border border-[var(--blue)] text-[var(--blue)] hover:bg-[var(--blue-50)] flex-shrink-0 transition">
          {t.markPaid}
        </button>
      )}
    </div>
  )
}

function AddExpenseModal({ onAdd, onClose }: { onAdd: (e: Expense) => void; onClose: () => void }) {
  const t = T[useLocale()]
  const [label, setLabel] = useState('')
  const [cat,   setCat]   = useState<Expense['category']>('food')
  const [amount, setAmount] = useState('')
  const [date,  setDate]  = useState(new Date().toISOString().slice(0, 10))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const a = parseFloat(amount)
    if (!label.trim() || isNaN(a) || a <= 0) return
    onAdd({ id: `x-${Date.now()}`, label: label.trim(), category: cat, amount: a, date })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="bg-white rounded-[12px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-[400px] border border-[var(--border)]">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <span className="font-display font-bold text-[15px] text-[var(--t900)]">{t.logExpense}</span>
          <button onClick={onClose} className="text-[var(--t400)] hover:text-[var(--t900)] text-[20px] leading-none">×</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">{t.descriptionReq}</label>
            <input value={label} onChange={e => setLabel(e.target.value)} required
              placeholder={t.descPlaceholder}
              className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] focus:outline-none focus:border-[var(--blue)] placeholder:text-[var(--t300)]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">{t.category}</label>
              <select value={cat} onChange={e => setCat(e.target.value as Expense['category'])}
                className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] bg-white focus:outline-none focus:border-[var(--blue)] cursor-pointer">
                {Object.entries(CAT_EMOJI).filter(([k]) => ['food','transport','books','entertainment','clothing','other'].includes(k)).map(([k, e]) => (
                  <option key={k} value={k}>{e} {t.expCatOptions[k as Expense['category']]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">{t.amountReq}</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="0.01" step="0.01"
                placeholder="0.00"
                className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] focus:outline-none focus:border-[var(--blue)] placeholder:text-[var(--t300)]" />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">{t.date}</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] focus:outline-none focus:border-[var(--blue)]" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-[8px] text-[13px] font-semibold text-[var(--t700)] border border-[var(--border)] bg-white hover:bg-[var(--bg)]">
              {t.cancel}
            </button>
            <button type="submit"
              className="px-4 py-2 rounded-[8px] text-[13px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)]">
              {t.logExpense}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

// ── DB → local type mappers ───────────────────────────────────────────────────

function mapFee(f: import('./page').DbFeeItem): FeeItem {
  const today = new Date().toISOString().slice(0, 10)
  const status: FeeStatus = f.paid ? 'paid' : f.due_date < today ? 'overdue' : 'pending'
  const CAT_MAP: Record<string, FeeItem['category']> = {
    tuition: 'tuition', homestay: 'homestay', insurance: 'insurance',
    other: 'other', transport: 'other',
  }
  return {
    id: f.id, label: f.name,
    category: CAT_MAP[f.category] ?? 'other',
    amount: f.amount_sgd, due_date: f.due_date, status,
  }
}

function mapExpense(e: import('./page').DbExpense): Expense {
  const CAT_MAP: Record<string, Expense['category']> = {
    food: 'food', transport: 'transport', school_supplies: 'books',
    activities: 'entertainment', healthcare: 'other', other: 'other',
  }
  return {
    id: e.id, label: e.note ?? 'Expense',
    category: CAT_MAP[e.category] ?? 'other',
    amount: e.amount_sgd, date: e.date,
  }
}


interface FinanceClientProps {
  initialFees: import('./page').DbFeeItem[]
  initialExpenses: import('./page').DbExpense[]
  userId: string
}

export default function FinanceClient({ initialFees, initialExpenses, userId }: FinanceClientProps) {
  const supabase = createBrowserClient()
  const locale = useLocale()
  const t = T[locale]
  const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-SG'
  const [fees,      setFees]     = useState<FeeItem[]>(initialFees.map(mapFee))
  const [expenses,  setExpenses] = useState<Expense[]>(initialExpenses.map(mapExpense))
  const [activeTab, setTab]      = useState<'fees' | 'expenses'>('fees')
  const [feeFilter, setFeeFilter] = useState<FeeStatus | 'all'>('all')
  const [showModal, setModal]    = useState(false)

  // ── Fee stats ──
  const totalFees    = fees.reduce((s, f) => s + f.amount, 0)
  const paidFees     = fees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
  const pendingFees  = fees.filter(f => f.status === 'pending').reduce((s, f) => s + f.amount, 0)
  const overdueFees  = fees.filter(f => f.status === 'overdue').reduce((s, f) => s + f.amount, 0)

  // ── Expense stats (current month) ──
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthExp  = expenses.filter(e => e.date.startsWith(thisMonth))
  const totalMonthExp = monthExp.reduce((s, e) => s + e.amount, 0)
  const totalBudget   = Object.values(BUDGET_TARGETS).reduce((a, b) => a + b, 0)

  // ── By category ──
  const expByCategory = useMemo(() => {
    const m: Record<string, number> = {}
    monthExp.forEach(e => { m[e.category] = (m[e.category] ?? 0) + e.amount })
    return m
  }, [monthExp])

  const filteredFees = useMemo(() => {
    const arr = feeFilter === 'all' ? fees : fees.filter(f => f.status === feeFilter)
    return arr.sort((a, b) => {
      const order: FeeStatus[] = ['overdue', 'pending', 'paid']
      return order.indexOf(a.status) - order.indexOf(b.status)
    })
  }, [fees, feeFilter])

  async function markPaid(id: string) {
    const prev = fees
    setFees(p => p.map(f => f.id === id ? { ...f, status: 'paid' } : f))
    const { error } = await supabase
      .from('fee_items')
      .update({ paid: true, paid_date: new Date().toISOString().slice(0, 10) })
      .eq('id', id)
    if (error) setFees(prev) // revert — the write didn't land
  }

  // UI categories → expense_logs enum
  const EXPENSE_CAT_DB: Record<Expense['category'], 'food' | 'transport' | 'school_supplies' | 'activities' | 'healthcare' | 'other'> = {
    food: 'food', transport: 'transport', books: 'school_supplies',
    entertainment: 'activities', clothing: 'other', other: 'other',
  }

  async function addExpense(e: Expense) {
    const { data, error } = await supabase
      .from('expense_logs')
      .insert({
        student_id: userId,
        amount_sgd: e.amount,
        category: EXPENSE_CAT_DB[e.category],
        note: e.label,
        date: e.date,
      })
      .select('id')
      .single()
    if (error || !data) return
    setExpenses(p => [{ ...e, id: data.id }, ...p])
  }

  return (
    <div className="flex flex-col min-h-screen">

      {/* Topbar */}
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-40">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">{t.pageTitle}</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">{t.pageSub}</div>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)]">
          {t.addLogExpense}
        </button>
      </div>

      <div className="p-[28px_36px] flex-1">

        {/* Stat cards */}
        <div className="grid gap-4 mb-6 grid-cols-2 lg:grid-cols-4">
          <StatCard label={t.totalFees} value={formatSGD(totalFees)} sub={t.allFeeItems} />
          <StatCard label={t.paid} value={formatSGD(paidFees)} sub={t.items(fees.filter(f => f.status === 'paid').length)} color="#057A55" />
          <StatCard label={t.pending} value={formatSGD(pendingFees)} sub={t.itemsDue(fees.filter(f => f.status === 'pending').length)} color="#B45309" />
          {overdueFees > 0
            ? <StatCard label={t.overdue} value={formatSGD(overdueFees)} sub={t.requiresAction} color="#E02424" />
            : <StatCard label={t.monthlySpending} value={formatSGD(totalMonthExp)} sub={t.ofBudget(formatSGD(totalBudget))} color="#1A56DB" />
          }
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 border-b border-[var(--border)]">
          {(['fees', 'expenses'] as const).map(tab => (
            <button key={tab} onClick={() => setTab(tab)}
              className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 -mb-[1px] transition-colors ${
                activeTab === tab
                  ? 'border-[var(--blue)] text-[var(--blue)]'
                  : 'border-transparent text-[var(--t500)] hover:text-[var(--t900)]'
              }`}>
              {tab === 'fees' ? t.feesTab : t.expensesTab}
            </button>
          ))}
        </div>

        {/* ── FEES TAB ── */}
        {activeTab === 'fees' && (
          <div className="grid gap-5 grid-cols-1 items-start lg:grid-cols-[1fr_280px]">
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
              {/* Filter pills */}
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[var(--t300)] uppercase tracking-wide mr-1">{t.show}</span>
                {(['all', 'overdue', 'pending', 'paid'] as const).map(f => (
                  <button key={f} onClick={() => setFeeFilter(f)}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium border-[1.5px] transition-all ${
                      feeFilter === f
                        ? 'bg-[var(--blue-50)] text-[var(--blue)] border-[var(--blue)]'
                        : 'bg-white text-[var(--t700)] border-[var(--border)] hover:bg-[var(--bg)]'
                    }`}>
                    {f === 'all' ? t.all : t.status[f]}
                  </button>
                ))}
              </div>
              <div className="divide-y divide-[var(--border)]">
                {filteredFees.map(fee => (
                  <FeeRow key={fee.id} fee={fee} onMarkPaid={markPaid} />
                ))}
              </div>
            </div>

            {/* Fee breakdown sidebar */}
            <div className="space-y-4">
              <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">{t.feeBreakdown}</div>
                {/* Progress bar: paid vs total */}
                <div className="mb-3">
                  <div className="flex justify-between text-[11px] text-[var(--t500)] mb-1">
                    <span>{t.paid}</span>
                    <span>{Math.round((paidFees / totalFees) * 100)}%</span>
                  </div>
                  <div className="h-[6px] bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#057A55] transition-all"
                      style={{ width: `${Math.round((paidFees / totalFees) * 100)}%` }} />
                  </div>
                </div>
                {/* By category */}
                {(['tuition','homestay','exam','insurance','materials','activity'] as const).map(cat => {
                  const total = fees.filter(f => f.category === cat).reduce((s, f) => s + f.amount, 0)
                  if (total === 0) return null
                  return (
                    <div key={cat} className="flex items-center justify-between py-1.5">
                      <span className="flex items-center gap-2 text-[12px] text-[var(--t700)]">
                        {CAT_EMOJI[cat]} {t.feeCats[cat]}
                      </span>
                      <span className="text-[12px] font-bold text-[var(--t900)]">{formatSGD(total)}</span>
                    </div>
                  )
                })}
              </div>

              {/* Upcoming due */}
              <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">{t.upcomingPayments}</div>
                {fees
                  .filter(f => f.status !== 'paid' && f.due_date >= new Date().toISOString().slice(0, 10))
                  .sort((a, b) => a.due_date.localeCompare(b.due_date))
                  .slice(0, 4)
                  .map(f => {
                    const daysLeft = Math.ceil((new Date(f.due_date).getTime() - Date.now()) / 86_400_000)
                    const urgent   = daysLeft <= 7
                    return (
                      <div key={f.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                        <div>
                          <div className="text-[12px] font-semibold text-[var(--t900)] leading-snug">{f.label}</div>
                          <div className="text-[11px] text-[var(--t500)]">
                            {new Date(f.due_date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[12px] font-bold text-[var(--t900)]">{formatSGD(f.amount)}</div>
                          <div className={`text-[10px] font-semibold ${urgent ? 'text-[#E02424]' : 'text-[var(--t300)]'}`}>
                            {daysLeft <= 0 ? t.overdueShort : t.daysLeft(daysLeft)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ── EXPENSES TAB ── */}
        {activeTab === 'expenses' && (
          <div className="grid gap-5 grid-cols-1 items-start lg:grid-cols-[1fr_280px]">
            {/* Expense list */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)]">
                  {t.recentExpenses(new Date().toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' }))}
                </div>
              </div>
              {expenses
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((exp) => (
                  <div key={exp.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--bg)] border-b border-[var(--border)] last:border-0">
                    <div className="text-[16px] flex-shrink-0">{CAT_EMOJI[exp.category] ?? '💰'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[var(--t900)]">{exp.label}</div>
                      <div className="text-[11px] text-[var(--t500)]">
                        {new Date(exp.date).toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' · '}
                        <span className="capitalize">{t.expCats[exp.category]}</span>
                      </div>
                    </div>
                    <div className="font-display font-bold text-[14px] text-[var(--t900)]">
                      SGD {exp.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
            </div>

            {/* Budget sidebar */}
            <div className="space-y-4">
              <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-1">{t.monthlyBudget}</div>
                <div className="text-[11px] text-[var(--t500)] mb-4">
                  {t.spentOf(formatSGD(totalMonthExp), formatSGD(totalBudget))}
                </div>
                {/* Overall bar */}
                <div className="mb-4">
                  <div className="h-[8px] bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.round((totalMonthExp / totalBudget) * 100))}%`,
                        background: totalMonthExp > totalBudget ? '#E02424' : '#1A56DB',
                      }} />
                  </div>
                  <div className="text-[11px] text-[var(--t300)] mt-1">
                    {t.pctUsed(Math.round((totalMonthExp / totalBudget) * 100))}
                  </div>
                </div>

                {/* Per-category */}
                {Object.entries(BUDGET_TARGETS).map(([cat, budget]) => {
                  const spent = expByCategory[cat] ?? 0
                  const pct   = Math.min(100, Math.round((spent / budget) * 100))
                  const over  = spent > budget
                  return (
                    <div key={cat} className="mb-3">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[var(--t700)] capitalize">{CAT_EMOJI[cat]} {t.expCats[cat as Expense['category']]}</span>
                        <span className={`font-semibold ${over ? 'text-[#E02424]' : 'text-[var(--t700)]'}`}>
                          ${spent} / ${budget}
                        </span>
                      </div>
                      <div className="h-[5px] bg-[#F3F4F6] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: over ? '#E02424' : EXP_COLORS[cat] ?? '#1A56DB' }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="bg-[#F3FAF7] border border-[#D1FAE5] rounded-[10px] p-4">
                <div className="font-display font-semibold text-[13px] text-[#057A55] mb-1">{t.tipTitle}</div>
                <div className="text-[12px] text-[#065F46] leading-relaxed">
                  {t.tipBody}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && <AddExpenseModal onAdd={addExpense} onClose={() => setModal(false)} />}
    </div>
  )
}
