import { createServerClient } from '@/db/server'
import UniversityClient from './UniversityClient'
import type { UniversityTarget, TargetGap } from './UniversityClient'

function parseGap(raw: unknown): TargetGap | null {
  if (typeof raw !== 'string' || !raw) return null
  try {
    const o = JSON.parse(raw)
    return {
      summary: typeof o.summary === 'string' ? o.summary : '',
      strengths: Array.isArray(o.strengths) ? o.strengths : [],
      gaps: Array.isArray(o.gaps) ? o.gaps : [],
    }
  } catch {
    return null
  }
}

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
    gapScore:     r.gap_score ?? null,
    gap:          parseGap(r.gap_analysis),
  }))

  return <UniversityClient initialTargets={targets} userId={user.id} />
}
