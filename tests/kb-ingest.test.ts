import { describe, it, expect } from 'vitest'
import { chunkPointId, planIngest, runIngest, runDocIngest } from '@/lib/kb/ingest'
import { parseKbDoc, chunkDoc } from '@/lib/kb/chunk'
import type { VectorStore, VectorPoint, StoredPoint } from '@/lib/kb/store'
import type { KbChunk, KbDocMeta } from '@/types/kb'

const meta = (id: string): KbDocMeta => ({
  id,
  title: id,
  category: 'university-official',
  university: 'NUS',
  topic: 'admissions',
  sourceUrls: [],
  lastVerified: '2026-06-12',
  refresh: 'quarterly',
  language: 'en',
})

const chunk = (docId: string, index: number): KbChunk => ({
  id: `${docId}#${index}`,
  docId,
  index,
  section: docId,
  text: `text ${docId} ${index}`,
  meta: meta(docId),
})

// ── chunkPointId ──────────────────────────────────────────────

describe('chunkPointId', () => {
  it('is a deterministic UUID for the same chunk id', () => {
    const a = chunkPointId('nus-admissions-routes#0')
    expect(a).toBe(chunkPointId('nus-admissions-routes#0'))
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('differs for different chunk ids', () => {
    expect(chunkPointId('a#0')).not.toBe(chunkPointId('a#1'))
  })
})

// ── planIngest ────────────────────────────────────────────────

describe('planIngest', () => {
  it('upserts every current chunk and deletes orphaned point ids', () => {
    const chunks = [chunk('doc-a', 0), chunk('doc-a', 1)]
    const existing = [chunkPointId('doc-a#0'), chunkPointId('doc-a#5'), chunkPointId('gone-doc#0')]
    const plan = planIngest(existing, chunks)
    expect(plan.upserts).toEqual(chunks)
    expect(plan.deletes.sort()).toEqual([chunkPointId('doc-a#5'), chunkPointId('gone-doc#0')].sort())
  })

  it('deletes nothing on a fresh store', () => {
    expect(planIngest([], [chunk('doc-a', 0)]).deletes).toEqual([])
  })
})

// ── runIngest (fake store + fake embedder) ────────────────────

class FakeStore implements VectorStore {
  points = new Map<string, VectorPoint>()
  ensured = 0
  async ensureCollection(): Promise<void> { this.ensured++ }
  async listIds(): Promise<string[]> { return Array.from(this.points.keys()) }
  async listDocs(): Promise<never[]> { return [] }
  async listIdsByDoc(docId: string): Promise<string[]> {
    return Array.from(this.points.values()).filter((p) => p.payload.docId === docId).map((p) => p.id)
  }
  async getDocChunks(): Promise<never[]> { return [] }
  async upsert(points: VectorPoint[]): Promise<void> {
    for (const p of points) this.points.set(p.id, p)
  }
  async deleteByIds(ids: string[]): Promise<void> {
    for (const id of ids) this.points.delete(id)
  }
  async search(): Promise<StoredPoint[]> { return [] }
}

const fakeEmbed = async (texts: string[]) => texts.map((t) => [t.length, 1, 2])

const RAW_DOC = `---
id: doc-a
title: "Doc A"
category: university-official
university: NUS
topic: admissions
source_urls: []
last_verified: "2026-06-12"
refresh: quarterly
language: en
---

Intro.

## Section

Body text.
`

describe('runIngest', () => {
  it('embeds all chunks and upserts them with payloads', async () => {
    const store = new FakeStore()
    const result = await runIngest([RAW_DOC], { store, embed: fakeEmbed })
    const { meta: m, body } = parseKbDoc(RAW_DOC)
    const expected = chunkDoc(m, body)
    expect(result.upserted).toBe(expected.length)
    expect(store.ensured).toBe(1)
    const point = store.points.get(chunkPointId('doc-a#0'))
    expect(point?.payload.chunkId).toBe('doc-a#0')
    expect(point?.payload.title).toBe('Doc A')
    expect(point?.vector).toHaveLength(3)
  })

  it('is idempotent and removes orphans when a doc shrinks', async () => {
    const store = new FakeStore()
    await runIngest([RAW_DOC], { store, embed: fakeEmbed })
    // Stale point from an older, longer version of the doc.
    await store.upsert([{ id: chunkPointId('doc-a#9'), vector: [0], payload: { chunkId: 'doc-a#9' } as never }])
    const result = await runIngest([RAW_DOC], { store, embed: fakeEmbed })
    expect(result.deleted).toBe(1)
    expect(store.points.has(chunkPointId('doc-a#9'))).toBe(false)
    expect(store.points.size).toBe(result.upserted)
  })
})

// ── runDocIngest (single-document, runtime ingest) ────────────

const OTHER_DOC = RAW_DOC.replace(/doc-a/g, 'doc-b').replace('Doc A', 'Doc B')

describe('runDocIngest', () => {
  it('replaces only the target doc, leaving other docs untouched', async () => {
    const store = new FakeStore()
    await runIngest([RAW_DOC, OTHER_DOC], { store, embed: fakeEmbed })
    const before = store.points.size
    // Stale extra chunk from an older version of doc-a.
    const staleId = chunkPointId('doc-a#9')
    await store.upsert([{ id: staleId, vector: [0], payload: { chunkId: 'doc-a#9', docId: 'doc-a' } as never }])

    const result = await runDocIngest(RAW_DOC, { store, embed: fakeEmbed })
    expect(result.docId).toBe('doc-a')
    expect(result.deleted).toBe(1)
    expect(store.points.has(staleId)).toBe(false)
    expect(store.points.size).toBe(before)
    expect(await store.listIdsByDoc('doc-b')).not.toHaveLength(0)
  })

  it('rejects a document with invalid frontmatter', async () => {
    const store = new FakeStore()
    await expect(runDocIngest('no frontmatter here', { store, embed: fakeEmbed }))
      .rejects.toThrow(/frontmatter/)
  })
})
