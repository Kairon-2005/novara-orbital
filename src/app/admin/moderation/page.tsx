import { createServerClient } from '@/db/server'
import ModerationClient from './ModerationClient'

export const dynamic = 'force-dynamic'

export default async function AdminModerationPage() {
  const supabase = createServerClient()
  const [{ data: reports }, { data: comments }] = await Promise.all([
    supabase.from('admission_reports')
      .select('id, institution, programme, admission_experience, created_at')
      .eq('moderation_status', 'flagged')
      .order('created_at', { ascending: true }),
    supabase.from('report_comments')
      .select('id, report_id, body, created_at')
      .eq('moderation_status', 'flagged')
      .order('created_at', { ascending: true }),
  ])

  return (
    <ModerationClient
      reports={(reports ?? []).map((r) => ({
        id: r.id,
        title: `${r.institution}${r.programme ? ` — ${r.programme}` : ''}`,
        preview: r.admission_experience,
      }))}
      comments={(comments ?? []).map((c) => ({ id: c.id, title: `Comment`, preview: c.body }))}
    />
  )
}
