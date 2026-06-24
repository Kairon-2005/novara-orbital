// Application-plan domain logic (pure). The AI returns a plan-shaped JSON;
// normalizeApplicationPlan whitelists/repairs it so the stored plan is always
// complete and well-typed. See docs: universities assistant v2.

export interface PlanDeadline {
  date: string // ISO yyyy-mm-dd
  title: string
  description?: string
}

export interface PlanDocument {
  id: string
  title: string
  required: boolean
  done: boolean
}

export interface PlanSource {
  url: string
  title?: string
  lastVerified?: string
}

export interface ApplicationPlan {
  applicationWindow: { opens: string; closes: string } | null
  deadlines: PlanDeadline[]
  documents: PlanDocument[]
  sources: PlanSource[]
  /** true = grounded in the knowledge base (official sources); false = model knowledge, user should check the official page. */
  verified: boolean
  notes: string | null
}

const EMPTY: ApplicationPlan = {
  applicationWindow: null,
  deadlines: [],
  documents: [],
  sources: [],
  verified: false,
  notes: null,
}

const isIsoDate = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))

const cleanString = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null

export function normalizeApplicationPlan(raw: unknown): ApplicationPlan {
  if (typeof raw !== 'object' || raw === null) return { ...EMPTY }
  const source = raw as Record<string, unknown>

  const windowRaw = source.applicationWindow as Record<string, unknown> | undefined
  const applicationWindow =
    windowRaw && isIsoDate(windowRaw.opens) && isIsoDate(windowRaw.closes)
      ? { opens: windowRaw.opens, closes: windowRaw.closes }
      : null

  const deadlines: PlanDeadline[] = (Array.isArray(source.deadlines) ? source.deadlines : [])
    .flatMap((d) => {
      if (typeof d !== 'object' || d === null) return []
      const item = d as Record<string, unknown>
      const title = cleanString(item.title)
      if (!isIsoDate(item.date) || !title) return []
      const description = cleanString(item.description)
      return [{ date: item.date, title, ...(description ? { description } : {}) }]
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  const documents: PlanDocument[] = (Array.isArray(source.documents) ? source.documents : [])
    .flatMap((d) => {
      if (typeof d !== 'object' || d === null) return []
      const item = d as Record<string, unknown>
      const title = cleanString(item.title)
      return title ? [{ title, required: item.required !== false, done: item.done === true }] : []
    })
    .map((d, i) => ({ id: `doc-${i}`, ...d }))

  const sources: PlanSource[] = (Array.isArray(source.sources) ? source.sources : [])
    .flatMap((s) => {
      if (typeof s !== 'object' || s === null) return []
      const item = s as Record<string, unknown>
      const url = cleanString(item.url)
      if (!url || !/^https?:\/\//.test(url)) return []
      const title = cleanString(item.title)
      const lastVerified = cleanString(item.lastVerified)
      return [{ url, ...(title ? { title } : {}), ...(lastVerified ? { lastVerified } : {}) }]
    })

  return {
    applicationWindow,
    deadlines,
    documents,
    sources,
    verified: source.verified === true,
    notes: cleanString(source.notes),
  }
}

export function planProgress(plan: ApplicationPlan): { done: number; total: number; pct: number } {
  const total = plan.documents.length
  const done = plan.documents.filter((d) => d.done).length
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) }
}

export function toggleDocument(plan: ApplicationPlan, docId: string): ApplicationPlan {
  return {
    ...plan,
    documents: plan.documents.map((d) => (d.id === docId ? { ...d, done: !d.done } : d)),
  }
}
