// CLI: npm run schools:ingest  [-- --dry-run]
//
// Fills the School Navigator's `schools` table with the real Singapore school
// landscape, from two sources:
//
//   1. MOE's "General information of schools" dataset on data.gov.sg — every
//      primary, secondary, JC and centralised institute (~340 schools).
//   2. scripts/data/curated-schools.json — the tiers MOE's dataset omits:
//      autonomous universities, polytechnics, ITE colleges, and the major
//      international schools.
//
// Every row is then geocoded through OneMap (Singapore's national mapping API,
// no key required) so the navigator can sort by distance from the student.
//
// Idempotent: rows are upserted on `slug`, so re-running refreshes in place.
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (read from
// .env.local if present). Uses the service-role key — run locally only.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { Database, SchoolType, SchoolCurriculum } from '../src/types/database'
import {
  mapMoeSchool, slugify, normalizePostalCode,
  type MoeSchoolRow, type SchoolUpsert,
} from '../src/lib/schools'

// ── env ───────────────────────────────────────────────────────────────────────
// Load .env.local without a dotenv dependency (same approach as scripts/kb-ingest.ts).
function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

// ── data.gov.sg ───────────────────────────────────────────────────────────────

const MOE_DATASET_ID = 'd_688b934f82c1059ed0a6993d2a829089' // "General information of schools"

/** data.gov.sg hands out a short-lived signed S3 URL rather than the file. */
async function fetchMoeCsv(): Promise<string> {
  const poll = await fetch(
    `https://api-open.data.gov.sg/v1/public/api/datasets/${MOE_DATASET_ID}/poll-download`,
  )
  if (!poll.ok) throw new Error(`data.gov.sg poll-download failed: ${poll.status}`)
  const body = await poll.json() as { data?: { url?: string; status?: string } }
  const url = body.data?.url
  if (!url) throw new Error(`data.gov.sg returned no download URL (status: ${body.data?.status})`)

  const csv = await fetch(url)
  if (!csv.ok) throw new Error(`MOE CSV download failed: ${csv.status}`)
  return csv.text()
}

/** Minimal RFC-4180 reader — the MOE feed quotes any field containing commas
 *  (bus routes, VP name lists), so a naive split would shear rows apart. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else quoted = false
      } else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (ch !== '\r') field += ch
  }
  if (field || row.length) { row.push(field); rows.push(row) }

  const [header, ...body] = rows.filter(r => r.some(c => c.trim() !== ''))
  return body.map(cells =>
    Object.fromEntries(header.map((h, i) => [h.trim(), (cells[i] ?? '').trim()])),
  )
}

// ── OneMap geocoding ──────────────────────────────────────────────────────────

type Geo = { latitude: number; longitude: number; matched: string; address: string }

const ONEMAP_SEARCH = 'https://www.onemap.gov.sg/api/common/elastic/search'

type OneMapResult = {
  SEARCHVAL: string; BUILDING: string; ADDRESS: string
  POSTAL: string; LATITUDE: string; LONGITUDE: string
}

/** Words too generic to distinguish two buildings sharing a postal code. */
const STOPWORDS = new Set(['school', 'the', 'of', 'and', 'singapore', 'campus', 'college', 'international'])

/** A postal code can hold several buildings — a school and the preschool on its
 *  grounds, for instance — and OneMap does not rank the school first. Score by
 *  how much of the school's name the building name actually contains. */
function pickBestMatch(results: OneMapResult[], schoolName: string): OneMapResult {
  const wanted = schoolName.toLowerCase().split(/[^a-z0-9]+/i)
    .filter(w => w.length > 2 && !STOPWORDS.has(w))

  let best = results[0]
  let bestScore = -1
  for (const r of results) {
    const hay = `${r.BUILDING} ${r.SEARCHVAL}`.toLowerCase()
    const score = wanted.filter(w => hay.includes(w)).length
    if (score > bestScore) { best = r; bestScore = score }
  }
  return best
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Geocoding the full directory is ~4 minutes of rate-limited requests, and a
// postal code's coordinates don't move. Caching them on disk makes re-ingests
// near-instant and keeps load off a free public API.
const CACHE_PATH = resolve(process.cwd(), 'scripts/data/geocode-cache.json')

function loadCache(): Record<string, Geo> {
  if (!existsSync(CACHE_PATH)) return {}
  try { return JSON.parse(readFileSync(CACHE_PATH, 'utf8')) } catch { return {} }
}

function saveCache(cache: Record<string, Geo>) {
  writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`)
}

// OneMap's keyless tier tolerates roughly 1.5 requests/second before it starts
// answering 429; measured against the full directory, 700ms between calls runs
// clean. Setting ONEMAP_TOKEN (a free OneMap account) lifts the limit.
const GEOCODE_DELAY_MS = Number(process.env.ONEMAP_DELAY_MS ?? 700)
const MAX_ATTEMPTS = 4

async function geocodePostal(postal: string, schoolName: string): Promise<Geo | null> {
  const url = `${ONEMAP_SEARCH}?searchVal=${encodeURIComponent(postal)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
  const token = process.env.ONEMAP_TOKEN

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    // Throttled — back off and try again rather than silently dropping a school.
    if (res.status === 429) {
      if (attempt === MAX_ATTEMPTS) return null
      await sleep(1500 * 2 ** (attempt - 1))
      continue
    }
    if (!res.ok) return null

    const body = await res.json().catch(() => null) as { results?: OneMapResult[] } | null
    const results = (body?.results ?? []).filter(r => r.LATITUDE && r.LONGITUDE)
    if (results.length === 0) return null

    const best = pickBestMatch(results, schoolName)
    return {
      latitude:  Number(best.LATITUDE),
      longitude: Number(best.LONGITUDE),
      matched:   best.BUILDING || best.SEARCHVAL,
      address:   best.ADDRESS,
    }
  }
  return null
}

// ── curated (non-MOE) tiers ───────────────────────────────────────────────────

type CuratedSchool = {
  school_name: string
  school_type: SchoolType
  curriculum:  SchoolCurriculum
  postal_code: string
  website:     string
  description: string
  highlights?: string[]
}

function loadCurated(): SchoolUpsert[] {
  const path = resolve(process.cwd(), 'scripts/data/curated-schools.json')
  const raw = JSON.parse(readFileSync(path, 'utf8')) as CuratedSchool[]
  return raw.map(c => ({
    school_name: c.school_name,
    slug:        slugify(c.school_name),
    school_type: c.school_type,
    curriculum:  c.curriculum,
    zone:        null,             // filled in from the geocode below
    address:     null,
    description: c.description,
    website:     c.website,
    postal_code: normalizePostalCode(c.postal_code),
    highlights:  c.highlights ?? [],
    source:      'curated',
    is_active:   true,
  }))
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  loadEnvLocal()
  const dryRun = process.argv.includes('--dry-run')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!dryRun && (!url || !key)) {
    console.error('schools:ingest needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in .env.local or the environment).')
    process.exit(1)
  }

  console.log('Fetching MOE school directory from data.gov.sg …')
  const csv = await fetchMoeCsv()
  const moeRows = parseCsv(csv) as unknown as MoeSchoolRow[]
  console.log(`  ${moeRows.length} MOE schools`)

  const curated = loadCurated()
  console.log(`  ${curated.length} curated universities / polytechnics / international schools`)

  // Curated rows win on a slug clash — a hand-written description beats a
  // generated one for the handful of schools that appear in both sources.
  const bySlug = new Map<string, SchoolUpsert>()
  for (const row of moeRows.map(mapMoeSchool)) bySlug.set(row.slug, row)
  for (const row of curated) bySlug.set(row.slug, row)
  const all = Array.from(bySlug.values())

  const cache = loadCache()
  const uncached = all.filter(s => s.postal_code && !cache[s.postal_code]).length
  console.log(`\nGeocoding ${all.length} schools via OneMap (${uncached} not yet cached) …`)

  let located = 0
  let missed = 0
  for (let i = 0; i < all.length; i++) {
    const school = all[i]
    if (!school.postal_code) { missed++; continue }

    let geo: Geo | null = cache[school.postal_code] ?? null
    if (!geo) {
      try {
        geo = await geocodePostal(school.postal_code, school.school_name)
        if (geo) cache[school.postal_code] = geo
      } catch (err) {
        console.warn(`  geocode failed: ${school.school_name} — ${(err as Error).message}`)
      }
      await sleep(GEOCODE_DELAY_MS)
    }

    if (geo) {
      school.latitude  = geo.latitude
      school.longitude = geo.longitude
      // Curated rows carry only a postal code; OneMap supplies the street address.
      if (!school.address) school.address = geo.address
      located++
    } else {
      missed++
      console.warn(`  no match: ${school.school_name} (${school.postal_code})`)
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  … ${i + 1}/${all.length} (${located} located)`)
      saveCache(cache)
    }
  }
  saveCache(cache)
  console.log(`  located ${located}, missing coordinates ${missed}`)

  if (dryRun) {
    console.log('\n--dry-run: nothing written. Sample rows:')
    console.log(JSON.stringify(all.slice(0, 3), null, 2))
    return
  }

  const supabase = createClient<Database>(url!, key!, { auth: { persistSession: false } })

  // Fail loudly and specifically if 20260727000000_school_geo.sql hasn't been
  // applied — a partial write with no coordinates would look like a data bug.
  const { error: schemaErr } = await supabase
    .from('schools').select('id, latitude, longitude, postal_code, source').limit(1)
  if (schemaErr) {
    console.error(
      `\nThe schools table is missing the geo columns (${schemaErr.message}).\n` +
      'Apply supabase/migrations/20260727000000_school_geo.sql first — ' +
      '`supabase db push`, or paste it into the Supabase SQL editor — then re-run.',
    )
    process.exit(1)
  }

  console.log(`\nUpserting ${all.length} schools …`)
  let written = 0
  for (let i = 0; i < all.length; i += 100) {
    const batch = all.slice(i, i + 100)
    const { error } = await supabase.from('schools').upsert(batch, { onConflict: 'slug' })
    if (error) {
      console.error(`  batch ${i / 100 + 1} failed:`, error.message)
      process.exit(1)
    }
    written += batch.length
    console.log(`  … ${written}/${all.length}`)
  }

  const { count } = await supabase
    .from('schools')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
  console.log(`\nDone. ${written} schools upserted; ${count} active rows in the directory.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
