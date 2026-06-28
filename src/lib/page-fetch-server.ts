// Server-only concrete fetchers for the PageFetcher tiers. Kept out of page-fetch.ts
// so the tier logic stays unit-testable without loading native/network deps.
// See docs/PRD-app-assistant-calendar.md §5.1.

/** Naive HTML → text: drop scripts/styles/tags, collapse whitespace. Good enough to
 *  feed an LLM (it tolerates noise); avoids a readability/jsdom dependency. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Tier 1: browser-fingerprinted fetch via impit (local; beats basic bot-blocking). */
export async function impitFetchText(url: string): Promise<string> {
  const { Impit } = await import('impit')
  const impit = new Impit({ browser: 'chrome', timeout: 15_000 })
  const res = await impit.fetch(url)
  return htmlToText(await res.text())
}

/** Tier 2: Jina Reader (renders JS, returns markdown). Only the public URL is sent. */
export async function readerFetchText(url: string): Promise<string> {
  const res = await fetch(`https://r.jina.ai/${url}`, { signal: AbortSignal.timeout(20_000) })
  if (!res.ok) return ''
  return (await res.text()).trim()
}
