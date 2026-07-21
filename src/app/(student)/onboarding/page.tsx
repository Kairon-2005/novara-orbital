'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/db/client'
import { useLocale } from '@/components/shared/LocaleProvider'
import type { Locale } from '@/lib/locale'

const YEARS = ['Year 7 (12–13)', 'Year 8 (13–14)', 'Year 9 (14–15)', 'Year 10 (15–16)', 'Year 11 (16–17)', 'Year 12 (17–18)', 'Year 13 (18–19)']
// value must match the DB CHECK constraint; label is what the user sees
const CURRICULA: Array<{ label: string; value: string }> = [
  { label: 'IB', value: 'IB' },
  { label: 'A-Level', value: 'A-Level' },
  { label: 'AP', value: 'AP' },
  { label: 'O-Level', value: 'O-Level' },
  { label: 'Not yet enrolled', value: 'Not enrolled' },
]
const BUDGETS: Array<{ label: string; value: string }> = [
  { label: '< SGD 30k / year', value: '<30k' },
  { label: 'SGD 30k – 50k', value: '30-50k' },
  { label: 'SGD 50k – 80k', value: '50-80k' },
  { label: '> SGD 80k', value: '>80k' },
]
const ENGLISH = ['Beginner', 'Intermediate', 'Advanced']
const NOW_YEAR = new Date().getFullYear()
const ENROLL_YEARS = Array.from({ length: 9 }, (_, i) => NOW_YEAR + i)

// MVP target scope: NUS / NTU, three programme tracks, the supported routes.
const TARGET_SCHOOLS: Array<{ label: string; value: string }> = [
  { label: 'NUS', value: 'NUS' },
  { label: 'NTU', value: 'NTU' },
  { label: 'NUS or NTU (both)', value: 'Both' },
]
const PROGRAMME_CATEGORIES: Array<{ label: string; value: string }> = [
  { label: 'Computer Science / AI / Data', value: 'CS_AI_Data' },
  { label: 'Business / Finance / Economics', value: 'Business_Finance_Econ' },
  { label: 'Engineering', value: 'Engineering' },
]
const APPLICATION_ROUTES: Array<{ label: string; value: string }> = [
  { label: 'IB', value: 'IB' },
  { label: 'International A-Level', value: 'A_Level' },
  { label: 'AP / American High School', value: 'AP' },
  { label: '中国高考 (Gaokao)', value: 'Gaokao' },
  { label: 'Other', value: 'Other' },
  { label: "I'm not sure yet", value: 'Unknown' },
]

// ── copy ─────────────────────────────────────────────────────────────────────
// Display labels only — the option values saved to the DB never change.

