// Server orchestration for admission cases: run the AI verification verdict and
// settle verified cases into the KB. Lives at lib/ root (not lib/community/*) so
// the pure domain layer stays free of I/O. The pure decisions it composes
// (createAiClaimVerifier, decideVerificationStatus) come from lib/community/verify.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, VerificationStatus } from '@/types/database'
import {
  createAiClaimVerifier,
  decideVerificationStatus,
  type VerificationClaim,
  type VerificationVerdict,
} from '@/lib/community/verify'
import { chatJson } from '@/lib/ai'
import { reportToKbDoc } from '@/lib/community-kb'
import { runDocIngest } from '@/lib/kb/ingest'
import { qdrantConfigured, QdrantStore } from '@/lib/kb/store'
import { embedTexts } from '@/lib/kb/embed'

const VERIFY_MODEL = 'qwen-plus'

export interface VerificationOutcome {
  status: VerificationStatus
  verdict: VerificationVerdict
  /** Ready to persist into admission_reports.verification_detail. */
  detail: VerificationVerdict & { model: string; checkedAt: string }
}

/** Cross-check a claim against proof evidence and decide the resulting status. */
export async function runVerification(
  claim: VerificationClaim,
  evidenceTexts: string[],
  nowIso: string,
): Promise<VerificationOutcome> {
  const verdict = await createAiClaimVerifier(chatJson).verify(claim, evidenceTexts)
  return {
    status: decideVerificationStatus(verdict),
    verdict,
    detail: { ...verdict, model: VERIFY_MODEL, checkedAt: nowIso },
  }
}

export interface IngestResult {
  ingested: boolean
  reason?: 'not-found' | 'not-verified' | 'already-ingested' | 'kb-not-configured'
  chunks?: number
}

/**
 * Settle a case into the wiki/KB — but only if it is VERIFIED and not already
 * ingested (idempotent via ingested_at). Requires a service-role client because
 * ingested_at is a guarded column. No-ops cleanly when the KB is unconfigured.
 */
export async function ingestReport(
  admin: SupabaseClient<Database>,
  reportId: string,
  nowIso: string,
): Promise<IngestResult> {
  const { data: r } = await admin.from('admission_reports').select('*').eq('id', reportId).maybeSingle()
  if (!r) return { ingested: false, reason: 'not-found' }
  if (r.verification_status !== 'verified') return { ingested: false, reason: 'not-verified' }
  if (r.ingested_at) return { ingested: false, reason: 'already-ingested' }
  if (!qdrantConfigured()) return { ingested: false, reason: 'kb-not-configured' }

  const doc = reportToKbDoc({
    id: r.id,
    level: r.level,
    institution: r.institution,
    programme: r.programme,
    route: r.route,
    result: r.result,
    applyYear: r.apply_year,
    scholarshipName: r.scholarship_name,
    grades: r.grades,
    englishTest: r.english_test,
    standardizedTests: r.standardized_tests,
    activities: r.activities,
    admissionExperience: r.admission_experience,
    interviewExperience: r.interview_experience,
    scholarshipExperience: r.scholarship_experience,
  }, nowIso.slice(0, 10))

  const result = await runDocIngest(doc, { store: new QdrantStore(), embed: embedTexts })
  await admin.from('admission_reports').update({ ingested_at: nowIso }).eq('id', reportId)
  return { ingested: true, chunks: result.upserted }
}
