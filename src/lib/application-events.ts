// Application-plan → adoptable calendar events (pure). Maps a plan's deadlines to
// `application` events and synthesizes a final "submit all materials" milestone, with
// idempotent dedupe against the calendar. See docs/PRD-app-assistant-calendar.md §5.3.

import type { ApplicationPlan } from '@/lib/university-plan'

export interface ProposedEvent {
  title: string
  date: string // ISO yyyy-mm-dd
  type: 'application'
  notes: string | null
  sourceUrl: string | null
}

export function planToProposedEvents(plan: ApplicationPlan, targetName: string): ProposedEvent[] {
  const sourceUrl = plan.sources[0]?.url ?? null

  const events: ProposedEvent[] = plan.deadlines.map((d) => ({
    title: d.title,
    date: d.date,
    type: 'application',
    notes: d.description ?? null,
    sourceUrl,
  }))

  // Final milestone: prefer the application window close, else the latest deadline.
  const latestDeadline = plan.deadlines.reduce<string | null>(
    (max, d) => (max === null || d.date > max ? d.date : max),
    null,
  )
  const submitAllDate = plan.applicationWindow?.closes ?? latestDeadline
  if (submitAllDate) {
    events.push({
      title: `Submit all application materials — ${targetName}`,
      date: submitAllDate,
      type: 'application',
      notes: null,
      sourceUrl,
    })
  }

  // Dedupe identical (date, title), then sort chronologically.
  const seen = new Set<string>()
  return events
    .filter((e) => {
      const key = `${e.date}|${e.title}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Drop proposed events that already exist on the calendar (match date + title). */
export function dedupeAgainstExisting(
  proposed: ProposedEvent[],
  existing: { date: string; title: string }[],
): ProposedEvent[] {
  const have = new Set(existing.map((e) => `${e.date}|${e.title}`))
  return proposed.filter((e) => !have.has(`${e.date}|${e.title}`))
}
