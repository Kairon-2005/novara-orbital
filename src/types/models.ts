// ─────────────────────────────────────────────────────────────────────────────
// Domain view models
// ─────────────────────────────────────────────────────────────────────────────
// The shapes the UI works with. Server Components map raw Supabase rows
// (snake_case) into these view models before handing them to client components,
// so the UI never depends on database column naming.
//
// NOTE: the `Mock*` prefix is historical (these started as mock data); they are
// now the app's real view-model types.

// ── Schools ───────────────────────────────────────────────────────────────────

export type SchoolType =
  | 'primary' | 'secondary' | 'jc' | 'poly' | 'university' | 'language_school' | 'diploma'

export type Curriculum = 'IB' | 'A-Level' | 'AP' | 'O-Level' | 'Local' | 'Mixed'

export type MockSchool = {
  id: string
  school_name: string
  slug: string
  school_type: SchoolType
  curriculum: Curriculum | null
  zone: string
  address: string
  description: string
  website: string
  tuition_range?: string          // SGD/year (indicative)
  highlights?: string[]
}

// ── Achievements ──────────────────────────────────────────────────────────────

export type AchievementCategory =
  | 'competition' | 'academic' | 'cca' | 'volunteer' | 'award' | 'other'

export type MockAchievement = {
  id: string
  category: AchievementCategory
  title: string
  date: string          // YYYY-MM-DD
  description: string
  xp: number
}

// ── Milestones ────────────────────────────────────────────────────────────────

export type MilestoneType =
  | 'exam' | 'competition' | 'cca' | 'application' | 'academic' | 'other'

export type MockMilestone = {
  id: string
  year: number          // calendar year (e.g. 2026)
  month: number         // 1–12
  type: MilestoneType
  title: string
  description: string
  due_date: string      // YYYY-MM-DD
  completed: boolean
}

// ── Documents ─────────────────────────────────────────────────────────────────

export type DocumentFileType =
  | 'transcript' | 'report_card' | 'certificate' | 'passport'
  | 'visa' | 'medical' | 'application' | 'other'

export type MockDocument = {
  id: string
  file_name: string
  file_type: DocumentFileType
  upload_date: string   // YYYY-MM-DD
  size_kb: number
  parent_access: boolean
  summary?: string      // AI classification summary, when available
  relevance?: string    // AI relevance: low | medium | high
  classifying?: boolean // transient UI flag while background classification runs
}

// ── School communications (parent comms) ──────────────────────────────────────

export type CommStatus = 'unread' | 'read'

export type MockComm = {
  id: string
  subject: string                   // Original English subject
  body_en: string                   // Original English body
  body_zh: string                   // AI-translated Chinese
  summary_zh: string                // Short Chinese summary (2 sentences)
  category: 'exam' | 'fee' | 'event' | 'policy' | 'welfare' | 'other'
  sent_date: string                 // YYYY-MM-DD
  from_school: string
  status: CommStatus
  urgent: boolean
}
