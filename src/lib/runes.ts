// ─────────────────────────────────────────────────────────────────────────────
// Roadmap runes (five-element gamification)
// ─────────────────────────────────────────────────────────────────────────────
// Each milestone maps to one of the five Chinese elements, turning the roadmap
// into a collectible journey. Pure + dependency-light so it's trivially testable
// and reusable across the milestone UI.

import type { MilestoneType } from '@/types/models'

export type RuneElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

export type Rune = {
  element: RuneElement
  glyph: string   // 木 火 土 金 水
  label: string
  color: string
}

export const RUNE_ELEMENTS: Record<RuneElement, Omit<Rune, 'element'>> = {
  wood:  { glyph: '木', label: 'Wood',  color: '#057A55' }, // growth, exploration
  fire:  { glyph: '火', label: 'Fire',  color: '#E02424' }, // passion, expression, initiative
  earth: { glyph: '土', label: 'Earth', color: '#B45309' }, // foundation, academic strength
  metal: { glyph: '金', label: 'Metal', color: '#6B7280' }, // achievement, proof, discipline
  water: { glyph: '水', label: 'Water', color: '#1A56DB' }, // reflection, strategy, adaptability
}

const TYPE_TO_ELEMENT: Record<MilestoneType, RuneElement> = {
  academic:    'earth', // academic foundation
  exam:        'earth', // academic proof
  competition: 'fire',  // initiative & expression
  cca:         'wood',  // growth & exploration
  application: 'metal', // documents & evidence, finalised
  other:       'water', // reflection & strategy
}

export function runeForType(type: MilestoneType): Rune {
  const element = TYPE_TO_ELEMENT[type] ?? 'water'
  return { element, ...RUNE_ELEMENTS[element] }
}
