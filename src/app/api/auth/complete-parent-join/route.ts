// POST /api/auth/complete-parent-join
// Called when email confirmation is disabled and a parent signs up via /join.
// Since there's no auth/callback redirect in that case, we do the parent linking here.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(request: Request) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { inviteCode } = await request.json() as { inviteCode: string }
  if (!inviteCode) return NextResponse.json({ error: 'No invite code' }, { status: 400 })

  // Find the student by invite code
  const { data: studentProfile } = await supabaseAdmin
    .from('student_profiles')
    .select('user_id')
    .eq('invite_code', inviteCode.toUpperCase())
    .maybeSingle()

  if (!studentProfile) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  // Insert the parent link (ignore duplicate if already linked)
  await supabaseAdmin
    .from('parent_links')
    .upsert({ parent_id: user.id, student_id: studentProfile.user_id }, { onConflict: 'parent_id' })

  return NextResponse.json({ ok: true })
}
