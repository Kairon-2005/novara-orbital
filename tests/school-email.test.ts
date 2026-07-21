import { describe, it, expect } from 'vitest'
import {
  institutionForEmail, decideCodeRequest, decideCodeSubmit, hashCode, newVerificationCode,
} from '@/lib/school-email'

const NOW = '2026-07-21T10:00:00Z'

describe('institutionForEmail', () => {
  it('maps known student domains to institutions', () => {
    expect(institutionForEmail('li.wei@u.nus.edu')).toBe('NUS')
    expect(institutionForEmail('WEI001@e.ntu.edu.sg')).toBe('NTU')
    expect(institutionForEmail('wei.2026@scis.smu.edu.sg')).toBe('SMU')
  })

  it('rejects non-school and malformed addresses', () => {
    expect(institutionForEmail('someone@gmail.com')).toBeNull()
    expect(institutionForEmail('fake@u.nus.edu.evil.com')).toBeNull()
    expect(institutionForEmail('not-an-email')).toBeNull()
  })
})

describe('decideCodeRequest', () => {
  it('allows a first request for a school address', () => {
    const d = decideCodeRequest({ email: 'a@u.nus.edu', existing: null, now: NOW })
    expect(d).toEqual({ ok: true, institution: 'NUS', domain: 'u.nus.edu' })
  })

  it('rejects unknown domains', () => {
    const d = decideCodeRequest({ email: 'a@gmail.com', existing: null, now: NOW })
    expect(d.ok).toBe(false)
    if (!d.ok) expect(d.reason).toBe('unsupported_domain')
  })

  it('enforces 3 sends per day', () => {
    const d = decideCodeRequest({
      email: 'a@u.nus.edu',
      existing: { sendsToday: 3, sendDay: '2026-07-21', verifiedAt: null },
      now: NOW,
    })
    expect(d.ok).toBe(false)
    if (!d.ok) expect(d.reason).toBe('too_many_sends')
  })

  it('resets the send counter on a new day', () => {
    const d = decideCodeRequest({
      email: 'a@u.nus.edu',
      existing: { sendsToday: 3, sendDay: '2026-07-20', verifiedAt: null },
      now: NOW,
    })
    expect(d.ok).toBe(true)
  })
})

describe('decideCodeSubmit', () => {
  const code = '482913'
  const record = {
    codeHash: hashCode(code, 'u1'),
    expiresAt: '2026-07-21T10:15:00Z',
    attempts: 0,
  }

  it('accepts the right code before expiry', () => {
    expect(decideCodeSubmit({ code, userId: 'u1', record, now: NOW })).toEqual({ ok: true })
  })

  it('rejects a wrong code and counts the attempt', () => {
    const d = decideCodeSubmit({ code: '000000', userId: 'u1', record, now: NOW })
    expect(d).toEqual({ ok: false, reason: 'wrong_code' })
  })

  it('rejects after expiry and after 5 attempts', () => {
    expect(decideCodeSubmit({ code, userId: 'u1', record: { ...record, expiresAt: '2026-07-21T09:59:00Z' }, now: NOW }))
      .toEqual({ ok: false, reason: 'expired' })
    expect(decideCodeSubmit({ code, userId: 'u1', record: { ...record, attempts: 5 }, now: NOW }))
      .toEqual({ ok: false, reason: 'too_many_attempts' })
  })

  it('the hash is user-bound — the same code for another user does not match', () => {
    expect(decideCodeSubmit({ code, userId: 'u2', record, now: NOW }))
      .toEqual({ ok: false, reason: 'wrong_code' })
  })
})

describe('newVerificationCode', () => {
  it('is 6 digits', () => {
    expect(newVerificationCode()).toMatch(/^\d{6}$/)
  })
})
