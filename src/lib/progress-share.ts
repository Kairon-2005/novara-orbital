// ─────────────────────────────────────────────────────────────────────────────
// Progress share — access rules for the tokenized 申请进度 share link
// ─────────────────────────────────────────────────────────────────────────────
// Pure decisions for the parent-facing share feature: whether a share row still
// grants access, when a new share expires, and what a share token looks like.
// The API route and the public share page are thin adapters over these rules.

import { randomBytes } from 'crypto'

export type ShareAccess = 'ok' | 'expired' | 'revoked' | 'not_found'

export function decideShareAccess(
  share: { expiresAt: string; revokedAt: string | null } | null,
  nowIso: string,
): ShareAccess {
  if (!share) return 'not_found'
  if (share.revokedAt) return 'revoked'
  if (Date.parse(share.expiresAt) <= Date.parse(nowIso)) return 'expired'
  return 'ok'
}

const SHARE_TTL_DAYS = 7

export function defaultShareExpiry(nowIso: string): string {
  return new Date(Date.parse(nowIso) + SHARE_TTL_DAYS * 86_400_000).toISOString()
}

/** 128 bits of randomness, base64url — safe to put in a URL, infeasible to guess. */
export function newShareToken(): string {
  return randomBytes(16).toString('base64url')
}
