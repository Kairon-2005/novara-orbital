// Public, fully-anonymized view of a single VERIFIED case — the shareable target.
// No author, no proof, no interaction. Unverified/missing cases are not shareable.

import Link from 'next/link'
import { createServerClient } from '@/db/server'
import { getLocale } from '@/lib/locale-server'
import { formatBgLine } from '@/lib/community'
import { VerifiedBadge } from '../../CasesTab'

const T = {
  en: {
    loginRequired: 'Please log in to view this case.',
    notShareable: 'This case isn’t available to share.',
    backToCommunity: '← Back to community',
    community: '← Community',
    admissionExperience: 'Admission experience',
    interviewExperience: 'Interview experience',
    scholarshipExperience: 'Scholarship experience',
    activitiesLabel: 'Activities:',
    footer: 'Verified community case · anonymized. Anecdotal single data point — verify against official sources.',
  },
  zh: {
    loginRequired: '请登录后查看此案例。',
    notShareable: '该案例暂不可分享。',
    backToCommunity: '← 返回社区',
    community: '← 社区',
    admissionExperience: '申请经验',
    interviewExperience: '面试经验',
    scholarshipExperience: '奖学金经验',
    activitiesLabel: '活动：',
    footer: '已验证的社区案例 · 已匿名化。仅为个例，请以官方信息为准。',
  },
}

export default async function SharedCasePage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = T[getLocale('en')]
  if (!user) return <p className="p-10 text-red-500">{t.loginRequired}</p>

  const { data: r } = await supabase
    .from('admission_reports')
    .select('institution, programme, level, route, result, apply_year, grades, english_test, standardized_tests, activities, scholarship_name, admission_experience, interview_experience, scholarship_experience, verification_status, moderation_status')
    .eq('id', params.id)
    .maybeSingle()

  if (!r || r.verification_status !== 'verified' || r.moderation_status !== 'approved') {
    return (
      <div className="page-content max-w-[720px]">
        <p className="text-[14px] text-[var(--t500)] p-10 text-center">{t.notShareable}</p>
        <div className="text-center"><Link href="/community" className="text-[var(--blue)] text-[13px] font-semibold">{t.backToCommunity}</Link></div>
      </div>
    )
  }

  const sections: [string, string | null][] = [
    [t.admissionExperience, r.admission_experience],
    [t.interviewExperience, r.interview_experience],
    [t.scholarshipExperience, r.scholarship_experience],
  ]

  return (
    <div className="page-content max-w-[720px]">
      <Link href="/community" className="text-[13px] text-[var(--blue)] font-semibold">{t.community}</Link>
      <div className="card p-5 mt-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#F3FAF7] text-[#057A55]">{r.result}</span>
          <VerifiedBadge status={r.verification_status} />
          {r.scholarship_name && <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#FDF6B2] text-[#8E4B10]">🏅 {r.scholarship_name}</span>}
        </div>
        <h1 className="font-display font-bold text-[20px] text-[var(--t900)] mt-2">
          {r.institution}{r.programme ? ` — ${r.programme}` : ''}
          <span className="text-[var(--t300)] font-semibold text-[14px]"> · {r.apply_year}</span>
        </h1>
        <div className="text-[12px] text-[var(--t500)] mt-1">{formatBgLine({ route: r.route, grades: r.grades, englishTest: r.english_test, standardizedTests: r.standardized_tests })}</div>
        {r.activities && <div className="text-[12px] text-[var(--t500)] mt-1"><span className="font-semibold">{t.activitiesLabel}</span> {r.activities}</div>}
        {sections.map(([title, text]) => text ? (
          <section key={title} className="mt-5">
            <h2 className="font-display font-semibold text-[14px] text-[var(--t900)] mb-1.5">{title}</h2>
            <p className="text-[13px] leading-relaxed text-[var(--t500)] whitespace-pre-wrap">{text}</p>
          </section>
        ) : null)}
        <p className="text-[11px] text-[var(--t300)] mt-6 pt-4 border-t border-[var(--border)]">
          {t.footer}
        </p>
      </div>
    </div>
  )
}
