'use client'

import { useEffect, useState } from 'react'
import { formatNotification, type NotificationView } from '@/lib/community/notifications'

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationView[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/community/notifications')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setItems(d.notifications ?? [])
        setUnread(d.unread ?? 0)
      })
      .catch(() => { /* non-blocking */ })
    return () => { cancelled = true }
  }, [])

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      setUnread(0)
      setItems((xs) => xs.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })))
      fetch('/api/community/notifications/read', { method: 'POST' }).catch(() => { /* non-blocking */ })
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative px-3 py-2 border border-[var(--border)] rounded-lg text-[14px] hover:border-[var(--blue)]"
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E02424] text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[300px] max-h-[360px] overflow-y-auto card p-2 z-30 shadow-lg">
          {items.length === 0 ? (
            <p className="text-[13px] text-[var(--t300)] p-3 text-center">No notifications yet.</p>
          ) : (
            items.map((n) => (
              <div key={n.id} className={`p-2.5 rounded-lg text-[13px] ${n.readAt ? 'text-[var(--t500)]' : 'text-[var(--t900)] font-medium bg-[var(--blue-50)]'}`}>
                {formatNotification(n)}
                <div className="text-[11px] text-[var(--t300)] mt-0.5">{n.createdAt.slice(0, 10)}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
