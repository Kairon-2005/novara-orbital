// POST /api/universities/plan/from-source  (multipart)
// Build a target's application plan from official-page content the user provides —
// by URL (layered fetch), pasted text, or an uploaded PDF/screenshot. Persists the
// plan and returns proposed calendar events. See docs/PRD-app-assistant-calendar.md.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { extractText } from '@/lib/extract'
import { fetchApplicationPlanFromSource } from '@/lib/ai'
import { runGuardedAi, quotaResponse } from '@/lib/ai-guard-server'
import { planToProposedEvents } from '@/lib/application-events'
import { createPageFetcher } from '@/lib/page-fetch'
import { impitFetchText, readerFetchText } from '@/lib/page-fetch-server'

const MAX_BYTES = 10 * 1024 * 1024
const MIN_USABLE = 50

export async function POST(request: Request) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })

  const targetId = String(form.get('targetId') ?? '')
  if (!targetId) return NextResponse.json({ error: 'targetId is required' }, { status: 400 })
  const url = (form.get('url') as string | null)?.trim() ?? ''
  const pastedText = (form.get('pastedText') as string | null)?.trim() ?? ''
  const file = form.get('file')
  const contribute = form.get('contribute') === '1'

  const [{ data: target }, { data: profile }] = await Promise.all([
    supabase.from('university_targets').select('id, name, programme').eq('id', targetId).maybeSingle(),
    supabase.from('student_profiles').select('target_enrollment_year').eq('user_id', user.id).maybeSingle(),
  ])
  if (!target) return NextResponse.json({ error: 'Target not found' }, { status: 404 })
  const enrollmentYear = profile?.target_enrollment_year ?? new Date().getFullYear() + 1

  // Resolve the source text: paste → upload → URL fetch (impit → reader → give up).
  let sourceText = pastedText
  let fetchedVia = pastedText ? 'paste' : 'none'
  if (!sourceText && file instanceof File && file.size > 0 && file.size <= MAX_BYTES) {
    sourceText = await extractText(Buffer.from(await file.arrayBuffer()), file.type)
    if (sourceText) fetchedVia = 'upload'
  }
  if (!sourceText && url) {
    const readerEnabled = process.env.READER_ENABLED === '1'
    const fetcher = createPageFetcher({
      impitFetch: impitFetchText,
      readerFetch: readerEnabled ? readerFetchText : null,
    })
    const r = await fetcher.fetchPageText(url)
    sourceText = r.text
    fetchedVia = r.via
  }

  if (!sourceText || sourceText.trim().length < MIN_USABLE) {
    // No dead end: tell the client to fall back to paste/upload.
    return NextResponse.json({ needsManualInput: true, fetchedVia })
  }

  try {
    const plan = await runGuardedAi(user.id, 'plan_from_source', () => fetchApplicationPlanFromSource(
      target.name, target.programme ?? '', enrollmentYear, sourceText, url || undefined,
    ))
    const planUpdatedAt = new Date().toISOString()
    await supabase
      .from('university_targets')
      .update({ application_plan: plan, plan_updated_at: planUpdatedAt })
      .eq('id', targetId)

    // Optional: submit the page to the KB for admin review (not shared until approved).
    if (contribute) {
      await supabase.from('kb_contributions').insert({
        contributor_id: user.id,
        url: url || null,
        title: `${target.name}${target.programme ? ` — ${target.programme}` : ''} — official page`,
        raw_text: sourceText.slice(0, 20000),
      })
    }

    return NextResponse.json({
      plan,
      proposedEvents: planToProposedEvents(plan, target.name),
      fetchedVia,
      planUpdatedAt,
    })
  } catch (err) {
    const quota = quotaResponse(err)
    if (quota) return quota
    console.error('[universities/plan/from-source]', err)
    return NextResponse.json({ error: 'Could not build a plan from this content.' }, { status: 500 })
  }
}
