// Voting domain logic (pure): 顶 (+1) / 踩 (-1) with toggle-to-clear, and the
// resulting public counters. Mirrors the DB trigger bump_report_votes so the UI
// can update optimistically and the server can validate. See
// docs/PRD-admission-cases.md §A.9.3.

export type Vote = 1 | -1
export type MyVote = Vote | 0   // 0 = no vote / cleared

export interface VoteState {
  myVote: MyVote
  upvotes: number
  downvotes: number
}

/**
 * Apply a click of `clicked` (顶 or 踩) to the current state. Clicking the
 * direction already selected clears it. Counts can never go below zero.
 */
export function applyVote(state: VoteState, clicked: Vote): VoteState {
  const prev = state.myVote
  const target: MyVote = prev === clicked ? 0 : clicked

  // Net change to the counter for `value`: remove the previous vote's contribution, add the target's.
  const delta = (value: Vote) => (prev === value ? -1 : 0) + (target === value ? 1 : 0)
  const clamp = (n: number) => (n < 0 ? 0 : n)

  return {
    myVote: target,
    upvotes: clamp(state.upvotes + delta(1)),
    downvotes: clamp(state.downvotes + delta(-1)),
  }
}
