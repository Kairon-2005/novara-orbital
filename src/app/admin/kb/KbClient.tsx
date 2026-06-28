'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/toast'

interface Contribution { id: string; title: string; url: string | null; status: string; created_at: string }
interface Doc { docId: string; title: string }

export default function KbClient({ contributions, docs }: { contributions: Contribution[]; docs: Doc[] }) {
  const toast = useToast()
  const [contribs, setContribs] = useState(contributions)
  const [docList, setDocList] = useState(docs)

  async function review(id: string, action: 'approve' | 'reject') {
    const res = await fetch('/api/admin/kb/contributions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    if (!res.ok) { toast({ title: 'Review failed', variant: 'error' }); return }
    setContribs((xs) => xs.filter((c) => c.id !== id))
    toast({ title: action === 'approve' ? 'Approved → added to KB' : 'Rejected', variant: 'success' })
  }

  async function delDoc(docId: string) {
    const res = await fetch('/api/admin/kb/docs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId }),
    })
    if (!res.ok) { toast({ title: 'Delete failed', variant: 'error' }); return }
    setDocList((xs) => xs.filter((d) => d.docId !== docId))
    toast({ title: 'Doc removed', variant: 'success' })
  }

  return (
    <div className="page-content max-w-[860px]">
      <h1 className="font-display font-bold text-[22px] text-[var(--t900)]">Knowledge base</h1>

      <h2 className="font-display font-semibold text-[14px] text-[var(--t900)] mt-4 mb-2">Contributions inbox ({contribs.length})</h2>
      {contribs.length === 0 ? (
        <p className="text-[13px] text-[var(--t300)]">No pending contributions.</p>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {contribs.map((c) => (
            <div key={c.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[var(--t900)] truncate">{c.title}</div>
                {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="text-[11px] text-[var(--blue)] truncate block">{c.url}</a>}
              </div>
              <button onClick={() => review(c.id, 'approve')} className="text-[12px] font-semibold px-2.5 py-1 rounded-lg border border-[var(--border)] text-[#057A55] hover:border-[#057A55]">Approve</button>
              <button onClick={() => review(c.id, 'reject')} className="text-[12px] font-semibold px-2.5 py-1 rounded-lg border border-[var(--border)] text-[#E02424] hover:border-[#E02424]">Reject</button>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-display font-semibold text-[14px] text-[var(--t900)] mt-6 mb-2">KB documents ({docList.length})</h2>
      {docList.length === 0 ? (
        <p className="text-[13px] text-[var(--t300)]">No documents (or KB not configured).</p>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {docList.map((d) => (
            <div key={d.docId} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-[var(--t900)] truncate">{d.title}</div>
                <div className="text-[11px] text-[var(--t300)]">{d.docId}</div>
              </div>
              <button onClick={() => delDoc(d.docId)} className="text-[12px] text-[#E02424] font-semibold">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
