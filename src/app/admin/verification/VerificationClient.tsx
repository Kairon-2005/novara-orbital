'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import type { VerificationStatus } from '@/types/database'

interface CaseRow {
  id: string
  institution: string
  programme: string | null
  result: string
  apply_year: number
  verification_status: VerificationStatus
}

const STATUS_COLOR: Record<string, string> = {
  verified: '#057A55', mismatch: '#E02424', pending: '#B45309', unverified: '#6B7280',
}

export default function VerificationClient({ cases }: { cases: CaseRow[] }) {
  const toast = useToast()
  const [rows, setRows] = useState(cases)
  const [filter, setFilter] = useState<'all' | VerificationStatus>('all')

  async function override(id: string, action: 'force-verify' | 'revoke' | 'resolve') {
    const res = await fetch('/api/admin/verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: id, action }),
    })
    const json = await res.json()
    if (!res.ok) { toast({ title: 'Override failed', variant: 'error' }); return }
    setRows((xs) => xs.map((r) => (r.id === id ? { ...r, verification_status: json.status } : r)))
    toast({ title: `Set to ${json.status}`, variant: 'success' })
  }

  const visible = filter === 'all' ? rows : rows.filter((r) => r.verification_status === filter)

  return (
    <div className="page-content max-w-[860px]">
      <h1 className="font-display font-bold text-[22px] text-[var(--t900)]">Verification</h1>
      <p className="text-[13px] text-[var(--t500)] mt-1 mb-3">Review and override AI verdicts. Force-verify adds the case to the wiki; revoke removes it.</p>
      <div className="flex gap-2 mb-3">
        {(['all', 'mismatch', 'pending', 'verified', 'unverified'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-[12px] font-semibold px-2.5 py-1 rounded-lg border ${filter === f ? 'border-[var(--blue)] text-[var(--blue)]' : 'border-[var(--border)] text-[var(--t500)]'}`}>
            {f}
          </button>
        ))}
      </div>
      <div className="card divide-y divide-[var(--border)]">
        {visible.length === 0 ? (
          <p className="text-[13px] text-[var(--t300)] p-4 text-center">No cases.</p>
        ) : visible.map((r) => (
          <div key={r.id} className="p-3 flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-bold uppercase" style={{ color: STATUS_COLOR[r.verification_status] }}>{r.verification_status}</span>
            <div className="flex-1 min-w-[160px] text-[13px] text-[var(--t900)]">
              {r.institution}{r.programme ? ` — ${r.programme}` : ''} <span className="text-[var(--t300)]">· {r.result} · {r.apply_year}</span>
            </div>
            <button onClick={() => override(r.id, 'force-verify')} className="text-[12px] font-semibold px-2.5 py-1 rounded-lg border border-[var(--border)] text-[#057A55] hover:border-[#057A55]">Force-verify</button>
            <button onClick={() => override(r.id, 'revoke')} className="text-[12px] font-semibold px-2.5 py-1 rounded-lg border border-[var(--border)] text-[#E02424] hover:border-[#E02424]">Revoke</button>
            <button onClick={() => override(r.id, 'resolve')} className="text-[12px] font-semibold px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--t500)] hover:border-[var(--blue)]">Resolve</button>
          </div>
        ))}
      </div>
    </div>
  )
}
