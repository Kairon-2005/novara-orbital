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

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; NovaraKBRefresh/1.0)' },
    })
    if (!res.ok) return null
    return await res.text()
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
  console.log(`Checking ${urls.length} source URLs across ${files.length} documents...\n`)

  const next: Record<string, string> = {}
  const failed: string[] = []
  for (const url of urls) {
    const html = await fetchText(url)
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

  if (failed.length > 0) {
    console.log(`⚠ Unreachable (${failed.length}) — check manually (may be bot-blocked):`)
    for (const url of failed) console.log(`  - ${url}`)
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
