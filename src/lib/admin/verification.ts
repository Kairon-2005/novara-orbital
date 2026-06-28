// Verification override transitions (pure). Decides the new status and whether the
// case should (re)enter or leave the wiki. The route applies the I/O. See PRD §6.

import type { VerificationStatus } from '@/types/database'

export type VerificationAction = 'force-verify' | 'revoke' | 'resolve'

export interface OverrideResult {
  status: VerificationStatus
  reingest: boolean
  uningest: boolean
}

export function applyVerificationOverride(action: VerificationAction): OverrideResult {
  switch (action) {
    case 'force-verify': return { status: 'verified', reingest: true, uningest: false }
    case 'revoke':       return { status: 'unverified', reingest: false, uningest: true }
    case 'resolve':      return { status: 'unverified', reingest: false, uningest: false }
  }
}
