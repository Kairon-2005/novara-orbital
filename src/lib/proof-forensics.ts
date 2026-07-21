// Proof forensics (pure) — heuristics that raise the cost of faked evidence.
// These NEVER upgrade a verdict: a duplicate file forces mismatch, suspicious
// metadata downgrades an auto-verify to unverified (= admin review), and clean
// forensics change nothing. Absence of metadata is common and NOT suspicious.

import { createHash } from 'crypto'
import type { VerificationStatus } from '@/types/database'

export type ForensicsInput = {
  producer: string | null
  creator: string | null
  creationDate: string | null // YYYY-MM-DD (see parsePdfDate)
}

export type ForensicsResult = {
  signals: string[]
  suspicious: boolean
}

// Image editors produce screenshots and composites, not offer letters.
const EDITOR_PATTERN = /photoshop|illustrator|canva|gimp|figma|affinity|pixelmator|paint/i

/** PDF `D:YYYYMMDDHHmmSS...` → ISO date, null when unparseable. */
export function parsePdfDate(raw: string | undefined | null): string | null {
  const m = /^D:(\d{4})(\d{2})(\d{2})/.exec(raw ?? '')
  if (!m) return null
  const iso = `${m[1]}-${m[2]}-${m[3]}`
  return Number.isNaN(Date.parse(iso)) ? null : iso
}

/**
 * Admission documents are produced in-cycle: for apply_year Y, anything created
 * before Y-1 or after Y+1 (calendar years) is implausible.
 */
export function assessProofForensics(input: ForensicsInput, applyYear: number): ForensicsResult {
  const signals: string[] = []

  const software = `${input.producer ?? ''} ${input.creator ?? ''}`
  if (EDITOR_PATTERN.test(software)) signals.push('edited_with_image_editor')

  if (input.creationDate) {
    const year = Number(input.creationDate.slice(0, 4))
    if (year < applyYear - 1 || year > applyYear + 1) signals.push('implausible_creation_date')
  }

  return { signals, suspicious: signals.length > 0 }
}

export function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

/** The same evidence file backing a different author's case is a hard signal. */
export function decideDuplicateEvidence(input: {
  ownersOfSameHash: string[]
  currentAuthor: string
}): boolean {
  return input.ownersOfSameHash.some(owner => owner !== input.currentAuthor)
}

/** Compose the gate: duplicate ⇒ mismatch; suspicious ⇒ verified→unverified. */
export function applyForensicsGate(
  aiStatus: VerificationStatus,
  forensics: ForensicsResult,
  isDuplicate: boolean,
): VerificationStatus {
  if (isDuplicate) return 'mismatch'
  if (forensics.suspicious && aiStatus === 'verified') return 'unverified'
  return aiStatus
}
