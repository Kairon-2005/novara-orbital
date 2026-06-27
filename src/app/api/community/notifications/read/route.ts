// POST /api/community/notifications/read → mark the caller's unread notifications read.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'

export async function POST() {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)
  if (error) return NextResponse.json({ error: 'Failed to mark read' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
