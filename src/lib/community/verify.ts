// Verification domain logic (pure core + an injectable AI verifier).
// The verifier answers a bounded question — "does the uploaded evidence support
// each claimed field?" — never "is this true in the world". See
// docs/PRD-admission-cases.md §A.3. No I/O here: the LLM is injected as a
// `ChatJson` seam so this whole module is unit-testable with a fake.

import type { ReportResult, VerificationStatus } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────

export type FieldSupport = 'supported' | 'contradicted' | 'absent'
export type VerifiableField = 'institution' | 'result' | 'programme' | 'applyYear'

export interface FieldVerdict {
  status: FieldSupport
  found?: string | null
}

export interface VerificationConflict {
  field: VerifiableField
  claimed: string
  found: string
}

export interface VerificationVerdict {
  fields: Partial<Record<VerifiableField, FieldVerdict>>
  conflicts: VerificationConflict[]
  confidence: 'low' | 'medium' | 'high'
}

export interface VerificationClaim {
  institution: string
  result: ReportResult
  programme?: string | null
  applyYear: number
}

/** Injected LLM seam: takes (system, user) prompts, returns parsed JSON. */
export type ChatJson = (system: string, user: string) => Promise<unknown>

export interface ClaimVerifier {
  verify(claim: VerificationClaim, evidenceTexts: string[]): Promise<VerificationVerdict>
}

// ── Pure decision (the TDD core) ──────────────────────────────

/**
 * Map a verdict to a status:
 *  - any key field contradicted        → 'mismatch'
 *  - institution AND result supported  → 'verified'
 *  - otherwise                         → 'unverified'
 * Absence of programme/applyYear in the evidence does not block 'verified'.
 */
export function decideVerificationStatus(verdict: VerificationVerdict): VerificationStatus {
  const fields = verdict.fields ?? {}
  const anyContradicted = Object.values(fields).some((f) => f?.status === 'contradicted')
  if (anyContradicted) return 'mismatch'
  if (fields.institution?.status === 'supported' && fields.result?.status === 'supported') {
    return 'verified'
  }
  return 'unverified'
}

// ── Verdict normalisation (pure) ──────────────────────────────
// The model returns free-form JSON; whitelist + coerce it so junk output can
// only ever produce a conservative ('absent') verdict, never a crash.

const FIELDS: VerifiableField[] = ['institution', 'result', 'programme', 'applyYear']
const SUPPORTS: FieldSupport[] = ['supported', 'contradicted', 'absent']
const CONFIDENCES: VerificationVerdict['confidence'][] = ['low', 'medium', 'high']

function claimValue(claim: VerificationClaim, field: VerifiableField): string {
  const v = field === 'applyYear' ? claim.applyYear : claim[field]
  return v == null ? '' : String(v)
}

export function normalizeVerdict(raw: unknown, claim: VerificationClaim): VerificationVerdict {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const rawFields = (typeof source.fields === 'object' && source.fields !== null
    ? source.fields
    : {}) as Record<string, unknown>

  const fields: VerificationVerdict['fields'] = {}
  const conflicts: VerificationConflict[] = []

  for (const field of FIELDS) {
    const entry = rawFields[field]
    if (typeof entry !== 'object' || entry === null) continue
    const e = entry as Record<string, unknown>
    const status: FieldSupport = SUPPORTS.includes(e.status as FieldSupport)
      ? (e.status as FieldSupport)
      : 'absent'
    const found = typeof e.found === 'string' && e.found.trim() ? e.found.trim() : null
    fields[field] = { status, found }
    if (status === 'contradicted') {
      conflicts.push({ field, claimed: claimValue(claim, field), found: found ?? '' })
    }
  }

  const confidence = CONFIDENCES.includes(source.confidence as VerificationVerdict['confidence'])
    ? (source.confidence as VerificationVerdict['confidence'])
    : 'medium'

  return { fields, conflicts, confidence }
}

// ── AI verifier (I/O behind the injected ChatJson seam) ───────

const VERIFY_PROMPT = `You verify a student's admission claim against the text of their uploaded proof documents (offer letter / transcript / test report). For EACH claimed field decide whether the evidence SUPPORTS it, CONTRADICTS it, or is ABSENT (not mentioned). Judge only what the documents say — never infer beyond them.

Output strict JSON:
{
  "fields": {
    "institution": { "status": "supported" | "contradicted" | "absent", "found": "<value seen in the proof, or null>" },
    "result":      { "status": "...", "found": "..." },
    "programme":   { "status": "...", "found": "..." },
    "applyYear":   { "status": "...", "found": "..." }
  },
  "confidence": "low" | "medium" | "high"
}
Rules: "supported" only when the document clearly matches the claim; "contradicted" when it clearly states something different; "absent" when the document does not mention that field.`

function buildVerifyUser(claim: VerificationClaim, evidence: string): string {
  return [
    'CLAIM:',
    `- institution: ${claim.institution}`,
    `- result: ${claim.result}`,
    `- programme: ${claim.programme ?? '(none)'}`,
    `- applyYear: ${claim.applyYear}`,
    '',
    'PROOF DOCUMENT TEXT:',
    evidence,
  ].join('\n')
}

/** AI evidence cross-check. `chat` is the only I/O dependency (injected). */
export function createAiClaimVerifier(chat: ChatJson): ClaimVerifier {
  return {
    async verify(claim, evidenceTexts) {
      const evidence = (evidenceTexts ?? [])
        .map((t) => t?.trim())
        .filter(Boolean)
        .join('\n\n---\n\n')
      if (!evidence) {
        // No proof → nothing to cross-check; decision logic maps {} to 'unverified'.
        return { fields: {}, conflicts: [], confidence: 'low' }
      }
      const raw = await chat(VERIFY_PROMPT, buildVerifyUser(claim, evidence))
      return normalizeVerdict(raw, claim)
    },
  }
}
