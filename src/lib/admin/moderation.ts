// Moderation transitions (pure). See docs/PRD-admin.md §6.

export type ModerationStatus = 'approved' | 'flagged' | 'removed'
export type ModerationAction = 'approve' | 'remove'

export function nextModerationStatus(current: ModerationStatus, action: ModerationAction): ModerationStatus {
  switch (action) {
    case 'approve': return 'approved'
    case 'remove': return 'removed'
    default: return current
  }
}
