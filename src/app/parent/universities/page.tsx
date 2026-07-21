// Parent read-only view of child's university wishlist
import { createServerClient } from '@/db/server'
import { redirect } from 'next/navigation'
import { getLocale } from '@/lib/locale-server'
import type { Locale } from '@/lib/locale'

const STATUS_LABEL: Record<Locale, Record<string, string>> = {
  en: {
    researching: '🔍 Researching',
    applied:     '📬 Applied',
    offer:       '🎉 Offer',
    rejected:    'Rejected',
    enrolled:    '✓ Enrolled',
  },
  zh: {
    researching: '🔍 研究中',
    applied:     '📬 已申请',
    offer:       '🎉 录取',
    rejected:    '未录取',
    enrolled:    '✓ 已入读',
  },
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  researching: { bg: '#EBF5FF', color: '#1A56DB' },
  applied:     { bg: '#FFFBEB', color: '#B45309' },
  offer:       { bg: '#F3FAF7', color: '#057A55' },
  rejected:    { bg: '#FDF2F2', color: '#E02424' },
  enrolled:    { bg: '#F3FAF7', color: '#057A55' },
}

const T = {
  en: {
    noLinkedStudent: 'No linked student found.',
    childFallback: 'Your child',
    pageTitle: 'Target universities',
    countLine: (n: number) => `${n} universit${n === 1 ? 'y' : 'ies'}`,
    empty: 'Your child hasn’t added any target universities yet.',
    deadline: '📅 Deadline: ',
    requirements: 'Admission requirements',
  },
  zh: {
    noLinkedStudent: '未找到已连接的学生账户。',
    childFallback: '孩子',
    pageTitle: '目标大学',
    countLine: (n: number) => `${n} 所大学`,
    empty: '孩子尚未添加目标大学。',
    deadline: '📅 截止日期: ',
    requirements: '录取要求',
  },
}

export default async function ParentUniversitiesPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locale = getLocale('zh')
  const t = T[locale]

  // Get linked student
  const { data: link } = await supabase
    .from('parent_links')
    .select('student_id')
    .eq('parent_id', user.id)
    .maybeSingle()

  if (!link?.student_id) {
    return (
      <div className="p-10 text-center text-[var(--t500)]">
        <p>{t.noLinkedStudent}</p>
      </div>
    )
  }

  const { data: targets } = await supabase
    .from('university_targets')
    .select('*')
    .eq('student_id', link.student_id)
    .order('created_at', { ascending: false })

  const { data: child } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', link.student_id)
    .single()

  const childName = child?.display_name ?? t.childFallback
  const statusLabel = STATUS_LABEL[locale]

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center sticky top-0 z-50">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">{t.pageTitle}</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">{childName} · {t.countLine(targets?.length ?? 0)}</div>
        </div>
      </div>

      <div className="p-[28px_36px] flex-1">
        {(!targets || targets.length === 0) ? (
          <div className="text-center py-16 text-[var(--t400)] text-[13px]">
            {t.empty}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {targets.map(t2 => {
              const sc = STATUS_STYLE[t2.status] ?? STATUS_STYLE.researching
              const label = statusLabel[t2.status] ?? t2.status
              return (
                <div key={t2.id} className="bg-white border border-[var(--border)] rounded-[12px] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-[15px] text-[var(--t900)]">{t2.name}</div>
                      {t2.programme && <div className="text-[12px] text-[var(--t500)] mt-0.5">{t2.programme}</div>}
                      {t2.country  && <div className="text-[11px] text-[var(--t400)] mt-0.5">{t2.country}</div>}
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-semibold flex-shrink-0"
                      style={{ background: sc.bg, color: sc.color }}>{label}</span>
                  </div>

                  {t2.deadline && (
                    <div className="mt-2 text-[11px] text-[var(--t500)]">
                      {t.deadline}<span className="font-semibold">{t2.deadline}</span>
                    </div>
                  )}

                  {t2.requirements && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)]">
                      <div className="text-[10px] font-bold text-[var(--t300)] uppercase tracking-wider mb-1.5">{t.requirements}</div>
                      <div className="text-[11px] text-[var(--t600)] leading-[1.65] line-clamp-4">
                        {t2.requirements}
                      </div>
                    </div>
                  )}

                  {t2.notes && (
                    <div className="mt-2 text-[11px] text-[var(--t500)] italic">{t2.notes}</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
