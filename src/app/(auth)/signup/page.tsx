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

    // Show "check your email" screen — redirect happens via /auth/callback
    setSent(true)
    setLoading(false)
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

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-[12px] text-[var(--t300)]">or sign up with</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        <button className="w-full py-2.5 border-[1.5px] border-[var(--border)] rounded-lg bg-white hover:bg-[var(--bg)] hover:border-[var(--blue)] flex items-center justify-center gap-2.5 text-[13px] font-semibold text-[var(--t700)] transition">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-center mt-5 text-[12px] text-[var(--t500)]">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--blue)] font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
