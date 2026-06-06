// POST /api/documents/classify  { id }
// On-demand classification of a single document. The client fires this in the
// background right after upload so the file is analysed without blocking the UI.
// RLS scopes the route client to the caller's own documents.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { classifyDocument } from '@/lib/classify-job'

export async function POST(req: Request) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await req.json() as { id?: string }
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  try {
    const classification = await classifyDocument(supabase, id)
    if (!classification) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    return NextResponse.json({ classification })
  } catch (err) {
    console.error('[documents/classify]', err)
    return NextResponse.json({ error: 'Classification failed' }, { status: 500 })
  }
}
