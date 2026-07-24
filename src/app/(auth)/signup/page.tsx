'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/db/client'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendOk, setResendOk] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) { setError('Please agree to the Terms of Service to continue.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    setError('')

    // 1. Create Supabase auth user — trigger auto-creates profiles + student_profiles rows.
    //    emailRedirectTo sends the user to /auth/callback after they confirm.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name, role: 'student' },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (authError || !authData.user) {
      setError(authError?.message ?? 'Sign up failed.')
      setLoading(false)
      return
    }

    // If Supabase returned a session immediately, email confirmation is disabled.
    // Skip the "check your email" screen and go straight to the app.
    if (authData.session) {
      window.location.href = '/dashboard'
      return
    }

    // Confirmation is on — show "check your email" screen.
    setSent(true)
    setLoading(false)
  }

  async function handleResend() {
    setResending(true)
    setError('')
    setResendOk(false)
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setResending(false)
    if (resendError) setError(resendError.message)
    else setResendOk(true)
  }

  // ── Email sent screen ──────────────────────────────────────────────────────
  if (sent) {
    return (
      <div style={{ width: 460 }}>
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
          <p className="text-[13px] text-[var(--t500)] mb-1">
            We sent a confirmation link to
          </p>
          <p className="text-[14px] font-semibold text-[var(--t900)] mb-6">{email}</p>
          <p className="text-[12px] text-[var(--t400)] leading-relaxed">
            Click the link in the email to verify your address and continue to onboarding.
            The link expires in 1 hour.
          </p>
          <div className="mt-6 pt-6 border-t border-[var(--border)] space-y-3">
            {resendOk && (
              <p className="text-[12px] font-medium text-[var(--green)]">✓ Email resent — check your inbox (and spam).</p>
            )}
            {error && (
              <p className="text-[12px] font-medium text-[var(--red)]">{error}</p>
            )}
            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full py-2.5 border-[1.5px] border-[var(--blue)] text-[var(--blue)] font-semibold text-[13px] rounded-lg hover:bg-[var(--blue-50)] transition disabled:opacity-60"
            >
              {resending ? 'Resending…' : 'Resend confirmation email'}
            </button>
            <p className="text-[12px] text-[var(--t400)]">
              Wrong address?{' '}
              <button
                onClick={() => { setSent(false); setError(''); setResendOk(false) }}
                className="text-[var(--blue)] font-semibold hover:underline"
              >
                Use a different email
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: 460 }}>
      <div className="bg-white border border-[var(--border)] rounded-2xl p-10 shadow-[0_8px_32px_rgba(26,86,219,0.08),0_2px_8px_rgba(0,0,0,0.04)]">

        {/* Brand */}
        <div className="flex items-center gap-3 justify-center mb-7">
          <div className="w-11 h-11 bg-[var(--blue)] rounded-xl flex items-center justify-center text-white font-display font-extrabold text-[22px]">
            N
          </div>
          <div className="font-display font-extrabold text-[24px] text-[var(--t900)]">Novara</div>
        </div>

        <h1 className="font-display font-bold text-[20px] text-center text-[var(--t900)] mb-1.5">
          Create your account
        </h1>
        <p className="text-[13px] text-[var(--t500)] text-center mb-7">
          Start your Singapore education journey — it&apos;s free
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="bg-[var(--red-50)] text-[var(--red)] text-[13px] px-4 py-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">Full name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Wei Zhang"
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
              placeholder="you@example.com"
              required
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-[13px] text-[var(--t900)] placeholder:text-[var(--t300)] focus:outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue-100)] transition"
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-[13px] text-[var(--t900)] placeholder:text-[var(--t300)] focus:outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue-100)] transition pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t300)] hover:text-[var(--t700)] transition">
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 accent-[var(--blue)]"
            />
            <span className="text-[12px] text-[var(--t500)] leading-relaxed">
              I agree to Novara&apos;s{' '}
              <Link href="#" className="text-[var(--blue)]">Terms of Service</Link>{' '}
              and{' '}
              <Link href="#" className="text-[var(--blue)]">Privacy Policy</Link>.
              I understand my data will be used to personalise my study roadmap.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[var(--blue)] hover:bg-[var(--blue-h)] text-white font-semibold text-[14px] rounded-lg transition disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create Account →'}
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
