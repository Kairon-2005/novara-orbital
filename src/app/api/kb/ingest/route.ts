// POST /api/kb/ingest
// Admin path: ingest (or re-ingest) ONE markdown KB document at runtime,
// without a redeploy. Secured by KB_ADMIN_SECRET (falls back to CRON_SECRET).
// Body: { "document": "<markdown with YAML frontmatter>" }

import { NextResponse } from 'next/server'
import { runDocIngest } from '@/lib/kb/ingest'
import { qdrantConfigured, QdrantStore } from '@/lib/kb/store'
import { embedTexts } from '@/lib/kb/embed'

export async function POST(req: Request) {
  const secret = process.env.KB_ADMIN_SECRET || process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!qdrantConfigured()) {
    return NextResponse.json({ error: 'Knowledge base is not configured' }, { status: 503 })
  }

  const body = await req.json() as { document?: string }
  if (!body.document?.trim()) {
    return NextResponse.json({ error: 'document (markdown with frontmatter) is required' }, { status: 400 })
  }

  try {
    const result = await runDocIngest(body.document, { store: new QdrantStore(), embed: embedTexts })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ingest failed'
    const status = /frontmatter|no content/.test(message) ? 422 : 500
    console.error('[kb/ingest]', err)
    return NextResponse.json({ error: message }, { status })
  }
}
