import { describe, it, expect } from 'vitest'
import { decideTrustTier, institutionsMatch } from '@/lib/trust-tier'

describe('institutionsMatch', () => {
  it('matches abbreviations and full names', () => {
    expect(institutionsMatch('NUS', 'NUS')).toBe(true)
    expect(institutionsMatch('NUS', 'National University of Singapore')).toBe(true)
    expect(institutionsMatch('ntu', 'Nanyang Technological University')).toBe(true)
    expect(institutionsMatch('NUS', 'NTU')).toBe(false)
  })
})

describe('decideTrustTier', () => {
  const base = {
    verificationStatus: 'verified' as const,
    staffReviewedAt: null as string | null,
    authorVerifiedInstitution: null as string | null,
    reportInstitution: 'NUS',
  }

  it('mismatch and unverified pass through', () => {
    expect(decideTrustTier({ ...base, verificationStatus: 'mismatch' })).toBe('mismatch')
    expect(decideTrustTier({ ...base, verificationStatus: 'unverified' })).toBe('unverified')
    expect(decideTrustTier({ ...base, verificationStatus: 'pending' })).toBe('unverified')
  })

  it('verified alone is ai_verified', () => {
    expect(decideTrustTier(base)).toBe('ai_verified')
  })

  it('a matching verified school email upgrades to email_verified', () => {
    expect(decideTrustTier({ ...base, authorVerifiedInstitution: 'NUS' })).toBe('email_verified')
  })

  it('a NON-matching school email does not upgrade', () => {
    expect(decideTrustTier({ ...base, authorVerifiedInstitution: 'NTU' })).toBe('ai_verified')
  })

  it('staff review is the top tier, but only on verified cases', () => {
    expect(decideTrustTier({ ...base, staffReviewedAt: '2026-07-21T00:00:00Z', authorVerifiedInstitution: 'NUS' }))
      .toBe('staff_reviewed')
    expect(decideTrustTier({ ...base, verificationStatus: 'mismatch', staffReviewedAt: '2026-07-21T00:00:00Z' }))
      .toBe('mismatch')
  })
})
