// Sidebar pin/unpin logic (pure). Pinned hrefs are persisted client-side
// (localStorage) and floated to the top of the nav in the order they were
// pinned; everything else keeps the default order.

export function orderNavItems<T extends { href: string }>(items: T[], pinned: string[]): T[] {
  const byHref = new Map(items.map((i) => [i.href, i]))
  const pinnedItems = pinned
    .map((href) => byHref.get(href))
    .filter((i): i is T => Boolean(i))
  const pinnedSet = new Set(pinnedItems.map((i) => i.href))
  return [...pinnedItems, ...items.filter((i) => !pinnedSet.has(i.href))]
}

export function togglePin(pinned: string[], href: string): string[] {
  return pinned.includes(href) ? pinned.filter((p) => p !== href) : [...pinned, href]
}
