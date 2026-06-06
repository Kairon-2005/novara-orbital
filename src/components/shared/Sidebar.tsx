'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ProfileMenu } from './ProfileMenu'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

interface SidebarProps {
  items: NavItem[]
  userName: string
  userEmail?: string
  userMeta?: string
  isParent?: boolean
  childName?: string
  generationsUsed?: number
}

export function Sidebar({ items, userName, userEmail, isParent, childName, generationsUsed }: SidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close the mobile drawer whenever the route changes
  useEffect(() => { setOpen(false) }, [pathname])

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

      {/* Account menu (avatar → settings, language, subscription, log out) */}
      <ProfileMenu
        userName={userName}
        userEmail={userEmail}
        isParent={isParent}
        generationsUsed={generationsUsed}
      />
      </aside>
    </>
  )
}
