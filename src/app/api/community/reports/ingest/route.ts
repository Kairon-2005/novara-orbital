// POST /api/community/reports/ingest  { reportId }
// Converts the caller's published admission report into an anonymized KB
// experience doc and ingests it, so the AI can cite community outcomes.
// MVP policy: no verification gate — every published report is ingested.
// No-ops cleanly when Qdrant isn't configured.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { reportToKbDoc } from '@/lib/community-kb'
import { runDocIngest } from '@/lib/kb/ingest'
import { qdrantConfigured, QdrantStore } from '@/lib/kb/store'
import { embedTexts } from '@/lib/kb/embed'

export async function POST(request: Request) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { reportId } = await request.json().catch(() => ({})) as { reportId?: string }
  if (!reportId) return NextResponse.json({ error: 'reportId is required' }, { status: 400 })

  const { data: r } = await supabase
    .from('admission_reports')
    .select('*')
    .eq('id', reportId)
    .eq('author_id', user.id) // only the author pushes their own report to the KB
    .eq('moderation_status', 'approved')
    .maybeSingle()
  if (!r) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  if (!qdrantConfigured()) return NextResponse.json({ ingested: false, reason: 'kb-not-configured' })

  try {
    const doc = reportToKbDoc({
      id: r.id,
      level: r.level,
      institution: r.institution,
      programme: r.programme,
      route: r.route,
      result: r.result,
      applyYear: r.apply_year,
      scholarshipName: r.scholarship_name,
      grades: r.grades,
      englishTest: r.english_test,
      standardizedTests: r.standardized_tests,
      activities: r.activities,
      admissionExperience: r.admission_experience,
      interviewExperience: r.interview_experience,
      scholarshipExperience: r.scholarship_experience,
    }, new Date().toISOString().slice(0, 10))

    const result = await runDocIngest(doc, { store: new QdrantStore(), embed: embedTexts })
    return NextResponse.json({ ingested: true, chunks: result.upserted })
  } catch (err) {
    console.error('[community/reports/ingest]', err)
    return NextResponse.json({ error: 'KB ingest failed' }, { status: 500 })
  }
}
