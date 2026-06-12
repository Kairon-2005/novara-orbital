// Bridge: published admission reports → knowledge-base experience docs (pure).
// Only the structured, author-free report content crosses over — never the
// author identity or the raw uploaded PDF. See docs/PRD-community.md.

import { detectKbUniversity } from '@/lib/kb/university'
import { formatBgLine } from '@/lib/community'
import type { ReportLevel, ReportRoute, ReportResult } from '@/types/database'

export interface ReportForKb {
  id: string
  level: ReportLevel
  institution: string
  programme: string | null
  route: ReportRoute
  result: ReportResult
  applyYear: number
  scholarshipName: string | null
  grades: string | null
  englishTest: string | null
  standardizedTests: string | null
  activities: string | null
  admissionExperience: string
  interviewExperience: string | null
  scholarshipExperience: string | null
}

/** Render a report as a KB markdown doc (frontmatter + body), fully anonymized. */
export function reportToKbDoc(report: ReportForKb, todayIso: string): string {
  const university = detectKbUniversity(report.institution)
  const levelLabel = report.level === 'secondary' ? 'secondary school' : 'undergraduate'
  const title = `Community report: ${report.institution}${report.programme ? ` ${report.programme}` : ''} ${report.result} (${report.route}, ${report.applyYear})`

  const lines = [
    '---',
    `id: report-${report.id}`,
    `title: "${title.replace(/"/g, "'")}"`,
    'category: experience',
    `university: ${university ?? 'null'}`,
    'topic: experience',
    'source_urls: []',
    `last_verified: "${todayIso}"`,
    'refresh: manual',
    'language: en',
    '---',
    '',
    `# ${title}`,
    '',
    'Community-contributed admission report. Anecdotal, single data point — verify against official sources.',
    '',
    '## Outcome and background',
    '',
    `- Level: ${levelLabel}`,
    `- Institution: ${report.institution}${report.programme ? ` — ${report.programme}` : ''}`,
    `- Result: ${report.result} (application year ${report.applyYear})`,
    `- Background: ${formatBgLine(report)}`,
  ]
  if (report.scholarshipName) lines.push(`- Scholarship: ${report.scholarshipName}`)
  if (report.activities) lines.push(`- Key activities: ${report.activities}`)

  lines.push('', '## Admission experience', '', report.admissionExperience)
  if (report.interviewExperience) {
    lines.push('', '## Interview experience', '', report.interviewExperience)
  }
  if (report.scholarshipExperience) {
    lines.push('', '## Scholarship experience', '', report.scholarshipExperience)
  }
  return `${lines.join('\n')}\n`
}
