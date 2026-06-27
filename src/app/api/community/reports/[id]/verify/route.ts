// POST /api/community/reports/[id]/verify
// Re-run the AI evidence cross-check for one of the caller's own reports (e.g.
// after they add a proof). Idempotent; persists the verdict with the service
// role and settles the case into the KB if it now verifies.

import { NextResponse } from 'next/server'
import { createRouteClient, createAdminClient } from '@/db/server'
import { runVerification, ingestReport } from '@/lib/community-reports'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: report } = await supabase
    .from('admission_reports')
    .select('*')
    .eq('id', params.id)
    .eq('author_id', user.id)
    .maybeSingle()
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const { data: proofs } = await supabase
    .from('report_proofs')
    .select('extracted_text')
    .eq('report_id', params.id)
  const evidenceTexts = (proofs ?? [])
    .map((p) => p.extracted_text)
    .filter((t): t is string => Boolean(t && t.trim()))
  if (evidenceTexts.length === 0) {
    return NextResponse.json({ error: 'Upload a proof document before verifying.' }, { status: 400 })
  }

  const nowIso = new Date().toISOString()
  const outcome = await runVerification(
    {
      institution: report.institution,
      result: report.result,
      programme: report.programme,
      applyYear: report.apply_year,
    },
    evidenceTexts,
    nowIso,
  )

  const admin = createAdminClient()
  await admin
    .from('admission_reports')
    .update({
      verification_status: outcome.status,
      verification_detail: outcome.detail,
      verified_at: outcome.status === 'verified' ? nowIso : null,
    })
    .eq('id', params.id)
  if (outcome.status === 'verified') {
    await ingestReport(admin, params.id, nowIso).catch(() => { /* non-blocking */ })
  }

  return NextResponse.json({ verdict: { status: outcome.status, conflicts: outcome.verdict.conflicts } })
}
