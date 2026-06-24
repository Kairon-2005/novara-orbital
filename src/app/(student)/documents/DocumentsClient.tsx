'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/db/client'
import { useToast } from '@/components/ui/toast'
import type { MockDocument, DocumentFileType } from '@/types/models'

// ── File type config ──────────────────────────────────────────────────────────

const FILE_TYPE_CONFIG: Record<DocumentFileType, { label: string; emoji: string; bg: string; color: string }> = {
  transcript:   { label: 'Transcript',   emoji: '📋', bg: '#EBF5FF', color: '#1A56DB' },
  report_card:  { label: 'Report Card',  emoji: '📊', bg: '#F3FAF7', color: '#057A55' },
  certificate:  { label: 'Certificate',  emoji: '🏅', bg: '#FFFBEB', color: '#B45309' },
  passport:     { label: 'Passport',     emoji: '🛂', bg: '#FDF2F2', color: '#E02424' },
  visa:         { label: 'Student Pass', emoji: '📄', bg: '#F5F3FF', color: '#7C3AED' },
  medical:      { label: 'Medical',      emoji: '🏥', bg: '#F0FDF4', color: '#15803D' },
  application:  { label: 'Application',  emoji: '📨', bg: '#FFF7ED', color: '#C2410C' },
  other:        { label: 'Other',        emoji: '📁', bg: '#F3F4F6', color: '#374151' },
}

const CATEGORY_TABS: Array<'all' | DocumentFileType> = [
  'all', 'transcript', 'report_card', 'certificate', 'passport', 'visa', 'medical', 'application', 'other',
]

function formatSize(kb: number): string {
  return kb >= 1000 ? `${(kb / 1000).toFixed(1)} MB` : `${kb} KB`
}

// ── Required docs checklist ───────────────────────────────────────────────────

const REQUIRED_DOCS = [
  { label: 'School Transcript', type: 'transcript' as DocumentFileType },
  { label: 'Passport Copy',     type: 'passport'   as DocumentFileType },
  { label: 'Student Pass (ICA)', type: 'visa'       as DocumentFileType },
  { label: 'Teacher Reference Letter', type: 'other' as DocumentFileType },
  { label: 'IELTS / SAT Score', type: 'certificate' as DocumentFileType },
]

// ── Document row ──────────────────────────────────────────────────────────────

