import { describe, it, expect } from 'vitest'
import { formatNotification } from '@/lib/community/notifications'
import type { NotificationView } from '@/lib/community/notifications'

const n = (over: Partial<NotificationView>): NotificationView => ({
  id: 'n1', type: 'comment_on_case', payload: { institution: 'NUS' }, readAt: null, createdAt: '2026-06-28', ...over,
})

describe('formatNotification', () => {
  it('describes a new comment on your case', () => {
    expect(formatNotification(n({ type: 'comment_on_case' }))).toBe('New comment on your NUS case')
  })

  it('describes an upvote on your case', () => {
    expect(formatNotification(n({ type: 'vote_on_case' }))).toBe('Someone upvoted your NUS case')
  })

  it('describes a verified vs mismatched verdict', () => {
    expect(formatNotification(n({ type: 'verification_done', payload: { institution: 'NTU', status: 'verified' } })))
      .toBe('Your NTU case was verified ✅')
    expect(formatNotification(n({ type: 'verification_done', payload: { institution: 'NTU', status: 'mismatch' } })))
      .toBe('Your NTU case had an evidence mismatch ⚠️')
  })

  it('falls back gracefully when the institution is missing', () => {
    expect(formatNotification(n({ type: 'comment_on_case', payload: {} }))).toBe('New comment on your case')
  })
})
