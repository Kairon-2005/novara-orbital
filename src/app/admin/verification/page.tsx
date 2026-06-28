import { createServerClient } from '@/db/server'
import VerificationClient from './VerificationClient'

export const dynamic = 'force-dynamic'

export default async function AdminVerificationPage() {
  const supabase = createServerClient()
  // Surface the cases an admin most likely needs to act on first.
  const { data } = await supabase
    .from('admission_reports')
    .select('id, institution, programme, result, apply_year, verification_status, created_at')
    .in('verification_status', ['mismatch', 'pending', 'verified', 'unverified'])
    .order('created_at', { ascending: false })
    .limit(200)

  return <VerificationClient cases={data ?? []} />
}
