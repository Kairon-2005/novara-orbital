import { describe, it, expect } from 'vitest'
import { buildAdminSummary } from '@/lib/admin/summary'
import type { AdminCounts } from '@/lib/admin/summary'

const counts: AdminCounts = {
  users: 42,
  reportsFlagged: 2,
  commentsFlagged: 1,
  casesVerified: 10,
  casesPending: 5,
  casesMismatch: 3,
  kbDocs: 20,
  contributionsPending: 4,
}

describe('buildAdminSummary', () => {
  it('passes counts through and derives the needs-attention total', () => {
    const s = buildAdminSummary(counts)
    expect(s.users).toBe(42)
    // flagged reports + flagged comments + pending contributions + mismatches
    expect(s.needsAttention).toBe(2 + 1 + 4 + 3)
  })

  it('is zero needs-attention when nothing is pending', () => {
    const s = buildAdminSummary({ ...counts, reportsFlagged: 0, commentsFlagged: 0, contributionsPending: 0, casesMismatch: 0 })
    expect(s.needsAttention).toBe(0)
  })
})
