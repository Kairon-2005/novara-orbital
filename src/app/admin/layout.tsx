import { redirect } from 'next/navigation'
import { createServerClient } from '@/db/server'
import { Sidebar } from '@/components/shared/Sidebar'
import { isAdmin } from '@/lib/admin/access'

function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const NAV_ITEMS = [
  { href: '/admin',              label: 'Overview',     d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  { href: '/admin/moderation',   label: 'Moderation',   d: 'M9 12l2 2 4-4 M12 3l8 4v5c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7z' },
  { href: '/admin/verification', label: 'Verification', d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4 12 14.01l-3-3' },
  { href: '/admin/kb',           label: 'Knowledge base', d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' },
  { href: '/admin/directory',    label: 'Directory',    d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
  { href: '/admin/users',        label: 'Users',        d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  if (!isAdmin(profile)) redirect('/dashboard')

  const navItems = NAV_ITEMS.map((item) => ({ href: item.href, label: item.label, icon: <Icon d={item.d} /> }))

  return (
    <div className="app-layout">
      <Sidebar items={navItems} userName={profile?.display_name ?? user.email ?? 'Admin'} userEmail={user.email ?? undefined} />
      <main className="main-content">{children}</main>
    </div>
  )
}
