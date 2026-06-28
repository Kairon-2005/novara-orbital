// Layered page fetching for the application assistant. Pages that block scrapers
// degrade through tiers: impit (browser-fingerprinted, local) → a reader service
// (renders JS, env-gated) → give up (the UI then asks the user to paste/upload).
//
// Only the tier logic lives here, with the concrete fetchers injected, so it is
// unit-testable and free of native/network deps. The route supplies real adapters.
// See docs/PRD-app-assistant-calendar.md §5.1.

export type FetchVia = 'impit' | 'reader' | 'none'

export interface FetchResult {
  text: string
  via: FetchVia
}

/** A raw fetcher returns extracted page text, or '' when it can't. */
export type RawFetcher = (url: string) => Promise<string>

// Below this, a result is treated as a thin/empty SPA shell and we escalate.
const MIN_TEXT_LEN = 200

/** Pick the first candidate (in priority order) whose text clears the threshold. */
export function pickBestText(candidates: { via: FetchVia; text: string }[]): FetchResult {
  for (const c of candidates) {
    const text = c.text?.trim() ?? ''
    if (text.length >= MIN_TEXT_LEN) return { via: c.via, text }
  }
  return { via: 'none', text: '' }
}

export interface PageFetcherDeps {
  impitFetch: RawFetcher
  /** null/undefined disables the reader tier (e.g. READER_ENABLED unset). */
  readerFetch?: RawFetcher | null
}

export function createPageFetcher(deps: PageFetcherDeps) {
  const safe = (f: RawFetcher): RawFetcher => (url) => f(url).catch(() => '')
  return {
    async fetchPageText(url: string): Promise<FetchResult> {
      const candidates: { via: FetchVia; text: string }[] = []

      const impit = await safe(deps.impitFetch)(url)
      candidates.push({ via: 'impit', text: impit })

      // Only pay for the reader if tier-1 came back thin and the reader is enabled.
      if ((impit?.trim().length ?? 0) < MIN_TEXT_LEN && deps.readerFetch) {
        candidates.push({ via: 'reader', text: await safe(deps.readerFetch)(url) })
      }

      return pickBestText(candidates)
    },
  }
}
