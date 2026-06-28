'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/toast'

interface Item { id: string; title: string; preview: string }

export default function ModerationClient({ reports, comments }: { reports: Item[]; comments: Item[] }) {
  const toast = useToast()
  const [r, setR] = useState(reports)
  const [c, setC] = useState(comments)

  async function act(kind: 'report' | 'comment', id: string, action: 'approve' | 'remove') {
    const res = await fetch('/api/admin/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, id, action }),
    })
    if (!res.ok) { toast({ title: 'Action failed', variant: 'error' }); return }
    if (kind === 'report') setR((xs) => xs.filter((x) => x.id !== id))
    else setC((xs) => xs.filter((x) => x.id !== id))
    toast({ title: action === 'approve' ? 'Approved' : 'Removed', variant: 'success' })
  }

  const section = (label: string, items: Item[], kind: 'report' | 'comment') => (
    <div className="mb-5">
      <h2 className="font-display font-semibold text-[14px] text-[var(--t900)] mb-2">{label} ({items.length})</h2>
      {items.length === 0 ? (
        <p className="text-[13px] text-[var(--t300)]">Nothing flagged.</p>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {items.map((it) => (
            <div key={it.id} className="p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[var(--t900)]">{it.title}</div>
                <p className="text-[12px] text-[var(--t500)] line-clamp-2">{it.preview}</p>
              </div>
              <button onClick={() => act(kind, it.id, 'approve')} className="text-[12px] font-semibold px-2.5 py-1 rounded-lg border border-[var(--border)] text-[#057A55] hover:border-[#057A55]">Approve</button>
              <button onClick={() => act(kind, it.id, 'remove')} className="text-[12px] font-semibold px-2.5 py-1 rounded-lg border border-[var(--border)] text-[#E02424] hover:border-[#E02424]">Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="page-content max-w-[860px]">
      <h1 className="font-display font-bold text-[22px] text-[var(--t900)]">Moderation</h1>
      <p className="text-[13px] text-[var(--t500)] mt-1 mb-4">Flagged content awaiting review.</p>
      {section('Flagged reports', r, 'report')}
      {section('Flagged comments', c, 'comment')}
    </div>
  )
}
