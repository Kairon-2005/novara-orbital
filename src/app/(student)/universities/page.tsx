import { createServerClient } from '@/db/server'
import UniversityClient from './UniversityClient'
import type { UniversityTarget } from './UniversityClient'

export default async function UniversitiesPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">Not authenticated.</p>

  const { data } = await supabase
    .from('university_targets')
    .select('*')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })

  const targets: UniversityTarget[] = (data ?? []).map(r => ({
    id:           r.id,
    name:         r.name,
    country:      r.country ?? '',
    programme:    r.programme ?? '',
    deadline:     r.deadline ?? null,
    requirements: r.requirements ?? '',
    notes:        r.notes ?? '',
    status:       r.status as UniversityTarget['status'],
    referenceLink: r.reference_link ?? '',
  }))

  return <UniversityClient initialTargets={targets} userId={user.id} />
}
