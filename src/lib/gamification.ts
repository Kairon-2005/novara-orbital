// ─────────────────────────────────────────────────────────────────────────────
// Gamification
// ─────────────────────────────────────────────────────────────────────────────
// A deep module: callers hand over a student's raw progress (achievements,
// milestones, documents) and get back everything needed to render the game
// layer — XP, level, badges, and the "journey to the dream university". All the
// thresholds, point values, level bands, and stage cut-offs are private to this
// module so the rest of the app never has to know how the game is scored.

import type { MockAchievement, MockMilestone, MockDocument, AchievementCategory } from '@/types/models'

// ── XP ────────────────────────────────────────────────────────────────────────

// Single source of truth for how much XP each achievement category is worth.
// Used both when persisting a new achievement and when reading existing ones.
export const XP_BY_CATEGORY: Record<AchievementCategory, number> = {
  competition: 60, award: 50, academic: 40, cca: 35, volunteer: 30, other: 20,
}

/** Resolve an achievement's XP: prefer the stored value, else derive from category. */
export function achievementXP(category: AchievementCategory, stored?: number | null): number {
  return stored ?? XP_BY_CATEGORY[category] ?? 20
}

function totalXP(
  achievements: MockAchievement[],
  milestones: MockMilestone[],
  documents: MockDocument[],
): number {
  const achXP = achievements.reduce((sum, a) => sum + a.xp, 0)
  const msXP  = milestones.filter(m => m.completed).length * 50
  const docXP = documents.length * 10
  return achXP + msXP + docXP
}

// ── Levels ────────────────────────────────────────────────────────────────────

export type GamificationLevel = {
  level: number
  name: string
  emoji: string
  min_xp: number
  max_xp: number
  color: string
}

const LEVELS: GamificationLevel[] = [
  { level: 1, name: 'Newcomer',  emoji: '🌱', min_xp: 0,    max_xp: 149,  color: '#6B7280' },
  { level: 2, name: 'Explorer',  emoji: '🌍', min_xp: 150,  max_xp: 399,  color: '#1A56DB' },
  { level: 3, name: 'Pioneer',   emoji: '🚀', min_xp: 400,  max_xp: 749,  color: '#7C3AED' },
  { level: 4, name: 'Scholar',   emoji: '📚', min_xp: 750,  max_xp: 1199, color: '#057A55' },
  { level: 5, name: 'Champion',  emoji: '🏆', min_xp: 1200, max_xp: 9999, color: '#B45309' },
]

export type LevelInfo = GamificationLevel & { progress_pct: number }

function levelForXP(xp: number): LevelInfo {
  const lvl = LEVELS.slice().reverse().find(l => xp >= l.min_xp) ?? LEVELS[0]
  const range = lvl.max_xp - lvl.min_xp
  const progress_pct = Math.min(100, Math.round(((xp - lvl.min_xp) / range) * 100))
  return { ...lvl, progress_pct }
}

// ── Badges ────────────────────────────────────────────────────────────────────

export type Badge = {
  id: string
  name: string
  emoji: string
  description: string
}

export const ALL_BADGES: Badge[] = [
  { id: 'first_step',   emoji: '🏁', name: 'First Step',   description: 'Added your first milestone' },
  { id: 'on_track',     emoji: '🎯', name: 'On Track',     description: 'Completed 3 milestones' },
  { id: 'champion',     emoji: '🏆', name: 'Champion',     description: 'Won a competition' },
  { id: 'scholar',      emoji: '📚', name: 'Scholar',      description: '3 academic achievements' },
  { id: 'all_rounder',  emoji: '🌟', name: 'All-Rounder',  description: 'Achievements in 4+ categories' },
  { id: 'paperwork',    emoji: '📄', name: 'Paperwork Done', description: 'Uploaded 3+ documents' },
  { id: 'volunteer',    emoji: '🤝', name: 'Helper',       description: 'Added a volunteer achievement' },
  { id: 'on_fire',      emoji: '🔥', name: 'On Fire',      description: 'Completed 5+ milestones' },
]

