import { describe, it, expect } from 'vitest'
import { getOrMakeRubricWith } from '@/lib/data/rubrics'
import { normalizeRubric } from '@/lib/rubric'
import type { AssessmentRubric } from '@/types/rubric'

// The RubricStore caches a rubric per target so the maker runs once per target,
// not once per student. getOrMakeRubricWith is the pure orchestration over
// injected load/make/save seams — testable with fakes, no DB and no LLM.

const TARGET = { university: 'NUS', programme: 'Computer Science', route: 'A-Level' }
const sampleRubric = (): AssessmentRubric => normalizeRubric({}, TARGET, '2026-06-28T00:00:00Z')

describe('getOrMakeRubricWith', () => {
  it('returns the cached rubric without making one on a hit', async () => {
    let made = 0
    const cached = sampleRubric()
    const rubric = await getOrMakeRubricWith(TARGET, {
      load: async () => cached,
      make: async () => { made++; return sampleRubric() },
      save: async () => {},
    })
    expect(rubric).toBe(cached)
    expect(made).toBe(0)
  })

  it('makes and saves exactly once on a miss', async () => {
    let made = 0
    let saved: AssessmentRubric | null = null
    const fresh = sampleRubric()
    const rubric = await getOrMakeRubricWith(TARGET, {
      load: async () => null,
      make: async () => { made++; return fresh },
      save: async (r) => { saved = r },
    })
    expect(made).toBe(1)
    expect(saved).toBe(fresh)
    expect(rubric).toBe(fresh)
  })
})
