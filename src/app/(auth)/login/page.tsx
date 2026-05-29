'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/db/client'

export default function LoginPage() {
  const supabase = createBrowserClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]           = useState('')
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resent, setResent]           = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setUnconfirmed(false)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      if (authError.message.toLowerCase().includes('email not confirmed')) {
        setUnconfirmed(true)
      } else {
        setError(authError.message)
      }
      setLoading(false)
      return
    }

    // Hard redirect so the server component re-renders with fresh session cookies.
    window.location.href = '/dashboard'
  }

  async function handleResend() {
    setResent(false)
    await supabase.auth.resend({ type: 'signup', email })
    setResent(true)
  }

  return (
    <div style={{ width: 420 }}>
      <div className="bg-white border border-[var(--border)] rounded-2xl p-10 shadow-[0_8px_32px_rgba(26,86,219,0.08),0_2px_8px_rgba(0,0,0,0.04)]">

        {/* Brand */}
        <div className="flex items-center gap-3 justify-center mb-7">
          <div className="w-11 h-11 bg-[var(--blue)] rounded-xl flex items-center justify-center text-white font-display font-extrabold text-[22px]">
            N
          </div>
          <div className="font-display font-extrabold text-[24px] text-[var(--t900)]">Novara</div>
        </div>
        <p className="text-[12px] text-[var(--t300)] text-center -mt-5 mb-6">
          Your path to Singapore&apos;s top universities
        </p>

        <h1 className="font-display font-bold text-[20px] text-center text-[var(--t900)] mb-1.5">
          Welcome back
        </h1>
        <p className="text-[13px] text-[var(--t500)] text-center mb-7">
          Sign in to continue your journey
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-[var(--red-50)] text-[var(--red)] text-[13px] px-4 py-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          {unconfirmed && (
            <div className="bg-[#FFFBEB] text-[#B45309] text-[13px] px-4 py-3 rounded-lg border border-yellow-200 space-y-1.5">
              <div className="font-semibold">Email not confirmed</div>
              <div className="text-[12px]">Check your inbox for the confirmation link.</div>
              {resent ? (
                <div className="text-[12px] text-[var(--green)] font-semibold">✓ Confirmation email resent!</div>
              ) : (
                <button type="button" onClick={handleResend} className="text-[12px] font-semibold underline">
                  Resend confirmation email →
                </button>
              )}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-[13px] text-[var(--t900)] placeholder:text-[var(--t300)] focus:outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue-100)] transition"
            />
          </div>

          <div>
            <label className="flex justify-between text-[12px] font-semibold text-[var(--t700)] mb-1.5">
              <span>Password</span>
              <Link href="#" className="text-[var(--blue)] font-medium text-[11px]">
                Forgot password?
              </Link>
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-[13px] text-[var(--t900)] placeholder:text-[var(--t300)] focus:outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue-100)] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[var(--blue)] hover:bg-[var(--blue-h)] text-white font-semibold text-[14px] rounded-lg transition disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-[12px] text-[var(--t300)]">or</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        {/* Google */}
        <button className="w-full py-2.5 border-[1.5px] border-[var(--border)] rounded-lg bg-white hover:bg-[var(--bg)] hover:border-[var(--blue)] flex items-center justify-center gap-2.5 text-[13px] font-semibold text-[var(--t700)] transition">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="text-center mt-6 text-[12px] text-[var(--t500)] space-y-1.5">
          <div>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[var(--blue)] font-semibold">Create one free</Link>
          </div>
          <div>
            <Link href="/join" className="text-[var(--t300)] text-[11px]">
              Parent? Join with invite code →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
