import { describe, it, expect } from 'vitest'
import { nextModerationStatus } from '@/lib/admin/moderation'

describe('nextModerationStatus', () => {
  it('approves a flagged item', () => {
    expect(nextModerationStatus('flagged', 'approve')).toBe('approved')
  })

  it('removes an item', () => {
    expect(nextModerationStatus('flagged', 'remove')).toBe('removed')
    expect(nextModerationStatus('approved', 'remove')).toBe('removed')
  })

  it('leaves the status unchanged for an unknown action', () => {
    // @ts-expect-error exercising a bad action at runtime
    expect(nextModerationStatus('flagged', 'nope')).toBe('flagged')
  })
})
