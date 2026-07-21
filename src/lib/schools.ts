// School Navigator filtering — pure. The directory rows come from the
// `schools` table (world-readable, admin-curated via /admin/directory);
// the client narrows them with these predicates.

import type { Database } from '@/types/database'

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
      const haystack = [s.school_name, s.zone, s.address, s.description]
        .filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}
