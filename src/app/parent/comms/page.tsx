import { createServerClient } from '@/db/server'
import CommsParentClient from './CommsParentClient'
import type { MockComm } from '@/types/models'

export default async function ParentCommsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">Not authenticated.</p>

  const { data: link } = await supabase
    .from('parent_links').select('student_id').eq('parent_id', user.id).single()

  if (!link) return (
    <div className="p-10 text-center text-[var(--t500)]">No linked student found.</div>
  )

  const { data: dbComms } = await supabase
    .from('school_communications')
    .select('id, original_text, chinese_translation, chinese_summary, source_type, submitted_at')
    .eq('student_id', link.student_id)
    .order('submitted_at', { ascending: false })

  const comms: MockComm[] = (dbComms ?? []).map(c => ({
    id:          c.id,
    subject:     c.original_text.slice(0, 60) + (c.original_text.length > 60 ? '…' : ''),
    body_en:     c.original_text,
    body_zh:     c.chinese_translation,
    summary_zh:  c.chinese_summary,
    category:    'other' as MockComm['category'],
    sent_date:   c.submitted_at.slice(0, 10),
    from_school: 'School',
    status:      'unread' as MockComm['status'],
    urgent:      false,
  }))

  return <CommsParentClient initialComms={comms} studentId={link.student_id} />
}
