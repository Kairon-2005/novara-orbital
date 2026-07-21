// Server Component — 文书工作室 (Essay Studio). Loads the student's essays,
// their feedback history, and targets for linking. The editor and critique
// flow live in the client component.
import { createServerClient } from '@/db/server'
import EssaysClient, { type EssayRow, type FeedbackRow } from './EssaysClient'

export default async function EssaysPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">Not authenticated.</p>

  const [{ data: essays, error }, { data: targets }] = await Promise.all([
    supabase
      .from('essays')
      .select('id, target_id, title, prompt, content, updated_at')
      .eq('student_id', user.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('university_targets')
      .select('id, name, programme')
      .eq('student_id', user.id),
  ])

  // Pre-migration schema (essays table not applied yet) — render the studio
  // shell with a notice instead of erroring.
  if (error) {
    return <EssaysClient essays={[]} feedback={{}} targets={[]} userId={user.id} storageReady={false} />
  }

  const feedback: Record<string, FeedbackRow[]> = {}
  if (essays && essays.length > 0) {
    const { data: fb } = await supabase
      .from('essay_feedback')
      .select('id, essay_id, feedback, created_at')
      .in('essay_id', essays.map(e => e.id))
      .order('created_at', { ascending: false })
    for (const row of fb ?? []) {
      ;(feedback[row.essay_id] ??= []).push({
        id: row.id,
        feedback: row.feedback as FeedbackRow['feedback'],
        createdAt: row.created_at,
      })
    }
  }

  return (
    <EssaysClient
      essays={(essays ?? []) as EssayRow[]}
      feedback={feedback}
      targets={targets ?? []}
      userId={user.id}
      storageReady
    />
  )
}
