'use client'

import { useState, useMemo } from 'react'
import { MOCK_SCHOOLS, type MockSchool } from '@/lib/mock-data'

// ── Helpers ───────────────────────────────────────────────────────────────────

const SCHOOL_EMOJI: Record<string, string> = {
  'acs-international': '🏫', 'uwc-dover': '🌏', 'tanglin-trust': '🏡',
  'stamford-american': '🇺🇸', 'sji-international': '✝️', 'canadian-international': '🍁',
  'raffles-institution': '🏛', 'hwa-chong': '📖', 'national-junior-college': '🎓',
  'nanyang-polytechnic': '⚙️', 'singapore-polytechnic': '🔧', 'nus': '🔬',
  'ntu': '🏗', 'etonhouse-broadrick': '🌱', 'inlingua-singapore': '🗣',
}

const CURRICULUM_STYLE: Record<string, { bg: string; color: string }> = {
  'IB':       { bg: '#EBF5FF', color: '#1A56DB' },
  'A-Level':  { bg: '#F3FAF7', color: '#057A55' },
  'AP':       { bg: '#F5F3FF', color: '#7C3AED' },
  'O-Level':  { bg: '#FFFBEB', color: '#B45309' },
  'Local':    { bg: '#F3F4F6', color: '#374151' },
  'Mixed':    { bg: '#FDF4FF', color: '#86198F' },
}

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  'secondary':      { bg: '#EBF5FF', color: '#1A56DB' },
  'jc':             { bg: '#F3FAF7', color: '#057A55' },
  'poly':           { bg: '#F5F3FF', color: '#7C3AED' },
  'university':     { bg: '#FDF2F2', color: '#E02424' },
  'language_school':{ bg: '#F0FDF4', color: '#15803D' },
  'primary':        { bg: '#FEF3C7', color: '#92400E' },
  'diploma':        { bg: '#FFF7ED', color: '#C2410C' },
}

const TYPE_LABEL: Record<string, string> = {
  secondary: 'International', jc: 'Government', poly: 'Polytechnic',
  university: 'University', language_school: 'Language School',
  primary: 'Primary', diploma: 'Diploma',
}

// ── Filter data ───────────────────────────────────────────────────────────────

const CURRICULA = ['All', 'IB', 'A-Level', 'AP', 'O-Level', 'Local']
const TYPES     = ['All types', 'International', 'Government', 'Polytechnic', 'University']
const BUDGETS   = ['Any budget', '< SGD 10k', '10–30k', '30–50k', '> 50k']

function budgetMatch(school: MockSchool, budget: string): boolean {
  if (budget === 'Any budget') return true
  const t = school.tuition_range ?? ''
  if (budget === '< SGD 10k') return t.includes('1,') || t.includes('3,') || t.includes('4,') || t.includes('500') || t.includes('600')
  if (budget === '10–30k')   return t.includes('17,') || t.includes('18,') || t.includes('22,') || t.includes('24,') || t.includes('26,') || t.includes('28,')
  if (budget === '30–50k')   return t.includes('30,') || t.includes('32,') || t.includes('34,') || t.includes('35,') || t.includes('38,') || t.includes('40,') || t.includes('42,') || t.includes('45,') || t.includes('48,')
  if (budget === '> 50k')    return false
  return true
}

// ── School Card (matches mockup design) ──────────────────────────────────────

