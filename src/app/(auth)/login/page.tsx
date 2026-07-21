'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/db/client'
import { LOCALE_COOKIE, resolveLocale, type Locale } from '@/lib/locale'

// Auth pages live outside the panel layouts (no LocaleProvider), so read the
// NEXT_LOCALE cookie directly. Read after mount to avoid a hydration mismatch.
function useCookieLocale(fallback: Locale): Locale {
  const [locale, setLocale] = useState<Locale>(fallback)
  useEffect(() => {
    const value = document.cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`))?.[1]
    setLocale(resolveLocale(value, fallback))
  }, [fallback])
  return locale
}

const T = {
  en: {
    tagline: "Your path to Singapore's top universities",
    welcomeBack: 'Welcome back',
    signInToContinue: 'Sign in to continue your journey',
    emailNotConfirmed: 'Email not confirmed',
    checkInbox: 'Check your inbox for the confirmation link.',
    resent: '✓ Confirmation email resent!',
    resend: 'Resend confirmation email →',
    emailLabel: 'Email address',
    passwordLabel: 'Password',
    forgotPassword: 'Forgot password?',
    signingIn: 'Signing in…',
    signIn: 'Sign in',
    noAccount: "Don't have an account?",
    createOne: 'Create one free',
    parentJoin: 'Parent? Join with invite code →',
  },
  zh: {
    tagline: '通往新加坡顶尖大学之路',
    welcomeBack: '欢迎回来',
    signInToContinue: '登录以继续你的申请之旅',
    emailNotConfirmed: '邮箱尚未验证',
    checkInbox: '请在收件箱中查收验证邮件。',
    resent: '✓ 验证邮件已重新发送！',
    resend: '重新发送验证邮件 →',
    emailLabel: '邮箱地址',
    passwordLabel: '密码',
    forgotPassword: '忘记密码？',
    signingIn: '登录中…',
    signIn: '登录',
    noAccount: '还没有账户？',
    createOne: '免费注册',
    parentJoin: '家长？使用邀请码加入 →',
  },
} satisfies Record<Locale, unknown>

export default function LoginPage() {
  const supabase = createBrowserClient()
  const t = T[useCookieLocale('en')]

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
          {t.tagline}
        </p>

        <h1 className="font-display font-bold text-[20px] text-center text-[var(--t900)] mb-1.5">
          {t.welcomeBack}
        </h1>
        <p className="text-[13px] text-[var(--t500)] text-center mb-7">
          {t.signInToContinue}
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-[var(--red-50)] text-[var(--red)] text-[13px] px-4 py-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          {unconfirmed && (
            <div className="bg-[#FFFBEB] text-[#B45309] text-[13px] px-4 py-3 rounded-lg border border-yellow-200 space-y-1.5">
              <div className="font-semibold">{t.emailNotConfirmed}</div>
              <div className="text-[12px]">{t.checkInbox}</div>
              {resent ? (
                <div className="text-[12px] text-[var(--green)] font-semibold">{t.resent}</div>
              ) : (
                <button type="button" onClick={handleResend} className="text-[12px] font-semibold underline">
                  {t.resend}
                </button>
              )}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">
              {t.emailLabel}
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
              <span>{t.passwordLabel}</span>
              <Link href="#" className="text-[var(--blue)] font-medium text-[11px]">
                {t.forgotPassword}
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
            {loading ? t.signingIn : t.signIn}
          </button>
        </form>

        <div className="text-center mt-6 text-[12px] text-[var(--t500)] space-y-1.5">
          <div>
            {t.noAccount}{' '}
            <Link href="/signup" className="text-[var(--blue)] font-semibold">{t.createOne}</Link>
          </div>
          <div>
            <Link href="/join" className="text-[var(--t300)] text-[11px]">
              {t.parentJoin}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
