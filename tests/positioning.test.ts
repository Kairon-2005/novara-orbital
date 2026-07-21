import { describe, it, expect } from 'vitest'
import { decidePositioning } from '@/lib/positioning'
import type { Positioning } from '@/lib/community/stats'

function pos(over: { total?: number; offer?: number; rejected?: number; waitlist?: number; backgrounds?: string[] }): Positioning {
  const offer = over.offer ?? 0, rejected = over.rejected ?? 0, waitlist = over.waitlist ?? 0
  const decided = offer + rejected + waitlist
  return {
    stats: {
      total: over.total ?? decided,
      byResult: { offer, rejected, waitlist, pending: 0, withdrawn: 0, interview: 0 } as Positioning['stats']['byResult'],
      offerRate: decided === 0 ? 0 : offer / decided,
      byRoute: {},
    },
    comparableBackgrounds: over.backgrounds ?? [],
  }
}

describe('decidePositioning', () => {
  it('refuses to bluff: no assessment and under 3 decided cases → insufficient_data', () => {
    const d = decidePositioning({ assessmentLevel: null, positioning: pos({ offer: 1, rejected: 1 }) })
    expect(d.verdict).toBe('insufficient_data')
  })

  it('with rich case data, a high offer rate and a strong assessment read as safety', () => {
    const d = decidePositioning({ assessmentLevel: 'strong', positioning: pos({ offer: 8, rejected: 2 }) })
    expect(d.verdict).toBe('safety')
    expect(d.evidence.join(' ')).toContain('10')   // decided verified cases cited
  })

  it('with rich case data, a low offer rate and a weak assessment read as reach', () => {
    const d = decidePositioning({ assessmentLevel: 'developing', positioning: pos({ offer: 1, rejected: 7 }) })
    expect(d.verdict).toBe('reach')
  })

  it('middling offer rate with a mid assessment reads as match', () => {
    const d = decidePositioning({ assessmentLevel: 'on_track', positioning: pos({ offer: 4, rejected: 5 }) })
    expect(d.verdict).toBe('match')
  })

  it('assessment-only (no cases): competitive levels read match, earlier levels read reach, and the evidence says the read is assessment-based', () => {
    const none = pos({})
    expect(decidePositioning({ assessmentLevel: 'competitive', positioning: none }).verdict).toBe('match')
    const early = decidePositioning({ assessmentLevel: 'developing', positioning: none })
    expect(early.verdict).toBe('reach')
    expect(early.evidence.join(' ')).toMatch(/评估|assessment/i)
  })

  it('cases-only (no assessment, ≥3 decided): verdict follows the offer rate', () => {
    expect(decidePositioning({ assessmentLevel: null, positioning: pos({ offer: 5, rejected: 1 }) }).verdict).toBe('safety')
    expect(decidePositioning({ assessmentLevel: null, positioning: pos({ offer: 1, rejected: 5 }) }).verdict).toBe('reach')
  })
})
