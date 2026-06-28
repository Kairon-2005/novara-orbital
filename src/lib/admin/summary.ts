// Admin dashboard shaping (pure). Turns raw counts into the dashboard view and a
// single "needs attention" total (the queue an admin should clear). See PRD §6.

export interface AdminCounts {
  users: number
  reportsFlagged: number
  commentsFlagged: number
  casesVerified: number
  casesPending: number
  casesMismatch: number
  kbDocs: number
  contributionsPending: number
}

export interface AdminSummary extends AdminCounts {
  needsAttention: number
}

export function buildAdminSummary(counts: AdminCounts): AdminSummary {
  return {
    ...counts,
    needsAttention:
      counts.reportsFlagged +
      counts.commentsFlagged +
      counts.contributionsPending +
      counts.casesMismatch,
  }
}
