// POST /api/kb/search
// Searches the knowledge base (Qdrant) and returns hits with citations.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { searchKb } from '@/lib/kb/retrieve'
import { formatCitations } from '@/lib/kb/context'
import type { KbFilters } from '@/types/kb'

interface Body {
  query: string
  university?: string
  category?: string
  topic?: string
  limit?: number
}

export async function POST(request: Request) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json() as Body
  if (!body.query?.trim()) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })
  }

  const filters: KbFilters = {
    university: body.university === 'NUS' || body.university === 'NTU' ? body.university : undefined,
    category: ['university-official', 'pathway', 'general-guide', 'experience'].includes(body.category ?? '')
      ? (body.category as KbFilters['category'])
      : undefined,
    topic: body.topic?.trim() || undefined,
    limit: typeof body.limit === 'number' ? Math.min(Math.max(1, body.limit), 20) : undefined,
  }

  try {
    const hits = await searchKb(body.query.trim(), filters)
    return NextResponse.json({ hits, citations: formatCitations(hits) })
  } catch (err) {
    console.error('[kb/search]', err)
    return NextResponse.json({ error: 'Knowledge base search failed' }, { status: 500 })
  }
}
