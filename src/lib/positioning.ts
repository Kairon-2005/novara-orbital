// 选校定位 — reach/match/safety verdict for one university target (pure).
// Composes the two signals Novara actually has: verified admission-case
// positioning for the target (lib/community/stats.buildPositioning) and the
// student's own portfolio assessment. Conservative by design: with thin case
// data AND no assessment it says insufficient_data instead of bluffing —
// that honesty is the difference from a 中介's sales pitch.

import type { Positioning } from '@/lib/community/stats'
import type { ReadinessLevel } from '@/types/assessment'

export type PositioningVerdict = 'reach' | 'match' | 'safety' | 'insufficient_data'

export type PositioningDecision = {
  verdict: PositioningVerdict
  evidence: string[]
}

const MIN_DECIDED_CASES = 3

// 0 = weaker profile, 1 = solid, 2 = strong
function assessmentTier(level: ReadinessLevel): 0 | 1 | 2 {
  if (level === 'competitive' || level === 'strong') return 2
  if (level === 'on_track') return 1
  return 0
}

const LEVEL_ZH: Record<ReadinessLevel, string> = {
  early_stage: '起步阶段', developing: '发展中', on_track: '步入正轨',
  competitive: '有竞争力', strong: '实力强劲',
}

export function decidePositioning(input: {
  assessmentLevel: ReadinessLevel | null
  positioning: Positioning
}): PositioningDecision {
  const { byResult, offerRate } = input.positioning.stats
  const decided = byResult.offer + byResult.rejected + byResult.waitlist
  const hasCases = decided >= MIN_DECIDED_CASES
  const evidence: string[] = []

  if (!hasCases && input.assessmentLevel === null) {
    return { verdict: 'insufficient_data', evidence: ['暂无足够的已验证案例，且未完成档案评估 — 先做一次AI评估。'] }
  }

  // Base difficulty read from verified outcomes at this target.
  // 0 = looks hard (reach), 1 = contested (match), 2 = favourable (safety)
  let score: number
  if (hasCases) {
    score = offerRate >= 0.6 ? 2 : offerRate >= 0.3 ? 1 : 0
    evidence.push(`${decided} 个已验证录取案例 · 录取率 ${Math.round(offerRate * 100)}%`)
  } else {
    score = 1 // no outcome data — neutral base, assessment decides
  }

  if (input.assessmentLevel !== null) {
    const tier = assessmentTier(input.assessmentLevel)
    score += tier - 1 // strong profile eases a step, weak profile hardens one
    evidence.push(`你的档案评估：${LEVEL_ZH[input.assessmentLevel]}`)
    if (!hasCases) evidence.push('该结论仅基于你的档案评估（案例数据不足）。')
  }

  // Never call a target "safety" on assessment alone — that claim needs outcomes.
  const ceiling = hasCases ? 2 : 1
  const clamped = Math.max(0, Math.min(ceiling, score))
  const verdict: PositioningVerdict = clamped === 2 ? 'safety' : clamped === 1 ? 'match' : 'reach'

  if (input.positioning.comparableBackgrounds.length > 0) {
    evidence.push(`可比录取背景 ${input.positioning.comparableBackgrounds.length} 条（见案例库）`)
  }

  return { verdict, evidence }
}
