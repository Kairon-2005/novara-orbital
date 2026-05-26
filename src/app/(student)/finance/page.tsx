// Server Component — fetches fee_items and expense_logs from Supabase.
import { createServerClient } from '@/db/server'
import FinanceClient from './FinanceClient'

export type DbFeeItem = {
  id: string; name: string; category: string
  amount_sgd: number; due_date: string; paid: boolean; paid_date: string | null
}

export type DbExpense = {
  id: string; note: string | null; category: string
  amount_sgd: number; date: string
}

export default async function FinancePage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">Not authenticated.</p>

  const [{ data: fees }, { data: expenses }] = await Promise.all([
    supabase
      .from('fee_items')
      .select('id, name, category, amount_sgd, due_date, paid, paid_date')
      .eq('student_id', user.id)
      .order('due_date', { ascending: true }),
    supabase
      .from('expense_logs')
      .select('id, note, category, amount_sgd, date')
      .eq('student_id', user.id)
      .order('date', { ascending: false }),
  ])

  return (
    <FinanceClient
      initialFees={fees ?? []}
      initialExpenses={expenses ?? []}
      userId={user.id}
    />
  )
}
