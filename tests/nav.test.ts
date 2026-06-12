import { describe, it, expect } from 'vitest'
import { orderNavItems, togglePin } from '@/lib/nav'

const items = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/roadmap', label: 'Roadmap' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/universities', label: 'Universities' },
]

describe('orderNavItems', () => {
  it('floats pinned items to the top in pin order, rest keep default order', () => {
    const ordered = orderNavItems(items, ['/universities', '/roadmap'])
    expect(ordered.map((i) => i.href)).toEqual(['/universities', '/roadmap', '/dashboard', '/portfolio'])
  })

  it('returns the default order when nothing is pinned', () => {
    expect(orderNavItems(items, []).map((i) => i.href)).toEqual(items.map((i) => i.href))
  })

  it('ignores pinned hrefs that no longer exist', () => {
    const ordered = orderNavItems(items, ['/gone', '/portfolio'])
    expect(ordered.map((i) => i.href)).toEqual(['/portfolio', '/dashboard', '/roadmap', '/universities'])
  })
})

describe('togglePin', () => {
  it('adds an unpinned href to the end of the pin list', () => {
    expect(togglePin(['/roadmap'], '/wiki')).toEqual(['/roadmap', '/wiki'])
  })

  it('removes an already-pinned href', () => {
    expect(togglePin(['/roadmap', '/wiki'], '/roadmap')).toEqual(['/wiki'])
  })
})
