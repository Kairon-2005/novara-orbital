// POST /api/universities/requirements
// Calls Qwen to fetch admission requirements for a given university + programme.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { fetchUniversityRequirements } from '@/lib/ai'

interface Body {
  name: string
  programme?: string
  country?: string
}

export async function POST(request: Request) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json() as Body
  const { name, programme = '', country = '' } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'University name is required' }, { status: 400 })
  }

  try {
    const requirements = await fetchUniversityRequirements(name.trim(), programme.trim(), country.trim())
    return NextResponse.json({ requirements })
  } catch (err) {
    console.error('[universities/requirements]', err)
    return NextResponse.json({ error: 'AI lookup failed. Please try again.' }, { status: 500 })
  }
}
