// POST /api/community/reports/ingest  { reportId }
// Settle one of the caller's own cases into the wiki/KB. Gated: only VERIFIED,
// not-already-ingested cases cross over (see ingestReport). Kept for manual
// re-ingest; the normal path ingests automatically on verification.

import { NextResponse } from 'next/server'
import { createRouteClient, createAdminClient } from '@/db/server'
import { ingestReport } from '@/lib/community-reports'

export async function POST(request: Request) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { reportId } = await request.json().catch(() => ({})) as { reportId?: string }
  if (!reportId) return NextResponse.json({ error: 'reportId is required' }, { status: 400 })

  // Authorize: the caller must own the report (read under their session/RLS).
  const { data: owned } = await supabase
    .from('admission_reports')
    .select('id')
    .eq('id', reportId)
    .eq('author_id', user.id)
    .maybeSingle()
  if (!owned) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const result = await ingestReport(createAdminClient(), reportId, new Date().toISOString())
  return NextResponse.json(result)
}
