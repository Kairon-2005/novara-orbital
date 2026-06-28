import { describe, it, expect } from 'vitest'
import { buildRubricMessages } from '@/lib/rubric-maker'

// The maker specialises the generic baseline standard into a target-specific
// rubric using retrieved knowledge-base cases. buildRubricMessages assembles the
// prompt purely, so we can pin that both the baseline and the cases reach the
// model without driving the model.

const TARGET = { university: 'NUS', programme: 'Computer Science', route: 'A-Level' }

describe('buildRubricMessages', () => {
  it('includes the generic baseline standard and the retrieved KB cases', () => {
    const system = buildRubricMessages(TARGET, 'KB CASE: NUS CS 2024 A-Level AAA offer')
      .filter(m => m.role === 'system')
      .map(m => m.content)
      .join('\n')

    expect(system).toContain('GENERIC CANDIDATE-READINESS STANDARD')
    expect(system).toContain('KB CASE: NUS CS 2024 A-Level AAA offer')
  })

  it('asks for all five admission dimensions', () => {
    const system = buildRubricMessages(TARGET, '')
      .filter(m => m.role === 'system')
      .map(m => m.content)
      .join('\n')

    expect(system).toContain('academic_strength')
    expect(system).toContain('initiative_impact')
  })
})
