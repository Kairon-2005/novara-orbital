// 申请就绪检查 — the "someone checked everything before you submit" safety net
// (pure). Cross-references the target's application plan against what the
// student has actually done: documents checked AND uploaded, deadlines alive
// and on the calendar, profile complete. No AI involved — this is bookkeeping,
// and bookkeeping must be deterministic.

import type { ApplicationPlan } from '@/lib/university-plan'

export type ReadinessItemStatus = 'ok' | 'missing' | 'warning'

export type ReadinessItem = {
  id: string
  label: string
  status: ReadinessItemStatus
  detail?: string
}

export type ReadinessReport = {
  /** True when nothing has status 'missing' — warnings don't block. */
  ready: boolean
  items: ReadinessItem[]
}

export type UploadedDoc = { fileName: string; fileType: string }

// Loose matching between a plan document title and an uploaded file. Keyword
// buckets keep this honest-but-forgiving; fallback is a name-substring check.
const DOC_KEYWORDS: Array<{ match: RegExp; fileTypes: string[]; nameHints: RegExp }> = [
  { match: /transcript|成绩/i, fileTypes: ['transcript', 'report_card'], nameHints: /transcript|成绩|grade/i },
  { match: /passport|护照/i, fileTypes: ['passport'], nameHints: /passport|护照/i },
  { match: /certificate|证书/i, fileTypes: ['certificate'], nameHints: /certificate|cert|证书/i },
  { match: /statement|essay|文书/i, fileTypes: ['application'], nameHints: /statement|essay|ps|文书/i },
  { match: /recommendation|referee|推荐/i, fileTypes: ['application', 'other'], nameHints: /recommendation|referee|推荐/i },
]

function hasMatchingUpload(docTitle: string, uploads: UploadedDoc[]): boolean {
  const bucket = DOC_KEYWORDS.find(k => k.match.test(docTitle))
  if (bucket) {
    return uploads.some(u => bucket.fileTypes.includes(u.fileType) || bucket.nameHints.test(u.fileName))
  }
  const firstWord = docTitle.trim().split(/\s+/)[0]?.toLowerCase() ?? ''
  return firstWord.length > 2 && uploads.some(u => u.fileName.toLowerCase().includes(firstWord))
}

export function checkSubmissionReadiness(input: {
  plan: ApplicationPlan | null
  uploadedDocs: UploadedDoc[]
  calendarEvents: Array<{ title: string; date: string }>
  profile: { curriculum?: string | null; englishLevel?: string | null; targetYear?: string | null }
  today: string
}): ReadinessReport {
  const items: ReadinessItem[] = []

  if (!input.plan) {
    items.push({ id: 'no_plan', label: '申请方案', status: 'missing', detail: '先为该目标生成申请方案（AI方案或官方页面导入）。' })
    return { ready: false, items }
  }
  const plan = input.plan

  // ── Documents ──
  for (const doc of plan.documents) {
    if (!doc.required) continue
    if (!doc.done) {
      items.push({ id: `doc:${doc.id}`, label: doc.title, status: 'missing', detail: '清单未勾选 — 材料还没准备好。' })
    } else if (!hasMatchingUpload(doc.title, input.uploadedDocs)) {
      items.push({ id: `doc:${doc.id}`, label: doc.title, status: 'warning', detail: '已勾选，但文档库里找不到对应文件 — 建议上传备份。' })
    } else {
      items.push({ id: `doc:${doc.id}`, label: doc.title, status: 'ok' })
    }
  }

  // ── Deadline alive? ──
  // The date you must not miss: the window close, else the earliest deadline.
  const closes = plan.applicationWindow?.closes ?? plan.deadlines.map(d => d.date).sort()[0]
  if (!closes) {
    items.push({ id: 'deadline_unknown', label: '截止日期', status: 'warning', detail: '方案里没有明确的截止日期 — 去官方页面确认。' })
  } else if (closes < input.today) {
    items.push({ id: 'deadline_passed', label: '截止日期', status: 'missing', detail: `申请已于 ${closes} 截止。` })
  } else {
    items.push({ id: 'deadline_alive', label: '截止日期', status: 'ok', detail: `${closes} 截止` })
    if (!input.calendarEvents.some(e => e.date === closes)) {
      items.push({ id: 'deadline_not_on_calendar', label: '日历提醒', status: 'warning', detail: '截止日期不在你的日历里 — 一键同步以免错过。' })
    }
  }

  // ── Profile ──
  const missingProfile = [
    !input.profile.curriculum && '课程体系',
    !input.profile.englishLevel && '英语水平',
    !input.profile.targetYear && '入学年份',
  ].filter(Boolean) as string[]
  if (missingProfile.length > 0) {
    items.push({ id: 'profile_incomplete', label: '个人档案', status: 'missing', detail: `缺少：${missingProfile.join('、')}` })
  } else {
    items.push({ id: 'profile_complete', label: '个人档案', status: 'ok' })
  }

  // ── Plan trust ──
  if (!plan.verified) {
    items.push({ id: 'plan_unverified', label: '方案来源', status: 'warning', detail: '方案未经官方页面核实 — 提交前请对照官网确认要求。' })
  }

  return { ready: !items.some(i => i.status === 'missing'), items }
}
