import { NextResponse } from 'next/server'
import { createRouteClient, createAdminClient } from '@/db/server'
import {
  decideCodeRequest, decideCodeSubmit, hashCode, newVerificationCode, CODE_TTL_MINUTES,
} from '@/lib/school-email'
import { isEmailConfigured, sendVerificationEmail } from '@/lib/email-sender'

// School-email OTP. All row writes go through the service role — the table is
// select-only for users so counters/hashes can't be tampered with client-side.

async function requireStudent(supabase: ReturnType<typeof createRouteClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'student') {
    return { error: NextResponse.json({ error: 'Students only' }, { status: 403 }) }
  }
  return { userId: user.id }
}

// POST { email } — request a code
export async function POST(req: Request) {
  const supabase = createRouteClient()
  const auth = await requireStudent(supabase)
  if ('error' in auth) return auth.error

  if (!isEmailConfigured()) {
    return NextResponse.json({ error: 'email_not_configured' }, { status: 503 })
  }

  const { email } = await req.json().catch(() => ({}))
  if (typeof email !== 'string' || !email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('school_email_verifications')
    .select('sends_today, send_day, verified_at')
    .eq('user_id', auth.userId)
    .maybeSingle()

  const now = new Date().toISOString()
  const decision = decideCodeRequest({
    email,
    existing: existing
      ? { sendsToday: existing.sends_today, sendDay: existing.send_day, verifiedAt: existing.verified_at }
      : null,
    now,
  })
  if (!decision.ok) {
    const status = decision.reason === 'too_many_sends' ? 429 : 400
    return NextResponse.json({ error: decision.reason }, { status })
  }

  const code = newVerificationCode()
  const today = now.slice(0, 10)
  const sameDay = existing?.send_day === today
  const { error } = await admin.from('school_email_verifications').upsert({
    user_id: auth.userId,
    email: email.trim().toLowerCase(),
    domain: decision.domain,
    institution: decision.institution,
    code_hash: hashCode(code, auth.userId),
    expires_at: new Date(Date.parse(now) + CODE_TTL_MINUTES * 60_000).toISOString(),
    attempts: 0,
    sends_today: sameDay ? (existing?.sends_today ?? 0) + 1 : 1,
    send_day: today,
    verified_at: null, // re-verification resets the badge until the new code lands
  }, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  try {
    await sendVerificationEmail(email.trim(), code)
  } catch (err) {
    console.error('[verify-school-email] send failed', err)
    return NextResponse.json({ error: 'send_failed' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, institution: decision.institution })
}

// PUT { code } — submit the code
export async function PUT(req: Request) {
  const supabase = createRouteClient()
  const auth = await requireStudent(supabase)
  if ('error' in auth) return auth.error

  const { code } = await req.json().catch(() => ({}))
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'code required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: record } = await admin
    .from('school_email_verifications')
    .select('code_hash, expires_at, attempts, institution, email')
    .eq('user_id', auth.userId)
    .maybeSingle()
  if (!record) return NextResponse.json({ error: 'no_pending_code' }, { status: 404 })

  const now = new Date().toISOString()
  const decision = decideCodeSubmit({
    code,
    userId: auth.userId,
    record: { codeHash: record.code_hash, expiresAt: record.expires_at, attempts: record.attempts },
    now,
  })

  if (!decision.ok) {
    if (decision.reason === 'wrong_code') {
      await admin.from('school_email_verifications')
        .update({ attempts: record.attempts + 1 })
        .eq('user_id', auth.userId)
    }
    const status = decision.reason === 'wrong_code' ? 400 : 410
    return NextResponse.json({ error: decision.reason }, { status })
  }

  await admin.from('school_email_verifications')
    .update({ verified_at: now })
    .eq('user_id', auth.userId)
  return NextResponse.json({ ok: true, institution: record.institution, email: record.email })
}
