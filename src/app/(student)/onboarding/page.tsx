'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/db/client'

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

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

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

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const allFilled = Object.values(form).every(v => v.trim() !== '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!allFilled) { setError('Please fill in all fields before continuing.'); return }

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
      setError(j.error ? `Save failed: ${j.error}` : 'Failed to save profile. Please try again.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  const inputClass = "w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-[13px] text-[var(--t900)] placeholder:text-[var(--t300)] focus:outline-none focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue-100)] transition bg-white"
  const selectClass = inputClass + " appearance-none cursor-pointer"
  const labelClass = "block text-[12px] font-semibold text-[var(--t700)] mb-1.5"

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
            Tell us about yourself
          </h1>
          <p className="text-[14px] text-[var(--t500)]">
            We&apos;ll build your personalised Singapore education roadmap based on your answers.
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
                <span className="font-display font-semibold text-[14px] text-[var(--t900)]">Where are you now?</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Current school year</label>
                  <select value={form.current_year} onChange={e => set('current_year', e.target.value)} className={selectClass} required>
                    <option value="">Select year…</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Current curriculum</label>
                  <select value={form.current_curriculum} onChange={e => set('current_curriculum', e.target.value)} className={selectClass} required>
                    <option value="">Select curriculum…</option>
                    {CURRICULA.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Current school <span className="text-[var(--t300)] font-normal">(or &quot;Not yet enrolled&quot;)</span></label>
                  <input
                    type="text"
                    value={form.current_school}
                    onChange={e => set('current_school', e.target.value)}
                    placeholder="e.g. ACS International, Not yet enrolled"
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
                <span className="font-display font-semibold text-[14px] text-[var(--t900)]">Where do you want to go?</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Target university</label>
                  <select value={form.target_school} onChange={e => set('target_school', e.target.value)} className={selectClass} required>
                    <option value="">Select university…</option>
                    {TARGET_SCHOOLS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Target programme</label>
                  <select value={form.programme_category} onChange={e => set('programme_category', e.target.value)} className={selectClass} required>
                    <option value="">Select programme…</option>
                    {PROGRAMME_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Application route</label>
                  <select value={form.application_route} onChange={e => set('application_route', e.target.value)} className={selectClass} required>
                    <option value="">Select your application route…</option>
                    {APPLICATION_ROUTES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>
                    Planned university enrollment year
                    <span className="text-[var(--t300)] font-normal ml-1">(when you aim to start university — sets your roadmap length)</span>
                  </label>
                  <select value={form.target_enrollment_year} onChange={e => set('target_enrollment_year', e.target.value)} className={selectClass} required>
                    <option value="">Select year…</option>
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
                <span className="font-display font-semibold text-[14px] text-[var(--t900)]">A bit more about you</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>
                    Extracurricular interests & strengths
                    <span className="text-[var(--t300)] font-normal ml-1">(helps us recommend competitions & CCAs)</span>
                  </label>
                  <textarea
                    value={form.interests}
                    onChange={e => set('interests', e.target.value)}
                    placeholder="e.g. Math Olympiad, piano, debate club, swimming…"
                    rows={2}
                    className={inputClass + " resize-none"}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Annual tuition budget (SGD)</label>
                    <select value={form.budget_range} onChange={e => set('budget_range', e.target.value)} className={selectClass} required>
                      <option value="">Select range…</option>
                      {BUDGETS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>English proficiency</label>
                    <select value={form.english_level} onChange={e => set('english_level', e.target.value)} className={selectClass} required>
                      <option value="">Select level…</option>
                      {ENGLISH.map(l => <option key={l} value={l}>{l}</option>)}
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
                    Saving your profile…
                  </>
                ) : (
                  'Generate my roadmap →'
                )}
              </button>
              <p className="text-center text-[11px] text-[var(--t300)] mt-2">
                You can update these details anytime from your profile settings.
              </p>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}
