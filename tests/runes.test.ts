import { describe, it, expect } from 'vitest'
import { runeForType, RUNE_ELEMENTS } from '@/lib/runes'
import type { MilestoneType } from '@/types/models'

describe('runeForType', () => {
  it('maps each milestone type to its five-element rune', () => {
    expect(runeForType('academic').element).toBe('earth')
    expect(runeForType('exam').element).toBe('earth')
    expect(runeForType('competition').element).toBe('fire')
    expect(runeForType('cca').element).toBe('wood')
    expect(runeForType('application').element).toBe('metal')
    expect(runeForType('other').element).toBe('water')
  })

  it('returns a glyph and colour for the element', () => {
    const rune = runeForType('academic')
    expect(rune.glyph).toBe('土')
    expect(rune.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it('uses all five elements across the milestone types', () => {
    const types: MilestoneType[] = ['academic', 'exam', 'competition', 'cca', 'application', 'other']
    const elements = new Set(types.map(t => runeForType(t).element))
    expect(elements).toEqual(new Set(['wood', 'fire', 'earth', 'metal', 'water']))
  })

  it('exposes every element with a distinct glyph', () => {
    const glyphs = Object.values(RUNE_ELEMENTS).map(e => e.glyph)
    expect(new Set(glyphs).size).toBe(glyphs.length)
    expect(glyphs.length).toBe(5)
  })
})
