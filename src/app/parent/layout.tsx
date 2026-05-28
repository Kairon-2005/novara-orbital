import { redirect } from 'next/navigation'
import { createServerClient } from '@/db/server'
import { Sidebar } from '@/components/shared/Sidebar'

function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

// Parent portal — Chinese labels (matches zh.json nav keys)
const NAV_ITEMS = [
  { href: '/parent/dashboard', label: '总览',     d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  { href: '/parent/roadmap',   label: '学习路线图', d: 'M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13V7m0 13 6 3m-6-16 6-3m0 0 5.447 2.724A1 1 0 0 1 21 7.618v10.764a1 1 0 0 1-1.447.894L15 17m0-13v13' },
  { href: '/parent/finance',   label: '费用规划',  d: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  { href: '/parent/comms',     label: '沟通中心',  d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { href: '/parent/homestay',  label: '住家寄宿',  d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
]

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'parent') redirect('/dashboard')

  // Fetch linked student name for the banner
  const { data: link } = await supabase
    .from('parent_links')
    .select('student_id')
    .eq('parent_id', user.id)
    .maybeSingle()

  let childName: string | undefined
  if (link?.student_id) {
    const { data: child } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', link.student_id)
      .single()
    childName = child?.display_name ?? undefined
  }

  const navItems = NAV_ITEMS.map(item => ({
    href: item.href,
    label: item.label,
    icon: <Icon d={item.d} />,
  }))

  return (
    <div className="app-layout">
      <Sidebar
        items={navItems}
        userName={profile?.display_name ?? user.email ?? '家长'}
        isParent
        childName={childName}
      />
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
