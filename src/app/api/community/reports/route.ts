// POST /api/community/reports
// Server-side admission-case creation so verification cannot be bypassed:
// insert the report, store proof file(s) privately, run the AI evidence
// cross-check, persist the verdict with the service role, and — only when
// verified — settle the case into the wiki/KB. See docs/PRD-admission-cases.md.

import { NextResponse } from 'next/server'
import { createRouteClient, createAdminClient } from '@/db/server'
import { extractText } from '@/lib/extract'
import { validateReport, type ReportDraft } from '@/lib/community'
import { runVerification, ingestReport } from '@/lib/community-reports'
import type { ReportProofKind } from '@/types/database'

const MAX_BYTES = 10 * 1024 * 1024
const PROOF_KINDS: ReportProofKind[] = ['offer_letter', 'transcript', 'test_score', 'other']

export async function POST(request: Request) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })

  let draft: ReportDraft
  try {
    draft = JSON.parse(String(form.get('draft') ?? '')) as ReportDraft
  } catch {
    return NextResponse.json({ error: 'Invalid draft payload' }, { status: 400 })
  }

  const validation = validateReport(draft, new Date().getFullYear())
  if (!validation.valid) {
    return NextResponse.json({ error: 'Invalid report', errors: validation.errors }, { status: 400 })
  }

  // 1) Insert the report (starts unverified; verification columns are guarded).
  const { data: report, error: insErr } = await supabase
    .from('admission_reports')
    .insert({
      author_id: user.id,
      anonymous: draft.anonymous ?? true,
      level: draft.level,
      institution: draft.institution.trim(),
      programme: draft.programme?.trim() || null,
      route: draft.route,
      result: draft.result,
      apply_year: draft.applyYear,
      scholarship_name: draft.scholarshipName?.trim() || null,
      grades: draft.grades?.trim() || null,
      english_test: draft.englishTest?.trim() || null,
      standardized_tests: draft.standardizedTests?.trim() || null,
      activities: draft.activities?.trim() || null,
      admission_experience: draft.admissionExperience.trim(),
      interview_experience: draft.interviewExperience?.trim() || null,
      scholarship_experience: draft.scholarshipExperience?.trim() || null,
    })
    .select()
    .single()
  if (insErr || !report) {
    return NextResponse.json({ error: 'Failed to publish report' }, { status: 500 })
  }

  // 2) Store proof file(s) privately and extract their text for the cross-check.
  const files = form.getAll('proofs').filter((f): f is File => f instanceof File)
  let kinds: unknown[] = []
  try { kinds = JSON.parse(String(form.get('proofKinds') ?? '[]')) } catch { kinds = [] }

  const evidenceTexts: string[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (file.size === 0 || file.size > MAX_BYTES) continue
    const buf = Buffer.from(await file.arrayBuffer())
    const text = await extractText(buf, file.type)
    const path = `${user.id}/${report.id}/${file.name}`
    const { error: upErr } = await supabase.storage
      .from('admission-proofs')
      .upload(path, buf, { contentType: file.type || undefined, upsert: true })
    if (upErr) continue
    const kind: ReportProofKind = PROOF_KINDS.includes(kinds[i] as ReportProofKind)
      ? (kinds[i] as ReportProofKind)
      : 'other'
    await supabase.from('report_proofs').insert({
      report_id: report.id,
      storage_path: path,
      doc_kind: kind,
      mime: file.type || null,
      bytes: file.size,
      extracted_text: text || null,
    })
    if (text) evidenceTexts.push(text)
  }

  // 3) Verify against the evidence and persist the verdict with the service role.
  let status = report.verification_status
  let conflicts: { field: string; claimed: string; found: string }[] = []
  if (evidenceTexts.length > 0) {
    const nowIso = new Date().toISOString()
    const outcome = await runVerification(
      {
        institution: draft.institution.trim(),
        result: draft.result,
        programme: draft.programme?.trim() || null,
        applyYear: draft.applyYear,
      },
      evidenceTexts,
      nowIso,
    ).catch(() => null)

    if (outcome) {
      status = outcome.status
      conflicts = outcome.verdict.conflicts
      const admin = createAdminClient()
      await admin
        .from('admission_reports')
        .update({
          verification_status: outcome.status,
          verification_detail: outcome.detail,
          verified_at: outcome.status === 'verified' ? nowIso : null,
        })
        .eq('id', report.id)

      // 4) Only verified cases settle into the wiki/KB (best-effort, idempotent).
      if (outcome.status === 'verified') {
        await ingestReport(admin, report.id, nowIso).catch(() => { /* non-blocking */ })
      }
    }
  }

  return NextResponse.json({
    report: { ...report, verification_status: status },
    verdict: { status, conflicts },
  })
}
