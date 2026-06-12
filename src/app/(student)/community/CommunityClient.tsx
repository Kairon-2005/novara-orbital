'use client'

import { useMemo, useState } from 'react'
import { createBrowserClient } from '@/db/client'
import { useToast } from '@/components/ui/toast'
import {
  validateReport, displayAuthor, formatBgLine, applyReportFilters,
  normalizeParsedDraft, REPORT_ROUTES, REPORT_RESULTS,
} from '@/lib/community'
import type { ReportDraft, ReportFilters } from '@/lib/community'
import type { ReportLevel, ReportRoute, ReportResult } from '@/types/database'

// ── View models (built by the server page) ────────────────────

export interface ReportRowView {
  id: string
  authorId: string
  authorName: string
  anonymous: boolean
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
  verified: boolean
  upvotes: number
  upvotedByMe: boolean
  commentCount: number
  createdAt: string
}

interface CommentView {
  id: string
  authorId: string
  authorName: string
  anonymous: boolean
  body: string
  createdAt: string
}

interface Props {
  initialReports: ReportRowView[]
  userId: string
}

// ── Constants ─────────────────────────────────────────────────

const RESULT_CONFIG: Record<ReportResult, { label: string; bg: string; color: string }> = {
  offer:     { label: 'Offer',      bg: '#F3FAF7', color: '#057A55' },
  rejected:  { label: 'Rejected',   bg: '#FDF2F2', color: '#E02424' },
  waitlist:  { label: 'Waitlist',   bg: '#FFFBEB', color: '#B45309' },
  interview: { label: 'Interview',  bg: '#EBF5FF', color: '#1A56DB' },
}

const LEVEL_LABEL: Record<ReportLevel, string> = {
  secondary: 'Secondary school',
  undergraduate: 'Undergraduate',
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR + 2 - 2015 + 1 }, (_, i) => CURRENT_YEAR + 2 - i)

const inputCls = 'w-full px-3 py-2 border border-[var(--border)] rounded-lg text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--blue-100)]'
const labelCls = 'block text-[11px] font-bold text-[var(--t300)] uppercase tracking-wide mb-1'

function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

// ── Component ─────────────────────────────────────────────────

const EMPTY_DRAFT: ReportDraft = {
  level: 'undergraduate',
  institution: '',
  programme: '',
  route: 'IB',
  result: 'offer',
  applyYear: CURRENT_YEAR,
  scholarshipName: '',
  grades: '',
  englishTest: '',
  standardizedTests: '',
  activities: '',
  admissionExperience: '',
  interviewExperience: '',
  scholarshipExperience: '',
  anonymous: true,
}

