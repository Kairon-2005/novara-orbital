// Offline refresh checker (pure parts). The kb-refresh script fetches each
// document's source_urls, fingerprints the visible text, and diffs against the
// last snapshot — telling the editor exactly which official pages changed
// since the content was last verified. Never runs in the request path.

import { createHash } from 'node:crypto'

/** Visible text of an HTML page: tags, scripts and styles stripped, whitespace collapsed. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

export function contentFingerprint(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

export type Snapshot = Record<string, string> // url → fingerprint

export interface SnapshotDiff {
  changed: string[]
  added: string[]
  removed: string[]
  unchanged: string[]
}

export function compareSnapshots(prev: Snapshot, next: Snapshot): SnapshotDiff {
  const diff: SnapshotDiff = { changed: [], added: [], removed: [], unchanged: [] }
  for (const [url, hash] of Object.entries(next)) {
    if (!(url in prev)) diff.added.push(url)
    else if (prev[url] !== hash) diff.changed.push(url)
    else diff.unchanged.push(url)
  }
  for (const url of Object.keys(prev)) {
    if (!(url in next)) diff.removed.push(url)
  }
  return diff
}
