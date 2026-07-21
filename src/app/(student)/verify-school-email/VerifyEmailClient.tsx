'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/components/shared/LocaleProvider'

const T = {
  en: {
    pageTitle: 'School Email Verification',
    pageSubtitle: 'Prove you hold a university mailbox — your admission cases earn a stronger badge.',
    verifiedTitle: (inst: string) => `✅ Verified — ${inst}`,
    verifiedBody: (email: string) => `${email} is verified. Cases you publish for this university now carry the 邮箱验证 badge.`,
    reverify: 'Verify a different address',
    whyTitle: 'Why verify?',
    whyBody: 'Documents can be faked; control of a school mailbox cannot. Verified authors\' cases rank higher in trust and display a distinct badge. One-time code only — we never email you anything else.',
    emailLabel: 'Your university email',
    emailPh: 'e.g. e0123456@u.nus.edu',
    supported: 'Supported: NUS · NTU · SMU · SUTD · SIT · SUSS student domains',
    sendCode: 'Send code',
    sending: 'Sending…',
    codeSent: (inst: string) => `Code sent — check your ${inst} inbox (15 min).`,
    codeLabel: '6-digit code',
    confirm: 'Confirm',
    checking: 'Checking…',
    notConfigured: 'The verification email service is not enabled yet on this deployment — check back soon.',
    errors: {
      unsupported_domain: 'That domain isn\'t a supported student mailbox.',
      too_many_sends: 'Daily send limit reached — try again tomorrow.',
      send_failed: 'Could not send the email. Try again shortly.',
      wrong_code: 'Wrong code — check and try again.',
      expired: 'Code expired — request a new one.',
      too_many_attempts: 'Too many attempts — request a new code.',
      no_pending_code: 'No pending code — request one first.',
      generic: 'Something went wrong. Try again.',
    } as Record<string, string>,
  },
  zh: {
    pageTitle: '学校邮箱验证',
    pageSubtitle: '证明你拥有大学邮箱——你发布的录取案例将获得更高等级的可信徽章。',
    verifiedTitle: (inst: string) => `✅ 已验证 — ${inst}`,
    verifiedBody: (email: string) => `${email} 已通过验证。你发布的该校案例将展示「邮箱验证」徽章。`,
    reverify: '验证其他邮箱',
    whyTitle: '为什么要验证？',
    whyBody: '文件可以伪造，学校邮箱的控制权无法伪造。通过验证的作者，其案例可信度更高并展示专属徽章。仅发送一次性验证码——我们绝不会发送其他任何邮件。',
    emailLabel: '你的大学邮箱',
    emailPh: '如 e0123456@u.nus.edu',
    supported: '支持：NUS · NTU · SMU · SUTD · SIT · SUSS 学生邮箱',
    sendCode: '发送验证码',
    sending: '发送中…',
    codeSent: (inst: string) => `验证码已发送——请查收你的 ${inst} 邮箱（15分钟内有效）。`,
    codeLabel: '6位验证码',
    confirm: '确认',
    checking: '验证中…',
    notConfigured: '本环境暂未开通验证邮件服务，敬请期待。',
    errors: {
      unsupported_domain: '该域名不是受支持的学生邮箱。',
      too_many_sends: '今日发送次数已达上限，请明天再试。',
      send_failed: '邮件发送失败，请稍后重试。',
      wrong_code: '验证码错误，请检查后重试。',
      expired: '验证码已过期，请重新获取。',
      too_many_attempts: '尝试次数过多，请重新获取验证码。',
      no_pending_code: '没有待验证的验证码，请先获取。',
      generic: '出了点问题，请重试。',
    } as Record<string, string>,
  },
}

