// GET /api/kb/docs/[docId] — one knowledge-base document, rebuilt from its
// ingested chunks (the wiki shows exactly what the AI retrieves from).

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { qdrantConfigured, QdrantStore } from '@/lib/kb/store'
import { assembleDoc } from '@/lib/kb/wiki'

export async function GET(_req: Request, { params }: { params: { docId: string } }) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  if (!qdrantConfigured()) {
    return NextResponse.json({ error: 'Knowledge base is not configured' }, { status: 503 })
  }

  try {
    const doc = assembleDoc(await new QdrantStore().getDocChunks(params.docId))
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    return NextResponse.json({ doc })
  } catch (err) {
    console.error('[kb/docs/:docId]', err)
    return NextResponse.json({ error: 'Failed to load document' }, { status: 500 })
  }
}