export default function CommunityClient({ initialReports, userId }: Props) {
  const supabase = createBrowserClient()
  const toast = useToast()

  const [reports, setReports] = useState(initialReports)
  const [filters, setFilters] = useState<ReportFilters>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Submit wizard state
  const [draft, setDraft] = useState<ReportDraft>(EMPTY_DRAFT)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [parsing, setParsing] = useState(false)

  // Comments state (loaded when a report is opened)
  const [comments, setComments] = useState<CommentView[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [commentAnon, setCommentAnon] = useState(true)
  const [commentSaving, setCommentSaving] = useState(false)

  const visible = useMemo(() => applyReportFilters(reports, filters), [reports, filters])
  const active = reports.find((r) => r.id === activeId) ?? null

  // ── Actions ─────────────────────────────────────────────────

  async function openReport(id: string) {
    setActiveId(id)
    setComments([])
    setCommentsLoading(true)
    const { data: rows } = await supabase
      .from('report_comments')
      .select('*')
      .eq('report_id', id)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: true })

    const namedIds = Array.from(new Set((rows ?? []).filter((c) => !c.anonymous).map((c) => c.author_id)))
    const { data: profiles } = namedIds.length > 0
      ? await supabase.from('profiles').select('id, display_name').in('id', namedIds)
      : { data: [] as { id: string; display_name: string }[] }
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]))

    setComments((rows ?? []).map((c) => ({
      id: c.id,
      authorId: c.author_id,
      authorName: nameById.get(c.author_id) ?? 'Anonymous',
      anonymous: c.anonymous,
      body: c.body,
      createdAt: c.created_at,
    })))
    setCommentsLoading(false)
  }

  async function toggleUpvote(report: ReportRowView) {
    const next = !report.upvotedByMe
    setReports((rs) => rs.map((r) =>
      r.id === report.id ? { ...r, upvotedByMe: next, upvotes: r.upvotes + (next ? 1 : -1) } : r
    ))
    const { error } = next
      ? await supabase.from('report_upvotes').insert({ user_id: userId, report_id: report.id })
      : await supabase.from('report_upvotes').delete().eq('user_id', userId).eq('report_id', report.id)
    if (error) {
      // Roll back the optimistic update.
      setReports((rs) => rs.map((r) =>
        r.id === report.id ? { ...r, upvotedByMe: report.upvotedByMe, upvotes: report.upvotes } : r
      ))
      toast({ title: 'Could not update your upvote', variant: 'error' })
    }
  }

  async function parseMaterial(file: File) {
    setParsing(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/community/parse-material', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const prefill = normalizeParsedDraft(data.draft)
      setDraft((d) => ({ ...d, ...prefill }))
      toast({ title: 'Form pre-filled from your document', description: 'Please review every field before publishing.' })
    } catch (e) {
      toast({ title: 'Could not parse the file', description: e instanceof Error ? e.message : undefined, variant: 'error' })
    } finally {
      setParsing(false)
    }
  }

  async function submitReport() {
    const result = validateReport(draft, CURRENT_YEAR)
    setErrors(result.errors as Record<string, string>)
    if (!result.valid) return

    setSaving(true)
    const { data, error } = await supabase
      .from('admission_reports')
      .insert({
        author_id: userId,
        anonymous: draft.anonymous ?? true,
        level: draft.level,
        institution: draft.institution.trim(),
        programme: draft.programme?.trim() || null,
        route: draft.route,
        result: draft.result,
        apply_year: draft.applyYear,
        scholarship_name: draft.scholarshipName?.trim() || null,
        grades: draft.grades?.trim() || null,
        english_test: draft.englishTest?.trim() || null,
        standardized_tests: draft.standardizedTests?.trim() || null,
        activities: draft.activities?.trim() || null,
        admission_experience: draft.admissionExperience.trim(),
        interview_experience: draft.interviewExperience?.trim() || null,
        scholarship_experience: draft.scholarshipExperience?.trim() || null,
      })
      .select()
      .single()
    setSaving(false)

    if (error || !data) {
      toast({ title: 'Failed to publish', description: error?.message, variant: 'error' })
      return
    }
    setReports((rs) => [{
      id: data.id,
      authorId: userId,
      authorName: 'Anonymous',
      anonymous: data.anonymous,
      level: data.level,
      institution: data.institution,
      programme: data.programme,
      route: data.route,
      result: data.result,
      applyYear: data.apply_year,
      scholarshipName: data.scholarship_name,
      grades: data.grades,
      englishTest: data.english_test,
      standardizedTests: data.standardized_tests,
      activities: data.activities,
      admissionExperience: data.admission_experience,
      interviewExperience: data.interview_experience,
      scholarshipExperience: data.scholarship_experience,
      verified: data.verified,
      upvotes: 0,
      upvotedByMe: false,
      commentCount: 0,
      createdAt: data.created_at,
    }, ...rs])
    setShowForm(false)
    setDraft(EMPTY_DRAFT)
    setErrors({})
    toast({ title: 'Report published 🎉', description: draft.anonymous ? 'Posted anonymously.' : undefined })
    // Fire-and-forget: push the anonymized report into the knowledge base so
    // the AI can cite community outcomes. Failure is non-blocking by design.
    fetch('/api/community/reports/ingest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reportId: data.id }),
    }).catch(() => { /* KB ingest is best-effort */ })
  }

  async function submitComment() {
    if (!active || !commentBody.trim()) return
    setCommentSaving(true)
    const { data, error } = await supabase
      .from('report_comments')
      .insert({ report_id: active.id, author_id: userId, anonymous: commentAnon, body: commentBody.trim() })
      .select()
      .single()
    setCommentSaving(false)
    if (error || !data) {
      toast({ title: 'Failed to comment', variant: 'error' })
      return
    }
    setComments((cs) => [...cs, {
      id: data.id, authorId: userId, authorName: 'Anonymous',
      anonymous: data.anonymous, body: data.body, createdAt: data.created_at,
    }])
    setReports((rs) => rs.map((r) => r.id === active.id ? { ...r, commentCount: r.commentCount + 1 } : r))
    setCommentBody('')
  }

  // ── Render: detail view ─────────────────────────────────────

  if (active) {
    const author = displayAuthor(active, userId)
    const rc = RESULT_CONFIG[active.result]
    return (
      <div className="page-content max-w-[760px]">
        <button onClick={() => setActiveId(null)} className="text-[13px] text-[var(--blue)] font-semibold mb-4 hover:underline">
          ← All reports
        </button>

        <div className="card p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: rc.bg, color: rc.color }}>{rc.label}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--blue-50)] text-[var(--blue)]">{LEVEL_LABEL[active.level]}</span>
            {active.scholarshipName && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#FDF6B2] text-[#8E4B10]">🏅 {active.scholarshipName}</span>
            )}
            <span className="text-[11px] text-[var(--t300)] ml-auto">{author.name}{author.isOwn && ' · Your report'} · {relativeDate(active.createdAt)}</span>
          </div>

          <h1 className="font-display font-bold text-[20px] text-[var(--t900)] mt-2">
            {active.institution}{active.programme ? ` — ${active.programme}` : ''}
            <span className="text-[var(--t300)] font-semibold text-[14px]"> · {active.applyYear}</span>
          </h1>
          <div className="text-[12px] text-[var(--t500)] mt-1">{formatBgLine(active)}</div>
          {active.activities && (
            <div className="text-[12px] text-[var(--t500)] mt-1"><span className="font-semibold">Activities:</span> {active.activities}</div>
          )}

          {([
            ['Admission experience', active.admissionExperience],
            ['Interview experience', active.interviewExperience],
            ['Scholarship experience', active.scholarshipExperience],
          ] as const).map(([title, text]) => text ? (
            <section key={title} className="mt-5">
              <h2 className="font-display font-semibold text-[14px] text-[var(--t900)] mb-1.5">{title}</h2>
              <p className="text-[13px] leading-relaxed text-[var(--t500)] whitespace-pre-wrap">{text}</p>
            </section>
          ) : null)}

          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-[var(--border)]">
            <button
              onClick={() => toggleUpvote(active)}
              className={`text-[13px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${active.upvotedByMe ? 'bg-[var(--blue-50)] border-[var(--blue)] text-[var(--blue)]' : 'border-[var(--border)] text-[var(--t500)] hover:border-[var(--blue)]'}`}
            >
              ▲ Helpful · {active.upvotes}
            </button>
            <span className="text-[12px] text-[var(--t300)]">{comments.length} comments</span>
          </div>
        </div>

        {/* Comments */}
        <div className="card p-5 mt-4">
          <h2 className="font-display font-semibold text-[14px] text-[var(--t900)] mb-3">Questions & comments</h2>
          {commentsLoading && <p className="text-[12px] text-[var(--t300)]">Loading…</p>}
          {!commentsLoading && comments.length === 0 && (
            <p className="text-[12px] text-[var(--t300)]">No comments yet — ask the first question.</p>
          )}
          {comments.map((c) => {
            const ca = displayAuthor(c, userId)
            return (
              <div key={c.id} className="py-2.5 border-b border-[var(--border)] last:border-0">
                <div className="text-[11px] text-[var(--t300)] mb-0.5">
                  {ca.name}{ca.isOwn && ' · You'} · {relativeDate(c.createdAt)}
                </div>
                <p className="text-[13px] text-[var(--t500)] whitespace-pre-wrap">{c.body}</p>
              </div>
            )
          })}

          <div className="mt-3">
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              rows={2}
              placeholder="Ask a follow-up question…"
              className={inputCls}
            />
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-1.5 text-[12px] text-[var(--t500)]">
                <input type="checkbox" checked={commentAnon} onChange={(e) => setCommentAnon(e.target.checked)} />
                Comment anonymously
              </label>
              <button
                onClick={submitComment}
                disabled={commentSaving || !commentBody.trim()}
                className="px-4 py-1.5 bg-[var(--blue)] text-white text-[12px] font-semibold rounded-lg disabled:opacity-50"
              >
                {commentSaving ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: submit form ─────────────────────────────────────

  if (showForm) {
    const err = (k: string) => errors[k] && <p className="text-[11px] text-red-500 mt-1">{errors[k]}</p>
    const set = (patch: Partial<ReportDraft>) => setDraft((d) => ({ ...d, ...patch }))
    return (
      <div className="page-content max-w-[680px]">
        <button onClick={() => setShowForm(false)} className="text-[13px] text-[var(--blue)] font-semibold mb-4 hover:underline">← Cancel</button>
        <h1 className="font-display font-bold text-[20px] text-[var(--t900)]">Share your admission result</h1>
        <p className="text-[13px] text-[var(--t500)] mt-1 mb-4">
          Structured reports help juniors calibrate. <span className="font-semibold">Posted anonymously by default</span> — your name is never shown unless you opt in.
        </p>

        {/* PDF auto-fill: parsed in memory, never stored; user reviews before publishing */}
        <label className="card flex items-center justify-between gap-3 p-4 mb-4 cursor-pointer hover:border-[var(--blue)] transition-colors">
          <div>
            <div className="text-[13px] font-semibold text-[var(--t900)]">⚡ Auto-fill from a document</div>
            <div className="text-[12px] text-[var(--t300)] mt-0.5">
              Upload your offer letter / application summary (PDF or image) — we extract the fields, you review. The file itself is never stored or shown to anyone.
            </div>
          </div>
          <span className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-[12px] font-semibold text-[var(--t500)] whitespace-nowrap">
            {parsing ? 'Parsing…' : 'Choose file'}
          </span>
          <input
            type="file"
            accept="application/pdf,image/*,.txt"
            className="hidden"
            disabled={parsing}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) parseMaterial(file)
              e.target.value = ''
            }}
          />
        </label>

        <div className="card p-5 mb-4">
          <h2 className="font-display font-semibold text-[14px] text-[var(--t900)] mb-3">1 · Outcome</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Level</label>
              <select value={draft.level} onChange={(e) => set({ level: e.target.value as ReportLevel })} className={inputCls}>
                <option value="undergraduate">Undergraduate</option>
                <option value="secondary">Secondary school</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Application year</label>
              <select value={draft.applyYear} onChange={(e) => set({ applyYear: Number(e.target.value) })} className={inputCls}>
                {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              {err('applyYear')}
            </div>
            <div>
              <label className={labelCls}>School / university</label>
              <input value={draft.institution} onChange={(e) => set({ institution: e.target.value })} placeholder="e.g. NUS, NTU, ACS (Independent)" className={inputCls} />
              {err('institution')}
            </div>
            <div>
              <label className={labelCls}>Programme {draft.level === 'secondary' && <span className="normal-case font-medium">(optional)</span>}</label>
              <input value={draft.programme} onChange={(e) => set({ programme: e.target.value })} placeholder="e.g. Computer Science" className={inputCls} />
              {err('programme')}
            </div>
            <div>
              <label className={labelCls}>Route</label>
              <select value={draft.route} onChange={(e) => set({ route: e.target.value as ReportRoute })} className={inputCls}>
                {REPORT_ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Result</label>
              <select value={draft.result} onChange={(e) => set({ result: e.target.value as ReportResult })} className={inputCls}>
                {REPORT_RESULTS.map((r) => <option key={r} value={r}>{RESULT_CONFIG[r].label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Scholarship (optional)</label>
              <input value={draft.scholarshipName} onChange={(e) => set({ scholarshipName: e.target.value })} placeholder="e.g. Nanyang Scholarship" className={inputCls} />
            </div>
          </div>
        </div>

        <div className="card p-5 mb-4">
          <h2 className="font-display font-semibold text-[14px] text-[var(--t900)] mb-1">2 · Background</h2>
          <p className="text-[12px] text-[var(--t300)] mb-3">Short and comparable — this becomes your report&apos;s BG line.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Grades / GPA</label>
              <input value={draft.grades} onChange={(e) => set({ grades: e.target.value })} placeholder='e.g. "IB 42/45 (HL AA 7)"' className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>English test</label>
              <input value={draft.englishTest} onChange={(e) => set({ englishTest: e.target.value })} placeholder='e.g. "IELTS 7.0 (W6.5)"' className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Standardized tests (optional)</label>
              <input value={draft.standardizedTests} onChange={(e) => set({ standardizedTests: e.target.value })} placeholder='e.g. "SAT 1520 · AP Calc BC 5"' className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Key activities (optional)</label>
              <input value={draft.activities} onChange={(e) => set({ activities: e.target.value })} placeholder='e.g. "SMO Silver · Robotics captain · 200h volunteering"' className={inputCls} />
            </div>
          </div>
        </div>

        <div className="card p-5 mb-4">
          <h2 className="font-display font-semibold text-[14px] text-[var(--t900)] mb-3">3 · Experience</h2>
          <label className={labelCls}>Admission experience</label>
          <textarea
            value={draft.admissionExperience}
            onChange={(e) => set({ admissionExperience: e.target.value })}
            rows={5}
            placeholder="Timeline, what you think mattered, what you'd do differently…"
            className={inputCls}
          />
          {err('admissionExperience')}
          <label className={`${labelCls} mt-3`}>Interview experience (optional)</label>
          <textarea value={draft.interviewExperience} onChange={(e) => set({ interviewExperience: e.target.value })} rows={3} placeholder="Format, questions asked, how you prepared…" className={inputCls} />
          <label className={`${labelCls} mt-3`}>Scholarship experience (optional)</label>
          <textarea value={draft.scholarshipExperience} onChange={(e) => set({ scholarshipExperience: e.target.value })} rows={3} placeholder="Application, interview, terms…" className={inputCls} />
        </div>

        <div className="card p-5 flex items-center justify-between">
          <label className="flex items-center gap-2 text-[13px] text-[var(--t500)]">
            <input type="checkbox" checked={draft.anonymous} onChange={(e) => set({ anonymous: e.target.checked })} />
            Post anonymously <span className="text-[var(--t300)]">(recommended — default)</span>
          </label>
          <button
            onClick={submitReport}
            disabled={saving}
            className="px-5 py-2 bg-[var(--blue)] text-white text-[13px] font-semibold rounded-lg disabled:opacity-50"
          >
            {saving ? 'Publishing…' : 'Publish report'}
          </button>
        </div>
      </div>
    )
  }

  // ── Render: feed ────────────────────────────────────────────

  return (
    <div className="page-content max-w-[860px]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-[22px] text-[var(--t900)]">Admission Reports</h1>
          <p className="text-[13px] text-[var(--t500)] mt-1">
            Real backgrounds, real outcomes — secondary school &amp; undergraduate only. Anonymous by default.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-[var(--blue)] text-white text-[13px] font-semibold rounded-lg whitespace-nowrap"
        >
          + Share your result
        </button>
      </div>

      {/* Filter bar */}
      <div className="card p-3 mt-4 mb-4 flex flex-wrap gap-2 items-center">
        <select value={filters.level ?? ''} onChange={(e) => setFilters((f) => ({ ...f, level: (e.target.value || undefined) as ReportLevel | undefined }))} className={`${inputCls} !w-auto`}>
          <option value="">All levels</option>
          <option value="undergraduate">Undergraduate</option>
          <option value="secondary">Secondary</option>
        </select>
        <select value={filters.route ?? ''} onChange={(e) => setFilters((f) => ({ ...f, route: (e.target.value || undefined) as ReportRoute | undefined }))} className={`${inputCls} !w-auto`}>
          <option value="">All routes</option>
          {REPORT_ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filters.result ?? ''} onChange={(e) => setFilters((f) => ({ ...f, result: (e.target.value || undefined) as ReportResult | undefined }))} className={`${inputCls} !w-auto`}>
          <option value="">All results</option>
          {REPORT_RESULTS.map((r) => <option key={r} value={r}>{RESULT_CONFIG[r].label}</option>)}
        </select>
        <select value={filters.applyYear ?? ''} onChange={(e) => setFilters((f) => ({ ...f, applyYear: e.target.value ? Number(e.target.value) : undefined }))} className={`${inputCls} !w-auto`}>
          <option value="">All years</option>
          {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <input
          value={filters.institution ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, institution: e.target.value || undefined }))}
          placeholder="Search school…"
          className={`${inputCls} !w-[180px] ml-auto`}
        />
      </div>

      {visible.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-[13px] text-[var(--t500)]">No reports match — be the first to share yours.</p>
        </div>
      )}

      {visible.map((r) => {
        const author = displayAuthor(r, userId)
        const rc = RESULT_CONFIG[r.result]
        return (
          <button key={r.id} onClick={() => openReport(r.id)} className="card w-full text-left p-4 mb-2.5 hover:border-[var(--blue)] transition-colors">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: rc.bg, color: rc.color }}>{rc.label}</span>
              <span className="text-[11px] font-semibold text-[var(--t300)]">{LEVEL_LABEL[r.level]} · {r.applyYear}</span>
              {r.scholarshipName && <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#FDF6B2] text-[#8E4B10]">🏅 Scholarship</span>}
              <span className="text-[11px] text-[var(--t300)] ml-auto">{author.name}{author.isOwn && ' · Your report'} · {relativeDate(r.createdAt)}</span>
            </div>
            <div className="font-semibold text-[14px] text-[var(--t900)] mt-1.5">
              {r.institution}{r.programme ? ` — ${r.programme}` : ''}
            </div>
            <div className="text-[12px] text-[var(--t500)] mt-0.5">{formatBgLine(r)}</div>
            <p className="text-[12px] text-[var(--t500)] mt-1.5 line-clamp-2">{r.admissionExperience}</p>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-[var(--t300)]">
              <span className={r.upvotedByMe ? 'text-[var(--blue)] font-semibold' : ''}>▲ {r.upvotes}</span>
              <span>💬 {r.commentCount}</span>
              {r.interviewExperience && <span>· interview notes</span>}
              {r.scholarshipExperience && <span>· scholarship notes</span>}
            </div>
          </button>
        )
      })}
    </div>
  )
}
