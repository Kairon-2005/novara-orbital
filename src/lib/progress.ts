// ─────────────────────────────────────────────────────────────────────────────
// Progress Snapshot — the single source of 申请进度 truth
// ─────────────────────────────────────────────────────────────────────────────
// A deep module: callers hand over a student's raw application data and get
// back one typed snapshot that every progress surface renders from — the
// student dashboard, the parent dashboard/roadmap, and the shareable progress
// card. Nothing here fabricates numbers: when a signal (e.g. an AI assessment)
// is absent, the snapshot says so instead of synthesizing a score.
//
// Pure by construction: `today` is injected so the module never reads clocks.

import { computeJourney, type Journey } from '@/lib/gamification'
import type { PortfolioAssessment, ReadinessLevel, DimensionLevel, AdmissionDimensionId } from '@/types/assessment'

export type ApplicationStatus = 'researching' | 'applied' | 'offer' | 'rejected' | 'enrolled'

export type SnapshotInputs = {
  student: {
    displayName: string
    school?: string | null
    year?: string | null
    curriculum?: string | null
    targetUniversity?: string | null
    targetProgramme?: string | null
  }
  /** All milestones of the active roadmap (empty when no roadmap). */
  milestones: ReadonlyArray<{ title: string; dueDate: string | null; completed: boolean }>
  targets: ReadonlyArray<{ name: string; country: string; programme: string; status: ApplicationStatus; deadline: string | null }>
  assessment: PortfolioAssessment | null
  /** Legacy holistic readiness score — journey fallback only, never a dimension. */
  readinessScore?: number | null
  achievements: ReadonlyArray<{ title: string; category: string; date: string }>
  upcomingEvents: ReadonlyArray<{ title: string; date: string; type: string }>
  /** YYYY-MM-DD; injected so the snapshot is pure. */
  today: string
}

export type ProgressSnapshot = {
  student: SnapshotInputs['student']
  journey: Journey
  milestones: { done: number; total: number; next: Array<{ title: string; dueDate: string | null }> }
  applications: Array<{ name: string; country: string; programme: string; status: ApplicationStatus; deadline: string | null; daysLeft: number | null }>
  readiness: {
    overallLevel: ReadinessLevel
    dimensions: Array<{ id: AdmissionDimensionId; score: number; level: DimensionLevel }>
  } | null
  recentAchievements: Array<{ title: string; category: string; date: string }>
  upcomingDeadlines: Array<{ title: string; date: string; type: string; daysLeft: number }>
  generatedAt: string
}

/** Whole days from `today` to `date`; negative when past. */
function daysBetween(today: string, date: string): number {
  return Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000)
}

// ── Public share card ─────────────────────────────────────────────────────────
// Projection rendered on the tokenized no-auth share page. Deliberately coarse:
// display name, target statuses, counts, journey stage, readiness LEVEL only.
// Never scores, reasoning, milestone titles, documents, finances, or comms.

export type PublicProgressCard = {
  student: { displayName: string; targetUniversity: string | null }
  // stage only — journey.pct is the readiness average in disguise, a score
  journey: Pick<Journey, 'stage' | 'milestonesDone' | 'milestonesTotal'>
  milestones: { done: number; total: number }
  applications: Array<{ name: string; country: string; status: ApplicationStatus; deadline: string | null }>
  readinessLevel: ReadinessLevel | null
  upcomingDeadlines: Array<{ title: string; date: string }>
  generatedAt: string
}

export function toPublicProgressCard(snapshot: ProgressSnapshot): PublicProgressCard {
  return {
    student: {
      displayName: snapshot.student.displayName,
      targetUniversity: snapshot.student.targetUniversity ?? null,
    },
    journey: {
      stage: snapshot.journey.stage,
      milestonesDone: snapshot.journey.milestonesDone,
      milestonesTotal: snapshot.journey.milestonesTotal,
    },
    milestones: { done: snapshot.milestones.done, total: snapshot.milestones.total },
    applications: snapshot.applications.map(({ name, country, status, deadline }) => ({ name, country, status, deadline })),
    readinessLevel: snapshot.readiness?.overallLevel ?? null,
    upcomingDeadlines: snapshot.upcomingDeadlines.slice(0, 4).map(({ title, date }) => ({ title, date })),
    generatedAt: snapshot.generatedAt,
  }
}

export function buildProgressSnapshot(inputs: SnapshotInputs): ProgressSnapshot {
  const done = inputs.milestones.filter(m => m.completed).length
  const total = inputs.milestones.length

  const assessmentAvg = inputs.assessment && inputs.assessment.dimensionScores.length > 0
    ? Math.round(inputs.assessment.dimensionScores.reduce((s, d) => s + d.score, 0) / inputs.assessment.dimensionScores.length)
    : 0

  const journey = computeJourney({
    readinessScore: assessmentAvg || inputs.readinessScore || 0,
    milestonesDone: done,
    milestonesTotal: total,
    achievements: inputs.achievements.length,
  })

  return {
    student: inputs.student,
    journey,
    milestones: {
      done,
      total,
      next: inputs.milestones
        .filter(m => !m.completed)
        .slice()
        .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
        .slice(0, 3)
        .map(({ title, dueDate }) => ({ title, dueDate })),
    },
    applications: inputs.targets
      .slice()
      .sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'))
      .map(t => ({ ...t, daysLeft: t.deadline ? daysBetween(inputs.today, t.deadline) : null })),
    readiness: inputs.assessment
      ? {
          overallLevel: inputs.assessment.overallLevel,
          dimensions: inputs.assessment.dimensionScores.map(d => ({
            id: d.dimensionId, score: d.score, level: d.level,
          })),
        }
      : null,
    recentAchievements: inputs.achievements
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date)),
    upcomingDeadlines: inputs.upcomingEvents
      .filter(e => e.date >= inputs.today)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(e => ({ ...e, daysLeft: daysBetween(inputs.today, e.date) })),
    generatedAt: inputs.today,
  }
}
