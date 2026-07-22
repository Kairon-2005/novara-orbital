import { describe, it, expect } from 'vitest'
import { normalizeGeneratedRoadmap } from '@/lib/ai'
import type { StudentProfile } from '@/types/roadmap'

const PROFILE: StudentProfile = {
  currentYear: 'Year 10',
  currentSchool: 'ACS International',
  currentCurriculum: 'IB',
  targetUniversity: 'NUS',
  targetProgramme: 'Computer Science',
  interests: 'Robotics',
  budgetRange: 'SGD 40-60k',
  englishLevel: 'Advanced',
}

describe('normalizeGeneratedRoadmap', () => {
  it('passes through a well-formed roadmap and attaches generatedFor', () => {
    const raw = {
      years: [
        {
          year: 2026,
          yearLabel: 'Year 10',
          keyMilestone: 'Build foundations',
          milestones: [
            { type: 'exam', title: 'IB mocks', description: 'Sit mocks', month: 4, dueDate: '2026-04-15' },
          ],
        },
      ],
    }
    const result = normalizeGeneratedRoadmap(raw, PROFILE)
    expect(result.years).toHaveLength(1)
    expect(result.years[0].milestones[0]).toEqual({
      type: 'exam', title: 'IB mocks', description: 'Sit mocks', month: 4, dueDate: '2026-04-15',
    })
    expect(result.generatedFor).toBe(PROFILE)
  })

  it('throws when the AI omits a years array', () => {
    expect(() => normalizeGeneratedRoadmap({ foo: 'bar' }, PROFILE)).toThrow(/years/)
  })

  it('throws when years is empty', () => {
    expect(() => normalizeGeneratedRoadmap({ years: [] }, PROFILE)).toThrow(/years/)
  })

  it('coerces an invalid milestone type to "other"', () => {
    const raw = { years: [{ year: 2026, milestones: [{ type: 'wildcard', title: 'Do a thing' }] }] }
    expect(normalizeGeneratedRoadmap(raw, PROFILE).years[0].milestones[0].type).toBe('other')
  })

  it('drops milestones with no title and tolerates a missing milestones array', () => {
    const raw = {
      years: [
        { year: 2026, milestones: [{ type: 'cca', title: '' }, { type: 'cca', title: 'Join debate' }] },
        { year: 2027 }, // no milestones array at all
      ],
    }
    const result = normalizeGeneratedRoadmap(raw, PROFILE)
    expect(result.years[0].milestones).toHaveLength(1)
    expect(result.years[0].milestones[0].title).toBe('Join debate')
    expect(result.years[1].milestones).toEqual([])
  })

  it('drops out-of-range months and coerces string years', () => {
    const raw = {
      years: [{ year: '2026', milestones: [{ type: 'exam', title: 'A-levels', month: 13 }] }],
    }
    const result = normalizeGeneratedRoadmap(raw, PROFILE)
    expect(result.years[0].year).toBe(2026)
    expect(result.years[0].milestones[0].month).toBeUndefined()
  })
})
