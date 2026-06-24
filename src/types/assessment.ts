// ─────────────────────────────────────────────────────────────────────────────
// Portfolio Assessment domain
// ─────────────────────────────────────────────────────────────────────────────
// The five admission-relevant dimensions a student's profile is scored against,
// plus the shape of an assessment result. Shared by the scoring logic, the AI
// assessor, the API, and the UI.

export type AdmissionDimensionId =
  | 'academic_strength'
  | 'programme_fit'
  | 'evidence_portfolio'
  | 'communication_storytelling'
  | 'initiative_impact'

export type DimensionLevel = 'missing' | 'weak' | 'developing' | 'competitive' | 'strong'

export type ReadinessLevel = 'early_stage' | 'developing' | 'on_track' | 'competitive' | 'strong'

export type Confidence = 'low' | 'medium' | 'high'

export type AdmissionDimension = {
  id: AdmissionDimensionId
  name: string
  blurb: string
}

export const ADMISSION_DIMENSIONS: AdmissionDimension[] = [
  { id: 'academic_strength',          name: 'Academic Strength',           blurb: 'Grades, curriculum rigour, subject relevance and academic trend.' },
  { id: 'programme_fit',              name: 'Programme Fit',               blurb: 'Alignment between your interests and the target programme.' },
  { id: 'evidence_portfolio',         name: 'Evidence Portfolio',          blurb: 'Quality, relevance and credibility of your documented achievements.' },
  { id: 'communication_storytelling', name: 'Communication & Storytelling', blurb: 'How clearly you explain your motivation and connect experiences.' },
  { id: 'initiative_impact',          name: 'Initiative & Impact',         blurb: 'Leadership, self-driven projects and real-world impact.' },
]

export type DimensionScore = {
  dimensionId: AdmissionDimensionId
  score: number            // 0–100
  level: DimensionLevel
  reasoning: string
  strengths: string[]
  gaps: string[]
  suggestedActions: string[]
}

export type PortfolioAssessment = {
  overallLevel: ReadinessLevel
  overallSummary: string
  dimensionScores: DimensionScore[]
  topStrengths: string[]
  topGaps: string[]
  recommendedNextSteps: string[]
  confidence: Confidence
}
