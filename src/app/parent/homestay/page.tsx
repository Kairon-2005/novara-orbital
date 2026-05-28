import { createServerClient } from '@/db/server'
import HomestayParentClient from './HomestayParentClient'

export default async function ParentHomestayPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">Not authenticated.</p>

  const { data: link } = await supabase
    .from('parent_links').select('student_id').eq('parent_id', user.id).single()

  if (!link) return (
    <div className="p-10 text-center text-[var(--t500)]">No linked student found.</div>
  )

  // homestay_listings joined via homestay_saves or child's confirmed booking
  // For now fetch the first active listing saved for this student (future: homestay_bookings table)
  const { data: childProfile } = await supabase
    .from('student_profiles')
    .select('current_school')
    .eq('user_id', link.student_id)
    .single()

  return <HomestayParentClient childSchool={childProfile?.current_school ?? null} />
}
