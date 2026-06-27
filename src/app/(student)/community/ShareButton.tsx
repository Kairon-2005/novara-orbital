'use client'

import { useState } from 'react'

// Native WeChat share needs the WeChat JS-SDK + an official-account binding, so
// it is gated behind a build flag. Copy-link + QR work everywhere.
const WECHAT_ENABLED = process.env.NEXT_PUBLIC_WECHAT_SHARE_ENABLED === '1'

export default function ShareButton({ path, label = '🔗 分享' }: { path: string; label?: string }) {
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
        {label}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[240px] card p-3 z-30 shadow-lg">
          <p className="text-[12px] text-[var(--t500)] mb-2">Share this verified, anonymized case:</p>
          <div className="flex justify-center mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR code" width={140} height={140} className="rounded" />
          </div>
          <button onClick={copy} className="w-full text-[12px] font-semibold px-2 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--blue)] mb-1.5">
            {copied ? '✓ Link copied' : 'Copy link'}
          </button>
          {WECHAT_ENABLED && (
            <button className="w-full text-[12px] font-semibold px-2 py-1.5 rounded-lg bg-[#07C160] text-white">
              微信好友 / 朋友圈
            </button>
          )}
          <p className="text-[10px] text-[var(--t300)] mt-2">Only the anonymized case is shared — never your identity or proof files.</p>
        </div>
      )}
    </div>
  )
}
