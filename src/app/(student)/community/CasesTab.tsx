'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from '@/components/shared/LocaleProvider'
import type { Locale } from '@/lib/locale'
import { formatBgLine, REPORT_ROUTES, REPORT_RESULTS } from '@/lib/community'
import type { ReportLevel, ReportRoute, ReportResult, VerificationStatus } from '@/types/database'
import type { TrustTier } from '@/lib/trust-tier'

// ── Types (mirror /api/community/cases) ───────────────────────

interface CaseView {
  id: string
  institution: string
  programme: string | null
  level: ReportLevel
  route: ReportRoute
  result: ReportResult
  applyYear: number
  grades: string | null
  englishTest: string | null
  standardizedTests: string | null
  scholarshipName: string | null
  verificationStatus: VerificationStatus
  trustTier?: TrustTier
  upvotes: number
  downvotes: number
  createdAt: string
}

interface Stats {
  total: number
  byResult: Record<ReportResult, number>
  offerRate: number
  byRoute: Record<string, number>
}

interface Filters {
  institution: string
  route: ReportRoute | ''
  result: ReportResult | ''
  level: ReportLevel | ''
  year: string
  verifiedOnly: boolean
}

const EMPTY: Filters = { institution: '', route: '', result: '', level: '', year: '', verifiedOnly: false }

const RESULT_STYLE: Record<ReportResult, { bg: string; color: string }> = {
  offer:     { bg: '#F3FAF7', color: '#057A55' },
  rejected:  { bg: '#FDF2F2', color: '#E02424' },
  waitlist:  { bg: '#FFFBEB', color: '#B45309' },
  interview: { bg: '#EBF5FF', color: '#1A56DB' },
}

const RESULT_LABEL: Record<Locale, Record<ReportResult, string>> = {
  en: { offer: 'Offer', rejected: 'Rejected', waitlist: 'Waitlist', interview: 'Interview' },
  zh: { offer: 'Offer', rejected: '被拒', waitlist: '候补', interview: '面试' },
}

const T = {
  en: {
    searchSchool: 'Search school / university…',
    allLevels: 'All levels',
    secondary: 'Secondary',
    undergraduate: 'Undergraduate',
    allRoutes: 'All routes',
    allResults: 'All results',
    allYears: 'All years',
    verifiedOnly: 'Verified only',
    verifiedCases: 'verified cases',
    offerRate: 'offer rate (of decided)',
    positioningNote: 'Positioning counts only verified cases. Unverified cases still appear below for context.',
    loadingCases: 'Loading cases…',
    emptySaved: 'No saved cases yet — tap 🔖 Save on a case to keep it here.',
    emptyMine: "You haven't posted any cases yet.",
    emptyPenName: (penName: string) => `No public cases from ${penName} yet.`,
    emptyFiltered: 'No cases match these filters yet.',
  },
  zh: {
    searchSchool: '搜索学校 / 大学…',
    allLevels: '全部阶段',
    secondary: '中学',
    undergraduate: '本科',
    allRoutes: '全部体系',
    allResults: '全部结果',
    allYears: '全部年份',
    verifiedOnly: '仅看已验证',
    verifiedCases: '已验证案例',
    offerRate: 'Offer 率（已出结果的案例）',
    positioningNote: '定位统计仅计入已验证案例。未验证案例仍会在下方展示以供参考。',
    loadingCases: '案例加载中…',
    emptySaved: '还没有收藏的案例——在案例上点 🔖 收藏 即可保存到这里。',
    emptyMine: '你还没有发布过案例。',
    emptyPenName: (penName: string) => `${penName} 还没有公开案例。`,
    emptyFiltered: '没有符合筛选条件的案例。',
  },
} satisfies Record<Locale, unknown>

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR + 2 - 2015 + 1 }, (_, i) => CURRENT_YEAR + 2 - i)
const selCls = 'px-2.5 py-1.5 border border-[var(--border)] rounded-lg text-[12px] bg-white'

export function VerifiedBadge({ status }: { status: VerificationStatus }) {
  if (status === 'verified') return <span className="text-[11px] font-semibold text-[#057A55]">✅ 已验证</span>
  if (status === 'mismatch') return <span className="text-[11px] font-semibold text-[#E02424]">⚠️ 信息不一致</span>
  return <span className="text-[11px] text-[var(--t300)]">未验证</span>
}

// 可信度分级 badge. Fixed community terms (已验证/信息不一致/未验证) stay identical
// in both locales; the two upgraded tiers get bilingual labels + a tooltip.
const TIER_BADGE: Record<TrustTier, { label: { en: string; zh: string }; cls: string; tip: { en: string; zh: string } }> = {
  staff_reviewed: {
    label: { en: '🛡 Staff reviewed', zh: '🛡 人工复核' },
    cls: 'text-[#7C3AED]',
    tip: { en: 'AI-verified AND a Novara reviewer confirmed the evidence.', zh: '通过AI核验，且由 Novara 审核员人工确认证据。' },
  },
  email_verified: {
    label: { en: '🎓 School-email verified', zh: '🎓 邮箱验证' },
    cls: 'text-[#1A56DB]',
    tip: { en: 'AI-verified AND the author holds a verified mailbox at this university.', zh: '通过AI核验，且作者已验证该校学生邮箱。' },
  },
  ai_verified: {
    label: { en: '✅ 已验证', zh: '✅ 已验证' },
    cls: 'text-[#057A55]',
    tip: { en: 'Evidence cross-checked by AI against the claimed offer.', zh: '证据已由AI与所述录取结果交叉核验。' },
  },
  unverified: {
    label: { en: '未验证', zh: '未验证' },
    cls: 'text-[var(--t300)]',
    tip: { en: 'No corroborating evidence yet.', zh: '暂无佐证材料。' },
  },
  mismatch: {
    label: { en: '⚠️ 信息不一致', zh: '⚠️ 信息不一致' },
    cls: 'text-[#E02424]',
    tip: { en: 'Evidence contradicts the claim or duplicates another case.', zh: '证据与所述不符，或与其他案例重复。' },
  },
}

