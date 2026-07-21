'use client'

import { useMemo, useState } from 'react'
import { createBrowserClient } from '@/db/client'
import { useToast } from '@/components/ui/toast'
import { useLocale } from '@/components/shared/LocaleProvider'
import type { Locale } from '@/lib/locale'
import CasesTab, { VerifiedBadge } from './CasesTab'
import NotificationBell from './NotificationBell'
import ShareButton from './ShareButton'
import {
  validateReport, displayAuthor, formatBgLine, applyReportFilters,
  normalizeParsedDraft, REPORT_ROUTES, REPORT_RESULTS,
} from '@/lib/community'
import type { ReportDraft, ReportFilters } from '@/lib/community'
import { applyVote, type MyVote } from '@/lib/community/vote'
import type { Database, ReportLevel, ReportRoute, ReportResult, VerificationStatus } from '@/types/database'

type ReportRow = Database['public']['Tables']['admission_reports']['Row']

interface Verdict {
  status: VerificationStatus
  conflicts: { field: string; claimed: string; found: string }[]
}

// ── View models (built by the server page) ────────────────────

export interface ReportRowView {
  id: string
  authorId: string
  penName: string | null
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
  verificationStatus: VerificationStatus
  upvotes: number
  downvotes: number
  myVote: MyVote
  savedByMe: boolean
  commentCount: number
  createdAt: string
}

interface CommentView {
  id: string
  authorId: string
  penName: string | null
  anonymous: boolean
  body: string
  createdAt: string
}

interface Props {
  initialReports: ReportRowView[]
  userId: string
}

// ── Constants ─────────────────────────────────────────────────

const RESULT_STYLE: Record<ReportResult, { bg: string; color: string }> = {
  offer:     { bg: '#F3FAF7', color: '#057A55' },
  rejected:  { bg: '#FDF2F2', color: '#E02424' },
  waitlist:  { bg: '#FFFBEB', color: '#B45309' },
  interview: { bg: '#EBF5FF', color: '#1A56DB' },
}

const RESULT_LABEL: Record<Locale, Record<ReportResult, string>> = {
  en: { offer: 'Offer', rejected: 'Rejected', waitlist: 'Waitlist', interview: 'Interview' },
  zh: { offer: 'Offer', rejected: '被拒', waitlist: '候补', interview: '面试' },
}

const LEVEL_LABEL: Record<Locale, Record<ReportLevel, string>> = {
  en: { secondary: 'Secondary school', undergraduate: 'Undergraduate' },
  zh: { secondary: '中学', undergraduate: '本科' },
}

