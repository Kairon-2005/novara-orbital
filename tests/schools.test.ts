import { describe, it, expect } from 'vitest'
import {
  filterSchools, haversineKm, sortByDistance, formatDistance,
  normalizePostalCode, titleCaseSchoolName, slugify,
  moeSchoolType, moeCurriculum, moeHighlights, mapMoeSchool,
  type DirectorySchool, type MoeSchoolRow,
} from '@/lib/schools'

const school = (over: Partial<DirectorySchool>): DirectorySchool => ({
  id: 'x', school_name: 'Some School', slug: 'some-school', school_type: 'secondary',
  curriculum: 'IB', zone: 'Central', address: null, description: null,
  website: null, tuition_range: null, highlights: [],
  postal_code: null, latitude: null, longitude: null, mrt_desc: null, source: 'manual',
  ...over,
})

const SCHOOLS = [
  school({ id: '1', school_name: 'ACS International', school_type: 'secondary', curriculum: 'IB', zone: 'Central' }),
  school({ id: '2', school_name: 'Raffles Institution', school_type: 'jc', curriculum: 'A-Level', zone: 'Central' }),
  school({ id: '3', school_name: 'Nanyang Polytechnic', school_type: 'poly', curriculum: 'Local', zone: 'North' }),
  school({ id: '4', school_name: 'Tanglin Trust School', school_type: 'secondary', curriculum: 'IB', zone: 'West', description: 'British-curriculum school near Holland Village' }),
]

describe('filterSchools', () => {
  it('returns everything when no filters are set', () => {
    expect(filterSchools(SCHOOLS, {})).toHaveLength(4)
  })

  it('matches the query against name, zone, and description, case-insensitively', () => {
    expect(filterSchools(SCHOOLS, { query: 'raffles' }).map(s => s.id)).toEqual(['2'])
    expect(filterSchools(SCHOOLS, { query: 'holland village' }).map(s => s.id)).toEqual(['4'])
    expect(filterSchools(SCHOOLS, { query: 'WEST' }).map(s => s.id)).toEqual(['4'])
  })

  it('narrows by school type and curriculum together', () => {
    expect(filterSchools(SCHOOLS, { type: 'secondary', curriculum: 'IB' }).map(s => s.id)).toEqual(['1', '4'])
    expect(filterSchools(SCHOOLS, { type: 'poly', curriculum: 'IB' })).toEqual([])
  })

  it('narrows by zone', () => {
    expect(filterSchools(SCHOOLS, { zone: 'North' }).map(s => s.id)).toEqual(['3'])
  })
})

// ── Distance ─────────────────────────────────────────────────────────────────

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm({ lat: 1.3, lng: 103.8 }, { lat: 1.3, lng: 103.8 })).toBe(0)
  })

  it('measures a known Singapore span', () => {
    // NUS (Kent Ridge) → NTU (Jurong West): ~10.4km as the crow flies.
    const km = haversineKm({ lat: 1.2966, lng: 103.7764 }, { lat: 1.3483, lng: 103.6831 })
    expect(km).toBeGreaterThan(10)
    expect(km).toBeLessThan(13)
  })
})

describe('sortByDistance', () => {
  const origin = { lat: 1.3000, lng: 103.8000 }
  const near = school({ id: 'near', latitude: 1.3010, longitude: 103.8010 })
  const far  = school({ id: 'far',  latitude: 1.4400, longitude: 103.8000 })
  const noGeo = school({ id: 'nogeo', latitude: null, longitude: null })

  it('orders nearest first', () => {
    expect(sortByDistance([far, near], origin).map(s => s.id)).toEqual(['near', 'far'])
  })

  it('keeps schools without coordinates, sunk to the bottom with a null distance', () => {
    const out = sortByDistance([noGeo, far, near], origin)
    expect(out.map(s => s.id)).toEqual(['near', 'far', 'nogeo'])
    expect(out[2].distanceKm).toBeNull()
  })
})

describe('formatDistance', () => {
  it('uses metres below 1km and one decimal km above', () => {
    expect(formatDistance(0.42)).toBe('420 m')
    expect(formatDistance(3.14)).toBe('3.1 km')
  })
})

// ── MOE dataset mapping ──────────────────────────────────────────────────────

