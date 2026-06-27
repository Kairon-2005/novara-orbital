import { describe, it, expect } from 'vitest'
import { parseMaterial } from '@/lib/community/parse'
import type { ChatJson } from '@/lib/community/verify'

describe('parseMaterial', () => {
  it('turns material text into a whitelisted draft via the injected model', async () => {
    const chat: ChatJson = async (_system, user) => {
      expect(user).toContain('NUS') // the material text is passed through as the user message
      return {
        level: 'undergraduate', institution: 'NUS', programme: 'Computer Science',
        route: 'IB', result: 'offer', applyYear: 2026, grades: 'IB 42/45',
        injected: 'should be dropped',
      }
    }
    const draft = await parseMaterial('I was admitted to NUS Computer Science.', chat)
    expect(draft.institution).toBe('NUS')
    expect(draft.route).toBe('IB')
    expect(draft.applyYear).toBe(2026)
    expect((draft as Record<string, unknown>).injected).toBeUndefined()
  })

  it('returns an empty draft when the model emits junk', async () => {
    const chat: ChatJson = async () => 'not json at all'
    expect(await parseMaterial('some text', chat)).toEqual({})
  })
})
