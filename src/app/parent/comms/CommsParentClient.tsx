'use client'

import { useState } from 'react'
import type { MockComm, CommStatus } from '@/lib/mock-data'

// ── Category labels ───────────────────────────────────────────────────────────

const CAT_ZH: Record<string, { zh: string; emoji: string; bg: string; color: string }> = {
  exam:    { zh: '考试',   emoji: '📝', bg: '#FDF2F2', color: '#E02424' },
  fee:     { zh: '费用',   emoji: '💰', bg: '#FFFBEB', color: '#B45309' },
  event:   { zh: '活动',   emoji: '📅', bg: '#EBF5FF', color: '#1A56DB' },
  policy:  { zh: '政策',   emoji: '📋', bg: '#F5F3FF', color: '#7C3AED' },
  welfare: { zh: '关怀',   emoji: '💚', bg: '#F3FAF7', color: '#057A55' },
  other:   { zh: '其他',   emoji: '📌', bg: '#F3F4F6', color: '#6B7280' },
}

// ── Comm card ─────────────────────────────────────────────────────────────────

function CommCard({ comm, onRead }: { comm: MockComm; onRead: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [showEn,   setShowEn]   = useState(false)
  const cat = CAT_ZH[comm.category] ?? CAT_ZH.other

  return (
    <div className={`bg-white border rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden transition-all ${
      comm.status === 'unread' && comm.urgent
        ? 'border-[#E02424]'
        : comm.status === 'unread'
        ? 'border-[var(--blue-100)]'
        : 'border-[var(--border)]'
    }`}>
      {/* Urgent banner */}
      {comm.urgent && comm.status === 'unread' && (
        <div className="bg-[#FDF2F2] px-4 py-1.5 flex items-center gap-2 border-b border-[#FECACA]">
          <span className="text-[11px] font-bold text-[#E02424]">⚠ 重要通知，请尽快查阅</span>
        </div>
      )}

      <div
        className={`px-5 py-4 cursor-pointer ${comm.status === 'unread' ? 'bg-[var(--blue-50)]/30' : ''}`}
        onClick={() => { setExpanded(v => !v); if (comm.status === 'unread') onRead(comm.id) }}
      >
        <div className="flex items-start gap-3">
          {/* Unread dot */}
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${comm.status === 'unread' ? 'bg-[var(--blue)]' : 'bg-transparent'}`} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: cat.bg, color: cat.color }}>
                {cat.emoji} {cat.zh}
              </span>
              {comm.status === 'unread' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--blue-50)] text-[var(--blue)]">
                  新通知
                </span>
              )}
              <span className="text-[11px] text-[var(--t300)] ml-auto">
                {new Date(comm.sent_date).toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric' })}
              </span>
            </div>

            {/* Chinese summary always visible */}
            <div className="text-[13px] font-semibold text-[var(--t900)] mb-1">{comm.subject}</div>
            <div className="text-[12px] text-[var(--t700)] leading-relaxed">{comm.summary_zh}</div>
          </div>

          <span className="text-[var(--t300)] text-[13px] flex-shrink-0">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 pt-0 border-t border-[var(--border)]">
          {/* Language toggle */}
          <div className="flex items-center gap-2 mt-4 mb-3">
            <span className="text-[11px] font-semibold text-[var(--t300)] uppercase tracking-wide">查看语言：</span>
            <button onClick={() => setShowEn(false)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium border-[1.5px] transition-all ${
                !showEn ? 'bg-[var(--blue-50)] text-[var(--blue)] border-[var(--blue)]'
                        : 'bg-white text-[var(--t700)] border-[var(--border)]'
              }`}>
              中文翻译
            </button>
            <button onClick={() => setShowEn(true)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium border-[1.5px] transition-all ${
                showEn ? 'bg-[var(--blue-50)] text-[var(--blue)] border-[var(--blue)]'
                       : 'bg-white text-[var(--t700)] border-[var(--border)]'
              }`}>
              原文英文
            </button>
          </div>

          <div className="bg-[var(--bg)] rounded-[8px] p-4">
            <div className="text-[12px] text-[var(--t700)] leading-relaxed whitespace-pre-line">
              {showEn ? comm.body_en : comm.body_zh}
            </div>
          </div>

          {!showEn && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--t300)]">
              <span>🤖</span>
              <span>由 Novara AI 翻译 · 如有疑问请以英文原文为准</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Upload placeholder ────────────────────────────────────────────────────────

function UploadNoticeCard() {
  const [dragging, setDragging] = useState(false)

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false) }}
      className={`border-2 border-dashed rounded-[10px] p-6 text-center transition-all cursor-pointer ${
        dragging ? 'border-[var(--blue)] bg-[var(--blue-50)]' : 'border-[var(--border)] bg-white hover:border-[var(--blue-100)] hover:bg-[var(--blue-50)]/30'
      }`}
    >
      <div className="text-[32px] mb-2">📄</div>
      <div className="font-display font-semibold text-[14px] text-[var(--t900)] mb-1">上传学校通知</div>
      <div className="text-[12px] text-[var(--t500)] mb-3">拖拽文件至此，或点击选择 · 支持 PDF、JPG、PNG</div>
      <div className="inline-flex items-center px-4 py-2 rounded-[8px] text-[12px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)]">
        选择文件
      </div>
      <div className="text-[11px] text-[var(--t300)] mt-2">上传后 AI 将自动翻译成中文并提取关键信息</div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface CommsParentClientProps {
  initialComms: MockComm[]
  studentId: string
}

export default function CommsParentClient({ initialComms, studentId }: CommsParentClientProps) {
  const [comms, setComms]     = useState<MockComm[]>(initialComms)
  const [filter, setFilter]   = useState<string>('all')
  const child = { display_name: 'Your child', display_name_cn: '孩子', current_school: '' }

  function markRead(id: string) {
    setComms(prev => prev.map(c => c.id === id ? { ...c, status: 'read' as CommStatus } : c))
  }

  function markAllRead() {
    setComms(prev => prev.map(c => ({ ...c, status: 'read' as CommStatus })))
  }

  const filtered = comms.filter(c => {
    if (filter === 'all')    return true
    if (filter === 'unread') return c.status === 'unread'
    return c.category === filter
  })

  const unreadCount = comms.filter(c => c.status === 'unread').length
  const urgentCount = comms.filter(c => c.status === 'unread' && c.urgent).length

  return (
    <div className="flex flex-col min-h-screen" style={{ fontFamily: "'Noto Sans SC', 'Inter', sans-serif" }}>

      {/* Topbar */}
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-40">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">沟通中心</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">
            {child.display_name_cn} · {child.current_school} · {comms.length} 条通知
            {unreadCount > 0 && <span className="ml-2 font-semibold text-[var(--blue)]">{unreadCount} 条未读</span>}
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[var(--border)] bg-white text-[var(--t700)] hover:bg-[var(--bg)]">
            全部标为已读
          </button>
        )}
      </div>

      <div className="p-[28px_36px] flex-1">
        <div className="grid gap-5 grid-cols-1 items-start lg:grid-cols-[1fr_260px]">

          {/* ── LEFT: Comm list ─────────────────────────────────────────────── */}
          <div>
            {/* Filter bar */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {[
                { val: 'all',    zh: '全部' },
                { val: 'unread', zh: `未读 (${unreadCount})` },
                ...Object.entries(CAT_ZH).map(([v, c]) => ({ val: v, zh: `${c.emoji} ${c.zh}` })),
              ].map(f => (
                <button key={f.val} onClick={() => setFilter(f.val)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium border-[1.5px] transition-all ${
                    filter === f.val
                      ? 'bg-[var(--blue-50)] text-[var(--blue)] border-[var(--blue)]'
                      : 'bg-white text-[var(--t700)] border-[var(--border)] hover:bg-[var(--bg)]'
                  }`}>
                  {f.zh}
                </button>
              ))}
            </div>

            {/* Comms */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-[36px] mb-3">📭</div>
                <div className="font-display font-bold text-[15px] text-[var(--t700)] mb-1">暂无相关通知</div>
                <div className="text-[12px] text-[var(--t500)]">请上传学校通知以获取中文翻译。</div>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(c => (
                  <CommCard key={c.id} comm={c} onRead={markRead} />
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT sidebar ──────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Upload card */}
            <UploadNoticeCard />

            {/* Urgent summary */}
            {urgentCount > 0 && (
              <div className="bg-[#FDF2F2] border border-[#FECACA] rounded-[10px] p-4">
                <div className="font-display font-semibold text-[13px] text-[#E02424] mb-2">⚠ 需要关注</div>
                {comms.filter(c => c.status === 'unread' && c.urgent).map(c => (
                  <div key={c.id} className="py-2 border-b border-[#FECACA] last:border-0">
                    <div className="text-[12px] font-semibold text-[var(--t900)]">{c.subject}</div>
                    <div className="text-[11px] text-[var(--t500)]">
                      {new Date(c.sent_date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* How it works */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">🤖 AI 翻译功能</div>
              {[
                '上传英文学校通知（PDF/图片）',
                'AI 自动翻译为中文并提取关键信息',
                '重要截止日期自动同步至日历',
                '逾期提醒和操作建议',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5 py-2 border-b border-[var(--border)] last:border-0">
                  <div className="w-5 h-5 rounded-full bg-[var(--blue)] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="text-[12px] text-[var(--t700)] leading-snug">{step}</div>
                </div>
              ))}
              <div className="mt-3 text-[11px] text-[var(--t300)]">后端API调用将在下一阶段接入</div>
            </div>

            {/* School contact */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">🏫 学校联系方式</div>
              <div className="text-[12px] text-[var(--t700)] space-y-2">
                <div><span className="text-[var(--t300)]">学校：</span>ACS International</div>
                <div><span className="text-[var(--t300)]">总机：</span>+65 6252 7322</div>
                <div><span className="text-[var(--t300)]">家长邮件：</span>parentrelations@acsinternational.edu.sg</div>
                <div><span className="text-[var(--t300)]">IB协调：</span>ibdp@acsinternational.edu.sg</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
