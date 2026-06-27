// GET /api/community/notifications → the caller's in-app notifications + unread count.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import type { NotificationView } from '@/lib/community/notifications'

export async function GET() {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const notifications: NotificationView[] = (data ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    payload: (n.payload ?? {}) as NotificationView['payload'],
    readAt: n.read_at,
    createdAt: n.created_at,
  }))
  const unread = notifications.filter((n) => !n.readAt).length

  return NextResponse.json({ notifications, unread })
}
