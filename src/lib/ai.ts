// Qwen AI client — OpenAI-compatible API
// To swap to OpenAI: change baseURL to undefined and use OPENAI_API_KEY
// To swap to Kimi: use 'https://api.moonshot.cn/v1' and KIMI_API_KEY

import OpenAI from 'openai'
import type { StudentProfile, GeneratedRoadmap } from '@/types/roadmap'
import { searchKb } from '@/lib/kb/retrieve'
import { buildKbContext, formatCitations } from '@/lib/kb/context'
import { detectKbUniversity, buildGroundedRequirementsPrompt } from '@/lib/kb/university'
import { buildRoadmapKbQuery, kbFiltersForTarget, kbContextMessage } from '@/lib/kb/queries'

export const ai = new OpenAI({
  apiKey: process.env.QWEN_API_KEY ?? '',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
})

// ── Helpers ───────────────────────────────────────────────────

// The PRD targets <10s for roadmap generation; cap every call so a hung
// upstream surfaces as a clean error instead of holding the request open.
const AI_TIMEOUT_MS = 45_000

export function withTimeout<T>(promise: Promise<T>, ms = AI_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('AI request timed out')), ms)
    ),
  ])
}

// Models occasionally wrap JSON in prose or return malformed output. Throw a
// labelled error the route layer can turn into a 500 instead of a raw crash.
export function parseJson<T>(content: string | null | undefined, label: string): T {
  if (!content) throw new Error(`${label}: empty AI response`)
  try {
    return JSON.parse(content) as T
  } catch {
    const match = content.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0]) as T
      } catch { /* fall through */ }
    }
    throw new Error(`${label}: AI returned invalid JSON`)
  }
}

// ── Roadmap Generation ────────────────────────────────────────

export type ExistingMilestone = {
  type: string
  title: string
  due_date?: string
  completed: boolean
}

const ROADMAP_SYSTEM_PROMPT = `You are an expert academic counsellor specialising in Singapore's education system for international students.

Generate a personalised multi-year academic roadmap for a Chinese international student in Singapore.

SINGAPORE CONTEXT (use these real names):
Exams: O-Level, A-Level, IB Diploma, AP, PSLE, DSA
Competitions: AMC 8/10/12, SASMO, Singapore Mathematical Olympiad (SMO), Singapore Biology Olympiad (SBO), Singapore Physics Olympiad (SPhO), SYPT, IJSO, Singapore Junior Chemistry Olympiad
CCAs: Student Council, Debate, Math Club, Science Society, Model UN, Orchestra, Swimming, Basketball
Key dates: DSA opens May, closes September; O-Level results January; A-Level results March; IB results July

EXISTING PLAN INSTRUCTIONS:
If existingMilestones is provided in the user message:
- Treat completed milestones as already achieved — do NOT include them again
- Build logically on top of pending milestones; if they look good, keep similar items but feel free to improve, rename, or add detail
- Fill gaps the current plan is missing for the student's target university/programme
- The new plan should feel like a natural evolution of the existing one, not a blank-slate restart

TIMELINE INSTRUCTIONS:
The user message includes "currentYear" and "enrollmentYear". Produce exactly ONE entry in "years" for EACH calendar year from currentYear through enrollmentYear inclusive, in chronological order, using the real calendar year as the "year" value. The final year (enrollmentYear) is when the student begins university — focus that year on applications, interviews, offers, and enrolment. Do not output years outside this range.

ASSESSMENT INSTRUCTIONS:
If "assessment" is provided, it is the student's current readiness: an overall level, their biggest gaps, and a per-dimension breakdown (Academic Strength, Programme Fit, Evidence Portfolio, Communication & Storytelling, Initiative & Impact). PRIORITISE milestones that close the weakest dimensions and the listed gaps — each year should make measurable progress on at least one weak dimension. Do not spend milestones reinforcing strengths the student already has.

OUTPUT FORMAT (strict JSON):
{
  "years": [
    {
      "year": 2025,
      "yearLabel": "Year 10 / Secondary 4",
      "keyMilestone": "One sentence summary of what this year is about",
      "milestones": [
        {
          "type": "exam|competition|cca|application|academic|other",
          "title": "Milestone title",
          "description": "2-3 sentences of specific actionable advice",
          "month": 4,
          "dueDate": "2025-04-15"
        }
      ]
    }
  ]
}`

export type RoadmapAssessmentContext = {
  overallLevel: string
  topGaps: string[]
  dimensions: { name: string; level: string; gaps: string[] }[]
}

