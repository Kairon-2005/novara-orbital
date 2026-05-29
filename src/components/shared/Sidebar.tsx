'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@/db/client'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

interface SidebarProps {
  items: NavItem[]
  userName: string
  userMeta?: string
  isParent?: boolean
  childName?: string
}

export function Sidebar({ items, userName, userMeta, isParent, childName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserClient()
  const [open, setOpen] = useState(false)

  // Close the mobile drawer whenever the route changes
  useEffect(() => { setOpen(false) }, [pathname])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile hamburger toggle (hidden on desktop via CSS) */}
      <button
        type="button"
        className="mobile-menu-btn"
        aria-label="Open navigation menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Backdrop behind the open drawer (hidden on desktop via CSS) */}
      {open && (
        <div
          className="sidebar-backdrop"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={cn('sidebar', isParent && 'sidebar-parent', open && 'sidebar-open')}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-[18px] border-b border-[var(--border)]">
        <div className="w-[34px] h-[34px] bg-[var(--blue)] rounded-[9px] flex items-center justify-center text-white font-display font-extrabold text-[17px] flex-shrink-0">
          N
        </div>
        <div>
          <div className="font-display font-bold text-[16px] text-[var(--t900)]">Novara</div>
          {isParent
            ? <div className="text-[10px] font-bold text-[#C81E1E] font-cn">家长端</div>
            : <div className="text-[9px] font-semibold text-[var(--t300)] uppercase tracking-widest">Student</div>
          }
        </div>
      </div>

      {/* Parent viewing child banner */}
      {isParent && childName && (
        <div className="mx-3 mt-3 px-3 py-2 bg-[var(--blue-50)] border border-[var(--blue-100)] rounded-lg">
          <div className="text-[10px] text-[var(--t500)] font-cn">正在查看</div>
          <div className="text-[13px] font-semibold text-[var(--blue)] font-cn">{childName}</div>
        </div>
      )}

      {/* Nav */}
      <nav className="px-2 py-2.5 flex-1 overflow-y-auto">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn('nav-item', pathname === item.href && 'active')}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User row */}
      <div className="px-3.5 py-3.5 border-t border-[var(--border)] flex items-center gap-2.5">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] flex-shrink-0',
          isParent ? 'bg-[#FEE2E2] text-[#C81E1E]' : 'bg-[var(--blue-50)] text-[var(--blue)]'
        )}>
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn('text-[13px] font-semibold text-[var(--t900)] truncate', isParent && 'font-cn')}>
            {userName}
          </div>
          {userMeta && (
            <div className="text-[11px] text-[var(--t500)] truncate">{userMeta}</div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          title="Sign out"
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-[var(--t300)] hover:text-[var(--red)] hover:bg-[var(--red-50)] transition"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
      </aside>
    </>
  )
}
