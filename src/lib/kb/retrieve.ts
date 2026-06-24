// Retrieval: query → embedding → filtered vector search → KbSearchHits.
//
// `searchKb` is the public entry point used by app code; `searchKbWith`
// exposes the seams for tests. Retrieval failures degrade to [] so AI
// features fall back to their non-RAG behaviour instead of erroring.

import { embedTexts } from './embed'
import { qdrantConfigured, QdrantStore } from './store'
import { lexicalRerank } from './rerank'
import type { VectorStore } from './store'
import type { EmbedFn } from './ingest'
import type { KbFilters, KbSearchHit } from '@/types/kb'

const DEFAULT_LIMIT = 6
// Hybrid retrieval: over-fetch dense candidates, then lexically rerank so
// exact figures/acronyms in the query win over vaguer semantic matches.
const OVERFETCH_FACTOR = 4
const MAX_CANDIDATES = 24

export interface RetrieveDeps {
  store: VectorStore
  embed: EmbedFn
}

export async function searchKbWith(
  query: string,
  filters: KbFilters,
  deps: RetrieveDeps
): Promise<KbSearchHit[]> {
  if (!query.trim()) return []
  const limit = filters.limit ?? DEFAULT_LIMIT
  try {
    const [vector] = await deps.embed([query.trim()])
    const results = await deps.store.search(vector, {
      limit: Math.min(limit * OVERFETCH_FACTOR, MAX_CANDIDATES),
      filter: { university: filters.university, category: filters.category, topic: filters.topic },
    })
    const hits = results.map((r) => ({
      chunkId: r.payload.chunkId,
      docId: r.payload.docId,
      title: r.payload.title,
      section: r.payload.section,
      text: r.payload.text,
      score: r.score,
      sourceUrls: r.payload.sourceUrls,
      lastVerified: r.payload.lastVerified,
    }))
    return lexicalRerank(hits, query, limit)
  } catch (err) {
    console.error('[kb/retrieve] search failed, degrading to no context', err)
    return []
  }
}

/** Search the knowledge base. Returns [] when Qdrant is not configured. */
export async function searchKb(query: string, filters: KbFilters = {}): Promise<KbSearchHit[]> {
  if (!qdrantConfigured()) return []
  return searchKbWith(query, filters, { store: new QdrantStore(), embed: embedTexts })
}
