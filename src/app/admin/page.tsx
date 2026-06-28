import Link from 'next/link'
import { createServerClient } from '@/db/server'
import { buildAdminSummary, type AdminCounts } from '@/lib/admin/summary'

export const dynamic = 'force-dynamic'

async function count(p: PromiseLike<{ count: number | null }>): Promise<number> {
  const { count } = await p
  return count ?? 0
}

export default async function AdminDashboard() {
  const supabase = createServerClient()
  const reports = () => supabase.from('admission_reports').select('*', { count: 'exact', head: true })
  const comments = () => supabase.from('report_comments').select('*', { count: 'exact', head: true })

  const [users, reportsFlagged, commentsFlagged, casesVerified, casesMismatch, casesUnverified, casesPendingState, contributionsPending] = await Promise.all([
    count(supabase.from('profiles').select('*', { count: 'exact', head: true })),
    count(reports().eq('moderation_status', 'flagged')),
    count(comments().eq('moderation_status', 'flagged')),
    count(reports().eq('verification_status', 'verified')),
    count(reports().eq('verification_status', 'mismatch')),
    count(reports().eq('verification_status', 'unverified')),
    count(reports().eq('verification_status', 'pending')),
    count(supabase.from('kb_contributions').select('*', { count: 'exact', head: true }).eq('status', 'pending')),
  ])

  const counts: AdminCounts = {
    users,
    reportsFlagged,
    commentsFlagged,
    casesVerified,
    casesPending: casesUnverified + casesPendingState,
    casesMismatch,
    kbDocs: 0,
    contributionsPending,
  }
  const s = buildAdminSummary(counts)

  const cards: { label: string; value: number; href?: string; alert?: boolean }[] = [
    { label: 'Needs attention', value: s.needsAttention, alert: s.needsAttention > 0 },
    { label: 'Flagged reports', value: s.reportsFlagged, href: '/admin/moderation' },
    { label: 'Flagged comments', value: s.commentsFlagged, href: '/admin/moderation' },
    { label: 'Evidence mismatches', value: s.casesMismatch, href: '/admin/verification' },
    { label: 'Pending contributions', value: s.contributionsPending, href: '/admin/kb' },
    { label: 'Verified cases', value: s.casesVerified, href: '/admin/verification' },
    { label: 'Cases pending', value: s.casesPending, href: '/admin/verification' },
    { label: 'Users', value: s.users, href: '/admin/users' },
  ]

  return (
    <div className="page-content max-w-[860px]">
      <h1 className="font-display font-bold text-[22px] text-[var(--t900)]">Admin</h1>
      <p className="text-[13px] text-[var(--t500)] mt-1">Moderation, verification, knowledge base, and directory.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {cards.map((c) => {
          const inner = (
            <div className={`card p-4 ${c.alert ? 'border-[#E02424]' : ''}`}>
              <div className={`text-[24px] font-display font-bold ${c.alert ? 'text-[#E02424]' : 'text-[var(--t900)]'}`}>{c.value}</div>
              <div className="text-[11px] text-[var(--t300)] uppercase tracking-wide mt-0.5">{c.label}</div>
            </div>
          )
          return c.href ? <Link key={c.label} href={c.href}>{inner}</Link> : <div key={c.label}>{inner}</div>
        })}
      </div>
    </div>
  )
}
