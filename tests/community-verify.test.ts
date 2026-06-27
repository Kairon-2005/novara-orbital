import { describe, it, expect } from 'vitest'
import { decideVerificationStatus, createAiClaimVerifier } from '@/lib/community/verify'
import type { VerificationVerdict, VerificationClaim, ChatJson } from '@/lib/community/verify'

const claim: VerificationClaim = {
  institution: 'NUS',
  result: 'offer',
  programme: 'Computer Science',
  applyYear: 2026,
}

const verdict = (over: Partial<VerificationVerdict> = {}): VerificationVerdict => ({
  fields: {
    institution: { status: 'supported', found: 'NUS' },
    result: { status: 'supported', found: 'offer' },
  },
  conflicts: [],
  confidence: 'high',
  ...over,
})

describe('decideVerificationStatus', () => {
  it('verifies when institution and result are both supported and nothing contradicts', () => {
    expect(decideVerificationStatus(verdict())).toBe('verified')
  })

  it('stays verified when programme/applyYear are merely absent from the proof', () => {
    const v = verdict({
      fields: {
        institution: { status: 'supported', found: 'NUS' },
        result: { status: 'supported', found: 'offer' },
        programme: { status: 'absent' },
        applyYear: { status: 'absent' },
      },
    })
    expect(decideVerificationStatus(v)).toBe('verified')
  })

  it('is a mismatch when any field is contradicted by the evidence', () => {
    const v = verdict({
      fields: {
        institution: { status: 'supported', found: 'NUS' },
        result: { status: 'contradicted', found: 'rejected' },
      },
      conflicts: [{ field: 'result', claimed: 'offer', found: 'rejected' }],
    })
    expect(decideVerificationStatus(v)).toBe('mismatch')
  })

  it('is unverified when key fields are not both supported', () => {
    const v = verdict({ fields: { institution: { status: 'supported', found: 'NUS' } } })
    expect(decideVerificationStatus(v)).toBe('unverified')
  })

  it('is unverified for an empty verdict (no evidence)', () => {
    expect(decideVerificationStatus(verdict({ fields: {} }))).toBe('unverified')
  })
})

describe('createAiClaimVerifier', () => {
  it('returns a normalized verdict from the model JSON', async () => {
    const chat: ChatJson = async () => ({
      fields: {
        institution: { status: 'supported', found: 'National University of Singapore' },
        result: { status: 'supported', found: 'offer' },
      },
      confidence: 'high',
    })
    const v = await createAiClaimVerifier(chat).verify(claim, ['... offer letter from NUS ...'])
    expect(decideVerificationStatus(v)).toBe('verified')
    expect(v.confidence).toBe('high')
  })

  it('records a conflict when the proof contradicts a claimed field', async () => {
    const chat: ChatJson = async () => ({
      fields: {
        institution: { status: 'supported', found: 'NUS' },
        result: { status: 'contradicted', found: 'rejected' },
      },
      confidence: 'high',
    })
    const v = await createAiClaimVerifier(chat).verify(claim, ['letter'])
    expect(decideVerificationStatus(v)).toBe('mismatch')
    expect(v.conflicts).toContainEqual({ field: 'result', claimed: 'offer', found: 'rejected' })
  })

  it('short-circuits to unverified without calling the model when there is no evidence', async () => {
    let called = false
    const chat: ChatJson = async () => { called = true; return {} }
    const v = await createAiClaimVerifier(chat).verify(claim, ['   ', ''])
    expect(called).toBe(false)
    expect(decideVerificationStatus(v)).toBe('unverified')
  })

  it('tolerates junk model output — unknown statuses become absent, bad confidence defaults', async () => {
    const chat: ChatJson = async () => ({ fields: { institution: { status: 'maybe', found: 123 } }, confidence: 'banana' })
    const v = await createAiClaimVerifier(chat).verify(claim, ['letter'])
    expect(decideVerificationStatus(v)).toBe('unverified')
    expect(v.confidence).toBe('medium')
  })
})