const T = {
  en: {
    // option label overrides, keyed by value; missing keys fall back to the EN label
    yearLabels: {} as Record<string, string>,
    curriculumLabels: {} as Record<string, string>,
    budgetLabels: {} as Record<string, string>,
    englishLabels: {} as Record<string, string>,
    schoolLabels: {} as Record<string, string>,
    programmeLabels: {} as Record<string, string>,
    routeLabels: {} as Record<string, string>,
    fillAllFields: 'Please fill in all fields before continuing.',
    saveFailedWith: (e: string) => `Save failed: ${e}`,
    saveFailed: 'Failed to save profile. Please try again.',
    titleEditing: 'Your profile',
    titleNew: 'Tell us about yourself',
    subEditing: 'Review your details — change any field and save. Your roadmap and assessment use this.',
    subNew: 'We’ll build your personalised Singapore education roadmap based on your answers.',
    section1: 'Where are you now?',
    currentSchoolYear: 'Current school year',
    selectYear: 'Select year…',
    currentCurriculum: 'Current curriculum',
    selectCurriculum: 'Select curriculum…',
    currentSchool: 'Current school',
    currentSchoolHint: <>(or &quot;Not yet enrolled&quot;)</>,
    schoolPlaceholder: 'e.g. ACS International, Not yet enrolled',
    section2: 'Where do you want to go?',
    targetUniversity: 'Target university',
    selectUniversity: 'Select university…',
    targetProgramme: 'Target programme',
    selectProgramme: 'Select programme…',
    applicationRoute: 'Application route',
    selectRoute: 'Select your application route…',
    enrollmentYear: 'Planned university enrollment year',
    enrollmentYearHint: '(when you aim to start university — sets your roadmap length)',
    section3: 'A bit more about you',
    interests: 'Extracurricular interests & strengths',
    interestsHint: '(helps us recommend competitions & CCAs)',
    interestsPlaceholder: 'e.g. Math Olympiad, piano, debate club, swimming…',
    budget: 'Annual tuition budget (SGD)',
    selectRange: 'Select range…',
    english: 'English proficiency',
    selectLevel: 'Select level…',
    saving: 'Saving your profile…',
    saveChanges: 'Save changes',
    generateRoadmap: 'Generate my roadmap →',
    updateAnytime: 'You can update these details anytime from your profile settings.',
  },
  zh: {
    yearLabels: {
      'Year 7 (12–13)': '7 年级（12–13 岁）',
      'Year 8 (13–14)': '8 年级（13–14 岁）',
      'Year 9 (14–15)': '9 年级（14–15 岁）',
      'Year 10 (15–16)': '10 年级（15–16 岁）',
      'Year 11 (16–17)': '11 年级（16–17 岁）',
      'Year 12 (17–18)': '12 年级（17–18 岁）',
      'Year 13 (18–19)': '13 年级（18–19 岁）',
    } as Record<string, string>,
    curriculumLabels: {
      'Not enrolled': '尚未入学',
    } as Record<string, string>,
    budgetLabels: {
      '<30k': '每年 3 万新币以下',
      '30-50k': '3 万 – 5 万新币',
      '50-80k': '5 万 – 8 万新币',
      '>80k': '8 万新币以上',
    } as Record<string, string>,
    englishLabels: {
      Beginner: '初级',
      Intermediate: '中级',
      Advanced: '高级',
    } as Record<string, string>,
    schoolLabels: {
      Both: 'NUS 或 NTU（都考虑）',
    } as Record<string, string>,
    programmeLabels: {
      CS_AI_Data: '计算机科学 / 人工智能 / 数据',
      Business_Finance_Econ: '商科 / 金融 / 经济',
      Engineering: '工程',
    } as Record<string, string>,
    routeLabels: {
      A_Level: '国际 A-Level',
      AP: 'AP / 美国高中',
      Gaokao: '中国高考',
      Other: '其他',
      Unknown: '还不确定',
    } as Record<string, string>,
    fillAllFields: '请先填写所有字段再继续。',
    saveFailedWith: (e: string) => `保存失败：${e}`,
    saveFailed: '资料保存失败，请重试。',
    titleEditing: '你的个人资料',
    titleNew: '介绍一下你自己',
    subEditing: '检查你的资料 — 可修改任意字段后保存。路线图和评估都基于这些信息。',
    subNew: '我们会根据你的回答，为你定制专属的新加坡升学路线图。',
    section1: '你现在在哪个阶段？',
    currentSchoolYear: '当前年级',
    selectYear: '选择年级…',
    currentCurriculum: '当前课程体系',
    selectCurriculum: '选择课程体系…',
    currentSchool: '当前就读学校',
    currentSchoolHint: <>（或填&quot;尚未入学&quot;）</>,
    schoolPlaceholder: '例如：ACS International，或尚未入学',
    section2: '你想去哪里？',
    targetUniversity: '目标大学',
    selectUniversity: '选择大学…',
    targetProgramme: '目标专业',
    selectProgramme: '选择专业…',
    applicationRoute: '申请路径',
    selectRoute: '选择你的申请路径…',
    enrollmentYear: '计划入学年份',
    enrollmentYearHint: '（你计划开始读大学的年份 — 决定路线图的时长）',
    section3: '再多了解你一点',
    interests: '课外兴趣与特长',
    interestsHint: '（帮助我们推荐竞赛和课外活动）',
    interestsPlaceholder: '例如：数学奥赛、钢琴、辩论社、游泳…',
    budget: '每年学费预算（新币）',
    selectRange: '选择区间…',
    english: '英语水平',
    selectLevel: '选择水平…',
    saving: '正在保存你的资料…',
    saveChanges: '保存修改',
    generateRoadmap: '生成我的路线图 →',
    updateAnytime: '这些信息之后可以随时在个人资料设置中修改。',
  },
} satisfies Record<Locale, unknown>

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const locale = useLocale()
  const t = T[locale]

  const [form, setForm] = useState({
    current_year: '',
    current_school: '',
    current_curriculum: '',
    target_school: '',
    programme_category: '',
    application_route: '',
    target_enrollment_year: '',
    interests: '',
    budget_range: '',
    english_level: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hydrating, setHydrating] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  // Pre-fill the form with the saved profile so it doubles as a view/edit screen.
  useEffect(() => {
    let active = true
    fetch('/api/profile')
      .then(r => (r.ok ? r.json() : null))
      .then((d: { studentProfile?: Record<string, unknown> } | null) => {
        if (!active || !d?.studentProfile) return
        const sp = d.studentProfile
        const str = (v: unknown) => (v == null ? '' : String(v))
        setForm({
          current_year:           str(sp.current_year),
          current_school:         str(sp.current_school),
          current_curriculum:     str(sp.current_curriculum),
          target_school:          str(sp.target_school),
          programme_category:     str(sp.programme_category),
          application_route:      str(sp.application_route),
          target_enrollment_year: str(sp.target_enrollment_year),
          interests:              str(sp.interests),
          budget_range:           str(sp.budget_range),
          english_level:          str(sp.english_level),
        })
        if (sp.onboarding_done) setIsEditing(true)
      })
      .catch(() => {})
      .finally(() => { if (active) setHydrating(false) })
    return () => { active = false }
  }, [])

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const allFilled = Object.values(form).every(v => v.trim() !== '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!allFilled) { setError(t.fillAllFields); return }

    setLoading(true)
    setError('')

    // Save profile fields
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        // Keep the legacy free-text fields populated from the structured choices
        target_university: form.target_school,
        target_programme: PROGRAMME_CATEGORIES.find(c => c.value === form.programme_category)?.label ?? form.programme_category,
        target_enrollment_year: Number(form.target_enrollment_year),
        onboarding_done: true,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({} as { error?: string }))
      setError(j.error ? t.saveFailedWith(j.error) : t.saveFailed)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  const inputClass = "w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-[13px] text-[var(--t900)] placeholder:text-[var(--t300)] focus:outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue-100)] transition bg-white"
  const selectClass = inputClass + " appearance-none cursor-pointer"
  const labelClass = "block text-[12px] font-semibold text-[var(--t700)] mb-1.5"

  if (hydrating) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <svg className="animate-spin w-6 h-6 text-[var(--blue)]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 bg-[var(--blue)] rounded-xl flex items-center justify-center text-white font-display font-extrabold text-[20px]">N</div>
            <span className="font-display font-extrabold text-[22px] text-[var(--t900)]">Novara</span>
          </div>
          <h1 className="font-display font-bold text-[24px] text-[var(--t900)] mb-2">
            {isEditing ? t.titleEditing : t.titleNew}
          </h1>
          <p className="text-[14px] text-[var(--t500)]">
            {isEditing ? t.subEditing : t.subNew}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white border border-[var(--border)] rounded-2xl p-8 shadow-sm space-y-6">

            {error && (
              <div className="bg-[var(--red-50)] text-[var(--red)] text-[13px] px-4 py-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {/* Section 1: Where are you now */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-[var(--blue)] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">1</div>
                <span className="font-display font-semibold text-[14px] text-[var(--t900)]">{t.section1}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t.currentSchoolYear}</label>
                  <select value={form.current_year} onChange={e => set('current_year', e.target.value)} className={selectClass} required>
                    <option value="">{t.selectYear}</option>
                    {YEARS.map(y => <option key={y} value={y}>{t.yearLabels[y] ?? y}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t.currentCurriculum}</label>
                  <select value={form.current_curriculum} onChange={e => set('current_curriculum', e.target.value)} className={selectClass} required>
                    <option value="">{t.selectCurriculum}</option>
                    {CURRICULA.map(c => <option key={c.value} value={c.value}>{t.curriculumLabels[c.value] ?? c.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>{t.currentSchool} <span className="text-[var(--t300)] font-normal">{t.currentSchoolHint}</span></label>
                  <input
                    type="text"
                    value={form.current_school}
                    onChange={e => set('current_school', e.target.value)}
                    placeholder={t.schoolPlaceholder}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border)]" />

            {/* Section 2: Where do you want to go */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-[var(--blue)] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">2</div>
                <span className="font-display font-semibold text-[14px] text-[var(--t900)]">{t.section2}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t.targetUniversity}</label>
                  <select value={form.target_school} onChange={e => set('target_school', e.target.value)} className={selectClass} required>
                    <option value="">{t.selectUniversity}</option>
                    {TARGET_SCHOOLS.map(s => <option key={s.value} value={s.value}>{t.schoolLabels[s.value] ?? s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t.targetProgramme}</label>
                  <select value={form.programme_category} onChange={e => set('programme_category', e.target.value)} className={selectClass} required>
                    <option value="">{t.selectProgramme}</option>
                    {PROGRAMME_CATEGORIES.map(c => <option key={c.value} value={c.value}>{t.programmeLabels[c.value] ?? c.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>{t.applicationRoute}</label>
                  <select value={form.application_route} onChange={e => set('application_route', e.target.value)} className={selectClass} required>
                    <option value="">{t.selectRoute}</option>
                    {APPLICATION_ROUTES.map(r => <option key={r.value} value={r.value}>{t.routeLabels[r.value] ?? r.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>
                    {t.enrollmentYear}
                    <span className="text-[var(--t300)] font-normal ml-1">{t.enrollmentYearHint}</span>
                  </label>
                  <select value={form.target_enrollment_year} onChange={e => set('target_enrollment_year', e.target.value)} className={selectClass} required>
                    <option value="">{t.selectYear}</option>
                    {ENROLL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border)]" />

            {/* Section 3: About you */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-[var(--blue)] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">3</div>
                <span className="font-display font-semibold text-[14px] text-[var(--t900)]">{t.section3}</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>
                    {t.interests}
                    <span className="text-[var(--t300)] font-normal ml-1">{t.interestsHint}</span>
                  </label>
                  <textarea
                    value={form.interests}
                    onChange={e => set('interests', e.target.value)}
                    placeholder={t.interestsPlaceholder}
                    rows={2}
                    className={inputClass + " resize-none"}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t.budget}</label>
                    <select value={form.budget_range} onChange={e => set('budget_range', e.target.value)} className={selectClass} required>
                      <option value="">{t.selectRange}</option>
                      {BUDGETS.map(b => <option key={b.value} value={b.value}>{t.budgetLabels[b.value] ?? b.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{t.english}</label>
                    <select value={form.english_level} onChange={e => set('english_level', e.target.value)} className={selectClass} required>
                      <option value="">{t.selectLevel}</option>
                      {ENGLISH.map(l => <option key={l} value={l}>{t.englishLabels[l] ?? l}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !allFilled}
                className="w-full py-3 bg-[var(--blue)] hover:bg-[var(--blue-h)] text-white font-semibold text-[15px] rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    {t.saving}
                  </>
                ) : (
                  isEditing ? t.saveChanges : t.generateRoadmap
                )}
              </button>
              <p className="text-center text-[11px] text-[var(--t300)] mt-2">
                {t.updateAnytime}
              </p>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}