function SchoolCard({ school }: { school: MockSchool }) {
  const [open, setOpen] = useState(false)
  const emoji = SCHOOL_EMOJI[school.slug] ?? '🏫'
  const currStyle = school.curriculum ? CURRICULUM_STYLE[school.curriculum] : null
  const typeStyle = TYPE_STYLE[school.school_type]

  // gradient background per type
  const gradients: Record<string, string> = {
    secondary:    'linear-gradient(135deg,#EBF5FF 0%,#F3F6FB 100%)',
    jc:           'linear-gradient(135deg,#F3FAF7 0%,#F3F6FB 100%)',
    poly:         'linear-gradient(135deg,#F5F3FF 0%,#F3F6FB 100%)',
    university:   'linear-gradient(135deg,#FDF2F2 0%,#F3F6FB 100%)',
    language_school: 'linear-gradient(135deg,#F0FDF4 0%,#F3F6FB 100%)',
  }
  const grad = gradients[school.school_type] ?? gradients.secondary

  return (
    <div
      className="bg-white border border-[var(--border)] rounded-[10px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)] hover:border-[var(--blue-100)]"
      style={{ cursor: 'pointer' }}
    >
      {/* Emoji image area */}
      <div
        className="h-[100px] flex items-center justify-center text-[32px]"
        style={{ background: grad }}
      >
        {emoji}
      </div>

      {/* Info */}
      <div className="p-[14px_16px] flex-1">
        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap mb-[6px]">
          {currStyle && school.curriculum && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: currStyle.bg, color: currStyle.color }}>
              {school.curriculum}
            </span>
          )}
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F3F4F6] text-[var(--t500)]">
            {TYPE_LABEL[school.school_type] ?? school.school_type}
          </span>
        </div>

        {/* Name */}
        <div className="font-display font-bold text-[13px] text-[var(--t900)] leading-snug mb-1">
          {school.school_name}
        </div>

        {/* Zone */}
        <div className="text-[11px] text-[var(--t500)] mb-2.5">
          📍 {school.zone}
        </div>

        {/* Tuition */}
        {school.tuition_range && (
          <>
            <div className="font-display font-bold text-[14px] text-[var(--t900)]">
              {school.tuition_range.split('/')[0].trim()}
            </div>
            <div className="text-[10px] text-[var(--t300)] mb-2">per year (indicative)</div>
          </>
        )}

        {/* Expanded highlights */}
        {open && (
          <div className="mt-2 pt-2 border-t border-[var(--border)]">
            <p className="text-[12px] text-[var(--t500)] leading-relaxed mb-2">
              {school.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {school.highlights?.map(h => (
                <span key={h} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg)] text-[var(--t700)]">
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-[16px] py-[10px] border-t border-[var(--border)] flex items-center justify-between">
        <button
          onClick={() => setOpen(v => !v)}
          className="text-[12px] text-[var(--blue)] font-medium hover:underline"
        >
          {open ? 'Less ↑' : 'Details ↓'}
        </button>
        <a
          href={school.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[7px] text-[12px] font-semibold border-[1.5px] border-[var(--blue)] text-[var(--blue)] hover:bg-[var(--blue-50)] transition"
          onClick={e => e.stopPropagation()}
        >
          View →
        </a>
      </div>
    </div>
  )
}

// ── Pill component ────────────────────────────────────────────────────────────

function Pill({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-[5px] rounded-full text-[12px] font-medium border-[1.5px] cursor-pointer transition-all whitespace-nowrap ${
        active
          ? 'bg-[var(--blue-50)] text-[var(--blue)] border-[var(--blue)]'
          : 'bg-white text-[var(--t700)] border-[var(--border)] hover:bg-[var(--blue-50)] hover:text-[var(--blue)] hover:border-[var(--blue)]'
      }`}
    >
      {children}
    </button>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NavigatorPage() {
  const [curriculum, setCurriculum] = useState('All')
  const [type, setType]             = useState('All types')
  const [budget, setBudget]         = useState('Any budget')
  const [sort, setSort]             = useState('Recommended')

  const filtered = useMemo(() => {
    return MOCK_SCHOOLS.filter(s => {
      // Curriculum
      if (curriculum !== 'All' && s.curriculum !== curriculum) return false
      // Type (approximate mapping)
      if (type === 'International' && !['secondary'].includes(s.school_type)) return false
      if (type === 'Government'    && s.school_type !== 'jc') return false
      if (type === 'Polytechnic'   && s.school_type !== 'poly') return false
      if (type === 'University'    && s.school_type !== 'university') return false
      // Budget
      if (!budgetMatch(s, budget)) return false
      return true
    })
  }, [curriculum, type, budget])

  const sorted = useMemo(() => {
    if (sort === 'Fees (low–high)') {
      return [...filtered].sort((a, b) => {
        const aFee = parseInt((a.tuition_range ?? '0').replace(/[^0-9]/g, '').slice(0, 5)) || 0
        const bFee = parseInt((b.tuition_range ?? '0').replace(/[^0-9]/g, '').slice(0, 5)) || 0
        return aFee - bFee
      })
    }
    if (sort === 'Fees (high–low)') {
      return [...filtered].sort((a, b) => {
        const aFee = parseInt((a.tuition_range ?? '0').replace(/[^0-9]/g, '').slice(0, 5)) || 0
        const bFee = parseInt((b.tuition_range ?? '0').replace(/[^0-9]/g, '').slice(0, 5)) || 0
        return bFee - aFee
      })
    }
    return filtered
  }, [filtered, sort])

  const hasFilters = curriculum !== 'All' || type !== 'All types' || budget !== 'Any budget'

  return (
    <div className="flex flex-col min-h-screen">

      {/* Topbar */}
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-50">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">School &amp; Curriculum Navigator</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">{MOCK_SCHOOLS.length} schools · 4 curricula · Updated Jan 2026</div>
        </div>
      </div>

      <div className="p-[28px_36px] flex-1">

        {/* Filter bar — matches mockup inline layout */}
        <div className="flex items-center gap-3 mb-5 flex-wrap bg-white border border-[var(--border)] rounded-[10px] px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <span className="text-[11px] font-semibold text-[var(--t300)] uppercase tracking-wide">Curriculum</span>
          <div className="flex flex-wrap gap-1.5">
            {CURRICULA.map(c => <Pill key={c} active={curriculum === c} onClick={() => setCurriculum(c)}>{c}</Pill>)}
          </div>

          <div className="w-px h-5 bg-[var(--border)] mx-1" />

          <span className="text-[11px] font-semibold text-[var(--t300)] uppercase tracking-wide">Type</span>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map(t => <Pill key={t} active={type === t} onClick={() => setType(t)}>{t}</Pill>)}
          </div>

          <div className="w-px h-5 bg-[var(--border)] mx-1" />

          <span className="text-[11px] font-semibold text-[var(--t300)] uppercase tracking-wide">Budget</span>
          <div className="flex flex-wrap gap-1.5">
            {BUDGETS.map(b => <Pill key={b} active={budget === b} onClick={() => setBudget(b)}>{b}</Pill>)}
          </div>
        </div>

        {/* Results bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-[13px] text-[var(--t500)]">
            Showing <strong className="text-[var(--t900)]">{sorted.length}</strong> school{sorted.length !== 1 ? 's' : ''}
            {hasFilters && (
              <button
                onClick={() => { setCurriculum('All'); setType('All types'); setBudget('Any budget') }}
                className="ml-3 text-[var(--blue)] text-[12px] font-medium hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[12px] text-[var(--t500)]">Sort:</label>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="px-3 py-1.5 border border-[var(--border)] rounded-[7px] text-[12px] text-[var(--t900)] bg-white focus:outline-none focus:border-[var(--blue)] cursor-pointer"
            >
              <option>Recommended</option>
              <option>Fees (low–high)</option>
              <option>Fees (high–low)</option>
            </select>
          </div>
        </div>

        {/* 3-col grid */}
        {sorted.length > 0 ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {sorted.map(s => <SchoolCard key={s.id} school={s} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <div className="font-display font-bold text-[16px] text-[var(--t700)] mb-1">No schools match</div>
            <div className="text-[13px] text-[var(--t500)]">Try adjusting your filters.</div>
          </div>
        )}
      </div>
    </div>
  )
}
