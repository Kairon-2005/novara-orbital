// POST /api/admin/verification  { reportId, action: 'force-verify' | 'revoke' | 'resolve' }
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
    reportId?: string; action?: VerificationAction
  }
  if (!reportId || (action !== 'force-verify' && action !== 'revoke' && action !== 'resolve')) {
    return NextResponse.json({ error: 'reportId and a valid action are required' }, { status: 400 })
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
