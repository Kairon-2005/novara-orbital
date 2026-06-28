import { describe, it, expect } from 'vitest'
import { pickBestText, createPageFetcher } from '@/lib/page-fetch'

const LONG = 'x'.repeat(300)

describe('pickBestText', () => {
  it('returns the first candidate over the length threshold', () => {
    expect(pickBestText([{ via: 'impit', text: LONG }, { via: 'reader', text: 'other' }]))
      .toEqual({ via: 'impit', text: LONG })
  })

  it('falls through a thin candidate to the next substantial one', () => {
    expect(pickBestText([{ via: 'impit', text: 'thin shell' }, { via: 'reader', text: LONG }]))
      .toEqual({ via: 'reader', text: LONG })
  })

  it('reports none when nothing is substantial', () => {
    expect(pickBestText([{ via: 'impit', text: '' }])).toEqual({ via: 'none', text: '' })
  })
})

describe('createPageFetcher', () => {
  it('uses tier-1 (impit) and skips the reader when tier-1 is substantial', async () => {
    let readerCalled = false
    const f = createPageFetcher({
      impitFetch: async () => LONG,
      readerFetch: async () => { readerCalled = true; return LONG },
    })
    const r = await f.fetchPageText('https://x')
    expect(r.via).toBe('impit')
    expect(readerCalled).toBe(false)
  })

  it('escalates to the reader when tier-1 is thin', async () => {
    const f = createPageFetcher({
      impitFetch: async () => 'thin',
      readerFetch: async () => LONG,
    })
    expect((await f.fetchPageText('https://x')).via).toBe('reader')
  })

  it('gives up (none) when the reader is disabled and tier-1 is thin', async () => {
    const f = createPageFetcher({ impitFetch: async () => 'thin', readerFetch: null })
    expect((await f.fetchPageText('https://x')).via).toBe('none')
  })

  it('survives a throwing fetcher', async () => {
    const f = createPageFetcher({
      impitFetch: async () => { throw new Error('blocked') },
      readerFetch: async () => LONG,
    })
    expect((await f.fetchPageText('https://x')).via).toBe('reader')
  })
})
