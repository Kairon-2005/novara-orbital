'use client'

import { useMemo, useState } from 'react'
import { useLocale } from '@/components/shared/LocaleProvider'
import { filterSchools, type DirectorySchool } from '@/lib/schools'

// ── Styling maps ──────────────────────────────────────────────────────────────

const SCHOOL_EMOJI: Record<string, string> = {
  primary: '🌱', secondary: '🏫', jc: '🏛', poly: '⚙️',
  university: '🎓', language_school: '🗣', diploma: '📜',
}

const CURRICULUM_STYLE: Record<string, { bg: string; color: string }> = {
  'IB':       { bg: '#EBF5FF', color: '#1A56DB' },
  'A-Level':  { bg: '#F3FAF7', color: '#057A55' },
  'AP':       { bg: '#F5F3FF', color: '#7C3AED' },
  'O-Level':  { bg: '#FFFBEB', color: '#B45309' },
  'Local':    { bg: '#F3F4F6', color: '#374151' },
  'Mixed':    { bg: '#FDF4FF', color: '#86198F' },
}

// ── Copy (bilingual) ──────────────────────────────────────────

const T = {
  en: {
    typeLabels: {
      primary: 'Primary', secondary: 'Secondary / International', jc: 'Junior College',
      poly: 'Polytechnic', university: 'University', language_school: 'Language School',
      diploma: 'Diploma',
    } as Record<string, string>,
    perYear: 'per year (indicative)',
    less: 'Less ↑',
    details: 'Details ↓',
    officialSite: 'Official site →',
    pageTitle: 'School Navigator',
    pageSubtitle: (n: number) => `Find your school in Singapore — primary to university · ${n} schools listed`,
    searchPh: "Search by name, area, or keyword — e.g. 'IB near Holland Village'",
    levelLabel: 'Level',
    curriculumLabel: 'Curriculum',
    zoneLabel: 'Zone',
    all: 'All',
    emptyDirTitle: 'The directory is empty',
    emptyDirDesc: 'School listings are curated by the Novara team — check back soon.',
    noMatchTitle: 'No schools match your filters',
    noMatchDesc: 'Try clearing a filter or broadening your search.',
  },
  zh: {
    typeLabels: {
      primary: '小学', secondary: '中学·国际学校', jc: '初级学院',
      poly: '理工学院', university: '大学', language_school: '语言学校',
      diploma: '文凭课程',
    } as Record<string, string>,
    perYear: '每年（参考价）',
    less: '收起 ↑',
    details: '详情 ↓',
    officialSite: '官方网站 →',
    pageTitle: '择校导航',
    pageSubtitle: (n: number) => `在新加坡找到合适的学校 — 从小学到大学 · 共收录 ${n} 所学校`,
    searchPh: '按校名、区域或关键词搜索——如 “IB near Holland Village”',
    levelLabel: '学段',
    curriculumLabel: '课程体系',
    zoneLabel: '区域',
    all: '全部',
    emptyDirTitle: '目录暂无学校',
    emptyDirDesc: '学校信息由 Novara 团队甄选上架，敬请期待。',
    noMatchTitle: '没有符合筛选条件的学校',
    noMatchDesc: '试试取消一个筛选条件，或放宽搜索。',
  },
}

const TYPE_GRADIENT: Record<string, string> = {
  primary:         'linear-gradient(135deg,#FEF3C7 0%,#F3F6FB 100%)',
  secondary:       'linear-gradient(135deg,#EBF5FF 0%,#F3F6FB 100%)',
  jc:              'linear-gradient(135deg,#F3FAF7 0%,#F3F6FB 100%)',
  poly:            'linear-gradient(135deg,#F5F3FF 0%,#F3F6FB 100%)',
  university:      'linear-gradient(135deg,#FDF2F2 0%,#F3F6FB 100%)',
  language_school: 'linear-gradient(135deg,#F0FDF4 0%,#F3F6FB 100%)',
  diploma:         'linear-gradient(135deg,#FFF7ED 0%,#F3F6FB 100%)',
}

// ── School card ───────────────────────────────────────────────────────────────

