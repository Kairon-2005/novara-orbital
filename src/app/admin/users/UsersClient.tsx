'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import type { Role } from '@/types/database'

interface UserRow {
  id: string
  display_name: string
  role: Role
  created_at: string
}

const ROLES: Role[] = ['student', 'parent', 'admin']

export default function UsersClient({ users, selfId }: { users: UserRow[]; selfId: string }) {
  const toast = useToast()
  const [rows, setRows] = useState(users)
  const [busy, setBusy] = useState<string | null>(null)

  async function setRole(userId: string, role: Role) {
    const prev = rows
    setRows((rs) => rs.map((r) => (r.id === userId ? { ...r, role } : r)))
    setBusy(userId)
    try {
      const res = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast({ title: 'Role updated', variant: 'success' })
    } catch (e) {
      setRows(prev)
      toast({ title: 'Could not update role', description: e instanceof Error ? e.message : undefined, variant: 'error' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="page-content max-w-[860px]">
      <h1 className="font-display font-bold text-[22px] text-[var(--t900)]">Users</h1>
      <p className="text-[13px] text-[var(--t500)] mt-1">{rows.length} users. Promote to admin or change a role.</p>
      <div className="card divide-y divide-[var(--border)] mt-4">
        {rows.map((u) => (
          <div key={u.id} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-[var(--t900)] truncate">
                {u.display_name}{u.id === selfId && <span className="text-[var(--t300)] font-normal"> · you</span>}
              </div>
              <div className="text-[11px] text-[var(--t300)]">{u.created_at.slice(0, 10)}</div>
            </div>
            <select
              value={u.role}
              disabled={busy === u.id}
              onChange={(e) => setRole(u.id, e.target.value as Role)}
              className="px-2.5 py-1.5 border border-[var(--border)] rounded-lg text-[12px] bg-white disabled:opacity-50"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
