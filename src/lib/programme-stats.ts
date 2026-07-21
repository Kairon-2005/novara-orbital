// Programme decision dashboard domain logic (pure). Rows come from the
// admin-curated programme_stats table; every displayed number must be able to
// answer "says who?" — provenanceFor returns the recorded source or null, and
// the UI renders 暂无数据 for anything without one. No derived or estimated
// statistics here, by design.

export type Provenance = { name: string; url: string; year: number }

export type ProgrammeStat = {
  id: string
  university: string
  programme: string
  country: string
  curriculumUrl: string | null
  igpUrl: string | null
  qsRankUniversity: number | null
  qsRankSubject: number | null
  theRankUniversity: number | null
  gesMedianSalarySgd: number | null
  gesEmploymentRate: number | null
  gesYear: number | null
  sources: Record<string, unknown>
}

export type ProgrammeSortKey = 'salary' | 'subject_rank' | 'university_rank' | 'employment'

const SORT_ACCESSORS: Record<ProgrammeSortKey, { get: (r: ProgrammeStat) => number | null; dir: 'asc' | 'desc' }> = {
  salary:          { get: r => r.gesMedianSalarySgd, dir: 'desc' },
  employment:      { get: r => r.gesEmploymentRate, dir: 'desc' },
  subject_rank:    { get: r => r.qsRankSubject, dir: 'asc' },
  university_rank: { get: r => r.qsRankUniversity, dir: 'asc' },
}

/** Stable sort; rows missing the datum always sink to the bottom. */
export function sortProgrammeStats(rows: ProgrammeStat[], by: ProgrammeSortKey): ProgrammeStat[] {
  const { get, dir } = SORT_ACCESSORS[by]
  return rows.slice().sort((a, b) => {
    const av = get(a), bv = get(b)
    if (av === null && bv === null) return 0
    if (av === null) return 1
    if (bv === null) return -1
    return dir === 'desc' ? bv - av : av - bv
  })
}

export function provenanceFor(row: ProgrammeStat, field: string): Provenance | null {
  const s = row.sources?.[field]
  if (!s || typeof s !== 'object') return null
  const p = s as Partial<Provenance>
  return typeof p.name === 'string' && typeof p.url === 'string' ? { name: p.name, url: p.url, year: Number(p.year) || 0 } : null
}
