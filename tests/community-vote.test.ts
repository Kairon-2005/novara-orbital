import { describe, it, expect } from 'vitest'
import { applyVote } from '@/lib/community/vote'
import type { VoteState } from '@/lib/community/vote'

const state = (over: Partial<VoteState> = {}): VoteState => ({
  myVote: 0, upvotes: 0, downvotes: 0, ...over,
})

describe('applyVote', () => {
  it('upvotes from neutral', () => {
    expect(applyVote(state(), 1)).toEqual({ myVote: 1, upvotes: 1, downvotes: 0 })
  })

  it('downvotes from neutral', () => {
    expect(applyVote(state(), -1)).toEqual({ myVote: -1, upvotes: 0, downvotes: 1 })
  })

  it('clears the vote when the same direction is clicked again', () => {
    expect(applyVote(state({ myVote: 1, upvotes: 1 }), 1)).toEqual({ myVote: 0, upvotes: 0, downvotes: 0 })
  })

  it('flips from up to down', () => {
    expect(applyVote(state({ myVote: 1, upvotes: 1 }), -1)).toEqual({ myVote: -1, upvotes: 0, downvotes: 1 })
  })

  it('never produces negative counts', () => {
    expect(applyVote(state({ myVote: 1, upvotes: 0 }), 1)).toEqual({ myVote: 0, upvotes: 0, downvotes: 0 })
  })
})
