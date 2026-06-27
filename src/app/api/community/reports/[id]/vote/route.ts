// POST /api/community/reports/[id]/vote  { value: 1 | -1 | 0 }
// Cast 顶 (+1) / 踩 (-1), or clear (0). The DB trigger bump_report_votes keeps
// the upvotes/downvotes counters in sync. See docs/PRD-admission-cases.md §A.9.3.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { value } = await request.json().catch(() => ({})) as { value?: number }
  if (value !== 1 && value !== -1 && value !== 0) {
    return NextResponse.json({ error: 'value must be 1, -1, or 0' }, { status: 400 })
  }

  const { error } = value === 0
    ? await supabase.from('report_votes').delete().eq('user_id', user.id).eq('report_id', params.id)
    : await supabase.from('report_votes').upsert(
        { user_id: user.id, report_id: params.id, value },
        { onConflict: 'user_id,report_id' },
      )
  if (error) return NextResponse.json({ error: 'Vote failed' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
