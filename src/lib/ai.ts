// Qwen AI client — OpenAI-compatible API
// To swap to OpenAI: change baseURL to undefined and use OPENAI_API_KEY
// To swap to Kimi: use 'https://api.moonshot.cn/v1' and KIMI_API_KEY

import OpenAI from 'openai'
import type { StudentProfile, GeneratedRoadmap } from '@/types/roadmap'

export const ai = new OpenAI({
  apiKey: process.env.QWEN_API_KEY ?? 'QWEN_API_KEY',
  baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
})

// ── Roadmap Generation ────────────────────────────────────────

const ROADMAP_SYSTEM_PROMPT = `You are an expert academic counsellor specialising in Singapore's education system for international students.

Generate a personalised multi-year academic roadmap for a Chinese international student in Singapore.

SINGAPORE CONTEXT (use these real names):
Exams: O-Level, A-Level, IB Diploma, AP, PSLE, DSA
Competitions: AMC 8/10/12, SASMO, Singapore Mathematical Olympiad (SMO), Singapore Biology Olympiad (SBO), Singapore Physics Olympiad (SPhO), SYPT, IJSO, Singapore Junior Chemistry Olympiad
CCAs: Student Council, Debate, Math Club, Science Society, Model UN, Orchestra, Swimming, Basketball
Key dates: DSA opens May, closes September; O-Level results January; A-Level results March; IB results July

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

export async function generateRoadmap(profile: StudentProfile): Promise<GeneratedRoadmap> {
  const response = await ai.chat.completions.create({
    model: 'qwen-plus',
    response_format: { type: 'json_object' },
    temperature: 0.3,
    messages: [
      { role: 'system', content: ROADMAP_SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(profile) },
    ],
  })

  const parsed = JSON.parse(response.choices[0].message.content!) as { years: GeneratedRoadmap['years'] }
  return { years: parsed.years, generatedFor: profile }
}

// ── Translation (English → Chinese) ──────────────────────────

export async function translateToChineseWithSummary(
  englishText: string
): Promise<{ translation: string; summary: string }> {
  const response = await ai.chat.completions.create({
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
  })
  return JSON.parse(response.choices[0].message.content!) as { translation: string; summary: string }
}

// ── Parent Message → English Draft ───────────────────────────

export async function translateParentMessage(chineseMessage: string): Promise<string> {
  const response = await ai.chat.completions.create({
    model: 'qwen-max',
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `You translate a parent's Chinese message into formal, polite English suitable for sending to a Singapore school administrator. Return only the English translation, no extra commentary.`,
      },
      { role: 'user', content: chineseMessage },
    ],
  })
  return response.choices[0].message.content!.trim()
}

// ── Portfolio Gap Analysis ────────────────────────────────────

export async function analysePortfolio(
  achievements: { category: string; title: string; description: string }[],
  targetProgramme: string,
  benchmarkData: Record<string, unknown>
): Promise<{ score: number; gap_analysis: string }> {
  const response = await ai.chat.completions.create({
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
  })
  return JSON.parse(response.choices[0].message.content!) as { score: number; gap_analysis: string }
}
