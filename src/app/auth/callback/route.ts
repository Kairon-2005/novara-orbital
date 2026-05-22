import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// GET /auth/callback
// Supabase redirects here after the user clicks the confirmation link in their email.
// We exchange the one-time `code` for a real session, handle parent linking if needed,
// then send the user to the right page.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code       = searchParams.get('code')        // Supabase PKCE code
  const inviteCode = searchParams.get('inviteCode')  // set by join page for parent flow

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=Missing+confirmation+code`)
  }

  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet: Array<{ name: string; value: string; options: CookieOptions }>) => {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    console.error('[auth/callback] exchangeCodeForSession error:', exchangeError.message)
    return NextResponse.redirect(`${origin}/login?error=Confirmation+failed.+Try+signing+up+again.`)
  }

  // ── Parent join flow ──────────────────────────────────────────────────────
  // If inviteCode is present, link the (now-confirmed) parent to the student.
  if (inviteCode) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      // Look up the student by invite code
      const { data: studentProfile } = await supabase
        .from('student_profiles')
        .select('user_id')
        .eq('invite_code', inviteCode.toUpperCase())
        .maybeSingle()

      if (studentProfile) {
        // Insert the parent_link (ignore if already exists)
        await supabase.from('parent_links').insert({
          parent_id: session.user.id,
          student_id: studentProfile.user_id,
        })
      }
    }
    return NextResponse.redirect(`${origin}/parent/dashboard`)
  }

  // ── Student signup flow ───────────────────────────────────────────────────
  return NextResponse.redirect(`${origin}/onboarding`)
}
