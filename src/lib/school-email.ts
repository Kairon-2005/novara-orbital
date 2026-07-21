// 学校邮箱验证 — pure rules for the one-time school-mailbox OTP that upgrades a
// case author's trust tier. Control of a university mailbox can't be
// Photoshopped, which is the whole point. Codes are hashed user-bound (a
// leaked hash can't be replayed for another account); send/attempt budgets
// keep the mailbox from being used as a spam vector.

import { createHash, randomInt } from 'crypto'

// Known student-mail domains → institution. Subdomains match (scis.smu.edu.sg
// → SMU). Extending this list is data-work; it later folds into the Region
// registry alongside the universities catalogue.
const DOMAIN_INSTITUTIONS: Record<string, string> = {
  'u.nus.edu': 'NUS',
  'e.ntu.edu.sg': 'NTU',
  'smu.edu.sg': 'SMU',
  'mymail.sutd.edu.sg': 'SUTD',
  'singaporetech.edu.sg': 'SIT',
  'suss.edu.sg': 'SUSS',
}

export function institutionForEmail(email: string): string | null {
  const m = /^[^\s@]+@([^\s@]+)$/.exec(email.trim().toLowerCase())
  if (!m) return null
  const domain = m[1]
  for (const [known, institution] of Object.entries(DOMAIN_INSTITUTIONS)) {
    if (domain === known || domain.endsWith('.' + known)) return institution
  }
  return null
}

export function emailDomain(email: string): string | null {
  const m = /^[^\s@]+@([^\s@]+)$/.exec(email.trim().toLowerCase())
  return m?.[1] ?? null
}

const MAX_SENDS_PER_DAY = 3
const MAX_ATTEMPTS = 5
export const CODE_TTL_MINUTES = 15

export type CodeRequestDecision =
  | { ok: true; institution: string; domain: string }
  | { ok: false; reason: 'unsupported_domain' | 'too_many_sends' }

export function decideCodeRequest(input: {
  email: string
  existing: { sendsToday: number; sendDay: string; verifiedAt: string | null } | null
  now: string
}): CodeRequestDecision {
  const institution = institutionForEmail(input.email)
  if (!institution) return { ok: false, reason: 'unsupported_domain' }

  const today = input.now.slice(0, 10)
  if (input.existing && input.existing.sendDay === today && input.existing.sendsToday >= MAX_SENDS_PER_DAY) {
    return { ok: false, reason: 'too_many_sends' }
  }
  return { ok: true, institution, domain: emailDomain(input.email)! }
}

export type CodeSubmitDecision =
  | { ok: true }
  | { ok: false; reason: 'expired' | 'too_many_attempts' | 'wrong_code' }

export function decideCodeSubmit(input: {
  code: string
  userId: string
  record: { codeHash: string; expiresAt: string; attempts: number }
  now: string
}): CodeSubmitDecision {
  if (Date.parse(input.record.expiresAt) <= Date.parse(input.now)) return { ok: false, reason: 'expired' }
  if (input.record.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'too_many_attempts' }
  if (hashCode(input.code, input.userId) !== input.record.codeHash) return { ok: false, reason: 'wrong_code' }
  return { ok: true }
}

/** User-bound hash: the same code hashes differently per account. */
export function hashCode(code: string, userId: string): string {
  return createHash('sha256').update(`${userId}:${code}`).digest('hex')
}

export function newVerificationCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}
