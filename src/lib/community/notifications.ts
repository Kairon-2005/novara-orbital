// Notification presentation (pure). The rows are written server-side by DB
// triggers; this just turns one into display copy. See PRD §A.9.4.

import type { NotificationType } from '@/types/database'

export interface NotificationView {
  id: string
  type: NotificationType
  payload: { institution?: string; status?: string; reportId?: string }
  readAt: string | null
  createdAt: string
}

export function formatNotification(n: NotificationView): string {
  const at = n.payload.institution ? ` ${n.payload.institution}` : ''
  switch (n.type) {
    case 'comment_on_case':
      return `New comment on your${at} case`
    case 'vote_on_case':
      return `Someone upvoted your${at} case`
    case 'verification_done':
      return n.payload.status === 'verified'
        ? `Your${at} case was verified ✅`
        : `Your${at} case had an evidence mismatch ⚠️`
    default:
      return 'New notification'
  }
}
