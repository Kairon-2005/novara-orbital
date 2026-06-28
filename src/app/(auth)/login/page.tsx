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

    // Route by role: admins → admin panel, parents → parent portal, else student.
    let dest = '/dashboard'
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role === 'admin') dest = '/admin'
      else if (profile?.role === 'parent') dest = '/parent/dashboard'
    }
    // Hard redirect so the server component re-renders with fresh session cookies.
    window.location.href = dest
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
