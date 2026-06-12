// CLI: npm run kb:refresh [-- --update]
// Offline editorial tool for the quarterly content refresh: fetches every
// source_url referenced by content/kb/*.md, fingerprints the visible text and
// diffs against content/kb/.snapshots.json. "changed" URLs are pages that
// moved since the docs were last verified — review those docs, update facts
// and last_verified, then run with --update to accept the new snapshot.
// This never runs in the request path (see PRD §6: runtime is retrieval-only).

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const SNAPSHOT_FILE = 'content/kb/.snapshots.json'
const FETCH_TIMEOUT_MS = 20_000

// Realistic browser headers — paired with impit's Chrome TLS fingerprint this
// passes the TLS/header layer of most anti-bot gates (Imperva/Incapsula on
// nus.edu.sg blocked plain fetch). Heavier JS challenges remain "unreachable"
// by design — those few URLs get checked by a human.
const BROWSER_HEADERS = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'upgrade-insecure-requests': '1',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
}

const looksBlocked = (status: number, body: string) =>
  status === 403 || status === 503 ||
  /_Incapsula_Resource|cf-challenge|just a moment|access denied/i.test(body.slice(0, 3000))

// Login-walled / anti-bot-hardened domains where automated checking is
// pointless — these are listed separately instead of polluting "unreachable".
const MANUAL_CHECK_DOMAINS = [
  'zhihu.com', 'zhuanlan.zhihu.com', 'reddit.com', 'bbs.gter.net',
  'quora.com', '1point3acres.com', 'xiaohongshu.com',
]
const needsManualCheck = (url: string) => {
  try {
    const host = new URL(url).hostname
    return MANUAL_CHECK_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))
  } catch {
    return false
  }
}

type Fetcher = { fetch: (url: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }> }

async function makeImpit(): Promise<Fetcher | null> {
  try {
    const { Impit } = await import('impit')
    return new Impit({ browser: 'chrome', timeout: FETCH_TIMEOUT_MS, followRedirects: true }) as unknown as Fetcher
  } catch {
    return null // impit not installed for this platform — plain fetch only
  }
}

async function fetchText(url: string, impit: Fetcher | null): Promise<string | null> {
  // Tier 1: Chrome-impersonated TLS via impit.
  if (impit) {
    try {
      const res = await impit.fetch(url, { headers: BROWSER_HEADERS })
      const body = await res.text()
      if (res.ok && !looksBlocked(res.status, body)) return body
    } catch { /* fall through to plain fetch */ }
  }
  // Tier 2: plain fetch (works for unprotected pages and as a fallback).
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { ...BROWSER_HEADERS, 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
    })
    const body = await res.text()
    if (!res.ok || looksBlocked(res.status, body)) return null
    return body
  } catch {
    return null
  }
}

async function main() {
  const { parseKbDoc } = await import('../src/lib/kb/chunk')
  const { stripHtml, contentFingerprint, compareSnapshots } = await import('../src/lib/kb/refresh')
  const update = process.argv.includes('--update')

  const dir = resolve(process.cwd(), 'content/kb')
  const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort()

  // url → docs that cite it
  const urlDocs = new Map<string, string[]>()
  for (const file of files) {
    const { meta } = parseKbDoc(readFileSync(join(dir, file), 'utf8'))
    for (const url of meta.sourceUrls) {
      urlDocs.set(url, [...(urlDocs.get(url) ?? []), meta.id])
    }
  }

  const urls = Array.from(urlDocs.keys())
  const impit = await makeImpit()
  console.log(`Checking ${urls.length} source URLs across ${files.length} documents` +
    `${impit ? ' (Chrome TLS impersonation via impit)' : ' (plain fetch — impit unavailable)'}...\n`)

  const next: Record<string, string> = {}
  const failed: string[] = []
  const manual: string[] = []
  for (const url of urls) {
    if (needsManualCheck(url)) {
      manual.push(url)
      continue
    }
    const html = await fetchText(url, impit)
    if (html === null) {
      failed.push(url)
      continue
    }
    next[url] = contentFingerprint(stripHtml(html))
  }

  const snapshotPath = resolve(process.cwd(), SNAPSHOT_FILE)
  const prev: Record<string, string> = existsSync(snapshotPath)
    ? JSON.parse(readFileSync(snapshotPath, 'utf8'))
    : {}

  const diff = compareSnapshots(prev, next)

  if (manual.length > 0) {
    console.log(`○ Login-walled sources skipped (${manual.length}) — community citations, no automated check possible.`)
  }
  if (failed.length > 0) {
    console.log(`⚠ Unreachable (${failed.length}) — check manually (may be bot-blocked):`)
    for (const url of failed) console.log(`  - ${url}\n    cited by: ${urlDocs.get(url)?.join(', ')}`)
    console.log()
  }
  if (diff.changed.length > 0) {
    console.log(`✦ CHANGED since last snapshot (${diff.changed.length}) — review these docs:`)
    for (const url of diff.changed) console.log(`  - ${url}\n    cited by: ${urlDocs.get(url)?.join(', ')}`)
    console.log()
  }
  if (diff.added.length > 0) console.log(`+ New URLs snapshotted: ${diff.added.length}`)
  console.log(`= Unchanged: ${diff.unchanged.length}`)

  if (update) {
    writeFileSync(snapshotPath, `${JSON.stringify({ ...prev, ...next }, null, 2)}\n`)
    console.log(`\nSnapshot written to ${SNAPSHOT_FILE}.`)
  } else if (diff.changed.length > 0 || Object.keys(prev).length === 0) {
    console.log('\nRun with --update after reviewing to accept the new snapshot.')
  }

  if (diff.changed.length > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
