// Qwen AI client — OpenAI-compatible API
// To swap to OpenAI: change baseURL to undefined and use OPENAI_API_KEY
// To swap to Kimi: use 'https://api.moonshot.cn/v1' and KIMI_API_KEY

import OpenAI from 'openai'
import type { StudentProfile, GeneratedRoadmap } from '@/types/roadmap'
import type { ChatJson } from '@/lib/community/verify'
import { searchKb } from '@/lib/kb/retrieve'
import { buildKbContext, formatCitations } from '@/lib/kb/context'
import { detectKbUniversity, buildGroundedRequirementsPrompt } from '@/lib/kb/university'
import { buildRoadmapKbQuery, kbFiltersForTarget, kbContextMessage } from '@/lib/kb/queries'
import { extractCompleteYears, parseStreamedRoadmap } from '@/lib/roadmap-stream'

// DashScope is region-split and the regions are separate account scopes: a
// mainland key 401s on the international host and vice versa. Overridable by
// env so moving between them (or to any OpenAI-compatible provider) is a config
// change, not a deploy of new code. Keep src/lib/kb/embed.ts in step.
export const QWEN_BASE_URL =
  process.env.QWEN_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1'

export const ai = new OpenAI({
  apiKey: process.env.QWEN_API_KEY ?? '',
  baseURL: QWEN_BASE_URL,
  // Default is 2 retries. When the host is unreachable rather than busy, each
  // attempt burns the full connect timeout, so retries turn one dead request
  // into three and eat the whole serverless budget.
  maxRetries: 1,
})

// ── Helpers ───────────────────────────────────────────────────

// The PRD targets <10s for roadmap generation; cap every call so a hung
// upstream surfaces as a clean error instead of holding the request open.
const AI_TIMEOUT_MS = 45_000

// Roadmap generation is the one call that does not fit the cap above: measured
// at 38–55s across runs, so a 45s limit failed it outright on slower runs. The
// streaming path gets its own, larger budget, sized to fit the route's 60s
// maxDuration alongside KB retrieval (6s) and request overhead. Unlike the
// timeout above, exhausting this budget salvages the completed years instead of
// throwing — see generateRoadmapStream.
export const AI_STREAM_BUDGET_MS = 50_000

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

// Concrete ChatJson seam used by the community parse/verify domain logic.
// Lives here (not under lib/community) so that lib/community stays free of any
// openai import and remains unit-testable with a fake.
export const chatJson: ChatJson = async (system, user) => {
  const res = await withTimeout(ai.chat.completions.create({
    model: 'qwen-plus',
    response_format: { type: 'json_object' },
    temperature: 0.1,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  }))
  return parseJson<unknown>(res.choices[0].message.content, 'community-chat')
}

// ── Roadmap Generation ────────────────────────────────────────

const MILESTONE_TYPES = ['exam', 'competition', 'cca', 'application', 'academic', 'other'] as const
type MilestoneType = (typeof MILESTONE_TYPES)[number]

function coerceType(v: unknown): MilestoneType {
  return (MILESTONE_TYPES as readonly string[]).includes(v as string) ? (v as MilestoneType) : 'other'
}

function coerceMonth(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 1 && n <= 12 ? Math.trunc(n) : undefined
}

// The model returns json_object, but nothing guarantees the SHAPE: it may omit
// `years`, return a non-array, or emit milestones missing a title or with an
// invalid `type` (which would later violate the milestones enum on save and
// crash the preview modal). Validate the envelope and coerce each row into a
// safe shape so downstream rendering/persistence can't break on bad output.
export function normalizeGeneratedRoadmap(raw: unknown, profile: StudentProfile): GeneratedRoadmap {
  const years = (raw as { years?: unknown })?.years
  if (!Array.isArray(years) || years.length === 0) {
    throw new Error('generateRoadmap: AI response missing a non-empty "years" array')
  }

  return { years: years.map(normalizeYear), generatedFor: profile }
}

// One year, coerced. Split out from normalizeGeneratedRoadmap so a streamed
// year can be normalised the moment it closes — the client then renders the
// same shape whether it arrived mid-stream or in the final payload.
export function normalizeYear(y: unknown): GeneratedRoadmap['years'][number] {
  const yr = y as Record<string, unknown>
  const yearNum = typeof yr.year === 'number' ? yr.year : Number(yr.year)
  const rawMilestones = Array.isArray(yr.milestones) ? yr.milestones : []
  const milestones = rawMilestones
    .map((m) => {
      const ms = m as Record<string, unknown>
      const title = typeof ms.title === 'string' ? ms.title.trim() : ''
      if (!title) return null // a milestone with no title is unusable — drop it
      return {
        type: coerceType(ms.type),
        title,
        description: typeof ms.description === 'string' ? ms.description : '',
        month: coerceMonth(ms.month),
        dueDate: typeof ms.dueDate === 'string' ? ms.dueDate : undefined,
      }
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)

  return {
    year: Number.isFinite(yearNum) ? yearNum : new Date().getFullYear(),
    yearLabel: typeof yr.yearLabel === 'string' ? yr.yearLabel : String(yearNum),
    keyMilestone: typeof yr.keyMilestone === 'string' ? yr.keyMilestone : '',
    milestones,
  }
}

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

  const parsed = parseJson<unknown>(response.choices[0].message.content, 'generateRoadmap')
  return normalizeGeneratedRoadmap(parsed, profile)
}

