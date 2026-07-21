// 可信度分级 (pure). Orders the trust signals the case library can actually
// stand behind: a human reviewed it > the author provably holds a mailbox at
// the claimed school > the AI cross-check passed > nothing / contradicted.
// Staff review and school email only COUNT on AI-verified cases — tiers refine
// verification, they never replace it.

import type { VerificationStatus } from '@/types/database'

export type TrustTier = 'staff_reviewed' | 'email_verified' | 'ai_verified' | 'unverified' | 'mismatch'

// Minimal alias map so a verified 'NUS' mailbox matches a case filed under the
// full name. Extends into the Region registry later.
const INSTITUTION_ALIASES: Record<string, string[]> = {
  nus: ['national university of singapore'],
  ntu: ['nanyang technological university'],
  smu: ['singapore management university'],
  sutd: ['singapore university of technology and design'],
  sit: ['singapore institute of technology'],
  suss: ['singapore university of social sciences'],
}

export function institutionsMatch(a: string, b: string): boolean {
  const na = a.trim().toLowerCase()
  const nb = b.trim().toLowerCase()
  if (na === nb) return true
  const expand = (x: string) => [x, ...(INSTITUTION_ALIASES[x] ?? [])]
  return expand(na).some(x => expand(nb).includes(x))
}

export function decideTrustTier(input: {
  verificationStatus: VerificationStatus
  staffReviewedAt: string | null
  authorVerifiedInstitution: string | null
  reportInstitution: string
}): TrustTier {
  if (input.verificationStatus === 'mismatch') return 'mismatch'
  if (input.verificationStatus !== 'verified') return 'unverified'
  if (input.staffReviewedAt) return 'staff_reviewed'
  if (
    input.authorVerifiedInstitution &&
    institutionsMatch(input.authorVerifiedInstitution, input.reportInstitution)
  ) return 'email_verified'
  return 'ai_verified'
}