export async function generateRoadmap(
  profile: StudentProfile,
  existingMilestones?: ExistingMilestone[],
  timeline?: { currentYear: number; enrollmentYear: number },
  assessment?: RoadmapAssessmentContext
): Promise<GeneratedRoadmap> {
  const now = new Date().getFullYear()
  const currentYear = timeline?.currentYear ?? now
  // Clamp the span so a bad value can't ask the model for dozens of years.
  const enrollmentYear = Math.max(currentYear, Math.min(timeline?.enrollmentYear ?? currentYear + 4, currentYear + 8))

  const payload: Record<string, unknown> = { profile, currentYear, enrollmentYear }
  if (existingMilestones && existingMilestones.length > 0) payload.existingMilestones = existingMilestones
  if (assessment) payload.assessment = assessment
  const userContent = JSON.stringify(payload)

  // Ground milestones (dates, requirements, pathway steps) in the knowledge
  // base when it has matching content; otherwise generate exactly as before.
  const kbHits = await searchKb(buildRoadmapKbQuery(profile), kbFiltersForTarget(profile.targetUniversity))
  const grounding = kbContextMessage(buildKbContext(kbHits))

  const response = await withTimeout(ai.chat.completions.create({
    model: 'qwen-plus',
    response_format: { type: 'json_object' },
    temperature: 0.3,
    messages: [
      { role: 'system', content: ROADMAP_SYSTEM_PROMPT },
      ...(grounding ? [{ role: 'system' as const, content: grounding }] : []),
      { role: 'user', content: userContent },
    ],
  }))

  const parsed = parseJson<{ years: GeneratedRoadmap['years'] }>(
    response.choices[0].message.content, 'generateRoadmap'
  )
  return { years: parsed.years, generatedFor: profile }
}

// ── Translation (English → Chinese) ──────────────────────────

export async function translateToChineseWithSummary(
  englishText: string
): Promise<{ translation: string; summary: string }> {
  const response = await withTimeout(ai.chat.completions.create({
    model: 'qwen-max',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `You translate school communications from English to Simplified Chinese for parents in China.
Output JSON: { "translation": "<full Chinese translation>", "summary": "<3-sentence Chinese summary>" }`,
      },
      { role: 'user', content: englishText },
    ],
  }))
  return parseJson<{ translation: string; summary: string }>(
    response.choices[0].message.content, 'translateToChineseWithSummary'
  )
}

// ── Parent Message → English Draft ───────────────────────────

export async function translateParentMessage(chineseMessage: string): Promise<string> {
  const response = await withTimeout(ai.chat.completions.create({
    model: 'qwen-max',
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `You translate a parent's Chinese message into formal, polite English suitable for sending to a Singapore school administrator. Return only the English translation, no extra commentary.`,
      },
      { role: 'user', content: chineseMessage },
    ],
  }))
  return response.choices[0].message.content?.trim() ?? ''
}

// ── University Requirements Lookup ───────────────────────────
// For NUS/NTU the answer is grounded in the curated knowledge base (RAG with
// citations — see docs/PRD-knowledge-base.md); other universities, or any
// retrieval failure, fall back to the model's own knowledge.

export async function fetchUniversityRequirements(
  universityName: string,
  programme: string,
  country: string
): Promise<string> {
  const kbUniversity = detectKbUniversity(universityName)
  if (kbUniversity) {
    const hits = await searchKb(
      `${universityName} ${programme || 'undergraduate'} admission requirements deadlines english tests`,
      { university: kbUniversity, limit: 6 }
    )
    if (hits.length > 0) {
      const response = await withTimeout(ai.chat.completions.create({
        model: 'qwen-plus',
        temperature: 0.2,
        messages: [
          { role: 'system', content: buildGroundedRequirementsPrompt(buildKbContext(hits)) },
          {
            role: 'user',
            content: `University: ${universityName}\nProgramme: ${programme || 'General undergraduate'}\nCountry: ${country || 'Singapore'}`,
          },
        ],
      }))
      const answer = response.choices[0].message.content?.trim() ?? ''
      const sources = formatCitations(hits)
        .map((c) => `- ${c.title} (last verified ${c.lastVerified})`)
        .join('\n')
      return sources ? `${answer}\n\nSources:\n${sources}` : answer
    }
  }

  const response = await withTimeout(ai.chat.completions.create({
    model: 'qwen-plus',
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `You are an expert university admissions counsellor for Chinese international students in Singapore applying to universities worldwide.
Given a university and programme, return a concise plain-text requirements summary (no markdown headers, use short paragraphs).
Cover: (1) Academic entry requirements, (2) English language requirements, (3) Application deadline and timeline, (4) Key documents needed, (5) One tip specific to Chinese/Singaporean applicants.
Be specific and accurate. If unsure about exact figures, give realistic ranges. Keep it under 250 words.`,
      },
      {
        role: 'user',
        content: `University: ${universityName}\nProgramme: ${programme || 'General undergraduate'}\nCountry: ${country || 'Unknown'}`,
      },
    ],
  }))
  return response.choices[0].message.content?.trim() ?? ''
}

