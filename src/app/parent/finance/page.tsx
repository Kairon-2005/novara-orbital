import { createServerClient } from '@/db/server'
import FinanceParentClient from './FinanceParentClient'

export default async function ParentFinancePage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">Not authenticated.</p>

  const { data: link } = await supabase
    .from('parent_links').select('student_id').eq('parent_id', user.id).single()

  if (!link) return (
    <div className="p-10 text-center text-[var(--t500)]">No linked student found.</div>
  )

  const { data: fees } = await supabase
    .from('fee_items')
    .select('id, name, amount_sgd, due_date, category, paid, paid_date')
    .eq('student_id', link.student_id)
    .order('due_date', { ascending: true })

  return <FinanceParentClient initialFees={fees ?? []} />
}
