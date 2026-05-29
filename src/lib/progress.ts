// Derives the gamified "journey to your dream university" state from real
// tracking data. Pure + dependency-free so it runs in any server component.

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
