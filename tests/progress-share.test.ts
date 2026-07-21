import { describe, it, expect } from 'vitest'
import { decideShareAccess, defaultShareExpiry, newShareToken } from '@/lib/progress-share'

const NOW = '2026-07-21T10:00:00Z'

describe('decideShareAccess', () => {
  it('allows a live, unrevoked, unexpired share', () => {
    expect(decideShareAccess({ expiresAt: '2026-07-28T10:00:00Z', revokedAt: null }, NOW)).toBe('ok')
  })

  it('rejects a missing share as not_found', () => {
    expect(decideShareAccess(null, NOW)).toBe('not_found')
  })

  it('rejects a revoked share even if unexpired', () => {
    expect(decideShareAccess({ expiresAt: '2026-07-28T10:00:00Z', revokedAt: '2026-07-20T00:00:00Z' }, NOW)).toBe('revoked')
  })

  it('rejects an expired share', () => {
    expect(decideShareAccess({ expiresAt: '2026-07-21T09:59:59Z', revokedAt: null }, NOW)).toBe('expired')
  })
})

describe('defaultShareExpiry', () => {
  it('is 7 days after creation', () => {
    expect(defaultShareExpiry(NOW)).toBe('2026-07-28T10:00:00.000Z')
  })
})

describe('newShareToken', () => {
  it('produces unguessable, URL-safe, distinct tokens', () => {
    const a = newShareToken()
    const b = newShareToken()
    expect(a).toMatch(/^[A-Za-z0-9_-]{22,}$/) // ≥128 bits, base64url
    expect(a).not.toBe(b)
  })
})
