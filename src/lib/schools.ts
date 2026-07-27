// School Navigator: filtering, distance, and the MOE-dataset mapping — all pure.
// The directory rows come from the `schools` table, ingested by
// `npm run schools:ingest` from MOE's official dataset on data.gov.sg and
// geocoded through OneMap. The client narrows them with these predicates.

import type { Database, SchoolType, SchoolCurriculum } from '@/types/database'

export type DirectorySchool = Omit<Database['public']['Tables']['schools']['Row'], 'is_active' | 'created_at'>

export type SchoolFilters = {
  query?: string
  type?: string       // school_type; undefined/'' = all
  curriculum?: string // undefined/'' = all
  zone?: string       // undefined/'' = all
}

export function filterSchools(schools: DirectorySchool[], f: SchoolFilters): DirectorySchool[] {
  const q = f.query?.trim().toLowerCase()
  return schools.filter(s => {
    if (f.type && s.school_type !== f.type) return false
    if (f.curriculum && s.curriculum !== f.curriculum) return false
    if (f.zone && s.zone !== f.zone) return false
    if (q) {
      const haystack = [s.school_name, s.zone, s.address, s.description, s.mrt_desc]
        .filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}

// ── Distance ─────────────────────────────────────────────────────────────────

export type Coords = { lat: number; lng: number }

const EARTH_RADIUS_KM = 6371
const toRad = (deg: number) => (deg * Math.PI) / 180

/** Great-circle distance in km. Singapore is ~50km across, so the sphere
 *  approximation is well within the precision a "how far is this school" number
 *  needs — no projection or map SDK required. */
export function haversineKm(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export type SchoolWithDistance = DirectorySchool & { distanceKm: number | null }

/** Annotate with distance from `origin` and sort nearest-first. Schools without
 *  coordinates keep a null distance and sink to the bottom rather than vanish. */
export function sortByDistance(schools: DirectorySchool[], origin: Coords): SchoolWithDistance[] {
  return schools
    .map(s => ({
      ...s,
      distanceKm: s.latitude != null && s.longitude != null
        ? haversineKm(origin, { lat: s.latitude, lng: s.longitude })
        : null,
    }))
    .sort((a, b) => {
      if (a.distanceKm == null) return b.distanceKm == null ? 0 : 1
      if (b.distanceKm == null) return -1
      return a.distanceKm - b.distanceKm
    })
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

// ── MOE dataset mapping ──────────────────────────────────────────────────────
// Shape of a row in data.gov.sg's "General information of schools" CSV. Only
// the fields the directory actually surfaces are typed.

export type MoeSchoolRow = {
  school_name:    string
  url_address:    string
  address:        string
  postal_code:    string
  mrt_desc:       string
  zone_code:      string  // NORTH | SOUTH | EAST | WEST
  type_code:      string  // GOVERNMENT SCHOOL | GOVERNMENT-AIDED SCH | INDEPENDENT SCHOOL | ...
  nature_code:    string  // CO-ED SCHOOL | BOYS' SCHOOL | GIRLS' SCHOOL
  mainlevel_code: string  // PRIMARY | SECONDARY (S1-S5) | JUNIOR COLLEGE | MIXED LEVEL (...) | ...
  sap_ind:        string  // Yes | No
  autonomous_ind: string
  gifted_ind:     string
  ip_ind:         string
}

/** MOE writes "na" (not "") for absent values throughout the dataset. */
const clean = (v: string | undefined): string | null => {
  const s = (v ?? '').trim()
  return !s || s.toLowerCase() === 'na' ? null : s
}

/** The dataset stores postal codes numerically, so the ~1% of Singapore
 *  addresses in districts 01–09 arrive stripped of their leading zero
 *  ("88256"). Geocoding fails on those unless the zero is restored. */
export function normalizePostalCode(raw: string | undefined): string | null {
  const digits = (raw ?? '').trim().replace(/\D/g, '')
  if (!digits || digits.length > 6) return null
  return digits.padStart(6, '0')
}

const isYes = (v: string | undefined) => (v ?? '').trim().toLowerCase() === 'yes'

/** Level of *entry*, which is what someone choosing a school is shopping for:
 *  a through-train S1–JC2 school is something you apply to at S1. */
export function moeSchoolType(mainlevelCode: string): SchoolType {
  const c = mainlevelCode.toUpperCase()
  if (c.startsWith('PRIMARY') || c.includes('P1-')) return 'primary'
  if (c.startsWith('JUNIOR COLLEGE') || c.startsWith('CENTRALISED')) return 'jc'
  return 'secondary'
}

export function moeCurriculum(type: SchoolType, row: Pick<MoeSchoolRow, 'ip_ind'>): SchoolCurriculum {
  if (type === 'jc') return 'A-Level'
  if (type === 'primary') return 'Local'
  // Integrated Programme students bypass O-Levels for an A-Level/IB finish.
  return isYes(row.ip_ind) ? 'Mixed' : 'O-Level'
}

const ACRONYMS = new Set([
  'ITE', 'CHIJ', 'SJI', 'NUS', 'NTU', 'SMU', 'SUTD', 'SIT', 'SUSS', 'MOE',
  'IB', 'AP', 'GESS', 'UWCSEA', 'ISS', 'OFS', 'PLMGS', 'PLMGSS', 'MGS', 'ACS',
  'CHS', 'HCI', 'NJC', 'TJC', 'VJC', 'RI', 'RGS', 'RVHS', 'SST', 'NUSH', 'NPS',
])

/** The dataset is ALL CAPS; cards read better in title case, but the acronyms
 *  in Singapore school names ("CHIJ", "ACS") must survive it. */
export function titleCaseSchoolName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(word =>
      word.split('-').map(part => {
        const bare = part.replace(/[^A-Za-z]/g, '')
        if (ACRONYMS.has(bare.toUpperCase())) return part.toUpperCase()
        // Capitalise the first *letter*, not the first character — names like
        // "(BARKER ROAD)" and "ST. NICHOLAS" lead with punctuation.
        return part.toLowerCase().replace(/[a-z]/, c => c.toUpperCase())
      }).join('-')
    )
    .join(' ')
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const ZONE_LABEL: Record<string, string> = {
  NORTH: 'North', SOUTH: 'South', EAST: 'East', WEST: 'West',
}

const NATURE_LABEL: Record<string, string> = {
  'CO-ED SCHOOL': 'Co-ed', "BOYS' SCHOOL": "Boys'", "GIRLS' SCHOOL": "Girls'",
}

/** The badges on a school card — the things families actually filter on. */
export function moeHighlights(row: MoeSchoolRow): string[] {
  const out: string[] = []
  if (isYes(row.ip_ind))        out.push('Integrated Programme')
  if (isYes(row.gifted_ind))    out.push('GEP')
  if (isYes(row.sap_ind))       out.push('SAP')
  if (isYes(row.autonomous_ind)) out.push('Autonomous')
  const nature = NATURE_LABEL[row.nature_code?.toUpperCase() ?? '']
  if (nature && nature !== 'Co-ed') out.push(nature)
  return out
}

export type SchoolUpsert = Database['public']['Tables']['schools']['Insert']

/** One CSV row → one directory row. Geocoding is layered on separately, since
 *  it needs network access and this stays pure. */
export function mapMoeSchool(row: MoeSchoolRow): SchoolUpsert {
  const name = titleCaseSchoolName(row.school_name)
  const type = moeSchoolType(row.mainlevel_code)
  const nature = NATURE_LABEL[row.nature_code?.toUpperCase() ?? ''] ?? null
  const kind = clean(row.type_code)?.replace(/\bSCH\b/, 'School')

  const descriptionParts = [
    kind ? titleCaseSchoolName(kind) : null,
    nature,
    isYes(row.ip_ind) ? 'offers the Integrated Programme' : null,
  ].filter(Boolean)

  const postal = normalizePostalCode(row.postal_code)
  const rawStreet = clean(row.address)
  const street = rawStreet ? titleCaseSchoolName(rawStreet) : null

  return {
    school_name: name,
    slug:        slugify(row.school_name),
    school_type: type,
    curriculum:  moeCurriculum(type, row),
    zone:        ZONE_LABEL[row.zone_code?.toUpperCase() ?? ''] ?? clean(row.zone_code),
    address:     street && postal ? `${street}, Singapore ${postal}` : street,
    description: descriptionParts.length ? `${descriptionParts.join(' · ')}.` : null,
    website:     clean(row.url_address),
    postal_code: postal,
    mrt_desc:    clean(row.mrt_desc),
    highlights:  moeHighlights(row),
    source:      'moe',
    is_active:   true,
  }
}