function earnedBadges(
  achievements: MockAchievement[],
  milestones: MockMilestone[],
  documents: MockDocument[],
): Badge[] {
  const badge = (id: string) => ALL_BADGES.find(b => b.id === id)!
  const completed = milestones.filter(m => m.completed).length
  const categories = new Set(achievements.map(a => a.category))

  const earned: Badge[] = []
  if (milestones.length >= 1)                                          earned.push(badge('first_step'))
  if (completed >= 3)                                                  earned.push(badge('on_track'))
  if (completed >= 5)                                                  earned.push(badge('on_fire'))
  if (achievements.some(a => a.category === 'competition'))            earned.push(badge('champion'))
  if (achievements.filter(a => a.category === 'academic').length >= 3) earned.push(badge('scholar'))
  if (categories.size >= 4)                                            earned.push(badge('all_rounder'))
  if (achievements.some(a => a.category === 'volunteer'))              earned.push(badge('volunteer'))
  if (documents.length >= 3)                                           earned.push(badge('paperwork'))
  return earned
}

// ── The deep interface ────────────────────────────────────────────────────────

export type ProgressInput = {
  achievements: MockAchievement[]
  milestones: MockMilestone[]
  documents: MockDocument[]
}

export type ProgressSummary = {
  xp: number
  level: LevelInfo
  badges: Badge[]
}

/**
 * One call to turn raw progress into the full game state. Prefer this over
 * computing XP/level/badges separately — it keeps the scoring rules in one place.
 */
export function summarizeProgress(input: ProgressInput): ProgressSummary {
  const xp = totalXP(input.achievements, input.milestones, input.documents)
  return {
    xp,
    level: levelForXP(xp),
    badges: earnedBadges(input.achievements, input.milestones, input.documents),
  }
}

// ── The "journey to the dream university" ──────────────────────────────────────
// Derived from real tracking data; rendered identically on the student (en) and
// parent (zh) dashboards via <JourneyCard/>.

export type JourneyStage = {
  index: number
  en: string
  zh: string
  blurbEn: string
  blurbZh: string
}

const STAGES: Omit<JourneyStage, 'index'>[] = [
  { en: 'Lift-off',          zh: '启航', blurbEn: 'Every orbit starts here — log your first milestones.',        blurbZh: '每段旅程都从这里开始，先完成第一批里程碑。' },
  { en: 'Building Momentum', zh: '蓄力', blurbEn: 'You are gathering speed. Keep milestones on track.',          blurbZh: '你正在积蓄动力，继续按计划推进里程碑。' },
  { en: 'Gaining Altitude',  zh: '加速', blurbEn: 'Real progress — now strengthen your weaker areas.',           blurbZh: '进展明显！接下来补强较弱的领域。' },
  { en: 'Final Approach',    zh: '临近', blurbEn: 'Almost there. Polish your portfolio and applications.',       blurbZh: '即将抵达，打磨你的作品集与申请材料。' },
  { en: 'Orbit Achieved',    zh: '入轨', blurbEn: 'Dream-university ready. Maintain your momentum!',             blurbZh: '已具备梦校申请实力，保持势头！' },
]

export const TOTAL_STAGES = STAGES.length

export type Journey = {
  pct: number
  stage: JourneyStage
  milestonesDone: number
  milestonesTotal: number
  achievements: number
  xp: number
}

export function computeJourney(input: {
  readinessScore?: number | null
  milestonesDone?: number | null
  milestonesTotal?: number | null
  achievements?: number | null
}): Journey {
  const milestonesDone = input.milestonesDone ?? 0
  const milestonesTotal = input.milestonesTotal ?? 0
  const achievements = input.achievements ?? 0
  const readiness = input.readinessScore ?? 0

  const milestonePct = milestonesTotal > 0 ? (milestonesDone / milestonesTotal) * 100 : 0
  // Readiness is the holistic "distance to dream university"; fall back to
  // milestone completion when no AI readiness score exists yet.
  const pct = Math.max(0, Math.min(100, Math.round(readiness > 0 ? readiness : milestonePct)))

  const index = pct >= 90 ? 4 : pct >= 65 ? 3 : pct >= 40 ? 2 : pct >= 15 ? 1 : 0
  const xp = milestonesDone * 50 + achievements * 30

  return {
    pct,
    stage: { index, ...STAGES[index] },
    milestonesDone,
    milestonesTotal,
    achievements,
    xp,
  }
}
