// POST /api/admin/users/role  { userId, role }
// Promote/demote a user. Admin-only; the write goes through the service role
// (the guard_profile_role trigger blocks role changes from anyone else).

import { NextResponse } from 'next/server'
import { createRouteClient, createAdminClient } from '@/db/server'
import { requireAdmin } from '@/lib/admin/guard'
import type { Role } from '@/types/database'

const ROLES: Role[] = ['student', 'parent', 'admin']

export async function POST(request: Request) {
  const supabase = createRouteClient()
  const gate = await requireAdmin(supabase)
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const { userId, role } = await request.json().catch(() => ({})) as { userId?: string; role?: Role }
  if (!userId || !role || !ROLES.includes(role)) {
    return NextResponse.json({ error: 'userId and a valid role are required' }, { status: 400 })
  }
  // Don't let an admin lock themselves out.
  if (userId === gate.userId && role !== 'admin') {
    return NextResponse.json({ error: "You can't remove your own admin role." }, { status: 400 })
  }

  const { error } = await createAdminClient().from('profiles').update({ role }).eq('id', userId)
  if (error) return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