function DocRow({ doc, onToggleAccess, onDelete }: {
  doc: MockDocument
  onToggleAccess: (id: string) => void
  onDelete: (id: string) => void
}) {
  const cfg = FILE_TYPE_CONFIG[doc.file_type]

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-[9px] bg-[var(--bg)] hover:bg-[#EAEFF7] transition group">
      {/* Icon */}
      <div className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0 text-[18px]"
        style={{ background: cfg.bg }}>
        {cfg.emoji}
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[var(--t900)] truncate">{doc.file_name}</div>
        <div className="text-[11px] text-[var(--t500)] mt-0.5">
          {cfg.label} · {doc.upload_date} · {formatSize(doc.size_kb)}
        </div>
        {doc.classifying && (
          <div className="text-[11px] text-[var(--blue)] mt-1 flex items-center gap-1.5">
            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Analysing…
          </div>
        )}
        {!doc.classifying && doc.summary && (
          <div className="text-[11px] text-[var(--t500)] mt-1 flex items-start gap-1.5">
            {doc.relevance && (
              <span className="inline-flex items-center px-1.5 py-px rounded-[4px] text-[9px] font-bold uppercase flex-shrink-0"
                style={{
                  background: doc.relevance === 'high' ? 'var(--green-50)' : doc.relevance === 'medium' ? '#FFFBEB' : '#F3F4F6',
                  color:      doc.relevance === 'high' ? 'var(--green)' : doc.relevance === 'medium' ? '#B45309' : 'var(--t500)',
                }}>
                ✦ {doc.relevance}
              </span>
            )}
            <span className="leading-snug">{doc.summary}</span>
          </div>
        )}
      </div>

      {/* Parent access toggle */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[11px] text-[var(--t300)]">Parent access</span>
        <button
          onClick={() => onToggleAccess(doc.id)}
          title={doc.parent_access ? 'Revoke parent access' : 'Grant parent access'}
          className="relative w-9 h-5 rounded-full transition-all flex-shrink-0"
          style={{ background: doc.parent_access ? 'var(--green)' : '#E5E7EB' }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
            style={{ left: doc.parent_access ? '18px' : '2px' }}
          />
        </button>
      </div>

      {/* Type badge */}
      <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-semibold flex-shrink-0"
        style={{ background: cfg.bg, color: cfg.color }}>
        {cfg.label}
      </span>

      {/* Delete */}
      <button
        onClick={() => onDelete(doc.id)}
        className="opacity-0 group-hover:opacity-100 text-[var(--t300)] hover:text-[var(--red)] transition flex-shrink-0"
        title="Delete"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
        </svg>
      </button>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

interface DocumentsClientProps {
  initialDocuments: MockDocument[]
  userId: string
}

export default function DocumentsClient({ initialDocuments, userId }: DocumentsClientProps) {
  const supabase = createBrowserClient()
  const toast = useToast()
  const [docs, setDocs]         = useState<MockDocument[]>(initialDocuments)
  const [activeTab, setActiveTab] = useState<'all' | DocumentFileType>('all')
  const [dragOver, setDragOver] = useState(false)

  const displayed = activeTab === 'all' ? docs : docs.filter(d => d.file_type === activeTab)

  const missing = REQUIRED_DOCS.filter(r => !docs.some(d => d.file_type === r.type))

  function handleToggleAccess(id: string) {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, parent_access: !d.parent_access } : d))
  }

  function handleDelete(id: string) {
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  const [uploading, setUploading] = useState(false)
  const [uploadCategory, setUploadCategory] = useState<DocumentFileType>('other')

  async function handleUploadFile(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('fileType', uploadCategory)
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.ok) {
        const newDoc: MockDocument = {
          id: json.id,
          file_name: file.name,
          file_type: uploadCategory,
          upload_date: new Date().toISOString().slice(0, 10),
          size_kb: Math.round(file.size / 1024),
          parent_access: false,
          classifying: true,
        }
        setDocs(prev => [newDoc, ...prev])
        toast({ title: 'Document uploaded', description: 'Analysing in the background…', variant: 'success' })
        void classifyInBackground(json.id as string)
      } else {
        toast({ title: 'Upload failed', description: json.error ?? 'Please try again.', variant: 'error' })
      }
    } catch {
      toast({ title: 'Upload failed', description: 'Network error. Please try again.', variant: 'error' })
    } finally {
      setUploading(false)
    }
  }

  // Fire-and-forget: classification runs out-of-band; the row updates when it lands.
  async function classifyInBackground(id: string) {
    try {
      const res = await fetch('/api/documents/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json() as { classification?: { summary?: string; relevance?: string } }
      setDocs(prev => prev.map(d => d.id === id
        ? { ...d, classifying: false, summary: json.classification?.summary, relevance: json.classification?.relevance }
        : d))
      if (json.classification) {
        toast({ title: 'Evidence analysed', description: 'Reassess your readiness on the Portfolio page to count it.', variant: 'success' })
      }
    } catch {
      setDocs(prev => prev.map(d => d.id === id ? { ...d, classifying: false } : d))
    }
  }

  function simulateUpload() {
    // Trigger hidden file input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) handleUploadFile(file)
    }
    input.click()
  }

  return (
    <div className="flex flex-col min-h-screen">

      {/* Topbar */}
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-50">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">Documents</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">{docs.length} files · {docs.filter(d => d.parent_access).length} shared with parents</div>
        </div>
        <button
          onClick={simulateUpload}
          disabled={uploading}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition ${uploading ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-[var(--blue)] text-white hover:bg-[var(--blue-h)]'}`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          Upload Document
        </button>
      </div>

      <div className="p-[28px_36px] flex-1">
        <div className="grid gap-6 grid-cols-1 items-start lg:grid-cols-[1fr_280px]">

          {/* LEFT — document list */}
          <div className="flex flex-col gap-4">

            {/* Category tabs */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold border-[1.5px] transition ${
                    activeTab === t
                      ? 'bg-[var(--blue)] text-white border-[var(--blue)]'
                      : 'bg-white text-[var(--t500)] border-[var(--border)] hover:border-[var(--blue)] hover:text-[var(--blue)]'
                  }`}
                >
                  {t === 'all'
                    ? `All (${docs.length})`
                    : `${FILE_TYPE_CONFIG[t].emoji} ${FILE_TYPE_CONFIG[t].label} (${docs.filter(d => d.file_type === t).length})`}
                </button>
              ))}
            </div>

            {/* Upload category picker */}
            <div className="flex items-center gap-2">
              <label htmlFor="upload-category" className="text-[11px] font-semibold text-[var(--t500)]">Upload as</label>
              <select
                id="upload-category"
                value={uploadCategory}
                onChange={e => setUploadCategory(e.target.value as DocumentFileType)}
                className="px-2.5 py-1.5 border border-[var(--border)] rounded-[7px] text-[12px] font-medium text-[var(--t700)] bg-white focus:outline-none focus:border-[var(--blue)]"
              >
                {CATEGORY_TABS.filter(t => t !== 'all').map(t => (
                  <option key={t} value={t}>
                    {FILE_TYPE_CONFIG[t as DocumentFileType].emoji} {FILE_TYPE_CONFIG[t as DocumentFileType].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); simulateUpload() }}
              onClick={simulateUpload}
              className="flex flex-col items-center justify-center gap-2 py-6 rounded-[10px] border-2 border-dashed cursor-pointer transition-all"
              style={{
                borderColor: dragOver ? 'var(--blue)' : 'var(--border)',
                background:  dragOver ? 'var(--blue-50)' : 'transparent',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--t300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              <div className="text-[12px] font-medium text-[var(--t500)]">
                Drag &amp; drop files here, or <span className="text-[var(--blue)] font-semibold">click to upload</span>
              </div>
              <div className="text-[11px] text-[var(--t300)]">PDF, JPG, PNG — max 10 MB</div>
            </div>

            {/* Document list */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <div className="font-display font-semibold text-[13px] text-[var(--t900)]">
                  {displayed.length} document{displayed.length !== 1 ? 's' : ''}
                </div>
                <div className="text-[11px] text-[var(--t500)]">Toggle switch to share with parents</div>
              </div>

              {displayed.length > 0 ? (
                <div className="p-3 flex flex-col gap-2">
                  {displayed.map(doc => (
                    <DocRow key={doc.id} doc={doc} onToggleAccess={handleToggleAccess} onDelete={handleDelete} />
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <div className="text-3xl mb-3">📁</div>
                  <div className="text-[13px] text-[var(--t500)]">No documents in this category.</div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — checklist + stats */}
          <div className="flex flex-col gap-4">

            {/* Required docs checklist */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] p-[18px_20px] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="font-display font-bold text-[13px] text-[var(--t900)] mb-1 flex items-center justify-between">
                <span>📋 Required Documents</span>
                {missing.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-bold bg-[var(--red-50)] text-[var(--red)]">
                    {missing.length} missing
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[var(--t500)] mb-3">For school application checklist</div>
              <div className="flex flex-col gap-1.5">
                {REQUIRED_DOCS.map(r => {
                  const uploaded = docs.some(d => d.file_type === r.type)
                  return (
                    <div key={r.label}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-[8px]"
                      style={{ background: uploaded ? 'var(--green-50)' : 'var(--red-50)' }}>
                      {uploaded ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--green)">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                        </svg>
                      )}
                      <span className="text-[12px] text-[var(--t700)] flex-1">{r.label}</span>
                      {!uploaded && (
                        <span className="text-[10px] font-bold text-[var(--red)]">Missing</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Parent access summary */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] p-[18px_20px] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="font-display font-bold text-[13px] text-[var(--t900)] mb-3">👨‍👩‍👧 Parent Access</div>
              <div className="flex flex-col gap-2">
                {docs.filter(d => d.parent_access).map(d => {
                  const cfg = FILE_TYPE_CONFIG[d.file_type]
                  return (
                    <div key={d.id} className="flex items-center gap-2 px-2 py-1.5 rounded-[7px] bg-[var(--bg)]">
                      <span className="text-[14px]">{cfg.emoji}</span>
                      <span className="text-[12px] text-[var(--t700)] flex-1 truncate">{d.file_name}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--green)">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                  )
                })}
                {docs.filter(d => d.parent_access).length === 0 && (
                  <div className="text-[12px] text-[var(--t500)] text-center py-3">
                    No documents shared with parents yet.
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] p-[18px_20px] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="font-display font-bold text-[13px] text-[var(--t900)] mb-3">Storage</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total files',     value: docs.length.toString(),                        color: 'var(--blue)' },
                  { label: 'Shared w/ parent', value: docs.filter(d => d.parent_access).length.toString(), color: 'var(--green)' },
                  { label: 'Total size',
                    value: `${(docs.reduce((s, d) => s + d.size_kb, 0) / 1000).toFixed(1)} MB`,    color: 'var(--t700)' },
                  { label: 'Missing',         value: missing.length.toString(),                     color: missing.length ? 'var(--red)' : 'var(--green)' },
                ].map((s, i) => (
                  <div key={i} className="bg-[var(--bg)] rounded-[8px] p-3 text-center">
                    <div className="font-display font-extrabold text-[20px] leading-none" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[10px] text-[var(--t500)] mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