export function TrustBadge({ tier, locale }: { tier: TrustTier; locale: Locale }) {
  const b = TIER_BADGE[tier]
  return (
    <span title={b.tip[locale]} className={`text-[11px] font-semibold cursor-help ${b.cls}`}>
      {b.label[locale]}
    </span>
  )
}

interface CasesTabProps {
  savedOnly?: boolean
  mine?: boolean
  penName?: string
}

export default function CasesTab({ savedOnly = false, mine = false, penName }: CasesTabProps) {
  const locale = useLocale()
  const t = T[locale]
  const resultLabel = RESULT_LABEL[locale]
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [cases, setCases] = useState<CaseView[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (savedOnly) p.set('saved', '1')
    if (mine) p.set('mine', '1')
    if (penName) p.set('penName', penName)
    if (filters.institution.trim()) p.set('institution', filters.institution.trim())
    if (filters.route) p.set('route', filters.route)
    if (filters.result) p.set('result', filters.result)
    if (filters.level) p.set('level', filters.level)
    if (filters.year) p.set('year', filters.year)
    if (filters.verifiedOnly) p.set('verified', '1')
    try {
      const res = await fetch(`/api/community/cases?${p.toString()}`)
      const data = await res.json()
      setCases(data.cases ?? [])
      setStats(data.stats ?? null)
    } finally {
      setLoading(false)
    }
  }, [filters, savedOnly, mine, penName])

  useEffect(() => { load() }, [load])

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }))
  const offerPct = stats ? Math.round(stats.offerRate * 100) : 0

  return (
    <div>
      {/* Filter bar */}
      <div className="card p-3 mt-4 mb-4 flex flex-wrap gap-2 items-center">
        <input
          value={filters.institution}
          onChange={(e) => set({ institution: e.target.value })}
          placeholder={t.searchSchool}
          className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-[12px] bg-white flex-1 min-w-[160px]"
        />
        <select value={filters.level} onChange={(e) => set({ level: e.target.value as Filters['level'] })} className={selCls}>
          <option value="">{t.allLevels}</option>
          <option value="secondary">{t.secondary}</option>
          <option value="undergraduate">{t.undergraduate}</option>
        </select>
        <select value={filters.route} onChange={(e) => set({ route: e.target.value as Filters['route'] })} className={selCls}>
          <option value="">{t.allRoutes}</option>
          {REPORT_ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filters.result} onChange={(e) => set({ result: e.target.value as Filters['result'] })} className={selCls}>
          <option value="">{t.allResults}</option>
          {REPORT_RESULTS.map((r) => <option key={r} value={r}>{resultLabel[r]}</option>)}
        </select>
        <select value={filters.year} onChange={(e) => set({ year: e.target.value })} className={selCls}>
          <option value="">{t.allYears}</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-[12px] text-[var(--t500)]">
          <input type="checkbox" checked={filters.verifiedOnly} onChange={(e) => set({ verifiedOnly: e.target.checked })} />
          {t.verifiedOnly}
        </label>
      </div>

      {/* Positioning panel — stats over the VERIFIED subset */}
      {stats && (
        <div className="card p-4 mb-4">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div>
              <div className="text-[22px] font-display font-bold text-[var(--t900)]">{stats.total}</div>
              <div className="text-[11px] text-[var(--t300)] uppercase tracking-wide">{t.verifiedCases}</div>
            </div>
            <div>
              <div className="text-[22px] font-display font-bold text-[#057A55]">{offerPct}%</div>
              <div className="text-[11px] text-[var(--t300)] uppercase tracking-wide">{t.offerRate}</div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REPORT_RESULTS.map((r) => (
                <span key={r} className="px-2 py-1 rounded-lg text-[11px] font-semibold"
                  style={{ background: RESULT_STYLE[r].bg, color: RESULT_STYLE[r].color }}>
                  {resultLabel[r]} {stats.byResult[r]}
                </span>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-[var(--t300)] mt-2">{t.positioningNote}</p>
        </div>
      )}

      {/* Case table */}
      {loading ? (
        <p className="text-[13px] text-[var(--t300)] p-6 text-center">{t.loadingCases}</p>
      ) : cases.length === 0 ? (
        <p className="text-[13px] text-[var(--t300)] p-6 text-center">
          {savedOnly
            ? t.emptySaved
            : mine
              ? t.emptyMine
              : penName
                ? t.emptyPenName(penName)
                : t.emptyFiltered}
        </p>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {cases.map((c) => {
            const rc = RESULT_STYLE[c.result]
            return (
              <div key={c.id} className="p-3 flex items-center gap-3 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: rc.bg, color: rc.color }}>{resultLabel[c.result]}</span>
                <div className="flex-1 min-w-[180px]">
                  <div className="text-[13px] font-semibold text-[var(--t900)]">
                    {c.institution}{c.programme ? ` · ${c.programme}` : ''}
                  </div>
                  <div className="text-[12px] text-[var(--t500)]">{formatBgLine(c)}</div>
                </div>
                <span className="text-[12px] text-[var(--t300)]">{c.applyYear}</span>
                {c.trustTier
                  ? <TrustBadge tier={c.trustTier} locale={locale} />
                  : <VerifiedBadge status={c.verificationStatus} />}
                <span className="text-[12px] text-[var(--t300)]">▲ {c.upvotes}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
