// Lexical fusion rerank (pure). Dense embeddings recall semantically related
// chunks but can rank an exact fact ("IELTS 6.5", "AP Calculus BC") below a
// vaguer match. Retrieval over-fetches from the vector store, then this
// reranks by dense score + lexical overlap with the query — a lightweight
// hybrid that costs no extra API calls. A cross-encoder reranker can replace
// this seam if the corpus outgrows it.

import type { KbSearchHit } from '@/types/kb'

const LEX_WEIGHT = 0.3

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ''))
    .filter((t) => t.length >= 2)
}

/**
 * Overlap score in [0, 1]: fraction of query-token weight present in the text.
 * Tokens containing digits (scores, years, "6.5") weigh double — exact figures
 * are what lexical matching is for.
 */
export function lexicalOverlap(query: string, text: string): number {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return 0
  const textTokens = new Set(tokenize(text))
  let total = 0
  let matched = 0
  for (const token of queryTokens) {
    const weight = /\d/.test(token) ? 2 : 1
    total += weight
    if (textTokens.has(token)) matched += weight
  }
  return total === 0 ? 0 : matched / total
}

/** Rerank dense hits by dense score + weighted lexical overlap; keep `limit`. */
export function lexicalRerank(hits: KbSearchHit[], query: string, limit: number): KbSearchHit[] {
  return hits
    .map((hit) => ({
      hit,
      combined: hit.score + LEX_WEIGHT * lexicalOverlap(query, `${hit.section} ${hit.text}`),
    }))
    .sort((a, b) => b.combined - a.combined || b.hit.score - a.hit.score)
    .slice(0, limit)
    .map((r) => r.hit)
}
