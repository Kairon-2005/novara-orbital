import { describe, it, expect } from 'vitest'
import { nextContributionStatus, contributionToKbDoc } from '@/lib/admin/contributions'

describe('nextContributionStatus', () => {
  it('approves and rejects', () => {
    expect(nextContributionStatus('pending', 'approve')).toBe('approved')
    expect(nextContributionStatus('pending', 'reject')).toBe('rejected')
  })
  it('leaves status unchanged for an unknown action', () => {
    // @ts-expect-error bad action at runtime
    expect(nextContributionStatus('pending', 'nope')).toBe('pending')
  })
})

describe('contributionToKbDoc', () => {
  it('renders frontmatter + body with the title, source URL and content', () => {
    const md = contributionToKbDoc(
      { id: 'abc', title: 'NUS CS deadlines', url: 'https://nus.edu.sg/oam', rawText: 'Apply by 15 Oct.' },
      '2026-06-28',
    )
    expect(md).toContain('id: contrib-abc')
    expect(md).toContain('NUS CS deadlines')
    expect(md).toContain('https://nus.edu.sg/oam')
    expect(md).toContain('Apply by 15 Oct.')
    expect(md).toContain('last_verified: "2026-06-28"')
  })
})
