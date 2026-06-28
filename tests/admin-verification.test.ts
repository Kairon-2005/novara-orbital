import { describe, it, expect } from 'vitest'
import { applyVerificationOverride } from '@/lib/admin/verification'

describe('applyVerificationOverride', () => {
  it('force-verify → verified and re-ingests into the wiki', () => {
    expect(applyVerificationOverride('force-verify')).toEqual({ status: 'verified', reingest: true, uningest: false })
  })

  it('revoke → unverified and removes from the wiki', () => {
    expect(applyVerificationOverride('revoke')).toEqual({ status: 'unverified', reingest: false, uningest: true })
  })

  it('resolve → unverified, no wiki change', () => {
    expect(applyVerificationOverride('resolve')).toEqual({ status: 'unverified', reingest: false, uningest: false })
  })
})
