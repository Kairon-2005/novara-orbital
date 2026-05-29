'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/db/client'

// useSearchParams() must be inside Suspense — Next.js 14 requirement
export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinForm />
    </Suspense>
  )
}

function JoinForm() {
  const searchParams = useSearchParams()
  const supabase = createBrowserClient()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) { setError('Invite code must be exactly 6 characters.'); return }
    setLoading(true)
    setError('')

    // 1. Sign up — trigger auto-creates profiles row with role: 'parent'.
    //    Pass inviteCode to the callback URL so linking happens after confirmation.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name, role: 'parent' },
        emailRedirectTo: `${window.location.origin}/auth/callback?inviteCode=${code.toUpperCase()}`,
      },
    })
    if (authError || !authData.user) {
      setError(authError?.message ?? 'Sign up failed.')
      setLoading(false)
      return
    }

    // If Supabase returned a session immediately, email confirmation is disabled.
    // Do the parent linking right now via the server route, then redirect.
    if (authData.session) {
      await fetch('/api/auth/complete-parent-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code.toUpperCase() }),
      })
      window.location.href = '/parent/dashboard'
      return
    }

    // Confirmation is on — show "check your email" screen.
    setSent(true)
    setLoading(false)
  }

  // ── Email sent screen ──────────────────────────────────────────────────────
  if (sent) {
    return (
      <div style={{ width: 440 }}>
        <div className="bg-white border border-[var(--border)] rounded-2xl p-10 shadow-[0_8px_32px_rgba(26,86,219,0.08),0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <div className="w-16 h-16 bg-[var(--blue-100)] rounded-full flex items-center justify-center mx-auto mb-5">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <h1 className="font-display font-bold text-[20px] text-[var(--t900)] mb-2">
            Check your email
          </h1>
          <p className="text-[13px] text-[var(--t500)] mb-1">We sent a confirmation link to</p>
          <p className="text-[14px] font-semibold text-[var(--t900)] mb-4">{email}</p>
          <p className="text-[12px] text-[var(--t400)] leading-relaxed">
            Click the link in the email to confirm your address. Once confirmed, you&apos;ll be
            automatically linked to your child&apos;s account.
          </p>
          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <p className="text-[12px] text-[var(--t400)]">
              Didn&apos;t receive it?{' '}
              <button
                onClick={() => { setSent(false); setError('') }}
                className="text-[var(--blue)] font-semibold hover:underline"
              >
                Try again
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: 440 }}>
      <div className="bg-white border border-[var(--border)] rounded-2xl p-10 shadow-[0_8px_32px_rgba(26,86,219,0.08),0_2px_8px_rgba(0,0,0,0.04)]">

        {/* Brand */}
        <div className="flex items-center gap-3 justify-center mb-7">
          <div className="w-11 h-11 bg-[var(--blue)] rounded-xl flex items-center justify-center text-white font-display font-extrabold text-[22px]">
            N
          </div>
          <div className="font-display font-extrabold text-[24px] text-[var(--t900)]">Novara</div>
        </div>

        <h1 className="font-display font-bold text-[20px] text-center text-[var(--t900)] mb-1.5">
          Join as a parent
        </h1>
        <p className="text-[13px] text-[var(--t500)] text-center mb-7">
          Enter the 6-character code from your child
        </p>

        <form onSubmit={handleJoin} className="space-y-4">
          {error && (
            <div className="bg-[var(--red-50)] text-[var(--red)] text-[13px] px-4 py-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Invite code — prominent */}
          <div>
            <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">
              Invite code
            </label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="X7KP2Q"
              maxLength={6}
              required
              className="w-full px-3.5 py-3 border-2 border-[var(--blue)] rounded-lg text-[20px] font-bold text-center tracking-[0.3em] text-[var(--t900)] placeholder:text-[var(--t300)] placeholder:tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--blue-100)] transition"
            />
            <p className="text-[11px] text-[var(--t300)] mt-1 text-center">
              Ask your child to generate this code in Novara → Settings
            </p>
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-[11px] text-[var(--t500)] mb-3 font-semibold uppercase tracking-wider">Your account details</p>

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Zhang Mei"
                  required
                  className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-[13px] text-[var(--t900)] placeholder:text-[var(--t300)] focus:outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue-100)] transition"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  required
                  className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-[13px] text-[var(--t900)] placeholder:text-[var(--t300)] focus:outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue-100)] transition"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-[13px] text-[var(--t900)] placeholder:text-[var(--t300)] focus:outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue-100)] transition"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[var(--blue)] hover:bg-[var(--blue-h)] text-white font-semibold text-[14px] rounded-lg transition disabled:opacity-60"
          >
            {loading ? 'Linking account…' : 'Join & link to child →'}
          </button>
        </form>

        <p className="text-center mt-5 text-[12px] text-[var(--t500)]">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--blue)] font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
