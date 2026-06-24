import { describe, it, expect } from 'vitest'
import { detectKbUniversity, buildGroundedRequirementsPrompt } from '@/lib/kb/university'

describe('detectKbUniversity', () => {
  it('detects NUS by acronym, full name, and Chinese names', () => {
    expect(detectKbUniversity('NUS')).toBe('NUS')
    expect(detectKbUniversity('nus ')).toBe('NUS')
    expect(detectKbUniversity('National University of Singapore')).toBe('NUS')
    expect(detectKbUniversity('新加坡国立大学')).toBe('NUS')
    expect(detectKbUniversity('新国大')).toBe('NUS')
  })

  it('detects NTU by acronym, full name, and Chinese name', () => {
    expect(detectKbUniversity('NTU')).toBe('NTU')
    expect(detectKbUniversity('Nanyang Technological University')).toBe('NTU')
    expect(detectKbUniversity('南洋理工大学')).toBe('NTU')
  })

  it('does not match acronyms inside other words or other universities', () => {
    expect(detectKbUniversity('Venus University')).toBeNull()
    expect(detectKbUniversity('University of Cambridge')).toBeNull()
    expect(detectKbUniversity('Nanjing University')).toBeNull()
  })
})

describe('buildGroundedRequirementsPrompt', () => {
  it('embeds the context block and citation instruction', () => {
    const prompt = buildGroundedRequirementsPrompt('KNOWLEDGE BASE CONTEXT:\n\n[1] facts')
    expect(prompt).toContain('KNOWLEDGE BASE CONTEXT')
    expect(prompt).toContain('[1] facts')
    expect(prompt.toLowerCase()).toContain('cite')
    expect(prompt.toLowerCase()).toContain('not covered')
  })
})
