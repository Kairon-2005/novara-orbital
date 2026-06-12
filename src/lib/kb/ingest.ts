// Ingestion: markdown docs → chunks → embeddings → vector store.
// planIngest is pure; runIngest orchestrates through the VectorStore +
// embedder seams so it is fully testable without a network.

import { createHash } from 'node:crypto'
import { parseKbDoc, chunkDoc } from './chunk'
import type { VectorStore, KbPointPayload } from './store'
import type { KbChunk } from '@/types/kb'

// ── Point ids ─────────────────────────────────────────────────

// Qdrant only accepts UUIDs or unsigned ints as point ids, so chunk ids are
// mapped to a deterministic name-based UUID (v5-shaped, SHA-1 of the chunk id).
const KB_NAMESPACE = 'novara-kb-v1:'

export function chunkPointId(chunkId: string): string {
  const hex = createHash('sha1').update(KB_NAMESPACE + chunkId).digest('hex')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `${((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-')
}

// ── Plan (pure) ───────────────────────────────────────────────

export interface IngestPlan {
  upserts: KbChunk[]
  /** Point ids present in the store but absent from the current corpus. */
  deletes: string[]
}

export function planIngest(existingPointIds: string[], chunks: KbChunk[]): IngestPlan {
  const desired = new Set(chunks.map((c) => chunkPointId(c.id)))
  return {
    upserts: chunks,
    deletes: existingPointIds.filter((id) => !desired.has(id)),
  }
}

// ── Run ───────────────────────────────────────────────────────

export type EmbedFn = (texts: string[]) => Promise<number[][]>

export interface IngestDeps {
  store: VectorStore
  embed: EmbedFn
  /** Chunks embedded per embed() call. DashScope caps batches at 10. */
  batchSize?: number
}

export interface IngestResult {
  docs: number
  upserted: number
  deleted: number
}

export function chunkPayload(chunk: KbChunk): KbPointPayload {
  return {
    chunkId: chunk.id,
    docId: chunk.docId,
    title: chunk.meta.title,
    section: chunk.section,
    text: chunk.text,
    category: chunk.meta.category,
    university: chunk.meta.university,
    topic: chunk.meta.topic,
    sourceUrls: chunk.meta.sourceUrls,
    lastVerified: chunk.meta.lastVerified,
  }
}

/** Ingest raw markdown documents. Idempotent: re-running replaces a doc's chunks and removes orphans. */
export async function runIngest(rawDocs: string[], deps: IngestDeps): Promise<IngestResult> {
  const { store, embed, batchSize = 10 } = deps

  const chunks: KbChunk[] = []
  for (const raw of rawDocs) {
    const { meta, body } = parseKbDoc(raw)
    chunks.push(...chunkDoc(meta, body))
  }
  if (chunks.length === 0) return { docs: rawDocs.length, upserted: 0, deleted: 0 }

  // Embed first so the collection dimension is known before any write.
  const vectors: number[][] = []
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    // Prefix the section trail so headings inform the embedding.
    vectors.push(...await embed(batch.map((c) => `${c.section}\n\n${c.text}`)))
  }

  await store.ensureCollection(vectors[0].length)
  const plan = planIngest(await store.listIds(), chunks)

  await store.upsert(plan.upserts.map((chunk, i) => ({
    id: chunkPointId(chunk.id),
    vector: vectors[i],
    payload: chunkPayload(chunk),
  })))
  await store.deleteByIds(plan.deletes)

  return { docs: rawDocs.length, upserted: plan.upserts.length, deleted: plan.deletes.length }
}

/**
 * Ingest one document at runtime (admin upload path). Scoped to the doc:
 * its chunks are replaced and its orphans removed; other docs are untouched.
 */
export async function runDocIngest(
  rawDoc: string,
  deps: IngestDeps
): Promise<IngestResult & { docId: string }> {
  const { store, embed, batchSize = 10 } = deps
  const { meta, body } = parseKbDoc(rawDoc)
  const chunks = chunkDoc(meta, body)
  if (chunks.length === 0) throw new Error(`runDocIngest: document "${meta.id}" has no content`)

  const vectors: number[][] = []
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    vectors.push(...await embed(batch.map((c) => `${c.section}\n\n${c.text}`)))
  }

  await store.ensureCollection(vectors[0].length)
  const plan = planIngest(await store.listIdsByDoc(meta.id), chunks)

  await store.upsert(plan.upserts.map((chunk, i) => ({
    id: chunkPointId(chunk.id),
    vector: vectors[i],
    payload: chunkPayload(chunk),
  })))
  await store.deleteByIds(plan.deletes)

  return { docId: meta.id, docs: 1, upserted: plan.upserts.length, deleted: plan.deletes.length }
}
