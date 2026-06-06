// Data-access layer — server-side repositories that hide Supabase queries and
// row→view-model mapping behind intention-revealing functions. Import these from
// Server Components / Route Handlers instead of querying `supabase.from(...)`
// inline, so query shape and table conventions live in exactly one place.

export { getStudentProfile } from './students'
export { getActiveRoadmap, getRoadmapMilestones, getActiveRoadmapMilestones } from './roadmaps'
export { getAchievements, countAchievements } from './achievements'
export { getStudentDocuments } from './documents'
export { getLatestAssessment } from './assessments'
export type { DB } from './client'
