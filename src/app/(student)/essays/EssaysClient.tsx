'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@/db/client'
import { useToast } from '@/components/ui/toast'
import { useLocale } from '@/components/shared/LocaleProvider'
import type { EssayFeedback } from '@/lib/essay-critique'

export type EssayRow = {
  id: string
  target_id: string | null
  title: string
  prompt: string
  content: string
  updated_at: string
}

export type FeedbackRow = { id: string; feedback: EssayFeedback; createdAt: string }

type TargetOption = { id: string; name: string; programme: string | null }

const FEEDBACK_SECTION_KEYS: Array<keyof EssayFeedback> = [
  'revisionPriorities', 'structure', 'specificity', 'evidenceAlignment', 'cliches',
]

// ── Copy (bilingual) ──────────────────────────────────────────

const T = {
  en: {
    sections: {
      revisionPriorities: 'Revision priorities',
      structure: 'Structure',
      specificity: 'Specificity',
      evidenceAlignment: 'Evidence alignment',
      cliches: 'Clichés',
    } as Partial<Record<keyof EssayFeedback, string>>,
    autosaveFailed: 'Autosave failed',
    createFailed: 'Could not create essay',
    quotaExceeded: 'Daily critique limit reached',
    critiqueFailed: 'Critique failed',
    pageTitle: 'Essay Studio',
    pageSubtitle: 'Your words, agent-grade critique — the AI reviews, it never writes.',
    newEssay: '+ New essay',
    migrationNotice: 'The essay tables are not enabled yet (waiting for a database migration). You can browse, but nothing can be saved.',
    emptyTitle: 'No essays yet',
    emptyDesc: 'Draft your personal statement here and get critique grounded in your real achievements — structure, specificity, clichés, and what evidence to use. The AI never writes it for you.',
    startFirstDraft: '+ Start your first draft',
    untitled: 'Untitled',
    feedbackRounds: (n: number) => `${n} feedback rounds · `,
    chars: (n: number) => `${n} chars`,
    noLinkedTarget: 'No linked target',
    titlePh: 'Essay title',
    promptPh: "The university's essay question / prompt (paste it here)",
    contentPh: "Write your draft here — in your own words. You'll get critique, not a rewrite.",
    saving: 'Saving…',
    saved: 'Saved',
    characters: (n: number) => `${n} characters`,
    delete: 'Delete',
    analysing: 'Analysing…',
    getCritique: 'Get critique',
    roundTitle: (n: number) => `Feedback round ${n}`,
  },
  zh: {
    sections: {
      revisionPriorities: '优先修改',
      structure: '结构',
      specificity: '具体性',
      evidenceAlignment: '证据对齐',
      cliches: '陈词滥调',
    } as Partial<Record<keyof EssayFeedback, string>>,
    autosaveFailed: '自动保存失败',
    createFailed: '无法创建文书',
    quotaExceeded: '今日反馈次数已用完',
    critiqueFailed: '反馈生成失败',
    pageTitle: '文书工作室',
    pageSubtitle: '你的文字，专业级点评 — AI 只评审，从不代写。',
    newEssay: '+ 新建文书',
    migrationNotice: '文书功能的数据表尚未启用（等待数据库迁移）。页面可浏览，暂不能保存。',
    emptyTitle: '还没有文书',
    emptyDesc: '在这里起草你的个人陈述，获得基于你真实经历的点评——结构、具体性、陈词滥调，以及该用哪些证据。AI 绝不会代写。',
    startFirstDraft: '+ 开始第一篇草稿',
    untitled: '未命名',
    feedbackRounds: (n: number) => `${n} 轮反馈 · `,
    chars: (n: number) => `${n} 字`,
    noLinkedTarget: '未关联目标',
    titlePh: '文书标题',
    promptPh: '大学的文书题目 / prompt（粘贴到这里）',
    contentPh: '在这里用你自己的话写草稿——你会得到点评，而不是改写。',
    saving: '保存中…',
    saved: '已保存',
    characters: (n: number) => `${n} 字`,
    delete: '删除',
    analysing: '分析中…',
    getCritique: '获取反馈',
    roundTitle: (n: number) => `第 ${n} 轮反馈`,
  },
}

