'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatBgLine, REPORT_ROUTES, REPORT_RESULTS } from '@/lib/community'
import type { ReportLevel, ReportRoute, ReportResult, VerificationStatus } from '@/types/database'

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

const RESULT_CONFIG: Record<ReportResult, { label: string; bg: string; color: string }> = {
  offer:     { label: 'Offer',     bg: '#F3FAF7', color: '#057A55' },
  rejected:  { label: 'Rejected',  bg: '#FDF2F2', color: '#E02424' },
  waitlist:  { label: 'Waitlist',  bg: '#FFFBEB', color: '#B45309' },
  interview: { label: 'Interview', bg: '#EBF5FF', color: '#1A56DB' },
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR + 2 - 2015 + 1 }, (_, i) => CURRENT_YEAR + 2 - i)
const selCls = 'px-2.5 py-1.5 border border-[var(--border)] rounded-lg text-[12px] bg-white'

export function VerifiedBadge({ status }: { status: VerificationStatus }) {
  if (status === 'verified') return <span className="text-[11px] font-semibold text-[#057A55]">✅ 已验证</span>
  if (status === 'mismatch') return <span className="text-[11px] font-semibold text-[#E02424]">⚠️ 信息不一致</span>
  return <span className="text-[11px] text-[var(--t300)]">未验证</span>
}

interface CasesTabProps {
  savedOnly?: boolean
  mine?: boolean
  penName?: string
}

export default function CasesTab({ savedOnly = false, mine = false, penName }: CasesTabProps) {
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
          placeholder="Search school / university…"
          className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-[12px] bg-white flex-1 min-w-[160px]"
        />
        <select value={filters.level} onChange={(e) => set({ level: e.target.value as Filters['level'] })} className={selCls}>
          <option value="">All levels</option>
          <option value="secondary">Secondary</option>
          <option value="undergraduate">Undergraduate</option>
        </select>
        <select value={filters.route} onChange={(e) => set({ route: e.target.value as Filters['route'] })} className={selCls}>
          <option value="">All routes</option>
          {REPORT_ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filters.result} onChange={(e) => set({ result: e.target.value as Filters['result'] })} className={selCls}>
          <option value="">All results</option>
          {REPORT_RESULTS.map((r) => <option key={r} value={r}>{RESULT_CONFIG[r].label}</option>)}
        </select>
        <select value={filters.year} onChange={(e) => set({ year: e.target.value })} className={selCls}>
          <option value="">All years</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-[12px] text-[var(--t500)]">
          <input type="checkbox" checked={filters.verifiedOnly} onChange={(e) => set({ verifiedOnly: e.target.checked })} />
          Verified only
        </label>
      </div>

      {/* Positioning panel — stats over the VERIFIED subset */}
      {stats && (
        <div className="card p-4 mb-4">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div>
              <div className="text-[22px] font-display font-bold text-[var(--t900)]">{stats.total}</div>
              <div className="text-[11px] text-[var(--t300)] uppercase tracking-wide">verified cases</div>
            </div>
            <div>
              <div className="text-[22px] font-display font-bold text-[#057A55]">{offerPct}%</div>
              <div className="text-[11px] text-[var(--t300)] uppercase tracking-wide">offer rate (of decided)</div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REPORT_RESULTS.map((r) => (
                <span key={r} className="px-2 py-1 rounded-lg text-[11px] font-semibold"
                  style={{ background: RESULT_CONFIG[r].bg, color: RESULT_CONFIG[r].color }}>
                  {RESULT_CONFIG[r].label} {stats.byResult[r]}
                </span>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-[var(--t300)] mt-2">Positioning counts only verified cases. Unverified cases still appear below for context.</p>
        </div>
      )}

      {/* Case table */}
      {loading ? (
        <p className="text-[13px] text-[var(--t300)] p-6 text-center">Loading cases…</p>
      ) : cases.length === 0 ? (
        <p className="text-[13px] text-[var(--t300)] p-6 text-center">
          {savedOnly
            ? 'No saved cases yet — tap 🔖 Save on a case to keep it here.'
            : mine
              ? "You haven't posted any cases yet."
              : penName
                ? `No public cases from ${penName} yet.`
                : 'No cases match these filters yet.'}
        </p>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {cases.map((c) => {
            const rc = RESULT_CONFIG[c.result]
            return (
              <div key={c.id} className="p-3 flex items-center gap-3 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: rc.bg, color: rc.color }}>{rc.label}</span>
                <div className="flex-1 min-w-[180px]">
                  <div className="text-[13px] font-semibold text-[var(--t900)]">
                    {c.institution}{c.programme ? ` · ${c.programme}` : ''}
                  </div>
                  <div className="text-[12px] text-[var(--t500)]">{formatBgLine(c)}</div>
                </div>
                <span className="text-[12px] text-[var(--t300)]">{c.applyYear}</span>
                <VerifiedBadge status={c.verificationStatus} />
                <span className="text-[12px] text-[var(--t300)]">▲ {c.upvotes}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
