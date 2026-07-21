// Sidebar pin/unpin logic (pure). Pinned hrefs are persisted client-side
// (localStorage) and floated to the top of the nav in the order they were
// pinned; everything else keeps the default order.

// Sections for a grouped sidebar: pinned items float into a leading unlabelled
// section (pin order), the rest keep their group in first-seen order. Groups
// whose items are all pinned disappear rather than render empty.

export type NavSection<T> = { label: string | null; items: T[] }

export function groupNavItems<T extends { href: string; group?: string }>(
  items: T[],
  pinned: string[],
): NavSection<T>[] {
  const byHref = new Map(items.map((i) => [i.href, i]))
  const pinnedItems = pinned
    .map((href) => byHref.get(href))
    .filter((i): i is T => Boolean(i))
  const pinnedSet = new Set(pinnedItems.map((i) => i.href))

  const sections: NavSection<T>[] = pinnedItems.length ? [{ label: null, items: pinnedItems }] : []
  for (const item of items) {
    if (pinnedSet.has(item.href)) continue
    const label = item.group ?? null
    const last = sections.find((s) => s.label === label && s.label !== null)
    if (last) last.items.push(item)
    else sections.push({ label, items: [item] })
  }
  return sections
}

export function togglePin(pinned: string[], href: string): string[] {
  return pinned.includes(href) ? pinned.filter((p) => p !== href) : [...pinned, href]
}
