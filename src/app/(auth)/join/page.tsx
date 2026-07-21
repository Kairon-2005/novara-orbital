'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/db/client'
import { LOCALE_COOKIE, resolveLocale, type Locale } from '@/lib/locale'

// Auth pages live outside the panel layouts (no LocaleProvider), so read the
// NEXT_LOCALE cookie directly. Read after mount to avoid a hydration mismatch.
// Parent surfaces default to Chinese.
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
    codeLengthError: 'Invite code must be exactly 6 characters.',
    signUpFailed: 'Sign up failed.',
    // Email sent screen
    checkEmail: 'Check your email',
    sentLinkTo: 'We sent a confirmation link to',
    clickToConfirm: "Click the link in the email to confirm your address. Once confirmed, you'll be automatically linked to your child's account.",
    didntReceive: "Didn't receive it?",
    tryAgain: 'Try again',
    // Form
    joinAsParent: 'Join as a parent',
    enterCode: 'Enter the 6-character code from your child',
    inviteCode: 'Invite code',
    codeHint: 'Ask your child to generate this code in Novara → Settings',
    accountDetails: 'Your account details',
    yourName: 'Your name',
    namePlaceholder: 'Zhang Mei',
    emailLabel: 'Email address',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Min. 8 characters',
    linking: 'Linking account…',
    join: 'Join & link to child →',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
  },
  zh: {
    codeLengthError: '邀请码必须为6个字符。',
    signUpFailed: '注册失败。',
    // Email sent screen
    checkEmail: '请查收邮件',
    sentLinkTo: '我们已将验证链接发送至',
    clickToConfirm: '点击邮件中的链接验证邮箱。验证完成后，系统会自动将您与孩子的账户连接。',
    didntReceive: '没有收到邮件？',
    tryAgain: '重试',
    // Form
    joinAsParent: '以家长身份加入',
    enterCode: '请输入孩子提供的6位邀请码',
    inviteCode: '邀请码',
    codeHint: '请孩子在 Novara → 设置 中生成此邀请码',
    accountDetails: '您的账户信息',
    yourName: '您的姓名',
    namePlaceholder: 'Zhang Mei',
    emailLabel: '邮箱地址',
    passwordLabel: '密码',
    passwordPlaceholder: '至少8个字符',
    linking: '连接账户中…',
    join: '加入并连接孩子账户 →',
    haveAccount: '已有账户？',
    signIn: '登录',
  },
} satisfies Record<Locale, unknown>

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
  const t = T[useCookieLocale('zh')]

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) { setError(t.codeLengthError); return }
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
      setError(authError?.message ?? t.signUpFailed)
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
            {t.checkEmail}
          </h1>
          <p className="text-[13px] text-[var(--t500)] mb-1">{t.sentLinkTo}</p>
          <p className="text-[14px] font-semibold text-[var(--t900)] mb-4">{email}</p>
          <p className="text-[12px] text-[var(--t400)] leading-relaxed">
            {t.clickToConfirm}
          </p>
          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <p className="text-[12px] text-[var(--t400)]">
              {t.didntReceive}{' '}
              <button
                onClick={() => { setSent(false); setError('') }}
                className="text-[var(--blue)] font-semibold hover:underline"
              >
                {t.tryAgain}
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
          {t.joinAsParent}
        </h1>
        <p className="text-[13px] text-[var(--t500)] text-center mb-7">
          {t.enterCode}
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
              {t.inviteCode}
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
              {t.codeHint}
            </p>
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-[11px] text-[var(--t500)] mb-3 font-semibold uppercase tracking-wider">{t.accountDetails}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">{t.yourName}</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t.namePlaceholder}
                  required
                  className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-[13px] text-[var(--t900)] placeholder:text-[var(--t300)] focus:outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue-100)] transition"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">{t.emailLabel}</label>
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
                <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">{t.passwordLabel}</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
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
            {loading ? t.linking : t.join}
          </button>
        </form>

        <p className="text-center mt-5 text-[12px] text-[var(--t500)]">
          {t.haveAccount}{' '}
          <Link href="/login" className="text-[var(--blue)] font-semibold">{t.signIn}</Link>
        </p>
      </div>
    </div>
  )
}
