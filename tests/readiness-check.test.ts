import { describe, it, expect } from 'vitest'
import { checkSubmissionReadiness } from '@/lib/readiness-check'
import type { ApplicationPlan } from '@/lib/university-plan'

const TODAY = '2026-07-21'

const plan = (over: Partial<ApplicationPlan> = {}): ApplicationPlan => ({
  applicationWindow: { opens: '2026-10-15', closes: '2027-02-21' },
  deadlines: [{ date: '2027-02-21', title: 'Application closes' }],
  documents: [
    { id: 'd1', title: 'Transcript', required: true, done: true },
    { id: 'd2', title: 'Personal statement', required: true, done: true },
    { id: 'd3', title: 'CCA records', required: false, done: false },
  ],
  sources: [{ url: 'https://nus.edu.sg/oam' }],
  verified: true,
  notes: null,
  ...over,
})

const base = {
  uploadedDocs: [
    { fileName: 'transcript_2026.pdf', fileType: 'transcript' },
    { fileName: 'personal-statement-v3.pdf', fileType: 'application' },
  ],
  calendarEvents: [{ title: 'NUS application closes', date: '2027-02-21' }],
  profile: { curriculum: 'IB', englishLevel: 'IELTS 7.0', targetYear: '2027' },
  today: TODAY,
}

describe('checkSubmissionReadiness', () => {
  it('all requirements met → ready, no missing items', () => {
    const r = checkSubmissionReadiness({ plan: plan(), ...base })
    expect(r.ready).toBe(true)
    expect(r.items.filter(i => i.status === 'missing')).toEqual([])
  })

  it('an unchecked required document blocks readiness', () => {
    const p = plan()
    p.documents = p.documents.map(d => d.id === 'd1' ? { ...d, done: false } : d)
    const r = checkSubmissionReadiness({ plan: p, ...base })
    expect(r.ready).toBe(false)
    expect(r.items.find(i => i.status === 'missing')?.label).toContain('Transcript')
  })

  it('a checked-off document with no matching upload warns but does not block', () => {
    const r = checkSubmissionReadiness({ plan: plan(), ...base, uploadedDocs: [] })
    expect(r.ready).toBe(true)
    expect(r.items.some(i => i.status === 'warning' && i.label.includes('Transcript'))).toBe(true)
  })

  it('a passed deadline blocks readiness', () => {
    const r = checkSubmissionReadiness({
      plan: plan({ applicationWindow: { opens: '2025-10-01', closes: '2026-02-01' }, deadlines: [{ date: '2026-02-01', title: 'closed' }] }),
      ...base,
    })
    expect(r.ready).toBe(false)
    expect(r.items.some(i => i.status === 'missing' && i.id === 'deadline_passed')).toBe(true)
  })

  it('deadline missing from the calendar and an ungrounded plan are warnings', () => {
    const r = checkSubmissionReadiness({ plan: plan({ verified: false }), ...base, calendarEvents: [] })
    expect(r.ready).toBe(true)
    expect(r.items.some(i => i.id === 'deadline_not_on_calendar' && i.status === 'warning')).toBe(true)
    expect(r.items.some(i => i.id === 'plan_unverified' && i.status === 'warning')).toBe(true)
  })

  it('incomplete profile blocks; no plan at all is its own missing item', () => {
    const r = checkSubmissionReadiness({ plan: plan(), ...base, profile: { curriculum: null, englishLevel: null, targetYear: '2027' } })
    expect(r.ready).toBe(false)
    expect(r.items.some(i => i.id === 'profile_incomplete' && i.status === 'missing')).toBe(true)

    const noPlan = checkSubmissionReadiness({ plan: null, ...base })
    expect(noPlan.ready).toBe(false)
    expect(noPlan.items.some(i => i.id === 'no_plan')).toBe(true)
  })
})
