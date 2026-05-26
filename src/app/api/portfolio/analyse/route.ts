// POST /api/portfolio/analyse
// Calls Qwen AI to score the student's portfolio and identify gaps.

import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { analysePortfolio } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const supabase = createRouteClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let achievements: { category: string; title: string; description: string }[]
  let targetProgramme: string

  try {
    const body = await req.json() as {
      achievements: { category: string; title: string; description: string }[]
      targetProgramme: string
    }
    achievements    = body.achievements   ?? []
    targetProgramme = body.targetProgramme ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Simple benchmark placeholder — in production this could come from a DB table
  const benchmarkData = {
    note: 'Singapore top-tier university entry benchmark for international students',
    typicalProfile: {
      competitions: '≥1 national-level award',
      cca: '2+ years leadership role',
      community: '50+ volunteer hours',
      language: 'IELTS 7.0+ or equivalent',
    },
  }

  try {
    const result = await analysePortfolio(achievements, targetProgramme, benchmarkData)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[portfolio/analyse]', err)
    return NextResponse.json({ error: 'AI analysis failed. Please try again.' }, { status: 500 })
  }
}