const T = {
  en: {
    // Detail view
    allReports: '← All reports',
    yourReport: ' · Your report',
    activitiesLabel: 'Activities:',
    admissionExperience: 'Admission experience',
    interviewExperience: 'Interview experience',
    scholarshipExperience: 'Scholarship experience',
    upvote: '顶',
    downvote: '踩',
    saved: '🔖 已收藏',
    save: '🔖 收藏',
    commentsCount: (n: number) => `${n} comments`,
    commentsTitle: 'Questions & comments',
    loading: 'Loading…',
    noComments: 'No comments yet — ask the first question.',
    you: ' · You',
    commentPlaceholder: 'Ask a follow-up question…',
    commentAnonymously: 'Comment anonymously',
    posting: 'Posting…',
    post: 'Post',
    // Toasts
    voteFailed: 'Could not record your vote',
    saveFailed: 'Could not update your saves',
    prefilled: 'Form pre-filled from your document',
    prefilledDesc: 'Review every field — this document also verifies your case.',
    parseFailed: 'Could not auto-fill from the file',
    penNameRequired: 'Choose a pen name to post non-anonymously.',
    penNameSaveFailed: 'Could not save your pen name',
    penNameTaken: 'It may be taken — try another.',
    publishFailed: 'Failed to publish',
    mismatchToast: '⚠️ Evidence mismatch',
    mismatchToastDesc: 'Your proof contradicts some fields — see the details above.',
    publishedVerified: 'Report published & verified ✅',
    published: 'Report published 🎉',
    publishedVerifiedDesc: 'Your proof checks out — your case is now in the wiki.',
    publishedAddProof: 'Add a proof later to get a verified badge.',
    commentFailed: 'Failed to comment',
    // Submit form
    cancel: '← Cancel',
    formTitle: 'Share your admission result',
    formIntro: 'Structured reports help juniors calibrate. ',
    formIntroBold: 'Posted anonymously by default',
    formIntroTail: ' — your name is never shown unless you opt in.',
    proofTitle: '⚡ Auto-fill & verify from your proof',
    proofDesc: 'Upload your offer letter / transcript (PDF or image). We auto-fill the form and privately cross-check it to verify your case — verified cases get a badge and feed the wiki. Proof is stored privately and never shown to other users.',
    reading: 'Reading…',
    chooseFile: 'Choose file',
    removeProof: 'Remove proof',
    outcome: '1 · Outcome',
    level: 'Level',
    undergraduate: 'Undergraduate',
    secondarySchool: 'Secondary school',
    applicationYear: 'Application year',
    schoolUniversity: 'School / university',
    schoolPlaceholder: 'e.g. NUS, NTU, ACS (Independent)',
    programme: 'Programme',
    optionalSuffix: '(optional)',
    programmePlaceholder: 'e.g. Computer Science',
    route: 'Route',
    result: 'Result',
    scholarshipOptional: 'Scholarship (optional)',
    scholarshipPlaceholder: 'e.g. Nanyang Scholarship',
    background: '2 · Background',
    backgroundHint: 'Short and comparable — this becomes your report’s BG line.',
    gradesGpa: 'Grades / GPA',
    gradesPlaceholder: 'e.g. "IB 42/45 (HL AA 7)"',
    englishTest: 'English test',
    englishPlaceholder: 'e.g. "IELTS 7.0 (W6.5)"',
    standardizedOptional: 'Standardized tests (optional)',
    standardizedPlaceholder: 'e.g. "SAT 1520 · AP Calc BC 5"',
    activitiesOptional: 'Key activities (optional)',
    activitiesPlaceholder: 'e.g. "SMO Silver · Robotics captain · 200h volunteering"',
    experience: '3 · Experience',
    admissionExpPlaceholder: "Timeline, what you think mattered, what you'd do differently…",
    interviewOptional: 'Interview experience (optional)',
    interviewPlaceholder: 'Format, questions asked, how you prepared…',
    scholarshipExpOptional: 'Scholarship experience (optional)',
    scholarshipExpPlaceholder: 'Application, interview, terms…',
    verdictVerified: '✅ Verified — your proof supports your claim.',
    verdictMismatch: '⚠️ Evidence mismatch — your proof contradicts some fields:',
    verdictUnverified: '⏳ Not verified — add an offer letter / transcript to earn a verified badge.',
    conflictLine: (claimed: string, found: string) => <>: you wrote &ldquo;{claimed}&rdquo;, proof shows &ldquo;{found}&rdquo;.</>,
    postAnonymously: 'Post anonymously',
    recommendedDefault: '(recommended — default)',
    publishing: 'Publishing…',
    publishReport: 'Publish report',
    penNameLabel: 'Pen name (shown instead of your real name)',
    penNamePlaceholder: 'e.g. codewei',
    penNameHint: 'Your real name is never shown — only this pen name.',
    // Feed
    pageTitle: 'Admission Reports',
    pageSubtitle: <>Real backgrounds, real outcomes — secondary school &amp; undergraduate only. Anonymous by default.</>,
    shareYourResult: '+ Share your result',
    tabs: { feed: 'Feed', cases: 'Cases', saved: 'Saved', mine: 'Mine' },
    back: '← Back',
    publicCasesOf: (name: string) => <>{name}&rsquo;s public cases</>,
    allLevels: 'All levels',
    secondary: 'Secondary',
    allRoutes: 'All routes',
    allResults: 'All results',
    allYears: 'All years',
    searchSchool: 'Search school…',
    noReports: 'No reports match — be the first to share yours.',
    scholarshipBadge: '🏅 Scholarship',
    interviewNotes: '· interview notes',
    scholarshipNotes: '· scholarship notes',
    today: 'today',
    yesterday: 'yesterday',
    daysAgo: (n: number) => `${n}d ago`,
    monthsAgo: (n: number) => `${n}mo ago`,
    yearsAgo: (n: number) => `${n}y ago`,
  },
  zh: {
    // Detail view
    allReports: '← 全部汇报',
    yourReport: ' · 我的汇报',
    activitiesLabel: '活动：',
    admissionExperience: '申请经验',
    interviewExperience: '面试经验',
    scholarshipExperience: '奖学金经验',
    upvote: '顶',
    downvote: '踩',
    saved: '🔖 已收藏',
    save: '🔖 收藏',
    commentsCount: (n: number) => `${n} 条评论`,
    commentsTitle: '提问与评论',
    loading: '加载中…',
    noComments: '还没有评论——来提第一个问题吧。',
    you: ' · 我',
    commentPlaceholder: '追问一个问题…',
    commentAnonymously: '匿名评论',
    posting: '发布中…',
    post: '发布',
    // Toasts
    voteFailed: '投票未能保存',
    saveFailed: '收藏未能更新',
    prefilled: '已根据你的文件预填表单',
    prefilledDesc: '请检查每个字段——该文件同时用于验证你的案例。',
    parseFailed: '无法从文件自动填充',
    penNameRequired: '实名发布需要先设置笔名。',
    penNameSaveFailed: '笔名未能保存',
    penNameTaken: '可能已被占用——换一个试试。',
    publishFailed: '发布失败',
    mismatchToast: '⚠️ 证明材料不一致',
    mismatchToastDesc: '你的证明材料与部分字段不符——请查看上方详情。',
    publishedVerified: '汇报已发布并通过验证 ✅',
    published: '汇报已发布 🎉',
    publishedVerifiedDesc: '证明材料核验通过——你的案例已进入案例库。',
    publishedAddProof: '之后补充证明材料即可获得已验证标识。',
    commentFailed: '评论发布失败',
    // Submit form
    cancel: '← 取消',
    formTitle: '分享你的录取结果',
    formIntro: '结构化的汇报能帮助学弟学妹更好地定位自己。',
    formIntroBold: '默认匿名发布',
    formIntroTail: '——除非你主动选择，否则不会显示你的姓名。',
    proofTitle: '⚡ 用证明材料自动填充并验证',
    proofDesc: '上传你的 offer letter / 成绩单（PDF 或图片）。我们会自动填充表单，并私密交叉核验以验证你的案例——已验证的案例会获得标识并进入案例库。证明材料私密存储，绝不会展示给其他用户。',
    reading: '读取中…',
    chooseFile: '选择文件',
    removeProof: '移除证明材料',
    outcome: '1 · 录取结果',
    level: '阶段',
    undergraduate: '本科',
    secondarySchool: '中学',
    applicationYear: '申请年份',
    schoolUniversity: '学校 / 大学',
    schoolPlaceholder: '例如 NUS、NTU、ACS (Independent)',
    programme: '专业',
    optionalSuffix: '（选填）',
    programmePlaceholder: '例如 Computer Science',
    route: '课程体系',
    result: '结果',
    scholarshipOptional: '奖学金（选填）',
    scholarshipPlaceholder: '例如 Nanyang Scholarship',
    background: '2 · 背景',
    backgroundHint: '简短、可比——这会成为你汇报的背景（BG）一行。',
    gradesGpa: '成绩 / GPA',
    gradesPlaceholder: '例如 "IB 42/45 (HL AA 7)"',
    englishTest: '英语成绩',
    englishPlaceholder: '例如 "IELTS 7.0 (W6.5)"',
    standardizedOptional: '标化成绩（选填）',
    standardizedPlaceholder: '例如 "SAT 1520 · AP Calc BC 5"',
    activitiesOptional: '主要活动（选填）',
    activitiesPlaceholder: '例如 "SMO 银奖 · 机器人队队长 · 志愿服务 200 小时"',
    experience: '3 · 经验分享',
    admissionExpPlaceholder: '时间线、你认为起作用的因素、如果重来会怎么做…',
    interviewOptional: '面试经验（选填）',
    interviewPlaceholder: '形式、被问到的问题、你如何准备…',
    scholarshipExpOptional: '奖学金经验（选填）',
    scholarshipExpPlaceholder: '申请、面试、条款…',
    verdictVerified: '✅ 已验证——证明材料支持你填写的信息。',
    verdictMismatch: '⚠️ 信息不一致——证明材料与以下字段不符：',
    verdictUnverified: '⏳ 未验证——上传 offer letter / 成绩单即可获得已验证标识。',
    conflictLine: (claimed: string, found: string) => <>：你填写的是“{claimed}”，证明材料显示“{found}”。</>,
    postAnonymously: '匿名发布',
    recommendedDefault: '（推荐——默认）',
    publishing: '发布中…',
    publishReport: '发布汇报',
    penNameLabel: '笔名（代替真实姓名显示）',
    penNamePlaceholder: '例如 codewei',
    penNameHint: '你的真实姓名绝不会显示——只显示这个笔名。',
    // Feed
    pageTitle: '录取汇报',
    pageSubtitle: <>真实背景、真实结果——仅限中学与本科申请。默认匿名。</>,
    shareYourResult: '+ 分享你的结果',
    tabs: { feed: '经验', cases: '案例库', saved: '收藏', mine: '我的记录' },
    back: '← 返回',
    publicCasesOf: (name: string) => <>{name} 的公开案例</>,
    allLevels: '全部阶段',
    secondary: '中学',
    allRoutes: '全部体系',
    allResults: '全部结果',
    allYears: '全部年份',
    searchSchool: '搜索学校…',
    noReports: '没有符合条件的汇报——来发布第一条吧。',
    scholarshipBadge: '🏅 奖学金',
    interviewNotes: '· 面试经验',
    scholarshipNotes: '· 奖学金经验',
    today: '今天',
    yesterday: '昨天',
    daysAgo: (n: number) => `${n} 天前`,
    monthsAgo: (n: number) => `${n} 个月前`,
    yearsAgo: (n: number) => `${n} 年前`,
  },
} satisfies Record<Locale, unknown>

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR + 2 - 2015 + 1 }, (_, i) => CURRENT_YEAR + 2 - i)

