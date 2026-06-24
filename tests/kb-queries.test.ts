import { describe, it, expect } from 'vitest'
import { buildRoadmapKbQuery, buildAssessmentKbQuery, kbFiltersForTarget, kbContextMessage } from '@/lib/kb/queries'

describe('kbFiltersForTarget', () => {
  it('filters to the detected university', () => {
    expect(kbFiltersForTarget('NUS')).toEqual({ university: 'NUS', limit: 5 })
    expect(kbFiltersForTarget('Nanyang Technological University')).toEqual({ university: 'NTU', limit: 5 })
  })

  it('uses no university filter for "Both" or unknown targets', () => {
    expect(kbFiltersForTarget('Both')).toEqual({ university: undefined, limit: 5 })
    expect(kbFiltersForTarget('')).toEqual({ university: undefined, limit: 5 })
  })
})

describe('buildRoadmapKbQuery', () => {
  it('combines target, programme and curriculum into a retrieval query', () => {
    const q = buildRoadmapKbQuery({
      targetUniversity: 'NUS',
      targetProgramme: 'Computer Science',
      currentCurriculum: 'IB',
    })
    expect(q).toContain('NUS')
    expect(q).toContain('Computer Science')
    expect(q).toContain('IB')
    expect(q).toContain('deadlines')
  })

  it('tolerates missing fields', () => {
    const q = buildRoadmapKbQuery({})
    expect(q).toContain('admission')
    expect(q).not.toContain('undefined')
  })
})

describe('buildAssessmentKbQuery', () => {
  it('targets prerequisites and grade profile for the programme', () => {
    const q = buildAssessmentKbQuery({ university: 'NTU', programme: 'Data Science and AI' })
    expect(q).toContain('NTU')
    expect(q).toContain('Data Science and AI')
    expect(q).toContain('prerequisites')
  })
})

describe('kbContextMessage', () => {
  it('wraps a context block with a grounding instruction', () => {
    const msg = kbContextMessage('KNOWLEDGE BASE CONTEXT:\n\n[1] facts')
    expect(msg).toContain('[1] facts')
    expect(msg.toLowerCase()).toContain('verified')
  })

  it('returns empty string for empty context', () => {
    expect(kbContextMessage('')).toBe('')
  })
})
