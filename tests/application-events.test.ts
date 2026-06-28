import { describe, it, expect } from 'vitest'
import { planToProposedEvents, dedupeAgainstExisting } from '@/lib/application-events'
import type { ApplicationPlan } from '@/lib/university-plan'

const plan = (over: Partial<ApplicationPlan> = {}): ApplicationPlan => ({
  applicationWindow: { opens: '2026-08-01', closes: '2026-11-30' },
  deadlines: [{ date: '2026-10-15', title: 'UCAS deadline', description: 'Submit form' }],
  documents: [],
  sources: [{ url: 'https://nus.edu.sg/oam' }],
  verified: true,
  notes: null,
  ...over,
})

describe('planToProposedEvents', () => {
  it('maps each deadline to an application event carrying the source URL', () => {
    const events = planToProposedEvents(plan(), 'NUS')
    expect(events).toContainEqual({
      title: 'UCAS deadline', date: '2026-10-15', type: 'application',
      notes: 'Submit form', sourceUrl: 'https://nus.edu.sg/oam',
    })
  })

  it('synthesizes a submit-all milestone at the application window close, sorted by date', () => {
    const events = planToProposedEvents(plan(), 'NUS')
    const submitAll = events.find((e) => e.title === 'Submit all application materials — NUS')
    expect(submitAll?.date).toBe('2026-11-30')
    expect(events.map((e) => e.date)).toEqual(['2026-10-15', '2026-11-30']) // sorted
  })

  it('uses the latest deadline for the submit-all milestone when there is no window', () => {
    const events = planToProposedEvents(plan({
      applicationWindow: null,
      deadlines: [
        { date: '2026-09-01', title: 'Portfolio due' },
        { date: '2026-10-15', title: 'UCAS deadline' },
      ],
    }), 'NTU')
    expect(events.find((e) => e.title.startsWith('Submit all'))?.date).toBe('2026-10-15')
  })

  it('returns nothing for an empty plan', () => {
    expect(planToProposedEvents(plan({ applicationWindow: null, deadlines: [], sources: [] }), 'NUS')).toEqual([])
  })
})

describe('dedupeAgainstExisting', () => {
  it('drops proposed events already on the calendar (same date + title)', () => {
    const proposed = planToProposedEvents(plan(), 'NUS')
    const kept = dedupeAgainstExisting(proposed, [{ date: '2026-10-15', title: 'UCAS deadline' }])
    expect(kept.some((e) => e.title === 'UCAS deadline')).toBe(false)
    expect(kept.some((e) => e.title.startsWith('Submit all'))).toBe(true)
  })
})