describe('normalizePostalCode', () => {
  it('restores the leading zero the dataset drops on districts 01-09', () => {
    expect(normalizePostalCode('88256')).toBe('088256')
    expect(normalizePostalCode('738907')).toBe('738907')
  })

  it('rejects empty and over-long values', () => {
    expect(normalizePostalCode('')).toBeNull()
    expect(normalizePostalCode('na')).toBeNull()
    expect(normalizePostalCode('1234567')).toBeNull()
  })
})

describe('titleCaseSchoolName', () => {
  it('title-cases the ALL-CAPS feed', () => {
    expect(titleCaseSchoolName('ADMIRALTY PRIMARY SCHOOL')).toBe('Admiralty Primary School')
  })

  it('capitalises through leading punctuation', () => {
    expect(titleCaseSchoolName('ANGLO-CHINESE SCHOOL (BARKER ROAD)'))
      .toBe('Anglo-Chinese School (Barker Road)')
  })

  it('preserves Singapore school acronyms', () => {
    expect(titleCaseSchoolName('CHIJ KATONG CONVENT')).toBe('CHIJ Katong Convent')
    expect(titleCaseSchoolName('ITE COLLEGE WEST')).toBe('ITE College West')
  })
})

describe('slugify', () => {
  it('produces a stable upsert key', () => {
    expect(slugify("CHIJ ST. NICHOLAS GIRLS' SCHOOL")).toBe('chij-st-nicholas-girls-school')
  })
})

describe('moeSchoolType', () => {
  it('maps each MOE level band to a directory type', () => {
    expect(moeSchoolType('PRIMARY')).toBe('primary')
    expect(moeSchoolType('SECONDARY (S1-S5)')).toBe('secondary')
    expect(moeSchoolType('JUNIOR COLLEGE')).toBe('jc')
    expect(moeSchoolType('CENTRALISED INSTITUTE')).toBe('jc')
  })

  it('files through-train schools under their entry level', () => {
    expect(moeSchoolType('MIXED LEVEL (P1-S4)')).toBe('primary')
    expect(moeSchoolType('MIXED LEVEL (S1-JC2)')).toBe('secondary')
  })
})

describe('moeCurriculum', () => {
  it('marks Integrated Programme schools as Mixed, since they skip O-Levels', () => {
    expect(moeCurriculum('secondary', { ip_ind: 'Yes' })).toBe('Mixed')
    expect(moeCurriculum('secondary', { ip_ind: 'No' })).toBe('O-Level')
    expect(moeCurriculum('jc', { ip_ind: 'No' })).toBe('A-Level')
  })
})

const moeRow = (over: Partial<MoeSchoolRow> = {}): MoeSchoolRow => ({
  school_name: 'ADMIRALTY PRIMARY SCHOOL', url_address: 'https://admiraltypri.moe.edu.sg/',
  address: '11 WOODLANDS CIRCLE   ', postal_code: '738907', mrt_desc: 'Admiralty Station',
  zone_code: 'NORTH', type_code: 'GOVERNMENT SCHOOL', nature_code: 'CO-ED SCHOOL',
  mainlevel_code: 'PRIMARY', sap_ind: 'No', autonomous_ind: 'No', gifted_ind: 'No', ip_ind: 'No',
  ...over,
})

describe('moeHighlights', () => {
  it('badges the programmes families actually filter on', () => {
    expect(moeHighlights(moeRow({ ip_ind: 'Yes', gifted_ind: 'Yes', nature_code: "GIRLS' SCHOOL" })))
      .toEqual(['Integrated Programme', 'GEP', "Girls'"])
  })

  it('does not badge the co-ed default', () => {
    expect(moeHighlights(moeRow())).toEqual([])
  })
})

describe('mapMoeSchool', () => {
  it('maps a feed row to a directory row', () => {
    const row = mapMoeSchool(moeRow())
    expect(row).toMatchObject({
      school_name: 'Admiralty Primary School',
      slug: 'admiralty-primary-school',
      school_type: 'primary',
      curriculum: 'Local',
      zone: 'North',
      address: '11 Woodlands Circle, Singapore 738907',
      postal_code: '738907',
      mrt_desc: 'Admiralty Station',
      source: 'moe',
      is_active: true,
    })
  })

  it('treats the feed\'s "na" placeholder as absent', () => {
    const row = mapMoeSchool(moeRow({ url_address: 'na', mrt_desc: 'na' }))
    expect(row.website).toBeNull()
    expect(row.mrt_desc).toBeNull()
  })
})
