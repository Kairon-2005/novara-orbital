// Server-side admin gate for /api/admin/* routes. Reuses the pure isAdmin check;
// kept out of access.ts so that module stays I/O-free. See docs/PRD-admin.md §6.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { isAdmin } from '@/lib/admin/access'

export type AdminGate =
  | { ok: true; userId: string }
  | { ok: false; error: string; status: number }

export async function requireAdmin(supabase: SupabaseClient<Database>): Promise<AdminGate> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated', status: 401 }
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isAdmin(me)) return { ok: false, error: 'Forbidden', status: 403 }
  return { ok: true, userId: user.id }
}
