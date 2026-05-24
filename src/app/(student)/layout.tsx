import { redirect } from 'next/navigation'
import { createServerClient } from '@/db/server'
import { Sidebar } from '@/components/shared/Sidebar'

// ── Icons (inline SVG to avoid an icon-lib import in layout) ─────────────

function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',        d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  { href: '/roadmap',    label: 'Roadmap',           d: 'M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13V7m0 13 6 3m-6-16 6-3m0 0 5.447 2.724A1 1 0 0 1 21 7.618v10.764a1 1 0 0 1-1.447.894L15 17m0-13v13' },
  { href: '/navigator',  label: 'School Navigator',  d: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2' },
  { href: '/portfolio',  label: 'Portfolio',         d: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z' },
  { href: '/documents',  label: 'Documents',         d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z' },
  { href: '/calendar',   label: 'Calendar',          d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z' },
  { href: '/finance',    label: 'Finance',           d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { href: '/homestay',   label: 'Homestay',          d: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
  { href: '/community',  label: 'Community',         d: 'M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
]

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'parent') redirect('/parent/dashboard')

  const { data: sp } = await supabase
    .from('student_profiles')
    .select('current_school, current_year')
    .eq('user_id', user.id)
    .maybeSingle()

  const navItems = NAV_ITEMS.map(item => ({
    href: item.href,
    label: item.label,
    icon: <Icon d={item.d} />,
  }))

  return (
    <div className="app-layout">
      <Sidebar
        items={navItems}
        userName={profile?.display_name ?? user.email ?? 'Student'}
        userMeta={sp?.current_school ?? sp?.current_year ?? undefined}
      />
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
