// Qwen AI client — OpenAI-compatible API
// To swap to OpenAI: change baseURL to undefined and use OPENAI_API_KEY
// To swap to Kimi: use 'https://api.moonshot.cn/v1' and KIMI_API_KEY

import OpenAI from 'openai'
import type { StudentProfile, GeneratedRoadmap } from '@/types/roadmap'

export const ai = new OpenAI({
  apiKey: process.env.QWEN_API_KEY ?? 'QWEN_API_KEY',
  baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
})

// ── Helpers ───────────────────────────────────────────────────

// The PRD targets <10s for roadmap generation; cap every call so a hung
// upstream surfaces as a clean error instead of holding the request open.
const AI_TIMEOUT_MS = 45_000

function withTimeout<T>(promise: Promise<T>, ms = AI_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('AI request timed out')), ms)
    ),
  ])
}

// Models occasionally wrap JSON in prose or return malformed output. Throw a
// labelled error the route layer can turn into a 500 instead of a raw crash.
function parseJson<T>(content: string | null | undefined, label: string): T {
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

export async function generateRoadmap(
  profile: StudentProfile,
  existingMilestones?: ExistingMilestone[]
): Promise<GeneratedRoadmap> {
  const userContent = existingMilestones && existingMilestones.length > 0
    ? JSON.stringify({ profile, existingMilestones })
    : JSON.stringify(profile)

  const response = await withTimeout(ai.chat.completions.create({
    model: 'qwen-plus',
    response_format: { type: 'json_object' },
    temperature: 0.3,
    messages: [
      { role: 'system', content: ROADMAP_SYSTEM_PROMPT },
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

export async function fetchUniversityRequirements(
  universityName: string,
  programme: string,
  country: string
): Promise<string> {
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

// ── Target-University Fit / Gap Analysis ─────────────────────

export type TargetGap = {
  score: number
  summary: string
  strengths: string[]
  gaps: string[]
}

export async function analyseTargetGap(input: {
  university: string
  country: string
  programme: string
  requirements?: string
  profile: {
    currentYear: string
    currentSchool: string
    curriculum: string
    englishLevel: string
    interests: string
  }
  achievements: { category: string; title: string }[]
}): Promise<TargetGap> {
  const response = await withTimeout(ai.chat.completions.create({
    model: 'qwen-plus',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `You are an admissions counsellor for Chinese international students in Singapore.
Compare the student's CURRENT profile and achievements against the TARGET university/programme and assess their fit.
Use the provided requirements if present; otherwise rely on your knowledge of this university.
Output strict JSON: {
  "score": <0-100 integer fit score>,
  "summary": "<2-3 sentence plain-English assessment>",
  "strengths": ["<specific existing strength>", ...],
  "gaps": ["<specific missing item + concrete next action>", ...]
}
Keep strengths and gaps to 2-4 items each, specific and actionable.`,
      },
      { role: 'user', content: JSON.stringify(input) },
    ],
  }))
  const parsed = parseJson<Partial<TargetGap>>(response.choices[0].message.content, 'analyseTargetGap')
  return {
    score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 0,
    summary: parsed.summary ?? '',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4) : [],
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 4) : [],
  }
}

// ── Portfolio Gap Analysis ────────────────────────────────────

export async function analysePortfolio(
  achievements: { category: string; title: string; description: string }[],
  targetProgramme: string,
  benchmarkData: Record<string, unknown>
): Promise<{ score: number; gap_analysis: string }> {
  const response = await withTimeout(ai.chat.completions.create({
    model: 'qwen-plus',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `You assess a student's portfolio against a target university programme benchmark.
Output JSON: { "score": <0-100 integer>, "gap_analysis": "<plain English paragraph identifying 2-3 weakest areas with specific actionable recommendations>" }`,
      },
      {
        role: 'user',
        content: JSON.stringify({ achievements, targetProgramme, benchmark: benchmarkData }),
      },
    ],
  }))
  return parseJson<{ score: number; gap_analysis: string }>(
    response.choices[0].message.content, 'analysePortfolio'
  )
}
