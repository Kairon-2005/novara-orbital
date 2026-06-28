import { describe, it, expect } from 'vitest'
import { buildCheckerMessages, type AssessmentInput } from '@/lib/assessor'
import { normalizeRubric } from '@/lib/rubric'
import { ADMISSION_DIMENSIONS } from '@/types/assessment'

// The checker scores strictly against a given Rubric — no knowledge base. Its
// prompt is assembled by the pure buildCheckerMessages, so we can pin exactly
// what reaches the model without driving the model.

const TARGET = { university: 'NUS', programme: 'Computer Science', route: 'A-Level' }
const NOW = '2026-06-28T00:00:00Z'

const RUBRIC = normalizeRubric(
  {
    dimensions: ADMISSION_DIMENSIONS.map(d => ({
      dimensionId: d.id,
      bands: [{ level: 'strong', descriptor: `${d.id} strong looks like X` }],
      gapCriteria: [`${d.id} gap one`],
    })),
  },
  TARGET,
  NOW,
)

const INPUT: AssessmentInput = {
  target: { university: 'NUS', programme: 'Computer Science' },
  profile: { currentYear: 'Year 12', currentSchool: 'ACS', curriculum: 'A-Level', englishLevel: 'IELTS 7', interests: 'AI' },
  achievements: [{ category: 'competition', title: 'SMO Gold' }],
  evidence: [{ type: 'transcript', summary: 'straight As', dimensions: ['academic_strength'], relevance: 'high' }],
}

describe('buildCheckerMessages', () => {
  it('renders the rubric bands, score ranges and gap criteria into the system prompt', () => {
    const system = buildCheckerMessages(INPUT, RUBRIC)
      .filter(m => m.role === 'system')
      .map(m => m.content)
      .join('\n')

    expect(system).toContain('academic_strength strong looks like X') // band descriptor
    expect(system).toContain('81-100')                                // strong score range
    expect(system).toContain('academic_strength gap one')             // gap criteria
  })

  it('puts the student portfolio in the user message', () => {
    const user = buildCheckerMessages(INPUT, RUBRIC).find(m => m.role === 'user')!
    expect(user.content).toContain('SMO Gold')
  })
})