function SchoolCard({ school }: { school: DirectorySchool }) {
  const [open, setOpen] = useState(false)
  const locale = useLocale()
  const t = T[locale]
  const currStyle = school.curriculum ? CURRICULUM_STYLE[school.curriculum] : null

  return (
    <div className="bg-white border border-[var(--border)] rounded-[10px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)] hover:border-[var(--blue-100)]">
      <div className="h-[100px] flex items-center justify-center text-[32px]"
        style={{ background: TYPE_GRADIENT[school.school_type] ?? TYPE_GRADIENT.secondary }}>
        {SCHOOL_EMOJI[school.school_type] ?? '🏫'}
      </div>

      <div className="p-[14px_16px] flex-1">
        <div className="flex items-center gap-1.5 flex-wrap mb-[6px]">
          {currStyle && school.curriculum && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: currStyle.bg, color: currStyle.color }}>
              {school.curriculum}
            </span>
          )}
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F3F4F6] text-[var(--t500)]">
            {t.typeLabels[school.school_type] ?? school.school_type}
          </span>
        </div>

        <div className="font-display font-bold text-[13px] text-[var(--t900)] leading-snug mb-1">
          {school.school_name}
        </div>

        {school.zone && <div className="text-[11px] text-[var(--t500)] mb-2.5">📍 {school.zone}</div>}

        {school.tuition_range && (
          <>
            <div className="font-display font-bold text-[14px] text-[var(--t900)]">
              {school.tuition_range.split('/')[0].trim()}
            </div>
            <div className="text-[10px] text-[var(--t300)] mb-2">{t.perYear}</div>
          </>
        )}

        {open && (
          <div className="mt-2 pt-2 border-t border-[var(--border)]">
            {school.description && (
              <p className="text-[12px] text-[var(--t500)] leading-relaxed mb-2">{school.description}</p>
            )}
            {school.address && <p className="text-[11px] text-[var(--t300)] mb-2">🗺 {school.address}</p>}
            <div className="flex flex-wrap gap-1.5">
              {school.highlights.map(h => (
                <span key={h} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg)] text-[var(--t700)]">
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-[16px] py-[10px] border-t border-[var(--border)] flex items-center justify-between">
        <button onClick={() => setOpen(v => !v)} className="text-[12px] text-[var(--blue)] font-medium hover:underline">
          {open ? t.less : t.details}
        </button>
        {school.website && (
          <a href={school.website} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[7px] text-[12px] font-semibold border-[1.5px] border-[var(--blue)] text-[var(--blue)] hover:bg-[var(--blue-50)] transition">
            {t.officialSite}
          </a>
        )}
      </div>
    </div>
  )
}

// ── Pill ──────────────────────────────────────────────────────────────────────

function Pill({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button onClick={onClick}
      className={`px-3 py-[5px] rounded-full text-[12px] font-medium border-[1.5px] cursor-pointer transition-all whitespace-nowrap ${
        active
          ? 'bg-[var(--blue-50)] text-[var(--blue)] border-[var(--blue)]'
          : 'bg-white text-[var(--t700)] border-[var(--border)] hover:bg-[var(--blue-50)] hover:text-[var(--blue)] hover:border-[var(--blue)]'
      }`}>
      {children}
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = ['primary', 'secondary', 'jc', 'poly', 'university'] as const
const CURRICULUM_OPTIONS = ['IB', 'A-Level', 'AP', 'O-Level', 'Local'] as const

export default function NavigatorClient({ schools }: { schools: DirectorySchool[] }) {
  const locale = useLocale()
  const t = T[locale]
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [curriculum, setCurriculum] = useState('')

  const zones = useMemo(
    () => Array.from(new Set(schools.map(s => s.zone).filter((z): z is string => Boolean(z)))).sort(),
    [schools],
  )
  const [zone, setZone] = useState('')

  const filtered = useMemo(
    () => filterSchools(schools, { query, type, curriculum, zone }),
    [schools, query, type, curriculum, zone],
  )

  return (
    <div className="flex flex-col min-h-screen">
      {/* Topbar */}
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-40">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">{t.pageTitle}</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">
            {t.pageSubtitle(schools.length)}
          </div>
        </div>
      </div>

      <div className="p-[28px_36px] flex-1">
        {/* Search + filters */}
        <div className="bg-white border border-[var(--border)] rounded-[10px] p-4 mb-5 flex flex-col gap-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t.searchPh}
            className="w-full px-3.5 py-2.5 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] focus:outline-none focus:border-[var(--blue)] placeholder:text-[var(--t300)]"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-[var(--t300)] uppercase tracking-wide">{t.levelLabel}</span>
            <Pill active={type === ''} onClick={() => setType('')}>{t.all}</Pill>
            {TYPE_OPTIONS.map(o => (
              <Pill key={o} active={type === o} onClick={() => setType(type === o ? '' : o)}>{t.typeLabels[o]}</Pill>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-[var(--t300)] uppercase tracking-wide">{t.curriculumLabel}</span>
            <Pill active={curriculum === ''} onClick={() => setCurriculum('')}>{t.all}</Pill>
            {CURRICULUM_OPTIONS.map(c => (
              <Pill key={c} active={curriculum === c} onClick={() => setCurriculum(curriculum === c ? '' : c)}>{c}</Pill>
            ))}
          </div>
          {zones.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-[var(--t300)] uppercase tracking-wide">{t.zoneLabel}</span>
              <Pill active={zone === ''} onClick={() => setZone('')}>{t.all}</Pill>
              {zones.map(z => (
                <Pill key={z} active={zone === z} onClick={() => setZone(zone === z ? '' : z)}>{z}</Pill>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        {filtered.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(s => <SchoolCard key={s.id} school={s} />)}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-[32px] mb-3">🔍</div>
            <div className="text-[14px] font-semibold text-[var(--t900)] mb-1">
              {schools.length === 0 ? t.emptyDirTitle : t.noMatchTitle}
            </div>
            <div className="text-[13px] text-[var(--t500)]">
              {schools.length === 0 ? t.emptyDirDesc : t.noMatchDesc}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
