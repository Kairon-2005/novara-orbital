import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/client'
import { generateInviteCode } from '@/lib/invite-code'

// POST /api/profile/invite-code — generate or regenerate invite code (student only)
export async function POST() {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify student role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'student') {
    return NextResponse.json({ error: 'Only students can generate invite codes' }, { status: 403 })
  }

  // Generate a unique code (retry up to 5 times on collision)
  let code = ''
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateInviteCode()
    const { data: existing } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('invite_code', code)
      .maybeSingle()
    if (!existing) break
  }

  const { error } = await supabase
    .from('student_profiles')
    .update({ invite_code: code })
    .eq('user_id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ code })
}
