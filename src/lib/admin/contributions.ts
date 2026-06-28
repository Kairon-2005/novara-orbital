// KB-contribution review (pure): status transition + the KB doc an approved
// contribution becomes. The route does the ingest I/O. See docs/PRD-admin.md §5/§8.

import { detectKbUniversity } from '@/lib/kb/university'
import type { KbContributionStatus } from '@/types/database'

export type ContributionAction = 'approve' | 'reject'

export function nextContributionStatus(
  current: KbContributionStatus,
  action: ContributionAction,
): KbContributionStatus {
  switch (action) {
    case 'approve': return 'approved'
    case 'reject': return 'rejected'
    default: return current
  }
}

export interface ContributionDoc {
  id: string
  title: string
  url?: string | null
  rawText: string
}

/** Render an approved contribution as a KB markdown doc (frontmatter + body). */
export function contributionToKbDoc(c: ContributionDoc, todayIso: string): string {
  const university = detectKbUniversity(c.title)
  const lines = [
    '---',
    `id: contrib-${c.id}`,
    `title: "${c.title.replace(/"/g, "'")}"`,
    'category: university-official',
    `university: ${university ?? 'null'}`,
    'topic: requirements',
    `source_urls: ${c.url ? `[${c.url}]` : '[]'}`,
    `last_verified: "${todayIso}"`,
    'refresh: manual',
    'language: en',
    '---',
    '',
    `# ${c.title}`,
    '',
    'Community-contributed official-page content, reviewed by an admin.',
    '',
    c.rawText,
  ]
  return `${lines.join('\n')}\n`
}
