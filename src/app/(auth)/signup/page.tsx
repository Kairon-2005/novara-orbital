'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
    agreeFirst: 'Please agree to the Terms of Service to continue.',
    passwordTooShort: 'Password must be at least 8 characters.',
    signUpFailed: 'Sign up failed.',
    // Email sent screen
    checkEmail: 'Check your email',
    sentLinkTo: 'We sent a confirmation link to',
    clickToVerify: 'Click the link in the email to verify your address and continue to onboarding. The link expires in 1 hour.',
    resendOk: '✓ Email resent — check your inbox (and spam).',
    resending: 'Resending…',
    resend: 'Resend confirmation email',
    wrongAddress: 'Wrong address?',
    useDifferentEmail: 'Use a different email',
    // Form
    createAccount: 'Create your account',
    startJourney: "Start your Singapore education journey — it's free",
    fullName: 'Full name',
    namePlaceholder: 'Wei Zhang',
    emailLabel: 'Email address',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Min. 8 characters',
    agreePrefix: "I agree to Novara's ",
    tos: 'Terms of Service',
    and: ' and ',
    privacy: 'Privacy Policy',
    agreeSuffix: '. I understand my data will be used to personalise my study roadmap.',
    creating: 'Creating account…',
    create: 'Create Account →',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
  },
  zh: {
    agreeFirst: '请先同意服务条款以继续。',
    passwordTooShort: '密码至少需要8个字符。',
    signUpFailed: '注册失败。',
    // Email sent screen
    checkEmail: '请查收邮件',
    sentLinkTo: '我们已将验证链接发送至',
    clickToVerify: '点击邮件中的链接验证邮箱并继续完成引导。链接1小时内有效。',
    resendOk: '✓ 邮件已重新发送——请查收收件箱（及垃圾邮件）。',
    resending: '重新发送中…',
    resend: '重新发送验证邮件',
    wrongAddress: '邮箱写错了？',
    useDifferentEmail: '换一个邮箱',
    // Form
    createAccount: '创建你的账户',
    startJourney: '开启你的新加坡留学之旅——完全免费',
    fullName: '姓名',
    namePlaceholder: 'Wei Zhang',
    emailLabel: '邮箱地址',
    passwordLabel: '密码',
    passwordPlaceholder: '至少8个字符',
    agreePrefix: '我同意 Novara 的',
    tos: '服务条款',
    and: '与',
    privacy: '隐私政策',
    agreeSuffix: '。我知悉我的数据将用于个性化我的学习路线图。',
    creating: '创建账户中…',
    create: '创建账户 →',
    haveAccount: '已有账户？',
    signIn: '登录',
  },
} satisfies Record<Locale, unknown>

export default function SignupPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const t = T[useCookieLocale('en')]

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendOk, setResendOk] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) { setError(t.agreeFirst); return }
    if (password.length < 8) { setError(t.passwordTooShort); return }

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
      setError(authError?.message ?? t.signUpFailed)
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
            {t.checkEmail}
          </h1>
          <p className="text-[13px] text-[var(--t500)] mb-1">
            {t.sentLinkTo}
          </p>
          <p className="text-[14px] font-semibold text-[var(--t900)] mb-6">{email}</p>
          <p className="text-[12px] text-[var(--t400)] leading-relaxed">
            {t.clickToVerify}
          </p>
          <div className="mt-6 pt-6 border-t border-[var(--border)] space-y-3">
            {resendOk && (
              <p className="text-[12px] font-medium text-[var(--green)]">{t.resendOk}</p>
            )}
            {error && (
              <p className="text-[12px] font-medium text-[var(--red)]">{error}</p>
            )}
            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full py-2.5 border-[1.5px] border-[var(--blue)] text-[var(--blue)] font-semibold text-[13px] rounded-lg hover:bg-[var(--blue-50)] transition disabled:opacity-60"
            >
              {resending ? t.resending : t.resend}
            </button>
            <p className="text-[12px] text-[var(--t400)]">
              {t.wrongAddress}{' '}
              <button
                onClick={() => { setSent(false); setError(''); setResendOk(false) }}
                className="text-[var(--blue)] font-semibold hover:underline"
              >
                {t.useDifferentEmail}
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
          {t.createAccount}
        </h1>
        <p className="text-[13px] text-[var(--t500)] text-center mb-7">
          {t.startJourney}
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="bg-[var(--red-50)] text-[var(--red)] text-[13px] px-4 py-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">{t.fullName}</label>
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
              placeholder="you@example.com"
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

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 accent-[var(--blue)]"
            />
            <span className="text-[12px] text-[var(--t500)] leading-relaxed">
              {t.agreePrefix}
              <Link href="#" className="text-[var(--blue)]">{t.tos}</Link>
              {t.and}
              <Link href="#" className="text-[var(--blue)]">{t.privacy}</Link>
              {t.agreeSuffix}
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[var(--blue)] hover:bg-[var(--blue-h)] text-white font-semibold text-[14px] rounded-lg transition disabled:opacity-60"
          >
            {loading ? t.creating : t.create}
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
