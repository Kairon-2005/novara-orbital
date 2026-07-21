'use client'

import { useState } from 'react'
import { useLocale } from '@/components/shared/LocaleProvider'
import type { Locale } from '@/lib/locale'

// Native WeChat share needs the WeChat JS-SDK + an official-account binding, so
// it is gated behind a build flag. Copy-link + QR work everywhere.
const WECHAT_ENABLED = process.env.NEXT_PUBLIC_WECHAT_SHARE_ENABLED === '1'

const T = {
  en: {
    share: '🔗 Share',
    intro: 'Share this verified, anonymized case:',
    qrAlt: 'QR code',
    copied: '✓ Link copied',
    copyLink: 'Copy link',
    wechat: 'WeChat friends / Moments',
    privacyNote: 'Only the anonymized case is shared — never your identity or proof files.',
  },
  zh: {
    share: '🔗 分享',
    intro: '分享这个已验证的匿名案例：',
    qrAlt: '二维码',
    copied: '✓ 链接已复制',
    copyLink: '复制链接',
    wechat: '微信好友 / 朋友圈',
    privacyNote: '仅分享匿名化的案例——绝不会泄露你的身份或证明材料。',
  },
} satisfies Record<Locale, unknown>

export default function ShareButton({ path, label }: { path: string; label?: string }) {
  const t = T[useLocale()]
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard blocked */ }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-[13px] font-semibold px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--t500)] hover:border-[var(--blue)]"
      >
        {label ?? t.share}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[240px] card p-3 z-30 shadow-lg">
          <p className="text-[12px] text-[var(--t500)] mb-2">{t.intro}</p>
          <div className="flex justify-center mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={t.qrAlt} width={140} height={140} className="rounded" />
          </div>
          <button onClick={copy} className="w-full text-[12px] font-semibold px-2 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--blue)] mb-1.5">
            {copied ? t.copied : t.copyLink}
          </button>
          {WECHAT_ENABLED && (
            <button className="w-full text-[12px] font-semibold px-2 py-1.5 rounded-lg bg-[#07C160] text-white">
              {t.wechat}
            </button>
          )}
          <p className="text-[10px] text-[var(--t300)] mt-2">{t.privacyNote}</p>
        </div>
      )}
    </div>
  )
}
