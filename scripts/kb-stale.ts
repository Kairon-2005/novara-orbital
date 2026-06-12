// CLI: npm run kb:stale
// Lists content/kb/*.md documents whose last_verified is older than 90 days.

import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

async function main() {
  const { parseKbDoc } = await import('../src/lib/kb/chunk')
  const { staleDocs, DEFAULT_MAX_AGE_DAYS } = await import('../src/lib/kb/stale')

  const dir = resolve(process.cwd(), 'content/kb')
  const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
  const docs = files.map((f) => {
    const { meta } = parseKbDoc(readFileSync(join(dir, f), 'utf8'))
    return { id: meta.id, title: meta.title, lastVerified: meta.lastVerified }
  })

  const stale = staleDocs(docs, new Date())
  if (stale.length === 0) {
    console.log(`All ${docs.length} documents verified within ${DEFAULT_MAX_AGE_DAYS} days.`)
    return
  }
  console.log(`${stale.length}/${docs.length} documents need re-verification (>${DEFAULT_MAX_AGE_DAYS} days):\n`)
  for (const doc of stale) {
    console.log(`- ${doc.id}  (last verified ${doc.lastVerified}, ${doc.ageDays ?? '?'} days ago)`)
  }
  process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
