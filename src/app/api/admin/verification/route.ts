// POST /api/admin/verification  { reportId, action: 'force-verify' | 'revoke' | 'resolve' | 'staff-review' }
// Admin override of the AI verdict. Verification columns are service-role-only (the
// guard_report_verification trigger), so this writes via createAdminClient and re-gates
// the wiki accordingly. See docs/PRD-admin.md §5/§6.

import { NextResponse } from 'next/server'
import { createRouteClient, createAdminClient } from '@/db/server'
import { requireAdmin } from '@/lib/admin/guard'
import { applyVerificationOverride, type VerificationAction } from '@/lib/admin/verification'
import { ingestReport, removeReportFromKb } from '@/lib/community-reports'

export async function POST(request: Request) {
  const supabase = createRouteClient()
  const gate = await requireAdmin(supabase)
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const { reportId, action } = await request.json().catch(() => ({})) as {
    reportId?: string; action?: VerificationAction | 'staff-review'
  }
  if (!reportId || (action !== 'force-verify' && action !== 'revoke' && action !== 'resolve' && action !== 'staff-review')) {
    return NextResponse.json({ error: 'reportId and a valid action are required' }, { status: 400 })
  }

  // 人工复核 — the top trust tier: a human confirmed the evidence. Independent
  // of the verdict override; only meaningful (per decideTrustTier) on verified
  // cases. staff_reviewed_at is service-role-only via guard_staff_review.
  if (action === 'staff-review') {
    const admin = createAdminClient()
    const { error } = await admin
      .from('admission_reports')
      .update({ staff_reviewed_at: new Date().toISOString() })
      .eq('id', reportId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  const result = applyVerificationOverride(action)
  const nowIso = new Date().toISOString()
  const admin = createAdminClient()

  await admin
    .from('admission_reports')
    .update({
      verification_status: result.status,
      verified_at: result.status === 'verified' ? nowIso : null,
      verification_detail: { override: action, by: gate.userId, at: nowIso },
    })
    .eq('id', reportId)

  if (result.reingest) await ingestReport(admin, reportId, nowIso).catch(() => { /* best-effort */ })
  if (result.uningest) await removeReportFromKb(admin, reportId).catch(() => { /* best-effort */ })

  return NextResponse.json({ ok: true, status: result.status })
}
