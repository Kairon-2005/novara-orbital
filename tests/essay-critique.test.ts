import { describe, it, expect } from 'vitest'
import { normalizeEssayFeedback, critiqueEssay, type EssayFeedback } from '@/lib/essay-critique'

const RAW: Record<string, unknown> = {
  overall: 'A promising draft with a generic middle.',
  structure: ['Opening anecdote works', 'Paragraph 3 repeats paragraph 2'],
  specificity: ['"I have always loved computers" — replace with a concrete moment'],
  evidenceAlignment: ['You claim leadership but never mention the SASMO team captaincy in your records'],
  cliches: ['"passion for learning"'],
  revisionPriorities: ['Cut paragraph 3', 'Open with the robotics failure story'],
}

describe('normalizeEssayFeedback', () => {
  it('whitelists the critique shape', () => {
    const fb = normalizeEssayFeedback(RAW)
    expect(fb.overall).toContain('promising')
    expect(fb.structure).toHaveLength(2)
    expect(fb.revisionPriorities[0]).toBe('Cut paragraph 3')
  })

  it('drops rewritten-prose fields — the integrity rule', () => {
    const fb = normalizeEssayFeedback({
      ...RAW,
      rewrite: 'Here is your improved essay: ...',
      revisedText: 'Full ghostwritten draft',
      improvedVersion: 'nope',
    }) as EssayFeedback & Record<string, unknown>
    expect(fb.rewrite).toBeUndefined()
    expect(fb.revisedText).toBeUndefined()
    expect(fb.improvedVersion).toBeUndefined()
  })

  it('truncates any bullet long enough to smuggle prose', () => {
    const fb = normalizeEssayFeedback({ ...RAW, structure: ['x'.repeat(2000)] })
    expect(fb.structure[0].length).toBeLessThanOrEqual(301)
  })

  it('tolerates malformed output', () => {
    const fb = normalizeEssayFeedback({ overall: 42, structure: 'not-an-array' })
    expect(fb.overall).toBe('')
    expect(fb.structure).toEqual([])
  })
})

describe('critiqueEssay', () => {
  it('sends the student context and returns normalized feedback', async () => {
    let seenSystem = '', seenUser = ''
    const fakeChat = async (system: string, user: string) => {
      seenSystem = system; seenUser = user
      return RAW
    }
    const fb = await critiqueEssay(fakeChat, {
      essay: { title: 'Why NUS CS', prompt: 'Why this course?', content: 'My essay...' },
      target: { university: 'NUS', programme: 'Computer Science' },
      achievements: [{ title: 'SASMO Gold', category: 'competition' }],
      assessmentSummary: 'on_track; weakest: communication_storytelling',
    })
    expect(seenSystem).toMatch(/never|不要|do not/i)      // the no-ghostwriting rule is in the prompt
    expect(seenUser).toContain('SASMO Gold')
    expect(seenUser).toContain('NUS')
    expect(fb.evidenceAlignment.length).toBeGreaterThan(0)
  })
})
