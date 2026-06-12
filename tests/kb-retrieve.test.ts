import { describe, it, expect } from 'vitest'
import { searchKbWith } from '@/lib/kb/retrieve'
import type { VectorStore, StoredPoint, KbPointPayload, SearchFilter } from '@/lib/kb/store'

const payload = (over: Partial<KbPointPayload> = {}): KbPointPayload => ({
  chunkId: 'nus-admissions-routes#1',
  docId: 'nus-admissions-routes',
  title: 'NUS Admissions Routes',
  section: 'NUS Admissions Routes > Gaokao route',
  text: 'Gaokao applicants need IELTS 6.5.',
  category: 'university-official',
  university: 'NUS',
  topic: 'admissions',
  sourceUrls: ['https://www.nus.edu.sg/oam/x'],
  lastVerified: '2026-06-12',
  ...over,
})

class StubStore implements VectorStore {
  lastSearch: { limit: number; filter?: SearchFilter } | null = null
  constructor(private results: StoredPoint[] = [], private fail = false) {}
  async ensureCollection(): Promise<void> {}
  async listIds(): Promise<string[]> { return [] }
  async listDocs(): Promise<never[]> { return [] }
  async listIdsByDoc(): Promise<string[]> { return [] }
  async getDocChunks(): Promise<never[]> { return [] }
  async upsert(): Promise<void> {}
  async deleteByIds(): Promise<void> {}
  async search(_v: number[], opts: { limit: number; filter?: SearchFilter }): Promise<StoredPoint[]> {
    if (this.fail) throw new Error('store down')
    this.lastSearch = opts
    return this.results
  }
}

const stubEmbed = async (texts: string[]) => texts.map(() => [0.1, 0.2])

describe('searchKbWith', () => {
  it('maps store results to KbSearchHits', async () => {
    const store = new StubStore([{ id: 'p1', score: 0.9, payload: payload() }])
    const hits = await searchKbWith('gaokao requirements', {}, { store, embed: stubEmbed })
    expect(hits).toEqual([{
      chunkId: 'nus-admissions-routes#1',
      docId: 'nus-admissions-routes',
      title: 'NUS Admissions Routes',
      section: 'NUS Admissions Routes > Gaokao route',
      text: 'Gaokao applicants need IELTS 6.5.',
      score: 0.9,
      sourceUrls: ['https://www.nus.edu.sg/oam/x'],
      lastVerified: '2026-06-12',
    }])
  })

  it('passes filters and defaults the limit to 6', async () => {
    const store = new StubStore()
    await searchKbWith('q', { university: 'NTU', topic: 'fees' }, { store, embed: stubEmbed })
    expect(store.lastSearch).toEqual({ limit: 6, filter: { university: 'NTU', category: undefined, topic: 'fees' } })
  })

  it('respects an explicit limit', async () => {
    const store = new StubStore()
    await searchKbWith('q', { limit: 2 }, { store, embed: stubEmbed })
    expect(store.lastSearch?.limit).toBe(2)
  })

  it('returns [] when the store fails (graceful degradation)', async () => {
    const store = new StubStore([], true)
    await expect(searchKbWith('q', {}, { store, embed: stubEmbed })).resolves.toEqual([])
  })

  it('returns [] for a blank query without calling the store', async () => {
    const store = new StubStore([{ id: 'p1', score: 1, payload: payload() }])
    await expect(searchKbWith('   ', {}, { store, embed: stubEmbed })).resolves.toEqual([])
    expect(store.lastSearch).toBeNull()
  })
})
