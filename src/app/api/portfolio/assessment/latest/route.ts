// GET /api/portfolio/assessment/latest
// Returns the student's most recent assessment result (or null).

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { getLatestAssessment } from '@/lib/data'

export async function GET() {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const assessment = await getLatestAssessment(supabase, user.id)
  return NextResponse.json({ assessment })
}
