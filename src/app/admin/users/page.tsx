import { createServerClient } from '@/db/server'
import UsersClient from './UsersClient'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, role, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  return <UsersClient users={data ?? []} selfId={user?.id ?? ''} />
}
