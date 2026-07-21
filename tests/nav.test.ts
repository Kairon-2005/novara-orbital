import { describe, it, expect } from 'vitest'
import { togglePin, groupNavItems } from '@/lib/nav'

describe('groupNavItems', () => {
  const grouped = [
    { href: '/dashboard', label: 'Dashboard', group: 'Journey' },
    { href: '/roadmap', label: 'Roadmap', group: 'Journey' },
    { href: '/universities', label: 'Universities', group: 'Applications' },
    { href: '/community', label: 'Community', group: 'Community' },
  ]

  it('groups items by their group label in first-seen order', () => {
    expect(groupNavItems(grouped, [])).toEqual([
      { label: 'Journey', items: [grouped[0], grouped[1]] },
      { label: 'Applications', items: [grouped[2]] },
      { label: 'Community', items: [grouped[3]] },
    ])
  })

  it('floats pinned items into a leading unlabelled section, in pin order', () => {
    const sections = groupNavItems(grouped, ['/community', '/roadmap'])
    expect(sections[0]).toEqual({ label: null, items: [grouped[3], grouped[1]] })
    expect(sections.slice(1)).toEqual([
      { label: 'Journey', items: [grouped[0]] },
      { label: 'Applications', items: [grouped[2]] },
    ])
  })

  it('drops a group section when all its items are pinned', () => {
    const sections = groupNavItems(grouped, ['/universities'])
    expect(sections.map(s => s.label)).toEqual([null, 'Journey', 'Community'])
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