// Streaming variant. Measured generation is 38–55s of mostly output tokens, so
// waiting for the last byte means a ~50s spinner; the first token arrives in
// ~240ms. Emitting each year as it closes turns that into a roadmap that fills
// in as the student watches.
//
// The budget is a hard stop, not a failure: whatever years completed are kept
// and returned. That matters because the caller's serverless function is killed
// at maxDuration regardless — better to hand back four usable years than to
// throw away everything the model already wrote.
export async function generateRoadmapStream(
  profile: StudentProfile,
  existingMilestones: ExistingMilestone[] | undefined,
  timeline: { currentYear: number; enrollmentYear: number } | undefined,
  assessment: RoadmapAssessmentContext | undefined,
  onYear: (year: GeneratedRoadmap['years'][number]) => void,
  budgetMs: number = AI_STREAM_BUDGET_MS
): Promise<GeneratedRoadmap> {
  const now = new Date().getFullYear()
  const currentYear = timeline?.currentYear ?? now
  const enrollmentYear = Math.max(currentYear, Math.min(timeline?.enrollmentYear ?? currentYear + 4, currentYear + 8))

  const payload: Record<string, unknown> = { profile, currentYear, enrollmentYear }
  if (existingMilestones && existingMilestones.length > 0) payload.existingMilestones = existingMilestones
  if (assessment) payload.assessment = assessment

  const kbHits = await searchKb(buildRoadmapKbQuery(profile), kbFiltersForTarget(profile.targetUniversity))
  const grounding = kbContextMessage(buildKbContext(kbHits))

  // Fail loudly on a misconfigured environment. Without this the SDK sends an
  // empty bearer token and the deployment looks like an upstream auth problem,
  // which sends you looking at the AI provider instead of at your env vars.
  if (!process.env.QWEN_API_KEY) throw new Error('QWEN_API_KEY is not set in this environment')

  const deadline = Date.now() + budgetMs
  const stream = await ai.chat.completions.create(
    {
      model: 'qwen-plus',
      response_format: { type: 'json_object' },
      temperature: 0.3,
      stream: true,
      messages: [
        { role: 'system', content: ROADMAP_SYSTEM_PROMPT },
        ...(grounding ? [{ role: 'system' as const, content: grounding }] : []),
        { role: 'user', content: JSON.stringify(payload) },
      ],
    },
    // The deadline below only advances once chunks arrive, so it cannot bound a
    // connect that never completes — an unreachable host hung here for ~49s and
    // took the request with it. This bounds the request itself; no retry,
    // because a second full-length hang would outlive the function.
    { timeout: budgetMs, maxRetries: 0 },
  )

  let buffer = ''
  let emitted = 0
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) {
      buffer += delta
      const years = extractCompleteYears(buffer)
      for (; emitted < years.length; emitted++) onYear(normalizeYear(years[emitted]))
    }
    if (Date.now() > deadline) {
      console.warn(`[generateRoadmapStream] budget of ${budgetMs}ms exhausted — salvaging ${emitted} year(s)`)
      break
    }
  }

  // normalizeGeneratedRoadmap still throws when nothing usable arrived, so a
  // stream that died before the first year closed surfaces as a clean failure.
  return normalizeGeneratedRoadmap(parseStreamedRoadmap(buffer), profile)
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

/**
 * Build an application plan grounded STRICTLY in user-provided official-page content
 * (link fetch / paste / upload). Used when scrapers can't reach the page. Records the
 * source URL and marks the plan verified when one is provided.
 */
export async function fetchApplicationPlanFromSource(
  universityName: string,
  programme: string,
  enrollmentYear: number,
  sourceText: string,
  sourceUrl?: string
): Promise<import('@/lib/university-plan').ApplicationPlan> {
  const { normalizeApplicationPlan } = await import('@/lib/university-plan')

  const system = `You build an application plan for a Chinese international student STRICTLY from the official page content provided below. Extract ONLY dates and requirements that appear in that content — never invent or infer dates that are not present. Omit any field the content does not state.\n\n${PLAN_OUTPUT_SPEC}`

  const response = await withTimeout(ai.chat.completions.create({
    model: 'qwen-plus',
    response_format: { type: 'json_object' },
    temperature: 0.1,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `University: ${universityName}\nProgramme: ${programme || 'General undergraduate'}\nTarget intake year: ${enrollmentYear}\n\nOFFICIAL PAGE CONTENT:\n${sourceText.slice(0, 16000)}`,
      },
    ],
  }))

  const plan = normalizeApplicationPlan(
    parseJson<unknown>(response.choices[0].message.content, 'fetchApplicationPlanFromSource')
  )

  const validUrl = sourceUrl && /^https?:\/\//.test(sourceUrl) ? sourceUrl : null
  if (validUrl) {
    const seen = new Set(plan.sources.map((s) => s.url))
    const sources = seen.has(validUrl)
      ? plan.sources
      : [{ url: validUrl, title: `${universityName} (provided page)` }, ...plan.sources]
    return { ...plan, sources: sources.slice(0, 8), verified: true }
  }
  return { ...plan, verified: plan.sources.length > 0 }
}

// Per-university fit analysis was removed — fit/readiness now lives entirely in
// the Portfolio assessment (see src/lib/assessor.ts + src/lib/assessment.ts).
// Portfolio assessment now lives in the deep `assessment` module — see
// src/lib/assessor.ts (the AI seam) and src/lib/assessment.ts (scoring core).
