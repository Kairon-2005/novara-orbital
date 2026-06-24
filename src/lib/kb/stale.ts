// Staleness check (pure). Docs whose facts haven't been re-verified within
// the max age are flagged for the weekly cron / kb:stale report.

export interface StaleInput {
  id: string
  title: string
  lastVerified: string
}

export interface StaleDoc extends StaleInput {
  /** Whole days since last_verified; null when the date is malformed. */
  ageDays: number | null
}

const DAY_MS = 86_400_000
export const DEFAULT_MAX_AGE_DAYS = 90

/** Docs not verified within `maxAgeDays`, oldest first. Malformed dates count as stale. */
export function staleDocs(docs: StaleInput[], now: Date, maxAgeDays = DEFAULT_MAX_AGE_DAYS): StaleDoc[] {
  const flagged: StaleDoc[] = []
  for (const doc of docs) {
    const verified = Date.parse(doc.lastVerified)
    if (Number.isNaN(verified)) {
      flagged.push({ ...doc, ageDays: null })
      continue
    }
    const ageDays = Math.floor((now.getTime() - verified) / DAY_MS)
    if (ageDays > maxAgeDays) flagged.push({ ...doc, ageDays })
  }
  // Malformed dates (unknown age) first, then oldest.
  return flagged.sort((a, b) => (b.ageDays ?? Infinity) - (a.ageDays ?? Infinity))
}
