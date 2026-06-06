import { describe, it, expect } from 'vitest'
import {
  summarizeProgress,
  computeJourney,
  achievementXP,
  XP_BY_CATEGORY,
  TOTAL_STAGES,
} from '@/lib/gamification'
import type { MockAchievement, MockMilestone, MockDocument, AchievementCategory } from '@/types/models'

// ── Test data builders ────────────────────────────────────────
// Small factories so each test states only the fields it cares about.

function achievement(category: AchievementCategory, xp: number): MockAchievement {
  return { id: crypto.randomUUID(), category, title: 't', date: '2026-01-01', description: '', xp }
}
function milestone(completed: boolean): MockMilestone {
  return { id: crypto.randomUUID(), year: 2026, month: 1, type: 'academic', title: 't', description: '', due_date: '2026-01-01', completed }
}
function document(): MockDocument {
  return { id: crypto.randomUUID(), file_name: 'f', file_type: 'other', upload_date: '2026-01-01', size_kb: 0, parent_access: false }
}
const badgeIds = (badges: { id: string }[]) => new Set(badges.map(b => b.id))

// ── achievementXP ─────────────────────────────────────────────

describe('achievementXP', () => {
  it('uses the stored value when one exists', () => {
    expect(achievementXP('volunteer', 99)).toBe(99)
  })

  it('falls back to the category value when none is stored', () => {
    expect(achievementXP('competition')).toBe(XP_BY_CATEGORY.competition)
  })

  it('treats a stored zero as a real value, not "missing"', () => {
    expect(achievementXP('competition', 0)).toBe(0)
  })
})

// ── summarizeProgress: XP ─────────────────────────────────────

describe('summarizeProgress — XP', () => {
  it('sums achievement XP, completed milestones (50 each) and documents (10 each)', () => {
    const { xp } = summarizeProgress({
      achievements: [achievement('competition', 60)],
      milestones: [milestone(true), milestone(true)],
      documents: [document(), document(), document()],
    })
    expect(xp).toBe(60 + 100 + 30)
  })

  it('only counts completed milestones toward XP', () => {
    const { xp } = summarizeProgress({
      achievements: [],
      milestones: [milestone(true), milestone(false), milestone(false)],
      documents: [],
    })
    expect(xp).toBe(50)
  })

  it('reports level 1 and no badges for an empty profile', () => {
    const { xp, level, badges } = summarizeProgress({ achievements: [], milestones: [], documents: [] })
    expect(xp).toBe(0)
    expect(level.level).toBe(1)
    expect(badges).toHaveLength(0)
  })

  it('advances the level as XP crosses a band threshold', () => {
    // 4 completed milestones = 200 XP, which is in the level-2 band (150–399)
    const { level } = summarizeProgress({
      achievements: [],
      milestones: [milestone(true), milestone(true), milestone(true), milestone(true)],
      documents: [],
    })
    expect(level.level).toBe(2)
    expect(level.progress_pct).toBeGreaterThanOrEqual(0)
    expect(level.progress_pct).toBeLessThanOrEqual(100)
  })
})

// ── summarizeProgress: badges ─────────────────────────────────

describe('summarizeProgress — badges', () => {
  it('awards Champion for any competition achievement', () => {
    const { badges } = summarizeProgress({
      achievements: [achievement('competition', 60)],
      milestones: [],
      documents: [],
    })
    expect(badgeIds(badges).has('champion')).toBe(true)
  })

  it('awards On Fire once five milestones are completed', () => {
    const { badges } = summarizeProgress({
      achievements: [],
      milestones: Array.from({ length: 5 }, () => milestone(true)),
      documents: [],
    })
    const ids = badgeIds(badges)
    expect(ids.has('on_fire')).toBe(true)
    expect(ids.has('on_track')).toBe(true) // 3+ completed also earned
  })

  it('awards All-Rounder for achievements spanning four categories', () => {
    const { badges } = summarizeProgress({
      achievements: [
        achievement('competition', 60),
        achievement('academic', 40),
        achievement('cca', 35),
        achievement('volunteer', 30),
      ],
      milestones: [],
      documents: [],
    })
    expect(badgeIds(badges).has('all_rounder')).toBe(true)
  })

  it('awards Paperwork Done for three uploaded documents', () => {
    const { badges } = summarizeProgress({
      achievements: [],
      milestones: [],
      documents: [document(), document(), document()],
    })
    expect(badgeIds(badges).has('paperwork')).toBe(true)
  })
})

// ── computeJourney ────────────────────────────────────────────

describe('computeJourney', () => {
  it('uses the readiness score as the percentage when one is present', () => {
    const journey = computeJourney({ readinessScore: 70, milestonesDone: 0, milestonesTotal: 10 })
    expect(journey.pct).toBe(70)
  })

  it('falls back to milestone completion when there is no readiness score', () => {
    const journey = computeJourney({ milestonesDone: 2, milestonesTotal: 4 })
    expect(journey.pct).toBe(50)
  })

  it('clamps the percentage into 0–100', () => {
    expect(computeJourney({ readinessScore: 250 }).pct).toBe(100)
    expect(computeJourney({ readinessScore: -10 }).pct).toBe(0)
  })

  it('derives journey XP from milestones (50) and achievements (30)', () => {
    const journey = computeJourney({ milestonesDone: 2, milestonesTotal: 4, achievements: 3 })
    expect(journey.xp).toBe(2 * 50 + 3 * 30)
  })

  it('moves through stages from lift-off to the final stage as progress grows', () => {
    expect(computeJourney({ readinessScore: 0 }).stage.index).toBe(0)
    expect(computeJourney({ readinessScore: 95 }).stage.index).toBe(TOTAL_STAGES - 1)
  })
})