export default function VerifyEmailClient({ current, emailConfigured }: {
  current: { email: string; institution: string; verifiedAt: string | null } | null
  emailConfigured: boolean
}) {
  const locale = useLocale()
  const t = T[locale]
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [phase, setPhase] = useState<'idle' | 'sending' | 'sent' | 'checking'>('idle')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(!current?.verifiedAt)

  async function requestCode(e: React.FormEvent) {
    e.preventDefault()
    setPhase('sending'); setError(null)
    const res = await fetch('/api/verify-school-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setPhase('idle')
      setError(res.status === 503 ? t.notConfigured : (t.errors[body.error] ?? t.errors.generic))
      return
    }
    setSentTo(body.institution)
    setPhase('sent')
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault()
    setPhase('checking'); setError(null)
    const res = await fetch('/api/verify-school-email', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setPhase('sent')
      setError(t.errors[body.error] ?? t.errors.generic)
      return
    }
    router.refresh()
    setShowForm(false)
    setPhase('idle')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center sticky top-0 z-40">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">{t.pageTitle}</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">{t.pageSubtitle}</div>
        </div>
      </div>

      <div className="p-[28px_36px] flex-1 max-w-[560px]">
        {current?.verifiedAt && !showForm ? (
          <div className="bg-white border border-[var(--border)] rounded-[10px] p-5">
            <div className="font-display font-bold text-[15px] text-[#057A55] mb-1">
              {t.verifiedTitle(current.institution)}
            </div>
            <p className="text-[13px] text-[var(--t500)] leading-relaxed mb-3">{t.verifiedBody(current.email)}</p>
            <button onClick={() => setShowForm(true)} className="text-[12px] font-semibold text-[var(--blue)] hover:underline">
              {t.reverify}
            </button>
          </div>
        ) : (
          <>
            <div className="bg-[var(--blue-50)] border border-[var(--blue-100)] rounded-[10px] p-4 mb-5">
              <div className="text-[13px] font-bold text-[var(--blue)] mb-1">{t.whyTitle}</div>
              <p className="text-[12px] text-[var(--t700)] leading-relaxed">{t.whyBody}</p>
            </div>

            {!emailConfigured && (
              <div className="mb-5 px-4 py-3 bg-[#FFFBEB] border border-[#FCD34D] rounded-[10px] text-[13px] text-[var(--amber)]">
                {t.notConfigured}
              </div>
            )}

            {error && <div className="text-[12px] text-[var(--red)] mb-3">{error}</div>}

            {phase !== 'sent' && phase !== 'checking' ? (
              <form onSubmit={requestCode} className="bg-white border border-[var(--border)] rounded-[10px] p-5 space-y-3">
                <label className="block text-[12px] font-semibold text-[var(--t700)]">{t.emailLabel}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder={t.emailPh}
                  className="w-full px-3 py-2.5 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] focus:outline-none focus:border-[var(--blue)] placeholder:text-[var(--t300)]" />
                <div className="text-[11px] text-[var(--t400)]">{t.supported}</div>
                <button type="submit" disabled={phase === 'sending' || !emailConfigured}
                  className="px-4 py-2 rounded-[8px] text-[13px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition disabled:opacity-50">
                  {phase === 'sending' ? t.sending : t.sendCode}
                </button>
              </form>
            ) : (
              <form onSubmit={submitCode} className="bg-white border border-[var(--border)] rounded-[10px] p-5 space-y-3">
                <div className="text-[13px] text-[#057A55] font-semibold">{t.codeSent(sentTo ?? '')}</div>
                <label className="block text-[12px] font-semibold text-[var(--t700)]">{t.codeLabel}</label>
                <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required
                  inputMode="numeric" pattern="\d{6}"
                  className="w-full px-3 py-2.5 border-[1.5px] border-[var(--border)] rounded-[8px] text-[18px] font-mono tracking-[0.4em] text-center focus:outline-none focus:border-[var(--blue)]" />
                <button type="submit" disabled={phase === 'checking' || code.length !== 6}
                  className="px-4 py-2 rounded-[8px] text-[13px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition disabled:opacity-50">
                  {phase === 'checking' ? t.checking : t.confirm}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
