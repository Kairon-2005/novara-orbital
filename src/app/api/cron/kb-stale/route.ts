// GET /api/cron/kb-stale
// Weekly sweep: reports knowledge-base documents whose facts haven't been
// re-verified in 90+ days, reading doc metadata from Qdrant (the ingested
// corpus is the source of truth at runtime). Secured by CRON_SECRET; wired
// to a weekly Vercel Cron schedule in vercel.json.

import { NextResponse } from 'next/server'
import { qdrantConfigured, QdrantStore } from '@/lib/kb/store'
import { staleDocs } from '@/lib/kb/stale'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!qdrantConfigured()) {
    return NextResponse.json({ configured: false, stale: [] })
  }

  try {
    const docs = await new QdrantStore().listDocs()
    const stale = staleDocs(
      docs.map((d) => ({ id: d.docId, title: d.title, lastVerified: d.lastVerified })),
      new Date()
    )
    if (stale.length > 0) {
      console.warn('[cron/kb-stale] docs needing re-verification:', stale.map((d) => d.id).join(', '))
    }
    return NextResponse.json({ configured: true, total: docs.length, stale })
  } catch (err) {
    console.error('[cron/kb-stale]', err)
    return NextResponse.json({ error: 'Staleness check failed' }, { status: 500 })
  }
}
