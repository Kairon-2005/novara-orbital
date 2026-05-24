import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'

// POST /api/profile/link-parent — parent redeems invite code to link to student
export async function POST(request: Request) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await request.json()
  if (!code || typeof code !== 'string' || code.length !== 6) {
    return NextResponse.json({ error: 'Invalid invite code format' }, { status: 400 })
  }

  // Find student with this invite code
  const { data: studentProfile, error: lookupError } = await supabase
    .from('student_profiles')
    .select('user_id')
    .eq('invite_code', code.toUpperCase())
    .single()

  if (lookupError || !studentProfile) {
    return NextResponse.json({ error: 'Invite code not found. Check with your child.' }, { status: 404 })
  }

  // Check not already linked
  const { data: existing } = await supabase
    .from('parent_links')
    .select('id')
    .eq('parent_id', session.user.id)
    .eq('student_id', studentProfile.user_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Already linked to this student.' }, { status: 409 })
  }

  // Create link
  const { error: linkError } = await supabase.from('parent_links').insert({
    parent_id: session.user.id,
    student_id: studentProfile.user_id,
  })

  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 400 })
  return NextResponse.json({ ok: true, studentId: studentProfile.user_id })
}
