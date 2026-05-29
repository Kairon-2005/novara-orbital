// POST /api/universities/gap
// AI evaluates the gap between the student's current profile + achievements
// and a target university, then persists the result on the target row.

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/db/server'
import { analyseTargetGap } from '@/lib/ai'

interface Body { targetId: string }

export async function POST(request: Request) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { targetId } = await request.json() as Body
  if (!targetId) return NextResponse.json({ error: 'targetId is required' }, { status: 400 })

  // Ownership check — only analyse the requester's own target
  const { data: target } = await supabase
    .from('university_targets')
    .select('id, name, country, programme, requirements')
    .eq('id', targetId)
    .eq('student_id', user.id)
    .maybeSingle()

  if (!target) return NextResponse.json({ error: 'Target not found' }, { status: 404 })

  const [{ data: sp }, { data: achievements }] = await Promise.all([
    supabase.from('student_profiles')
      .select('current_year, current_school, current_curriculum, english_level, interests')
      .eq('user_id', user.id).maybeSingle(),
    supabase.from('achievements')
      .select('category, title').eq('student_id', user.id),
  ])

  try {
    const gap = await analyseTargetGap({
      university:   target.name,
      country:      target.country ?? '',
      programme:    target.programme ?? '',
      requirements: target.requirements ?? '',
      profile: {
        currentYear:   sp?.current_year       ?? '',
        currentSchool: sp?.current_school      ?? '',
        curriculum:    sp?.current_curriculum  ?? '',
        englishLevel:  sp?.english_level       ?? '',
        interests:     sp?.interests           ?? '',
      },
      achievements: achievements ?? [],
    })

    await supabase.from('university_targets').update({
      gap_score:      gap.score,
      gap_analysis:   JSON.stringify({ summary: gap.summary, strengths: gap.strengths, gaps: gap.gaps }),
      gap_updated_at: new Date().toISOString(),
    }).eq('id', targetId)

    return NextResponse.json({ gap })
  } catch (err) {
    console.error('[universities/gap]', err)
    return NextResponse.json({ error: 'AI analysis failed. Please try again.' }, { status: 500 })
  }
}
