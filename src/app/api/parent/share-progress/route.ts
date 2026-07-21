import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { defaultShareExpiry, newShareToken } from '@/lib/progress-share'

// Parent-only management of 申请进度 share links. RLS enforces both the role
// (only a linked parent can insert) and ownership (only the creator can list
// or revoke) — the route just shapes requests and responses.

async function requireParentWithChild(supabase: ReturnType<typeof createRouteClient>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const [{ data: profile }, { data: link }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', session.user.id).single(),
    supabase.from('parent_links').select('student_id').eq('parent_id', session.user.id).maybeSingle(),
  ])
  if (profile?.role !== 'parent') {
    return { error: NextResponse.json({ error: 'Only parents can share progress' }, { status: 403 }) }
  }
  if (!link?.student_id) {
    return { error: NextResponse.json({ error: 'No linked student' }, { status: 403 }) }
  }
  return { userId: session.user.id, studentId: link.student_id }
}

// POST — mint a new share link (7-day expiry)
export async function POST() {
  const supabase = createRouteClient()
  const auth = await requireParentWithChild(supabase)
  if ('error' in auth) return auth.error

  const token = newShareToken()
  const { data, error } = await supabase
    .from('progress_shares')
    .insert({
      token,
      student_id: auth.studentId,
      created_by: auth.userId,
      expires_at: defaultShareExpiry(new Date().toISOString()),
    })
    .select('id, token, expires_at')
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 400 })
  return NextResponse.json({ id: data.id, path: `/share/progress/${data.token}`, expiresAt: data.expires_at })
}

// GET — list own shares, newest first
export async function GET() {
  const supabase = createRouteClient()
  const auth = await requireParentWithChild(supabase)
  if ('error' in auth) return auth.error

  const { data, error } = await supabase
    .from('progress_shares')
    .select('id, token, created_at, expires_at, revoked_at')
    .eq('created_by', auth.userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({
    shares: (data ?? []).map(s => ({
      id: s.id,
      path: `/share/progress/${s.token}`,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
      revokedAt: s.revoked_at,
    })),
  })
}

// PATCH — revoke one own share: { id }
export async function PATCH(req: Request) {
  const supabase = createRouteClient()
  const auth = await requireParentWithChild(supabase)
  if ('error' in auth) return auth.error

  const { id } = await req.json().catch(() => ({}))
  if (typeof id !== 'string' || !id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('progress_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('created_by', auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
