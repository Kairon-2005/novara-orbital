import { describe, it, expect } from 'vitest'
import { buildProgressSnapshot, toPublicProgressCard } from '@/lib/progress'

const TODAY = '2026-07-21'

const emptyInputs = {
  student: { displayName: 'Li Wei' },
  milestones: [],
  targets: [],
  assessment: null,
  readinessScore: null,
  achievements: [],
  upcomingEvents: [],
  today: TODAY,
} as const

describe('buildProgressSnapshot', () => {
  it('produces a safe zeroed snapshot for a brand-new student', () => {
    const snap = buildProgressSnapshot({ ...emptyInputs })
    expect(snap.student.displayName).toBe('Li Wei')
    expect(snap.milestones).toEqual({ done: 0, total: 0, next: [] })
    expect(snap.applications).toEqual([])
    expect(snap.readiness).toBeNull()
    expect(snap.journey.pct).toBe(0)
    expect(snap.journey.stage.index).toBe(0)
    expect(snap.generatedAt).toBe(TODAY)
  })

  it('counts milestones and lists the next 3 incomplete ones by due date (undated last)', () => {
    const snap = buildProgressSnapshot({
      ...emptyInputs,
      milestones: [
        { title: 'Done one', dueDate: '2026-01-10', completed: true },
        { title: 'Undated', dueDate: null, completed: false },
        { title: 'Sept task', dueDate: '2026-09-01', completed: false },
        { title: 'Aug task', dueDate: '2026-08-01', completed: false },
        { title: 'Oct task', dueDate: '2026-10-01', completed: false },
      ],
    })
    expect(snap.milestones.done).toBe(1)
    expect(snap.milestones.total).toBe(5)
    expect(snap.milestones.next.map(m => m.title)).toEqual(['Aug task', 'Sept task', 'Oct task'])
  })

  it('surfaces real assessment dimensions and drives the journey off their average', () => {
    const snap = buildProgressSnapshot({
      ...emptyInputs,
      assessment: {
        overallLevel: 'on_track',
        overallSummary: 'Solid base.',
        dimensionScores: [
          { dimensionId: 'academic_strength', score: 80, level: 'competitive', reasoning: '', strengths: [], gaps: [], suggestedActions: [] },
          { dimensionId: 'programme_fit', score: 60, level: 'developing', reasoning: '', strengths: [], gaps: [], suggestedActions: [] },
        ],
        topStrengths: [], topGaps: [], recommendedNextSteps: [], confidence: 'medium',
      },
    })
    expect(snap.readiness).toEqual({
      overallLevel: 'on_track',
      dimensions: [
        { id: 'academic_strength', score: 80, level: 'competitive' },
        { id: 'programme_fit', score: 60, level: 'developing' },
      ],
    })
    expect(snap.journey.pct).toBe(70) // avg of 80/60 — not a synthesized number
  })

  it('never fabricates dimensions from the legacy readiness score', () => {
    const snap = buildProgressSnapshot({ ...emptyInputs, readinessScore: 55 })
    expect(snap.readiness).toBeNull()   // no assessment → say so, don't invent bars
    expect(snap.journey.pct).toBe(55)   // legacy score still drives the journey
  })

  it('lists application targets by deadline with days remaining', () => {
    const snap = buildProgressSnapshot({
      ...emptyInputs,
      targets: [
        { name: 'NUS', country: 'Singapore', programme: 'CS', status: 'applied', deadline: '2026-08-01' },
        { name: 'UCL', country: 'UK', programme: 'CS', status: 'researching', deadline: null },
        { name: 'NTU', country: 'Singapore', programme: 'CS', status: 'offer', deadline: '2026-07-25' },
      ],
    })
    expect(snap.applications.map(a => a.name)).toEqual(['NTU', 'NUS', 'UCL'])
    expect(snap.applications[0].daysLeft).toBe(4)
    expect(snap.applications[2].daysLeft).toBeNull()
  })

  it('keeps only future deadlines, annotated with days left, and recent achievements newest-first', () => {
    const snap = buildProgressSnapshot({
      ...emptyInputs,
      upcomingEvents: [
        { title: 'Past thing', date: '2026-07-01', type: 'application' },
        { title: 'Tomorrow', date: '2026-07-22', type: 'exam' },
      ],
      achievements: [
        { title: 'Old medal', category: 'competition', date: '2025-01-01' },
        { title: 'New medal', category: 'competition', date: '2026-06-01' },
      ],
    })
    expect(snap.upcomingDeadlines).toEqual([{ title: 'Tomorrow', date: '2026-07-22', type: 'exam', daysLeft: 1 }])
    expect(snap.recentAchievements.map(a => a.title)).toEqual(['New medal', 'Old medal'])
  })
})

describe('toPublicProgressCard', () => {
  it('exposes coarse progress only — readiness level without dimension scores', () => {
    const snap = buildProgressSnapshot({
      ...emptyInputs,
      milestones: [{ title: 'Secret task name', dueDate: '2026-08-01', completed: false }],
      targets: [{ name: 'NUS', country: 'Singapore', programme: 'CS', status: 'applied', deadline: '2026-08-01' }],
      assessment: {
        overallLevel: 'competitive',
        overallSummary: 'Private reasoning text.',
        dimensionScores: [
          { dimensionId: 'academic_strength', score: 82, level: 'strong', reasoning: 'private', strengths: [], gaps: [], suggestedActions: [] },
        ],
        topStrengths: [], topGaps: [], recommendedNextSteps: [], confidence: 'high',
      },
      upcomingEvents: [{ title: 'NUS deadline', date: '2026-08-01', type: 'application' }],
    })
    const card = toPublicProgressCard(snap)

    expect(card.student).toEqual({ displayName: 'Li Wei', targetUniversity: null })
    expect(card.readinessLevel).toBe('competitive')
    expect(card.applications).toEqual([{ name: 'NUS', country: 'Singapore', status: 'applied', deadline: '2026-08-01' }])
    expect(card.milestones).toEqual({ done: 0, total: 1 })
    expect(card.journey.stage.zh).toBeDefined()
    expect(card.upcomingDeadlines).toEqual([{ title: 'NUS deadline', date: '2026-08-01' }])
    // The privacy rule itself: nothing score- or reasoning-shaped survives.
    const flat = JSON.stringify(card)
    expect(flat).not.toContain('82')
    expect(flat).not.toContain('Private reasoning')
    expect(flat).not.toContain('Secret task name')
  })
})
