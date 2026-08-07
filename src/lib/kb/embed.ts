// Embedding adapter (thin seam).
// Has its own client instance so the kb module never imports ai.ts — ai.ts
// imports kb, and a cycle would be fragile. Config comes from the shared
// ai-config module, which has no imports of its own.

import OpenAI from 'openai'
import { AI_API_KEY, AI_BASE_URL, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from '@/lib/ai-config'

const ai = new OpenAI({
  apiKey: AI_API_KEY,
  baseURL: AI_BASE_URL,
  maxRetries: 1,
})

const EMBED_TIMEOUT_MS = 30_000

function withTimeout<T>(promise: Promise<T>, ms = EMBED_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Embedding request timed out')), ms)
    ),
  ])
}

// Re-exported so existing importers (ingest, store, scripts) keep working.
export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS }

/** Embed up to 10 texts per call (DashScope batch cap is enforced by callers). */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const response = await withTimeout(ai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS,
    encoding_format: 'float',
  }))
  // The API may return embeddings out of order; sort by index to be safe.
  return [...response.data].sort((a, b) => a.index - b.index).map((d) => d.embedding)
}
