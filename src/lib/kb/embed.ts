// DashScope embedding adapter (thin seam).
// Has its own client instance (same key/baseURL as src/lib/ai.ts) so the kb
// module never imports ai.ts — ai.ts imports kb, and a cycle would be fragile.

import OpenAI from 'openai'

const ai = new OpenAI({
  apiKey: process.env.QWEN_API_KEY ?? '',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
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

export const EMBEDDING_MODEL = 'text-embedding-v3'
export const EMBEDDING_DIMENSIONS = 1024

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
