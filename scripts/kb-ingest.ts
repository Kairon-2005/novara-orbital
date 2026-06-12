// CLI: npm run kb:ingest
// Ingests every content/kb/*.md document into Qdrant (chunk → embed → upsert,
// idempotent; orphaned chunks are removed). Requires QDRANT_URL, QDRANT_API_KEY
// and QWEN_API_KEY (read from .env.local if present).

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Load .env.local without a dotenv dependency (controlled KEY=value lines).
function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

async function main() {
  loadEnvLocal()
  // Import after env is loaded — these modules read process.env at module scope.
  const { runIngest } = await import('../src/lib/kb/ingest')
  const { QdrantStore, qdrantConfigured } = await import('../src/lib/kb/store')
  const { embedTexts } = await import('../src/lib/kb/embed')

  if (!qdrantConfigured()) {
    console.error('kb:ingest needs QDRANT_URL and QDRANT_API_KEY (in .env.local or the environment).')
    process.exit(1)
  }
  if (!process.env.QWEN_API_KEY) {
    console.error('kb:ingest needs QWEN_API_KEY for embeddings.')
    process.exit(1)
  }

  const dir = resolve(process.cwd(), 'content/kb')
  const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
  if (files.length === 0) {
    console.error(`No markdown documents found in ${dir}.`)
    process.exit(1)
  }
  console.log(`Ingesting ${files.length} documents from content/kb/ ...`)

  const rawDocs = files.map((f) => readFileSync(join(dir, f), 'utf8'))
  const result = await runIngest(rawDocs, { store: new QdrantStore(), embed: embedTexts })
  console.log(`Done: ${result.docs} docs, ${result.upserted} chunks upserted, ${result.deleted} orphans deleted.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
