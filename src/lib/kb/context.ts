// Turning retrieval hits into prompt context + user-facing citations (pure).

import type { KbSearchHit } from '@/types/kb'

/**
 * Render hits as a numbered context block for inclusion in an AI prompt.
 * Empty input → empty string (callers skip RAG cleanly).
 */
export function buildKbContext(hits: KbSearchHit[]): string {
  if (hits.length === 0) return ''
  const blocks = hits.map((h, i) =>
    `[${i + 1}] ${h.section} (${h.title}, last verified ${h.lastVerified})\n${h.text}`
  )
  return `KNOWLEDGE BASE CONTEXT:\n\n${blocks.join('\n\n')}`
}

export interface KbCitation {
  docId: string
  title: string
  sourceUrls: string[]
  lastVerified: string
}

/** One citation per source document, in first-hit order. */
export function formatCitations(hits: KbSearchHit[]): KbCitation[] {
  const seen = new Map<string, KbCitation>()
  for (const h of hits) {
    if (!seen.has(h.docId)) {
      seen.set(h.docId, {
        docId: h.docId,
        title: h.title,
        sourceUrls: h.sourceUrls,
        lastVerified: h.lastVerified,
      })
    }
  }
  return Array.from(seen.values())
}