const inputCls = 'w-full px-3 py-2 border border-[var(--border)] rounded-lg text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--blue-100)]'
const labelCls = 'block text-[11px] font-bold text-[var(--t300)] uppercase tracking-wide mb-1'

function relativeDate(iso: string, t: (typeof T)[Locale]): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return t.today
  if (days === 1) return t.yesterday
  if (days < 30) return t.daysAgo(days)
  if (days < 365) return t.monthsAgo(Math.floor(days / 30))
  return t.yearsAgo(Math.floor(days / 365))
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
  const locale = useLocale()
  const t = T[locale]
  const resultLabel = RESULT_LABEL[locale]
  const levelLabel = LEVEL_LABEL[locale]

  const [reports, setReports] = useState(initialReports)
  const [filters, setFilters] = useState<ReportFilters>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState<'feed' | 'cases' | 'saved' | 'mine'>('feed')

  // Submit wizard state
  const [draft, setDraft] = useState<ReportDraft>(EMPTY_DRAFT)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [parsing, setParsing] = useState(false)
  // Uploaded proof(s): auto-fill the form AND get stored privately for the
  // server-side AI cross-check. Kept in client state until the case is published.
  const [proofFiles, setProofFiles] = useState<File[]>([])
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [penNameInput, setPenNameInput] = useState('')
  // Set when the viewer taps a pen name to browse that author's public cases.
  const [viewingPenName, setViewingPenName] = useState<string | null>(null)

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
      ? await supabase.from('profiles').select('id, pen_name').in('id', namedIds)
      : { data: [] as { id: string; pen_name: string | null }[] }
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.pen_name]))

    setComments((rows ?? []).map((c) => ({
      id: c.id,
      authorId: c.author_id,
      penName: nameById.get(c.author_id) ?? null,
      anonymous: c.anonymous,
      body: c.body,
      createdAt: c.created_at,
    })))
    setCommentsLoading(false)
  }

  async function vote(report: ReportRowView, clicked: 1 | -1) {
    const next = applyVote({ myVote: report.myVote, upvotes: report.upvotes, downvotes: report.downvotes }, clicked)
    setReports((rs) => rs.map((r) => r.id === report.id ? { ...r, ...next } : r))
    let ok = false
    try {
      const res = await fetch(`/api/community/reports/${report.id}/vote`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: next.myVote }),
      })
      ok = res.ok
    } catch { ok = false }
    if (!ok) {
      // Roll back the optimistic update.
      setReports((rs) => rs.map((r) =>
        r.id === report.id ? { ...r, myVote: report.myVote, upvotes: report.upvotes, downvotes: report.downvotes } : r
      ))
      toast({ title: t.voteFailed, variant: 'error' })
    }
  }

  async function toggleSave(report: ReportRowView) {
    const next = !report.savedByMe
    setReports((rs) => rs.map((r) => r.id === report.id ? { ...r, savedByMe: next } : r))
    const { error } = next
      ? await supabase.from('report_saves').insert({ user_id: userId, report_id: report.id })
      : await supabase.from('report_saves').delete().eq('user_id', userId).eq('report_id', report.id)
    if (error) {
      setReports((rs) => rs.map((r) => r.id === report.id ? { ...r, savedByMe: report.savedByMe } : r))
      toast({ title: t.saveFailed, variant: 'error' })
    }
  }

  async function parseMaterial(file: File) {
    setParsing(true)
    // Keep the file as proof regardless of parse success — it backs verification.
    setProofFiles((fs) => [...fs, file])
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/community/parse-material', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const prefill = normalizeParsedDraft(data.draft)
      setDraft((d) => ({ ...d, ...prefill }))
      toast({ title: t.prefilled, description: t.prefilledDesc })
    } catch (e) {
      toast({ title: t.parseFailed, description: e instanceof Error ? e.message : undefined, variant: 'error' })
    } finally {
      setParsing(false)
    }
  }

  function removeProof(index: number) {
    setProofFiles((fs) => fs.filter((_, i) => i !== index))
  }

  async function submitReport() {
    const result = validateReport(draft, CURRENT_YEAR)
    setErrors(result.errors as Record<string, string>)
    if (!result.valid) return

    // Posting non-anonymously requires a pen name (display_name is never shown).
    if (draft.anonymous === false) {
      const pen = penNameInput.trim()
      if (!pen) {
        setErrors((e) => ({ ...e, penName: t.penNameRequired }))
        return
      }
      const { error: penErr } = await supabase.from('profiles').update({ pen_name: pen }).eq('id', userId)
      if (penErr) {
        toast({ title: t.penNameSaveFailed, description: t.penNameTaken, variant: 'error' })
        return
      }
    }

    // Server-side creation: the report, its private proof(s), and the AI
    // cross-check all happen behind /api/community/reports so verification
    // (and the wiki gate) cannot be bypassed from the client.
    setSaving(true)
    const form = new FormData()
    form.append('draft', JSON.stringify(draft))
    for (const f of proofFiles) form.append('proofs', f)
    form.append('proofKinds', JSON.stringify(proofFiles.map(() => 'offer_letter')))

    let payload: { report?: ReportRow; verdict?: Verdict; error?: string }
    try {
      const res = await fetch('/api/community/reports', { method: 'POST', body: form })
      payload = await res.json()
      if (!res.ok || !payload.report) throw new Error(payload.error ?? 'Failed to publish')
    } catch (e) {
      setSaving(false)
      toast({ title: t.publishFailed, description: e instanceof Error ? e.message : undefined, variant: 'error' })
      return
    }
    setSaving(false)

    const data = payload.report
    setReports((rs) => [{
      id: data.id,
      authorId: userId,
      penName: null,
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
      verificationStatus: data.verification_status,
      upvotes: 0,
      downvotes: 0,
      myVote: 0,
      savedByMe: false,
      commentCount: 0,
      createdAt: data.created_at,
    }, ...rs])

    const v = payload.verdict ?? { status: data.verification_status, conflicts: [] }
    setVerdict(v)
    if (v.status === 'mismatch') {
      // Keep the form open so the author can see the conflicts and correct them.
      toast({
        title: t.mismatchToast,
        description: t.mismatchToastDesc,
        variant: 'error',
      })
      return
    }
    setShowForm(false)
    setDraft(EMPTY_DRAFT)
    setProofFiles([])
    setErrors({})
    toast({
      title: v.status === 'verified' ? t.publishedVerified : t.published,
      description: v.status === 'verified'
        ? t.publishedVerifiedDesc
        : (proofFiles.length === 0 ? t.publishedAddProof : undefined),
    })
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
      toast({ title: t.commentFailed, variant: 'error' })
      return
    }
    setComments((cs) => [...cs, {
      id: data.id, authorId: userId, penName: null,
      anonymous: data.anonymous, body: data.body, createdAt: data.created_at,
    }])
    setReports((rs) => rs.map((r) => r.id === active.id ? { ...r, commentCount: r.commentCount + 1 } : r))
    setCommentBody('')
  }

  // ── Render: detail view ─────────────────────────────────────

  if (active) {
    const author = displayAuthor(active, userId)
    const rc = RESULT_STYLE[active.result]
    return (
      <div className="page-content max-w-[760px]">
        <button onClick={() => setActiveId(null)} className="text-[13px] text-[var(--blue)] font-semibold mb-4 hover:underline">
          {t.allReports}
        </button>

        <div className="card p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: rc.bg, color: rc.color }}>{resultLabel[active.result]}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--blue-50)] text-[var(--blue)]">{levelLabel[active.level]}</span>
            {active.scholarshipName && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#FDF6B2] text-[#8E4B10]">🏅 {active.scholarshipName}</span>
            )}
            <VerifiedBadge status={active.verificationStatus} />
            <span className="text-[11px] text-[var(--t300)] ml-auto">
              {!active.anonymous && !author.isOwn && author.name !== 'Anonymous' ? (
                <button onClick={() => setViewingPenName(author.name)} className="text-[var(--blue)] font-semibold hover:underline">{author.name}</button>
              ) : author.name}
              {author.isOwn && t.yourReport} · {relativeDate(active.createdAt, t)}
            </span>
          </div>

          <h1 className="font-display font-bold text-[20px] text-[var(--t900)] mt-2">
            {active.institution}{active.programme ? ` — ${active.programme}` : ''}
            <span className="text-[var(--t300)] font-semibold text-[14px]"> · {active.applyYear}</span>
          </h1>
          <div className="text-[12px] text-[var(--t500)] mt-1">{formatBgLine(active)}</div>
          {active.activities && (
            <div className="text-[12px] text-[var(--t500)] mt-1"><span className="font-semibold">{t.activitiesLabel}</span> {active.activities}</div>
          )}

          {([
            [t.admissionExperience, active.admissionExperience],
            [t.interviewExperience, active.interviewExperience],
            [t.scholarshipExperience, active.scholarshipExperience],
          ] as const).map(([title, text]) => text ? (
            <section key={title} className="mt-5">
              <h2 className="font-display font-semibold text-[14px] text-[var(--t900)] mb-1.5">{title}</h2>
              <p className="text-[13px] leading-relaxed text-[var(--t500)] whitespace-pre-wrap">{text}</p>
            </section>
          ) : null)}

          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[var(--border)]">
            <button
              onClick={() => vote(active, 1)}
              className={`text-[13px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${active.myVote === 1 ? 'bg-[var(--blue-50)] border-[var(--blue)] text-[var(--blue)]' : 'border-[var(--border)] text-[var(--t500)] hover:border-[var(--blue)]'}`}
            >
              ▲ {t.upvote} · {active.upvotes}
            </button>
            <button
              onClick={() => vote(active, -1)}
              className={`text-[13px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${active.myVote === -1 ? 'bg-[#FDF2F2] border-[#E02424] text-[#E02424]' : 'border-[var(--border)] text-[var(--t500)] hover:border-[#E02424]'}`}
            >
              ▼ {t.downvote} · {active.downvotes}
            </button>
            <button
              onClick={() => toggleSave(active)}
              className={`text-[13px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${active.savedByMe ? 'bg-[var(--blue-50)] border-[var(--blue)] text-[var(--blue)]' : 'border-[var(--border)] text-[var(--t500)] hover:border-[var(--blue)]'}`}
            >
              {active.savedByMe ? t.saved : t.save}
            </button>
            {active.verificationStatus === 'verified' && <ShareButton path={`/community/case/${active.id}`} />}
            <span className="text-[12px] text-[var(--t300)] ml-1">{t.commentsCount(comments.length)}</span>
          </div>
        </div>

        {/* Comments */}
        <div className="card p-5 mt-4">
          <h2 className="font-display font-semibold text-[14px] text-[var(--t900)] mb-3">{t.commentsTitle}</h2>
          {commentsLoading && <p className="text-[12px] text-[var(--t300)]">{t.loading}</p>}
          {!commentsLoading && comments.length === 0 && (
            <p className="text-[12px] text-[var(--t300)]">{t.noComments}</p>
          )}
          {comments.map((c) => {
            const ca = displayAuthor(c, userId)
            return (
              <div key={c.id} className="py-2.5 border-b border-[var(--border)] last:border-0">
                <div className="text-[11px] text-[var(--t300)] mb-0.5">
                  {ca.name}{ca.isOwn && t.you} · {relativeDate(c.createdAt, t)}
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
              placeholder={t.commentPlaceholder}
              className={inputCls}
            />
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-1.5 text-[12px] text-[var(--t500)]">
                <input type="checkbox" checked={commentAnon} onChange={(e) => setCommentAnon(e.target.checked)} />
                {t.commentAnonymously}
              </label>
              <button
                onClick={submitComment}
                disabled={commentSaving || !commentBody.trim()}
                className="px-4 py-1.5 bg-[var(--blue)] text-white text-[12px] font-semibold rounded-lg disabled:opacity-50"
              >
                {commentSaving ? t.posting : t.post}
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
        <button onClick={() => setShowForm(false)} className="text-[13px] text-[var(--blue)] font-semibold mb-4 hover:underline">{t.cancel}</button>
        <h1 className="font-display font-bold text-[20px] text-[var(--t900)]">{t.formTitle}</h1>
        <p className="text-[13px] text-[var(--t500)] mt-1 mb-4">
          {t.formIntro}<span className="font-semibold">{t.formIntroBold}</span>{t.formIntroTail}
        </p>

        {/* Proof upload: auto-fills the form AND backs the AI verification.
            Stored privately (owner-only); never shown to other users. */}
        <label className="card flex items-center justify-between gap-3 p-4 mb-2 cursor-pointer hover:border-[var(--blue)] transition-colors">
          <div>
            <div className="text-[13px] font-semibold text-[var(--t900)]">{t.proofTitle}</div>
            <div className="text-[12px] text-[var(--t300)] mt-0.5">
              {t.proofDesc}
            </div>
          </div>
          <span className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-[12px] font-semibold text-[var(--t500)] whitespace-nowrap">
            {parsing ? t.reading : t.chooseFile}
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
        {proofFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {proofFiles.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F3FAF7] text-[#057A55] rounded-lg text-[12px]">
                📎 {f.name}
                <button type="button" onClick={() => removeProof(i)} className="text-[#057A55] hover:opacity-70" aria-label={t.removeProof}>×</button>
              </span>
            ))}
          </div>
        )}
        {!proofFiles.length && <div className="mb-4" />}

        <div className="card p-5 mb-4">
          <h2 className="font-display font-semibold text-[14px] text-[var(--t900)] mb-3">{t.outcome}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t.level}</label>
              <select value={draft.level} onChange={(e) => set({ level: e.target.value as ReportLevel })} className={inputCls}>
                <option value="undergraduate">{t.undergraduate}</option>
                <option value="secondary">{t.secondarySchool}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.applicationYear}</label>
              <select value={draft.applyYear} onChange={(e) => set({ applyYear: Number(e.target.value) })} className={inputCls}>
                {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              {err('applyYear')}
            </div>
            <div>
              <label className={labelCls}>{t.schoolUniversity}</label>
              <input value={draft.institution} onChange={(e) => set({ institution: e.target.value })} placeholder={t.schoolPlaceholder} className={inputCls} />
              {err('institution')}
            </div>
            <div>
              <label className={labelCls}>{t.programme} {draft.level === 'secondary' && <span className="normal-case font-medium">{t.optionalSuffix}</span>}</label>
              <input value={draft.programme} onChange={(e) => set({ programme: e.target.value })} placeholder={t.programmePlaceholder} className={inputCls} />
              {err('programme')}
            </div>
            <div>
              <label className={labelCls}>{t.route}</label>
              <select value={draft.route} onChange={(e) => set({ route: e.target.value as ReportRoute })} className={inputCls}>
                {REPORT_ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.result}</label>
              <select value={draft.result} onChange={(e) => set({ result: e.target.value as ReportResult })} className={inputCls}>
                {REPORT_RESULTS.map((r) => <option key={r} value={r}>{resultLabel[r]}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{t.scholarshipOptional}</label>
              <input value={draft.scholarshipName} onChange={(e) => set({ scholarshipName: e.target.value })} placeholder={t.scholarshipPlaceholder} className={inputCls} />
            </div>
          </div>
        </div>

        <div className="card p-5 mb-4">
          <h2 className="font-display font-semibold text-[14px] text-[var(--t900)] mb-1">{t.background}</h2>
          <p className="text-[12px] text-[var(--t300)] mb-3">{t.backgroundHint}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t.gradesGpa}</label>
              <input value={draft.grades} onChange={(e) => set({ grades: e.target.value })} placeholder={t.gradesPlaceholder} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t.englishTest}</label>
              <input value={draft.englishTest} onChange={(e) => set({ englishTest: e.target.value })} placeholder={t.englishPlaceholder} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{t.standardizedOptional}</label>
              <input value={draft.standardizedTests} onChange={(e) => set({ standardizedTests: e.target.value })} placeholder={t.standardizedPlaceholder} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{t.activitiesOptional}</label>
              <input value={draft.activities} onChange={(e) => set({ activities: e.target.value })} placeholder={t.activitiesPlaceholder} className={inputCls} />
            </div>
          </div>
        </div>

        <div className="card p-5 mb-4">
          <h2 className="font-display font-semibold text-[14px] text-[var(--t900)] mb-3">{t.experience}</h2>
          <label className={labelCls}>{t.admissionExperience}</label>
          <textarea
            value={draft.admissionExperience}
            onChange={(e) => set({ admissionExperience: e.target.value })}
            rows={5}
            placeholder={t.admissionExpPlaceholder}
            className={inputCls}
          />
          {err('admissionExperience')}
          <label className={`${labelCls} mt-3`}>{t.interviewOptional}</label>
          <textarea value={draft.interviewExperience} onChange={(e) => set({ interviewExperience: e.target.value })} rows={3} placeholder={t.interviewPlaceholder} className={inputCls} />
          <label className={`${labelCls} mt-3`}>{t.scholarshipExpOptional}</label>
          <textarea value={draft.scholarshipExperience} onChange={(e) => set({ scholarshipExperience: e.target.value })} rows={3} placeholder={t.scholarshipExpPlaceholder} className={inputCls} />
        </div>

        {verdict && (
          <div
            className="card p-4 mb-4"
            style={{
              background: verdict.status === 'verified' ? '#F3FAF7' : verdict.status === 'mismatch' ? '#FDF2F2' : '#FFFBEB',
            }}
          >
            <div className="text-[13px] font-semibold" style={{ color: verdict.status === 'verified' ? '#057A55' : verdict.status === 'mismatch' ? '#E02424' : '#B45309' }}>
              {verdict.status === 'verified' && t.verdictVerified}
              {verdict.status === 'mismatch' && t.verdictMismatch}
              {(verdict.status === 'unverified' || verdict.status === 'pending') && t.verdictUnverified}
            </div>
            {verdict.status === 'mismatch' && verdict.conflicts.length > 0 && (
              <ul className="mt-2 text-[12px] text-[var(--t500)] list-disc pl-5">
                {verdict.conflicts.map((c, i) => (
                  <li key={i}><span className="font-semibold">{c.field}</span>{t.conflictLine(c.claimed, c.found)}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="card p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-[13px] text-[var(--t500)]">
              <input type="checkbox" checked={draft.anonymous} onChange={(e) => set({ anonymous: e.target.checked })} />
              {t.postAnonymously} <span className="text-[var(--t300)]">{t.recommendedDefault}</span>
            </label>
            <button
              onClick={submitReport}
              disabled={saving}
              className="px-5 py-2 bg-[var(--blue)] text-white text-[13px] font-semibold rounded-lg disabled:opacity-50"
            >
              {saving ? t.publishing : t.publishReport}
            </button>
          </div>
          {draft.anonymous === false && (
            <div className="mt-3">
              <label className={labelCls}>{t.penNameLabel}</label>
              <input
                value={penNameInput}
                onChange={(e) => setPenNameInput(e.target.value)}
                placeholder={t.penNamePlaceholder}
                className={inputCls}
              />
              {err('penName')}
              <p className="text-[11px] text-[var(--t300)] mt-1">{t.penNameHint}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Render: feed / cases ────────────────────────────────────

  const headerBlock = (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 className="font-display font-bold text-[22px] text-[var(--t900)]">{t.pageTitle}</h1>
        <p className="text-[13px] text-[var(--t500)] mt-1">
          {t.pageSubtitle}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-[var(--blue)] text-white text-[13px] font-semibold rounded-lg whitespace-nowrap"
        >
          {t.shareYourResult}
        </button>
      </div>
    </div>
  )

  const TAB_LABEL = t.tabs
  const tabBar = (
    <div className="flex gap-5 mt-4 border-b border-[var(--border)]">
      {(['feed', 'cases', 'saved', 'mine'] as const).map((t) => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`pb-2 -mb-px text-[13px] font-semibold ${tab === t ? 'text-[var(--blue)] border-b-2 border-[var(--blue)]' : 'text-[var(--t300)]'}`}
        >
          {TAB_LABEL[t]}
        </button>
      ))}
    </div>
  )

  // Another author's public (non-anonymous) cases — opened by tapping a pen name.
  if (viewingPenName) {
    return (
      <div className="page-content max-w-[860px]">
        {headerBlock}
        <button onClick={() => setViewingPenName(null)} className="text-[13px] text-[var(--blue)] font-semibold mt-4">{t.back}</button>
        <h2 className="font-display font-bold text-[18px] text-[var(--t900)] mt-2">{t.publicCasesOf(viewingPenName)}</h2>
        <CasesTab penName={viewingPenName} />
      </div>
    )
  }

  if (tab === 'cases' || tab === 'saved' || tab === 'mine') {
    return (
      <div className="page-content max-w-[860px]">
        {headerBlock}
        {tabBar}
        <CasesTab savedOnly={tab === 'saved'} mine={tab === 'mine'} />
      </div>
    )
  }

  return (
    <div className="page-content max-w-[860px]">
      {headerBlock}
      {tabBar}

      {/* Filter bar */}
      <div className="card p-3 mt-4 mb-4 flex flex-wrap gap-2 items-center">
        <select value={filters.level ?? ''} onChange={(e) => setFilters((f) => ({ ...f, level: (e.target.value || undefined) as ReportLevel | undefined }))} className={`${inputCls} !w-auto`}>
          <option value="">{t.allLevels}</option>
          <option value="undergraduate">{t.undergraduate}</option>
          <option value="secondary">{t.secondary}</option>
        </select>
        <select value={filters.route ?? ''} onChange={(e) => setFilters((f) => ({ ...f, route: (e.target.value || undefined) as ReportRoute | undefined }))} className={`${inputCls} !w-auto`}>
          <option value="">{t.allRoutes}</option>
          {REPORT_ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filters.result ?? ''} onChange={(e) => setFilters((f) => ({ ...f, result: (e.target.value || undefined) as ReportResult | undefined }))} className={`${inputCls} !w-auto`}>
          <option value="">{t.allResults}</option>
          {REPORT_RESULTS.map((r) => <option key={r} value={r}>{resultLabel[r]}</option>)}
        </select>
        <select value={filters.applyYear ?? ''} onChange={(e) => setFilters((f) => ({ ...f, applyYear: e.target.value ? Number(e.target.value) : undefined }))} className={`${inputCls} !w-auto`}>
          <option value="">{t.allYears}</option>
          {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <input
          value={filters.institution ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, institution: e.target.value || undefined }))}
          placeholder={t.searchSchool}
          className={`${inputCls} !w-[180px] ml-auto`}
        />
      </div>

      {visible.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-[13px] text-[var(--t500)]">{t.noReports}</p>
        </div>
      )}

      {visible.map((r) => {
        const author = displayAuthor(r, userId)
        const rc = RESULT_STYLE[r.result]
        return (
          <button key={r.id} onClick={() => openReport(r.id)} className="card w-full text-left p-4 mb-2.5 hover:border-[var(--blue)] transition-colors">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: rc.bg, color: rc.color }}>{resultLabel[r.result]}</span>
              <span className="text-[11px] font-semibold text-[var(--t300)]">{levelLabel[r.level]} · {r.applyYear}</span>
              <VerifiedBadge status={r.verificationStatus} />
              {r.scholarshipName && <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#FDF6B2] text-[#8E4B10]">{t.scholarshipBadge}</span>}
              <span className="text-[11px] text-[var(--t300)] ml-auto">{author.name}{author.isOwn && t.yourReport} · {relativeDate(r.createdAt, t)}</span>
            </div>
            <div className="font-semibold text-[14px] text-[var(--t900)] mt-1.5">
              {r.institution}{r.programme ? ` — ${r.programme}` : ''}
            </div>
            <div className="text-[12px] text-[var(--t500)] mt-0.5">{formatBgLine(r)}</div>
            <p className="text-[12px] text-[var(--t500)] mt-1.5 line-clamp-2">{r.admissionExperience}</p>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-[var(--t300)]">
              <span className={r.myVote === 1 ? 'text-[var(--blue)] font-semibold' : ''}>▲ {r.upvotes}</span>
              <span className={r.myVote === -1 ? 'text-[#E02424] font-semibold' : ''}>▼ {r.downvotes}</span>
              <span>💬 {r.commentCount}</span>
              {r.interviewExperience && <span>{t.interviewNotes}</span>}
              {r.scholarshipExperience && <span>{t.scholarshipNotes}</span>}
            </div>
          </button>
        )
      })}
    </div>
  )
}
