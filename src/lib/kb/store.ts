// Vector store seam. The rest of the KB module talks to this small interface;
// QdrantStore is the only place that knows Qdrant's REST API.

import type { KbCategory, KbUniversity } from '@/types/kb'

/** Payload stored alongside each vector — everything retrieval needs. */
export interface KbPointPayload {
  chunkId: string
  docId: string
  title: string
  section: string
  text: string
  category: KbCategory
  university: KbUniversity | null
  topic: string
  sourceUrls: string[]
  lastVerified: string
}

export interface VectorPoint {
  /** UUID (see chunkPointId) — Qdrant requires UUID/uint ids. */
  id: string
  vector: number[]
  payload: KbPointPayload
}

export interface StoredPoint {
  id: string
  score: number
  payload: KbPointPayload
}

export interface SearchFilter {
  university?: KbUniversity
  category?: KbCategory
  topic?: string
}

export interface KbDocSummary {
  docId: string
  title: string
  lastVerified: string
}

export interface VectorStore {
  ensureCollection(dimensions: number): Promise<void>
  /** All point ids currently in the collection. */
  listIds(): Promise<string[]>
  /** One summary per ingested document (for staleness reporting). */
  listDocs(): Promise<KbDocSummary[]>
  /** Point ids belonging to one document (for scoped re-ingest). */
  listIdsByDoc(docId: string): Promise<string[]>
  /** A document's chunk payloads in section order (for the wiki reader). */
  getDocChunks(docId: string): Promise<KbPointPayload[]>
  upsert(points: VectorPoint[]): Promise<void>
  deleteByIds(ids: string[]): Promise<void>
  search(vector: number[], opts: { limit: number; filter?: SearchFilter }): Promise<StoredPoint[]>
}

// ── Qdrant implementation ─────────────────────────────────────

const COLLECTION = 'novara_kb'

export function qdrantConfigured(): boolean {
  return Boolean(process.env.QDRANT_URL && process.env.QDRANT_API_KEY)
}

/** True when the store is configured but the cluster itself isn't answering —
 *  Qdrant Cloud suspends free clusters after a period of inactivity, and a
 *  suspended cluster's hostname still resolves but every path 404s. Callers use
 *  this to say "temporarily unavailable" instead of leaking a raw HTTP error. */
export function isClusterUnreachable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    /failed \(404\)/.test(msg) ||          // suspended cluster / deleted deployment
    /failed \(50\d\)/.test(msg) ||         // cluster restarting
    /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|fetch failed/i.test(msg)
  )
}

export class QdrantStore implements VectorStore {
  constructor(
    private baseUrl = process.env.QDRANT_URL ?? '',
    private apiKey = process.env.QDRANT_API_KEY ?? '',
    private collection = COLLECTION
  ) {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('QdrantStore: QDRANT_URL and QDRANT_API_KEY must be set')
    }
    this.baseUrl = this.baseUrl.replace(/\/$/, '')
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { 'api-key': this.apiKey, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Qdrant ${method} ${path} failed (${res.status}): ${detail.slice(0, 300)}`)
    }
    return res.json() as Promise<T>
  }

  async ensureCollection(dimensions: number): Promise<void> {
    const exists = await fetch(`${this.baseUrl}/collections/${this.collection}`, {
      headers: { 'api-key': this.apiKey },
    })
    if (exists.ok) return
    await this.request('PUT', `/collections/${this.collection}`, {
      vectors: { size: dimensions, distance: 'Cosine' },
    })
    // Payload indexes make filtered search efficient.
    for (const field of ['university', 'category', 'topic', 'docId']) {
      await this.request('PUT', `/collections/${this.collection}/index?wait=true`, {
        field_name: field,
        field_schema: 'keyword',
      }).catch(() => { /* index may already exist */ })
    }
  }

  private async scroll(
    withPayload: boolean,
    docId?: string
  ): Promise<{ id: string; payload?: Partial<KbPointPayload> }[]> {
    const points: { id: string; payload?: Partial<KbPointPayload> }[] = []
    let offset: unknown = undefined
    do {
      const page = await this.request<{
        result: { points: { id: string; payload?: Partial<KbPointPayload> }[]; next_page_offset: unknown }
      }>(
        'POST', `/collections/${this.collection}/points/scroll`,
        {
          limit: 500,
          with_payload: withPayload,
          with_vector: false,
          offset,
          ...(docId ? { filter: { must: [{ key: 'docId', match: { value: docId } }] } } : {}),
        }
      )
      points.push(...page.result.points.map((p) => ({ ...p, id: String(p.id) })))
      offset = page.result.next_page_offset
    } while (offset !== null && offset !== undefined)
    return points
  }

  async listIds(): Promise<string[]> {
    return (await this.scroll(false)).map((p) => p.id)
  }

  async listIdsByDoc(docId: string): Promise<string[]> {
    return (await this.scroll(false, docId)).map((p) => p.id)
  }

  async getDocChunks(docId: string): Promise<KbPointPayload[]> {
    const chunkIndex = (chunkId?: string) => Number(chunkId?.split('#')[1] ?? 0)
    return (await this.scroll(true, docId))
      .map((p) => p.payload)
      .filter((p): p is KbPointPayload => Boolean(p?.chunkId))
      .sort((a, b) => chunkIndex(a.chunkId) - chunkIndex(b.chunkId))
  }

  async listDocs(): Promise<KbDocSummary[]> {
    const docs = new Map<string, KbDocSummary>()
    for (const point of await this.scroll(true)) {
      const { docId, title, lastVerified } = point.payload ?? {}
      if (docId && !docs.has(docId)) {
        docs.set(docId, { docId, title: title ?? docId, lastVerified: lastVerified ?? '' })
      }
    }
    return Array.from(docs.values())
  }

  async upsert(points: VectorPoint[]): Promise<void> {
    if (points.length === 0) return
    await this.request('PUT', `/collections/${this.collection}/points?wait=true`, {
      points: points.map((p) => ({ id: p.id, vector: p.vector, payload: p.payload })),
    })
  }

  async deleteByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    await this.request('POST', `/collections/${this.collection}/points/delete?wait=true`, {
      points: ids,
    })
  }

  async search(vector: number[], opts: { limit: number; filter?: SearchFilter }): Promise<StoredPoint[]> {
    const must: unknown[] = []
    if (opts.filter?.university) must.push({ key: 'university', match: { value: opts.filter.university } })
    if (opts.filter?.category) must.push({ key: 'category', match: { value: opts.filter.category } })
    if (opts.filter?.topic) must.push({ key: 'topic', match: { value: opts.filter.topic } })

    const res = await this.request<{ result: { id: string; score: number; payload: KbPointPayload }[] }>(
      'POST', `/collections/${this.collection}/points/search`,
      {
        vector,
        limit: opts.limit,
        with_payload: true,
        ...(must.length > 0 ? { filter: { must } } : {}),
      }
    )
    return res.result.map((r) => ({ id: String(r.id), score: r.score, payload: r.payload }))
  }
}