export default function EssaysClient({ essays: initialEssays, feedback: initialFeedback, targets, userId, storageReady }: {
  essays: EssayRow[]
  feedback: Record<string, FeedbackRow[]>
  targets: TargetOption[]
  userId: string
  storageReady: boolean
}) {
  const supabase = createBrowserClient()
  const toast = useToast()
  const locale = useLocale()
  const t = T[locale]
  const [essays, setEssays] = useState<EssayRow[]>(initialEssays)
  const [feedback, setFeedback] = useState<Record<string, FeedbackRow[]>>(initialFeedback)
  const [activeId, setActiveId] = useState<string | null>(initialEssays[0]?.id ?? null)
  const [critiquing, setCritiquing] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const active = essays.find(e => e.id === activeId) ?? null
  const activeFeedback = activeId ? feedback[activeId] ?? [] : []

  function mutateActive(patch: Partial<EssayRow>) {
    if (!activeId) return
    setEssays(prev => prev.map(e => e.id === activeId ? { ...e, ...patch } : e))
    scheduleSave(activeId, patch)
  }

  function scheduleSave(id: string, patch: Partial<EssayRow>) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void persist(id), 900)
  }

  async function persist(id: string) {
    const essay = essaysRef.current.find(e => e.id === id)
    if (!essay) return
    setSaving(true)
    const { error } = await supabase
      .from('essays')
      .update({
        title: essay.title, prompt: essay.prompt, content: essay.content,
        target_id: essay.target_id, updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    setSaving(false)
    if (error) toast({ title: t.autosaveFailed, description: error.message, variant: 'error' })
  }

  // persist() reads through a ref so the debounce sees the latest keystrokes
  const essaysRef = useRef(essays)
  useEffect(() => { essaysRef.current = essays }, [essays])

  async function createEssay() {
    const { data, error } = await supabase
      .from('essays')
      .insert({ student_id: userId, title: 'Untitled essay' })
      .select('id, target_id, title, prompt, content, updated_at')
      .single()
    if (error || !data) { toast({ title: t.createFailed, description: error?.message, variant: 'error' }); return }
    setEssays(prev => [data as EssayRow, ...prev])
    setActiveId(data.id)
  }

  async function deleteEssay(id: string) {
    await supabase.from('essays').delete().eq('id', id)
    setEssays(prev => prev.filter(e => e.id !== id))
    if (activeId === id) setActiveId(null)
  }

  async function requestFeedback() {
    if (!active) return
    await persist(active.id) // critique what's on screen, not a stale save
    setCritiquing(true)
    try {
      const res = await fetch(`/api/essays/${active.id}/feedback`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) {
        toast({ title: res.status === 429 ? t.quotaExceeded : t.critiqueFailed, description: body.error, variant: 'error' })
        return
      }
      setFeedback(prev => ({
        ...prev,
        [active.id]: [{ id: body.id, feedback: body.feedback, createdAt: body.createdAt }, ...(prev[active.id] ?? [])],
      }))
    } finally {
      setCritiquing(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-40">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">{t.pageTitle}</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">{t.pageSubtitle}</div>
        </div>
        <button onClick={createEssay} disabled={!storageReady}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition disabled:opacity-50">
          {t.newEssay}
        </button>
      </div>

      <div className="p-[28px_36px] flex-1">
        {!storageReady && (
          <div className="mb-5 px-4 py-3 bg-[#FFFBEB] border border-[#FCD34D] rounded-[10px] text-[13px] text-[var(--amber)]">
            {t.migrationNotice}
          </div>
        )}

        {essays.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-[48px] mb-4">✍️</div>
            <div className="font-display font-bold text-[16px] text-[var(--t900)] mb-1">{t.emptyTitle}</div>
            <div className="text-[13px] text-[var(--t500)] mb-5 max-w-md">
              {t.emptyDesc}
            </div>
            {storageReady && (
              <button onClick={createEssay} className="px-4 py-2 rounded-[8px] text-[13px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition">
                {t.startFirstDraft}
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 grid-cols-1 lg:grid-cols-[240px_1fr] items-start">
            {/* Essay list */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] overflow-hidden">
              {essays.map(e => (
                <button key={e.id} onClick={() => setActiveId(e.id)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)] transition ${e.id === activeId ? 'bg-[var(--blue-50)]' : ''}`}>
                  <div className="text-[13px] font-semibold text-[var(--t900)] truncate">{e.title || t.untitled}</div>
                  <div className="text-[11px] text-[var(--t400)] mt-0.5">
                    {(feedback[e.id]?.length ?? 0) > 0 ? t.feedbackRounds(feedback[e.id].length) : ''}{t.chars(e.content.length)}
                  </div>
                </button>
              ))}
            </div>

            {/* Editor + feedback */}
            {active && (
              <div className="space-y-4">
                <div className="bg-white border border-[var(--border)] rounded-[10px] p-4 space-y-3">
                  <div className="flex gap-2">
                    <input value={active.title} onChange={e => mutateActive({ title: e.target.value })}
                      placeholder={t.titlePh}
                      className="flex-1 px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[14px] font-semibold focus:outline-none focus:border-[var(--blue)]" />
                    <select value={active.target_id ?? ''} onChange={e => mutateActive({ target_id: e.target.value || null })}
                      className="px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[12px] bg-white focus:outline-none focus:border-[var(--blue)]">
                      <option value="">{t.noLinkedTarget}</option>
                      {targets.map(t => (
                        <option key={t.id} value={t.id}>{t.name}{t.programme ? ` · ${t.programme}` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <input value={active.prompt} onChange={e => mutateActive({ prompt: e.target.value })}
                    placeholder={t.promptPh}
                    className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[12px] focus:outline-none focus:border-[var(--blue)] placeholder:text-[var(--t300)]" />
                  <textarea value={active.content} onChange={e => mutateActive({ content: e.target.value })}
                    placeholder={t.contentPh}
                    rows={16}
                    className="w-full px-3.5 py-3 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] leading-relaxed focus:outline-none focus:border-[var(--blue)] placeholder:text-[var(--t300)] resize-y" />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--t300)]">
                      {saving ? t.saving : t.saved} · {t.characters(active.content.length)}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => deleteEssay(active.id)}
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-[var(--red)] border border-[var(--border)] hover:border-[var(--red)] transition">
                        {t.delete}
                      </button>
                      <button onClick={requestFeedback} disabled={critiquing || active.content.trim().length < 80}
                        className="px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition disabled:opacity-50">
                        {critiquing ? t.analysing : t.getCritique}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Feedback history */}
                {activeFeedback.map((round, i) => (
                  <div key={round.id} className="bg-white border border-[var(--border)] rounded-[10px] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-display font-semibold text-[13px] text-[var(--t900)]">
                        {t.roundTitle(activeFeedback.length - i)}
                      </div>
                      <span className="text-[11px] text-[var(--t300)]">{new Date(round.createdAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-SG')}</span>
                    </div>
                    {round.feedback.overall && (
                      <p className="text-[13px] text-[var(--t700)] leading-relaxed mb-3">{round.feedback.overall}</p>
                    )}
                    <div className="space-y-2.5">
                      {FEEDBACK_SECTION_KEYS.map(key => {
                        const items = round.feedback[key]
                        if (!Array.isArray(items) || items.length === 0) return null
                        return (
                          <div key={key}>
                            <div className="text-[11px] font-semibold text-[var(--t500)] uppercase tracking-wider mb-1">{t.sections[key]}</div>
                            <ul className="space-y-1">
                              {items.map(item => (
                                <li key={item} className="text-[12px] text-[var(--t700)] leading-relaxed pl-3 border-l-2 border-[var(--blue-100)]">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
