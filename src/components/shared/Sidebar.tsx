'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

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

  return (
    <aside className={cn('sidebar', isParent && 'sidebar-parent')}>
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
        <div>
          <div className={cn('text-[13px] font-semibold text-[var(--t900)]', isParent && 'font-cn')}>
            {userName}
          </div>
          {userMeta && (
            <div className="text-[11px] text-[var(--t500)]">{userMeta}</div>
          )}
        </div>
      </div>
    </aside>
  )
}
