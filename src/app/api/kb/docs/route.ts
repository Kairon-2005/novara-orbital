// GET /api/kb/docs — list all knowledge-base documents (for the wiki reader).

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { qdrantConfigured, QdrantStore, isClusterUnreachable } from '@/lib/kb/store'

export async function GET() {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  if (!qdrantConfigured()) return NextResponse.json({ configured: false, docs: [] })

  try {
    const docs = await new QdrantStore().listDocs()
    docs.sort((a, b) => a.title.localeCompare(b.title))
    return NextResponse.json({ configured: true, docs })
  } catch (err) {
    console.error('[kb/docs]', err)

    // A suspended or restarting cluster is an operational state, not a bug in
    // the page — say so plainly instead of surfacing a raw Qdrant 404.
    if (isClusterUnreachable(err)) {
      return NextResponse.json({ configured: true, unavailable: true, docs: [] }, { status: 503 })
    }

    const detail = err instanceof Error ? err.message : 'unknown error'
    // Surface enough detail to distinguish "collection missing" (run kb:ingest)
    // from bad credentials/URL, without leaking secrets.
    return NextResponse.json({ error: `Failed to list documents: ${detail.slice(0, 200)}` }, { status: 500 })
  }
}