// ── Application Plan (assistant v2) ──────────────────────────
// Structured plan for one target: application window, deadlines, document
// checklist, sources. NUS/NTU plans are grounded in the knowledge base
// (official sources, weekly-checked); anything else is model knowledge,
// marked unverified, and must point the user at the official page.

const PLAN_OUTPUT_SPEC = `Output strict JSON:
{
  "applicationWindow": { "opens": "YYYY-MM-DD", "closes": "YYYY-MM-DD" } | null,
  "deadlines": [ { "date": "YYYY-MM-DD", "title": "<short>", "description": "<optional detail>" } ],
  "documents": [ { "title": "<required item, e.g. 'High school transcript (certified English translation)'>", "required": true|false } ],
  "sources": [ { "url": "<official page>", "title": "<page name>" } ],
  "notes": "<one short caveat or tip, or null>"
}
Rules:
- deadlines must cover: application open/close, document submission, test-score submission, expected outcome/acceptance windows where known.
- documents: a complete, practical checklist for THIS university and programme (transcripts, English test, standardized tests, passport, essays, fees...).
- Dates must be for the student's target intake year where determinable; if you adapted dates from an earlier cycle, say so in "notes".
- Never invent exact dates you don't know — omit the deadline and mention the official page in "notes" instead.`

export async function fetchApplicationPlan(
  universityName: string,
  programme: string,
  enrollmentYear: number
): Promise<import('@/lib/university-plan').ApplicationPlan> {
  const { normalizeApplicationPlan } = await import('@/lib/university-plan')
  const kbUniversity = detectKbUniversity(universityName)
  const hits = kbUniversity
    ? await searchKb(
        `${universityName} ${programme || 'undergraduate'} application deadlines important dates required documents admission requirements`,
        { university: kbUniversity, limit: 8 }
      )
    : []

  const grounded = hits.length > 0
  const system = grounded
    ? `You build an application plan for a Chinese international student. Use ONLY the knowledge base context below (curated from official ${kbUniversity} sources) for dates and requirements; do not invent figures that conflict with it.\n\n${kbContextMessage(buildKbContext(hits))}\n\n${PLAN_OUTPUT_SPEC}`
    : `You build an application plan for a Chinese international student from your general knowledge. Be conservative with exact dates; ALWAYS include the university's official undergraduate-admissions URL in "sources".\n\n${PLAN_OUTPUT_SPEC}`

  const response = await withTimeout(ai.chat.completions.create({
    model: 'qwen-plus',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `University: ${universityName}\nProgramme: ${programme || 'General undergraduate'}\nTarget intake year: ${enrollmentYear}`,
      },
    ],
  }))

  const plan = normalizeApplicationPlan(
    parseJson<unknown>(response.choices[0].message.content, 'fetchApplicationPlan')
  )

  // Grounded plans get verified=true and authoritative sources from the KB
  // citations (the model's own source list may be partial).
  if (grounded) {
    const citationSources = formatCitations(hits).flatMap((c) =>
      c.sourceUrls.map((url) => ({ url, title: c.title, lastVerified: c.lastVerified }))
    )
    const seen = new Set(plan.sources.map((s) => s.url))
    return {
      ...plan,
      verified: true,
      sources: [...plan.sources, ...citationSources.filter((s) => !seen.has(s.url))].slice(0, 8),
    }
  }
  return { ...plan, verified: false }
}

// Per-university fit analysis was removed — fit/readiness now lives entirely in
// the Portfolio assessment (see src/lib/assessor.ts + src/lib/assessment.ts).
// Portfolio assessment now lives in the deep `assessment` module — see
// src/lib/assessor.ts (the AI seam) and src/lib/assessment.ts (scoring core).
