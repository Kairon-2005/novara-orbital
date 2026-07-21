import { describe, it, expect } from 'vitest'
import { filterSchools, type DirectorySchool } from '@/lib/schools'

const school = (over: Partial<DirectorySchool>): DirectorySchool => ({
  id: 'x', school_name: 'Some School', slug: 'some-school', school_type: 'secondary',
  curriculum: 'IB', zone: 'Central', address: null, description: null,
  website: null, tuition_range: null, highlights: [],
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
