'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { groupNavItems, togglePin } from '@/lib/nav'
import { ProfileMenu } from './ProfileMenu'
import { useLocale } from './LocaleProvider'

const PINS_STORAGE_KEY = 'novara-nav-pins'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  /** Optional pillar section label; ungrouped items render without a heading. */
  group?: string
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
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState<string[]>([])

  // Close the mobile drawer whenever the route changes
  useEffect(() => { setOpen(false) }, [pathname])

  // Pins persist locally; load after mount to avoid an SSR hydration mismatch.
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(PINS_STORAGE_KEY) ?? '[]')
      if (Array.isArray(stored)) setPinned(stored.filter((p): p is string => typeof p === 'string'))
    } catch { /* corrupted storage — start unpinned */ }
  }, [])

  function onTogglePin(href: string) {
    setPinned((prev) => {
      const next = togglePin(prev, href)
      try { localStorage.setItem(PINS_STORAGE_KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
      return next
    })
  }

  const sections = groupNavItems(items, pinned)

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
      {/* Wordmark */}
      <div className="px-4 py-[18px] border-b border-[var(--border)]">
        <div className="font-display font-bold text-[18px] text-[var(--t900)] leading-none">Novara</div>
        {isParent
          ? <div className="text-[10px] font-bold text-[#C81E1E] font-cn mt-1">{locale === 'zh' ? '家长端' : 'Parent Portal'}</div>
          : <div className="text-[9px] font-semibold text-[var(--t300)] uppercase tracking-widest mt-1">{locale === 'zh' ? '学生端' : 'Student'}</div>
        }
      </div>

      {/* Parent viewing child banner */}
      {isParent && childName && (
        <div className="mx-3 mt-3 px-3 py-2 bg-[var(--blue-50)] border border-[var(--blue-100)] rounded-lg">
          <div className="text-[10px] text-[var(--t500)] font-cn">{locale === 'zh' ? '正在查看' : 'Viewing'}</div>
          <div className="text-[13px] font-semibold text-[var(--blue)] font-cn">{childName}</div>
        </div>
      )}

      {/* Nav — pillar sections; pinned items float to the top via the 📌 toggle */}
      <nav className="px-2 py-2.5 flex-1 overflow-y-auto">
        {sections.map((section, si) => (
          <div key={section.label ?? `pinned-${si}`} className={si > 0 ? 'mt-3' : undefined}>
            {section.label && (
              <div className="px-3 pb-1 text-[10px] font-bold text-[var(--t300)] uppercase tracking-[.08em]">
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
          const isPinned = pinned.includes(item.href)
          return (
            <div key={item.href} className="relative group">
              <Link
                href={item.href}
                className={cn('nav-item pr-8', pathname === item.href && 'active')}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
              <button
                type="button"
                aria-label={isPinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
                title={isPinned ? 'Unpin' : 'Pin to top'}
                onClick={() => onTogglePin(item.href)}
                className={cn(
                  'absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity',
                  isPinned
                    ? 'opacity-100 text-[var(--blue)]'
                    : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[var(--t300)]'
                )}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 17v5" />
                  <path d="M9 10.76V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3.76a2 2 0 0 0 .59 1.42l1.7 1.7a1 1 0 0 1-.7 1.71H7.41a1 1 0 0 1-.7-1.7l1.7-1.71A2 2 0 0 0 9 10.76z" />
                </svg>
              </button>
            </div>
          )
            })}
          </div>
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
