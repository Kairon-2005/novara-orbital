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

// Sections mirror the three product pillars: your journey (progress), the
// application work, and the community. Users can still re-prioritise via pinning.
const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',        group: 'My Journey', d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  { href: '/roadmap',    label: 'Roadmap',           group: 'My Journey', d: 'M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13V7m0 13 6 3m-6-16 6-3m0 0 5.447 2.724A1 1 0 0 1 21 7.618v10.764a1 1 0 0 1-1.447.894L15 17m0-13v13' },
  { href: '/portfolio',  label: 'Portfolio',         group: 'My Journey', d: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z' },
  { href: '/navigator',  label: 'School Navigator',  group: 'Applications', d: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2' },
  { href: '/universities', label: 'Universities',      group: 'Applications', d: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 0 1 .665 6.479A11.952 11.952 0 0 0 12 20.055a11.952 11.952 0 0 0-6.824-2.998 12.078 12.078 0 0 1 .665-6.479L12 14z' },
  { href: '/essays',     label: 'Essays 文书',        group: 'Applications', d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' },
  { href: '/documents',  label: 'Documents',         group: 'Applications', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z' },
  { href: '/calendar',   label: 'Calendar',          group: 'Applications', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z' },
  { href: '/finance',    label: 'Finance',           group: 'Applications', d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { href: '/community',  label: 'Community',         group: 'Community', d: 'M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
  { href: '/wiki',       label: 'Knowledge Wiki',    group: 'Community', d: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
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

  const [{ data: sp }, { data: quota }] = await Promise.all([
    supabase.from('student_profiles').select('current_school, current_year').eq('user_id', user.id).maybeSingle(),
    supabase.from('roadmap_generation_quota').select('total_generations').eq('user_id', user.id).maybeSingle(),
  ])

  const navItems = NAV_ITEMS.map(item => ({
    href: item.href,
    label: item.label,
    group: item.group,
    icon: <Icon d={item.d} />,
  }))

  return (
    <div className="app-layout">
      <Sidebar
        items={navItems}
        userName={profile?.display_name ?? user.email ?? 'Student'}
        userEmail={user.email ?? undefined}
        userMeta={sp?.current_school ?? sp?.current_year ?? undefined}
        generationsUsed={quota?.total_generations ?? 0}
      />
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
