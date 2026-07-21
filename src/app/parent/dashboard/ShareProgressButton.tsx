'use client'

import { useState } from 'react'

// 分享申请进度 — mints/reuses a tokenized share link (7天有效, 可撤销) and
// presents it WeChat-style: copy link + QR. The link opens the public,
// coarse-grained progress card; see /share/progress/[token].

type Share = { id: string; path: string; createdAt: string; expiresAt: string; revokedAt: string | null }

function isActive(s: Share) {
  return !s.revokedAt && Date.parse(s.expiresAt) > Date.now()
}

export default function ShareProgressButton() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [shares, setShares] = useState<Share[]>([])
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = shares.find(isActive) ?? null
  const url = active && typeof window !== 'undefined' ? `${window.location.origin}${active.path}` : null
  const qr = url ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}` : null

  async function refresh(): Promise<Share[]> {
    const res = await fetch('/api/parent/share-progress')
    if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? '加载失败')
    const body = await res.json()
    setShares(body.shares)
    return body.shares
  }

  async function openModal() {
    setOpen(true); setBusy(true); setError(null)
    try {
      const list = await refresh()
      if (!list.some(isActive)) await createShare(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setBusy(false)
    }
  }

  async function createShare(manageBusy = true) {
    if (manageBusy) { setBusy(true); setError(null) }
    try {
      const res = await fetch('/api/parent/share-progress', { method: 'POST' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? '创建失败')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败')
    } finally {
      if (manageBusy) setBusy(false)
    }
  }

  async function revoke(id: string) {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/parent/share-progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? '撤销失败')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '撤销失败')
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard blocked */ }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-white bg-[#07C160] hover:opacity-90 transition"
      >
        分享进度
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-[12px] w-full max-w-[360px] p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-display font-bold text-[15px] text-[var(--t900)]">分享孩子的申请进度</div>
              <button onClick={() => setOpen(false)} className="text-[var(--t300)] hover:text-[var(--t700)] text-[18px] leading-none">×</button>
            </div>

            {error && <div className="text-[12px] text-[var(--red)] mb-2">{error}</div>}
            {busy && !active && <div className="text-[13px] text-[var(--t500)] py-6 text-center">生成中…</div>}

            {active && (
              <>
                <p className="text-[12px] text-[var(--t500)] mb-3 leading-relaxed">
                  打开链接无需登录，适合转发到微信家庭群。仅展示进度概览（目标院校状态、里程碑完成度、阶段），不含成绩、文件或费用明细。
                </p>
                {qr && (
                  <div className="flex justify-center mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qr} alt="进度分享二维码" width={150} height={150} className="rounded" />
                  </div>
                )}
                <button onClick={copy} className="w-full text-[12px] font-semibold px-2 py-2 rounded-[8px] border border-[var(--border)] hover:border-[var(--blue)] mb-1.5">
                  {copied ? '✓ 链接已复制' : '复制链接'}
                </button>
                <div className="text-[11px] text-[var(--t300)] text-center mb-3">
                  有效期至 {new Date(active.expiresAt).toLocaleDateString('zh-CN')} · 可随时撤销
                </div>
              </>
            )}

            {shares.filter(isActive).length > 0 && (
              <div className="border-t border-[var(--border)] pt-2.5">
                {shares.filter(isActive).map(s => (
                  <div key={s.id} className="flex items-center justify-between py-1">
                    <span className="text-[11px] text-[var(--t500)]">
                      创建于 {new Date(s.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                    <button onClick={() => revoke(s.id)} disabled={busy} className="text-[11px] font-semibold text-[var(--red)] hover:underline disabled:opacity-50">
                      撤销
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
