import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'

// GET /api/profile — current user's profile + student_profile
export async function GET() {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  const { data: studentProfile } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  return NextResponse.json({ profile, studentProfile })
}

// PATCH /api/profile — update student_profile fields
export async function PATCH(request: Request) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const allowedFields = [
    'current_year', 'current_school', 'current_curriculum',
    'target_university', 'target_programme', 'target_enrollment_year',
    'application_route', 'target_school', 'programme_category',
    'interests', 'budget_range', 'english_level', 'onboarding_done',
  ]

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field]
  }

  // Upsert, not update: an UPDATE that matches no row succeeds silently, so a
  // user whose student_profiles row is missing would finish onboarding, be told
  // it saved, and then hit "Profile not found" on every AI feature. Upserting
  // makes the row self-healing instead.
  const { error } = await supabase
    .from('student_profiles')
    .upsert({ ...updates, user_id: session.user.id }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
