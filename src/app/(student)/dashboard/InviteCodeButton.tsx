'use client'

import { useState } from 'react'
import { useLocale } from '@/components/shared/LocaleProvider'
import type { Locale } from '@/lib/locale'

const T = {
  en: {
    generateFailed: 'Could not generate code. Please try again.',
    generating: 'Generating…',
    generate: 'Generate Invite Code',
  },
  zh: {
    generateFailed: '邀请码生成失败，请重试。',
    generating: '正在生成…',
    generate: '生成邀请码',
  },
} satisfies Record<Locale, unknown>

export default function InviteCodeButton() {
  const locale = useLocale()
  const t = T[locale]
  const [code, setCode]       = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function generate() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/profile/invite-code', { method: 'POST' })
    const json = await res.json().catch(() => ({} as { code?: string; error?: string }))
    if (res.ok && json.code) {
      setCode(json.code)
    } else {
      setError(json.error ?? t.generateFailed)
    }
    setLoading(false)
  }

  if (code) {
    return (
      <div className="font-mono font-bold text-[22px] text-[var(--blue)] tracking-[0.25em] bg-[var(--blue-50)] rounded-[8px] px-4 py-2.5 text-center">
        {code}
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={generate}
        disabled={loading}
        className="w-full py-2.5 rounded-[8px] text-[13px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition disabled:opacity-50"
      >
        {loading ? t.generating : t.generate}
      </button>
      {error && <p className="text-[11px] text-[var(--red)] mt-2">{error}</p>}
    </div>
  )
}
