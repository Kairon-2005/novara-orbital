// DELETE /api/admin/kb/docs  { docId }  — admin removes a KB doc's chunks from the store.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { requireAdmin } from '@/lib/admin/guard'
import { qdrantConfigured, QdrantStore } from '@/lib/kb/store'

export async function DELETE(request: Request) {
  const supabase = createRouteClient()
  const gate = await requireAdmin(supabase)
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const { docId } = await request.json().catch(() => ({})) as { docId?: string }
  if (!docId) return NextResponse.json({ error: 'docId is required' }, { status: 400 })
  if (!qdrantConfigured()) return NextResponse.json({ ok: false, reason: 'kb-not-configured' })

  const store = new QdrantStore()
  const ids = await store.listIdsByDoc(docId)
  if (ids.length > 0) await store.deleteByIds(ids)
  return NextResponse.json({ ok: true, removed: ids.length })
}
