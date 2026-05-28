'use client'

import { useState } from 'react'

export default function InviteCodeButton() {
  const [code, setCode]       = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    const res = await fetch('/api/profile/invite-code', { method: 'POST' })
    if (res.ok) {
      const json = await res.json() as { code: string }
      setCode(json.code)
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
    <button
      onClick={generate}
      disabled={loading}
      className="w-full py-2.5 rounded-[8px] text-[13px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition disabled:opacity-50"
    >
      {loading ? 'Generating…' : 'Generate Invite Code'}
    </button>
  )
}
