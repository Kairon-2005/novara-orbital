import { createServerClient } from '@/db/server'
import DirectoryClient from './DirectoryClient'

export const dynamic = 'force-dynamic'

export default async function AdminDirectoryPage() {
  const supabase = createServerClient()
  const [{ data: schools }, { data: homestays }] = await Promise.all([
    supabase.from('schools').select('id, school_name, slug, school_type, zone, is_active').order('school_name'),
    supabase.from('homestay_listings').select('id, family_name, address, room_type, monthly_rate_sgd, zone, is_active').order('family_name'),
  ])
  return <DirectoryClient schools={schools ?? []} homestays={homestays ?? []} />
}
