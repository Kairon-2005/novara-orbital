'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@/db/client'
import { useLocale } from '@/components/shared/LocaleProvider'
import { LOCALE_COOKIE } from '@/lib/locale'

// The account menu opened from the sidebar avatar. Its own labels are bilingual
// so the language toggle has an immediate, real effect; the chosen locale is
// also persisted (cookie + localStorage) for the wider i18n rollout to consume.

type Lang = 'en' | 'zh'

const COPY = {
  en: {
    account: 'Account', subscription: 'Subscription', language: 'Language',
    editProfile: 'Edit profile', schoolEmail: 'School email', logout: 'Log out', freePlan: 'Free plan',
    used: (n: number) => `${n} AI generation${n === 1 ? '' : 's'} used`,
  },
  zh: {
    account: '账户', subscription: '订阅', language: '语言',
    editProfile: '编辑资料', schoolEmail: '学校邮箱验证', logout: '退出登录', freePlan: '免费版',
    used: (n: number) => `已使用 ${n} 次 AI 生成`,
  },
} satisfies Record<Lang, unknown>

export function ProfileMenu({
  userName,
  userEmail,
  isParent = false,
  generationsUsed = 0,
}: {
  userName: string
  userEmail?: string
  isParent?: boolean
  generationsUsed?: number
}) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const ref = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const lang = useLocale()
  const [signingOut, setSigningOut] = useState(false)

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function chooseLang(next: Lang) {
    try {
      window.localStorage.setItem('novara_locale', next)
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    } catch { /* storage may be unavailable */ }
    // Server components re-render with the new cookie; LocaleProvider follows.
    router.refresh()
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const t = COPY[lang]
  const cnFont = lang === 'zh' ? 'font-cn' : ''

  return (
    <div ref={ref} className="relative border-t border-[var(--border)]">
      {/* Trigger — the avatar + identity row */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-full px-3.5 py-3.5 flex items-center gap-2.5 text-left hover:bg-[var(--bg)] transition"
      >
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] flex-shrink-0',
          isParent ? 'bg-[#FEE2E2] text-[#C81E1E]' : 'bg-[var(--blue-50)] text-[var(--blue)]',
        )}>
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn('text-[13px] font-semibold text-[var(--t900)] truncate', isParent && 'font-cn')}>
            {userName}
          </div>
          {userEmail && <div className="text-[11px] text-[var(--t500)] truncate">{userEmail}</div>}
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t300)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>

      {/* Popover — opens upward from the bottom-anchored row */}
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute bottom-full left-2 right-2 mb-1 z-[120] bg-white border border-[var(--border)] rounded-[10px] overflow-hidden',
            'shadow-[0_8px_28px_rgba(0,0,0,0.14)]',
            cnFont,
          )}
        >
          {/* Subscription (student only — quota is per student) */}
          {!isParent && (
            <div className="px-3.5 py-3 border-b border-[var(--border)]">
              <div className="text-[10px] font-semibold text-[var(--t300)] uppercase tracking-wider mb-1.5">{t.subscription}</div>
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--t900)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" /> {t.freePlan}
              </span>
              <div className="text-[11px] text-[var(--t500)] mt-1">{t.used(generationsUsed)}</div>
            </div>
          )}

          {/* Language */}
          <div className="px-3.5 py-3 border-b border-[var(--border)]">
            <div className="text-[10px] font-semibold text-[var(--t300)] uppercase tracking-wider mb-1.5">{t.language}</div>
            <div className="inline-flex rounded-[8px] border border-[var(--border)] overflow-hidden text-[12px] font-semibold">
              {(['en', 'zh'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => chooseLang(l)}
                  className={cn(
                    'px-3.5 py-1.5 transition',
                    lang === l ? 'bg-[var(--blue)] text-white' : 'bg-white text-[var(--t500)] hover:bg-[var(--bg)]',
                  )}
                >
                  {l === 'en' ? 'EN' : '中文'}
                </button>
              ))}
            </div>
          </div>

          {/* Edit profile (student only) */}
          {!isParent && (
            <Link
              href="/onboarding"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-[var(--t700)] hover:bg-[var(--bg)] transition"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
              {t.editProfile}
            </Link>
          )}

          {/* School email verification (student only) */}
          {!isParent && (
            <Link
              href="/verify-school-email"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-[var(--t700)] hover:bg-[var(--bg)] transition"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
              </svg>
              {t.schoolEmail}
            </Link>
          )}

          {/* Log out */}
          <button
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-[var(--red)] hover:bg-[var(--red-50)] transition disabled:opacity-60"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t.logout}
          </button>
        </div>
      )}
    </div>
  )
}
