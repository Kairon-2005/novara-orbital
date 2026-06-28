// POST /api/admin/moderate  { kind: 'report' | 'comment', id, action: 'approve' | 'remove' }
// Admin-only. The admin RLS policies allow the update under the admin's session.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { requireAdmin } from '@/lib/admin/guard'
import { nextModerationStatus, type ModerationAction } from '@/lib/admin/moderation'

export async function POST(request: Request) {
  const supabase = createRouteClient()
  const gate = await requireAdmin(supabase)
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const { kind, id, action } = await request.json().catch(() => ({})) as {
    kind?: string; id?: string; action?: ModerationAction
  }
  const table = kind === 'report' ? 'admission_reports' : kind === 'comment' ? 'report_comments' : null
  if (!table || !id || (action !== 'approve' && action !== 'remove')) {
    return NextResponse.json({ error: 'kind, id and a valid action are required' }, { status: 400 })
  }

  const status = nextModerationStatus('flagged', action)
  const { error } = await supabase.from(table).update({ moderation_status: status }).eq('id', id)
  if (error) return NextResponse.json({ error: 'Moderation failed' }, { status: 500 })
  return NextResponse.json({ ok: true, status })
}
