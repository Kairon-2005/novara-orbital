// POST /api/admin/kb/contributions  { id, action: 'approve' | 'reject' }
// Admin reviews a user-submitted official page. Approve ingests it into the KB.

import { NextResponse } from 'next/server'
import { createRouteClient, createAdminClient } from '@/db/server'
import { requireAdmin } from '@/lib/admin/guard'
import { nextContributionStatus, contributionToKbDoc, type ContributionAction } from '@/lib/admin/contributions'
import { runDocIngest } from '@/lib/kb/ingest'
import { qdrantConfigured, QdrantStore } from '@/lib/kb/store'
import { embedTexts } from '@/lib/kb/embed'

export async function POST(request: Request) {
  const supabase = createRouteClient()
  const gate = await requireAdmin(supabase)
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const { id, action } = await request.json().catch(() => ({})) as { id?: string; action?: ContributionAction }
  if (!id || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'id and a valid action are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: c } = await admin.from('kb_contributions').select('*').eq('id', id).maybeSingle()
  if (!c) return NextResponse.json({ error: 'Contribution not found' }, { status: 404 })

  const nowIso = new Date().toISOString()
  if (action === 'approve' && qdrantConfigured()) {
    const doc = contributionToKbDoc({ id: c.id, title: c.title, url: c.url, rawText: c.raw_text }, nowIso.slice(0, 10))
    await runDocIngest(doc, { store: new QdrantStore(), embed: embedTexts })
  }

  const status = nextContributionStatus(c.status, action)
  await admin.from('kb_contributions').update({ status, reviewed_by: gate.userId, reviewed_at: nowIso }).eq('id', id)
  return NextResponse.json({ ok: true, status })
}
