import { describe, it, expect } from 'vitest'
import { normalizeApplicationPlan, planProgress, toggleDocument } from '@/lib/university-plan'
import type { ApplicationPlan } from '@/lib/university-plan'

const RAW = {
  applicationWindow: { opens: '2026-12-03', closes: '2027-02-23' },
  deadlines: [
    { date: '2027-02-23', title: 'Application closes' },
    { date: '2027-03-05', title: 'Supporting documents due', description: 'Upload via applicant portal' },
  ],
  documents: [
    { title: 'High school transcript', required: true },
    { title: 'IELTS / TOEFL score', required: true },
    { title: 'Passport copy', required: false },
  ],
  sources: [{ url: 'https://www.nus.edu.sg/oam/admissions/important-dates', title: 'NUS important dates', lastVerified: '2026-06-12' }],
  verified: true,
}

describe('normalizeApplicationPlan', () => {
  it('normalizes a complete plan, assigning stable document ids and done=false', () => {
    const plan = normalizeApplicationPlan(RAW)
    expect(plan.applicationWindow).toEqual({ opens: '2026-12-03', closes: '2027-02-23' })
    expect(plan.deadlines).toHaveLength(2)
    expect(plan.documents.map((d) => d.id)).toEqual(['doc-0', 'doc-1', 'doc-2'])
    expect(plan.documents.every((d) => d.done === false)).toBe(true)
    expect(plan.verified).toBe(true)
    expect(plan.sources[0].url).toContain('nus.edu.sg')
  })

  it('drops malformed deadlines and documents instead of failing', () => {
    const plan = normalizeApplicationPlan({
      deadlines: [{ date: 'soon', title: 'Bad date' }, { date: '2027-01-15', title: 'Good' }, { title: 'No date' }],
      documents: [{ title: '' }, { title: 'Transcript' }, 'junk'],
      sources: [{ url: 'not-a-url' }, { url: 'https://ntu.edu.sg/x' }],
    })
    expect(plan.deadlines.map((d) => d.title)).toEqual(['Good'])
    expect(plan.documents.map((d) => d.title)).toEqual(['Transcript'])
    expect(plan.sources.map((s) => s.url)).toEqual(['https://ntu.edu.sg/x'])
    expect(plan.verified).toBe(false)
    expect(plan.applicationWindow).toBeNull()
  })

  it('returns an empty unverified plan for junk input', () => {
    const plan = normalizeApplicationPlan('garbage')
    expect(plan).toEqual({ applicationWindow: null, deadlines: [], documents: [], sources: [], verified: false, notes: null })
  })

  it('sorts deadlines chronologically', () => {
    const plan = normalizeApplicationPlan({
      deadlines: [{ date: '2027-03-01', title: 'B' }, { date: '2027-01-01', title: 'A' }],
    })
    expect(plan.deadlines.map((d) => d.title)).toEqual(['A', 'B'])
  })
})

describe('planProgress', () => {
  const plan = (done: boolean[]): ApplicationPlan => normalizeApplicationPlan({
    documents: done.map((_, i) => ({ title: `Doc ${i}` })),
  }) && {
    ...normalizeApplicationPlan({ documents: done.map((_, i) => ({ title: `Doc ${i}` })) }),
    documents: done.map((d, i) => ({ id: `doc-${i}`, title: `Doc ${i}`, required: true, done: d })),
  }

  it('computes done/total and percentage', () => {
    expect(planProgress(plan([true, false, false, true]))).toEqual({ done: 2, total: 4, pct: 50 })
  })

  it('handles an empty checklist', () => {
    expect(planProgress(plan([]))).toEqual({ done: 0, total: 0, pct: 0 })
  })
})

describe('toggleDocument', () => {
  it('flips exactly the targeted document', () => {
    const base = normalizeApplicationPlan(RAW)
    const toggled = toggleDocument(base, 'doc-1')
    expect(toggled.documents[1].done).toBe(true)
    expect(toggled.documents[0].done).toBe(false)
    expect(toggleDocument(toggled, 'doc-1').documents[1].done).toBe(false)
  })
})
