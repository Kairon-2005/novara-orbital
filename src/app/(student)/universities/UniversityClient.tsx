'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/db/client'
import { useToast } from '@/components/ui/toast'

// ── Types ─────────────────────────────────────────────────────
// Fit/readiness analysis lives in the Portfolio assessment now — this page only
// manages application logistics (requirements, deadlines, status, links).

export interface UniversityTarget {
  id: string
  name: string
  country: string
  programme: string
  deadline: string | null
  requirements: string
  notes: string
  status: 'researching' | 'applied' | 'offer' | 'rejected' | 'enrolled'
  referenceLink: string
}

interface Props {
  initialTargets: UniversityTarget[]
  userId: string
}

// ── Constants ─────────────────────────────────────────────────

const STATUS_CONFIG = {
  researching: { label: 'Researching', bg: '#EBF5FF', color: '#1A56DB' },
  applied:     { label: 'Applied',     bg: '#FFFBEB', color: '#B45309' },
  offer:       { label: 'Offer 🎉',    bg: '#F3FAF7', color: '#057A55' },
  rejected:    { label: 'Rejected',    bg: '#FDF2F2', color: '#E02424' },
  enrolled:    { label: 'Enrolled ✓',  bg: '#F3FAF7', color: '#057A55' },
}

const COUNTRY_EMOJI: Record<string, string> = {
  'UK': '🇬🇧', 'United Kingdom': '🇬🇧',
  'US': '🇺🇸', 'USA': '🇺🇸', 'United States': '🇺🇸',
  'Singapore': '🇸🇬', 'SG': '🇸🇬',
  'Australia': '🇦🇺', 'AU': '🇦🇺',
  'Canada': '🇨🇦', 'CA': '🇨🇦',
  'Netherlands': '🇳🇱', 'Germany': '🇩🇪',
  'Hong Kong': '🇭🇰', 'Japan': '🇯🇵',
}

function countryFlag(country: string) {
  return COUNTRY_EMOJI[country] ?? '🌏'
}

function daysUntil(dateStr: string | null): { text: string; urgent: boolean } {
  if (!dateStr) return { text: 'No deadline set', urgent: false }
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  if (diff < 0)   return { text: 'Deadline passed', urgent: true }
  if (diff === 0) return { text: 'Due today!', urgent: true }
  if (diff <= 30) return { text: `${diff}d left`, urgent: true }
  if (diff <= 90) return { text: `${diff}d left`, urgent: false }
  return { text: `${diff}d left`, urgent: false }
}

// ── Add University Form ───────────────────────────────────────

function AddForm({ onAdd, onCancel }: { onAdd: (u: UniversityTarget) => void; onCancel: () => void }) {
  const [name, setProgramme]  = useState('')  // reusing vars for simplicity
  const [uniName, setUniName] = useState('')
  const [country, setCountry] = useState('')
  const [programme, setProg]  = useState('')
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes]     = useState('')
  const [refLink, setRefLink] = useState('')
  const [saving, setSaving]   = useState(false)
  const supabase = createBrowserClient()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!uniName.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('university_targets')
      .insert({
        name:        uniName.trim(),
        country:     country.trim(),
        programme:   programme.trim(),
        deadline:    deadline || null,
        notes:       notes.trim(),
        requirements: '',
        reference_link: refLink.trim(),
        status:      'researching',
      })
      .select('id')
      .single()
    setSaving(false)
    if (!error && data) {
      onAdd({
        id:           data.id,
        name:         uniName.trim(),
        country:      country.trim(),
        programme:    programme.trim(),
        deadline:     deadline || null,
        requirements: '',
        notes:        notes.trim(),
        status:       'researching',
        referenceLink: refLink.trim(),
      })
    }
  }

  const cls = "w-full px-3 py-2.5 border border-[var(--border)] rounded-[8px] text-[13px] bg-white text-[var(--t900)] focus:outline-none focus:border-[var(--blue)] placeholder:text-[var(--t300)]"

  return (
    <form onSubmit={submit} className="bg-[var(--blue-50)] border border-[var(--blue-100)] rounded-[12px] p-5 mb-5 flex flex-col gap-3">
      <div className="font-display font-bold text-[13px] text-[var(--blue)]">Add university to wishlist</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">University name *</label>
          <input value={uniName} onChange={e => setUniName(e.target.value)} placeholder="e.g. UCL, NUS, MIT" className={cls} required />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">Country</label>
          <input value={country} onChange={e => setCountry(e.target.value)} placeholder="UK, Singapore, US…" className={cls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">Programme</label>
          <input value={programme} onChange={e => setProg(e.target.value)} placeholder="Computer Science BSc" className={cls} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">Application deadline</label>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={cls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">Official website</label>
          <input value={refLink} onChange={e => setRefLink(e.target.value)} placeholder="https://…" className={cls} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[var(--t700)] mb-1">Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Why this university?" className={cls} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-[7px] text-[12px] font-semibold text-[var(--t500)] hover:bg-white transition">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-[7px] text-[12px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] disabled:opacity-50 transition">
          {saving ? 'Adding…' : '+ Add university'}
        </button>
      </div>
    </form>
  )
}

// ── University Card ───────────────────────────────────────────

function UniversityCard({
  target, userId, onDelete, onUpdate,
}: {
  target: UniversityTarget
  userId: string
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<UniversityTarget>) => void
}) {
  const [expanded, setExpanded]   = useState(false)
  const [fetching, setFetching]   = useState(false)
  const [editNotes, setEditNotes] = useState(false)
  const [notesVal, setNotesVal]   = useState(target.notes)
  const [editLink, setEditLink]   = useState(false)
  const [linkVal, setLinkVal]     = useState(target.referenceLink)
  const supabase = createBrowserClient()
  const toast = useToast()

  const sc = STATUS_CONFIG[target.status]
  const dl = daysUntil(target.deadline)

  async function handleFetchReqs() {
    setFetching(true)
    setExpanded(true)
    const res = await fetch('/api/universities/requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: target.name, programme: target.programme, country: target.country }),
    })
    if (res.ok) {
      const json = await res.json() as { requirements: string }
      await supabase.from('university_targets').update({ requirements: json.requirements }).eq('id', target.id)
      onUpdate(target.id, { requirements: json.requirements })
    }
    setFetching(false)
  }

  async function handleStatusChange(status: UniversityTarget['status']) {
    await supabase.from('university_targets').update({ status }).eq('id', target.id)
    onUpdate(target.id, { status })
  }

  async function handleSaveNotes() {
    await supabase.from('university_targets').update({ notes: notesVal }).eq('id', target.id)
    onUpdate(target.id, { notes: notesVal })
    setEditNotes(false)
  }

  async function handleDelete() {
    await supabase.from('university_targets').delete().eq('id', target.id)
    onDelete(target.id)
  }

  async function handleSaveLink() {
    const v = linkVal.trim()
    await supabase.from('university_targets').update({ reference_link: v }).eq('id', target.id)
    onUpdate(target.id, { referenceLink: v })
    setEditLink(false)
  }

  async function handleAddDeadlineToCalendar() {
    if (!target.deadline) return
    const { error } = await supabase.from('calendar_events').insert({
      student_id: userId,
      title:      `${target.name} application deadline`,
      event_date: target.deadline,
      type:       'application',
      source:     'manual',
      notes:      target.programme || null,
    })
    toast(error
      ? { title: 'Could not add to calendar', description: 'Please try again.', variant: 'error' }
      : { title: 'Added to calendar', description: `${target.name} deadline`, variant: 'success' })
  }

  return (
    <div className="bg-white border border-[var(--border)] rounded-[12px] overflow-hidden transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      {/* Card header */}
      <div
        className="flex items-start gap-3 px-4 py-4 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Country flag */}
        <div className="text-[28px] leading-none flex-shrink-0 mt-0.5">
          {countryFlag(target.country)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-[15px] text-[var(--t900)] leading-tight">{target.name}</div>
          {target.programme && (
            <div className="text-[12px] text-[var(--t500)] mt-0.5 truncate">{target.programme}</div>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-semibold"
              style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
            {target.deadline && (
              <span className="text-[11px] font-medium"
                style={{ color: dl.urgent ? 'var(--red)' : 'var(--t400)' }}>
                📅 {target.deadline} · {dl.text}
              </span>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t300)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0, marginTop: 4 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[var(--border)] px-4 pb-4 pt-3 space-y-3">

          {/* Status selector */}
          <div>
            <div className="text-[11px] font-semibold text-[var(--t500)] mb-1.5 uppercase tracking-wider">Status</div>
            <div className="flex gap-1.5 flex-wrap">
              {(Object.keys(STATUS_CONFIG) as UniversityTarget['status'][]).map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className="px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition border"
                  style={{
                    background:   target.status === s ? STATUS_CONFIG[s].bg : 'transparent',
                    color:        target.status === s ? STATUS_CONFIG[s].color : 'var(--t400)',
                    borderColor:  target.status === s ? STATUS_CONFIG[s].color + '44' : 'var(--border)',
                  }}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Official website + deadline → calendar */}
          <div className="flex flex-wrap items-center gap-2">
            {editLink ? (
              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                <input
                  value={linkVal}
                  onChange={e => setLinkVal(e.target.value)}
                  placeholder="https://official-website…"
                  className="flex-1 px-2.5 py-1.5 border border-[var(--border)] rounded-[6px] text-[12px] focus:outline-none focus:border-[var(--blue)]"
                />
                <button onClick={handleSaveLink} className="text-[11px] font-semibold text-[var(--blue)]">Save</button>
                <button onClick={() => { setEditLink(false); setLinkVal(target.referenceLink) }} className="text-[11px] font-semibold text-[var(--t400)]">Cancel</button>
              </div>
            ) : target.referenceLink ? (
              <a href={target.referenceLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--blue)] hover:underline">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Official website
              </a>
            ) : (
              <button onClick={() => setEditLink(true)} className="text-[12px] text-[var(--t400)] hover:text-[var(--blue)] transition">+ Add official website</button>
            )}
            {target.referenceLink && !editLink && (
              <button onClick={() => setEditLink(true)} className="text-[11px] text-[var(--t300)] hover:underline">edit</button>
            )}
            {target.deadline && (
              <button onClick={handleAddDeadlineToCalendar}
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-[6px] border border-[var(--border)] text-[var(--t700)] hover:bg-[var(--bg)] transition">
                📅 Add deadline to calendar
              </button>
            )}
          </div>

          {/* Requirements */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[11px] font-semibold text-[var(--t500)] uppercase tracking-wider">Requirements</div>
              <button
                onClick={handleFetchReqs}
                disabled={fetching}
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-[6px] bg-[var(--blue-50)] text-[var(--blue)] hover:bg-[var(--blue-100)] disabled:opacity-50 transition"
              >
                {fetching ? (
                  <>
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Fetching…
                  </>
                ) : '✦ Fetch with AI'}
              </button>
            </div>
            {target.requirements ? (
              <div className="text-[12px] text-[var(--t700)] leading-[1.7] bg-[var(--bg)] rounded-[8px] px-3 py-3 whitespace-pre-wrap">
                {target.requirements}
              </div>
            ) : (
              <div className="text-[12px] text-[var(--t300)] italic py-2">
                Click &ldquo;Fetch with AI&rdquo; to get entry requirements, language scores, and deadlines.
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[11px] font-semibold text-[var(--t500)] uppercase tracking-wider">Your notes</div>
              {!editNotes && (
                <button onClick={() => setEditNotes(true)} className="text-[11px] text-[var(--blue)] font-semibold hover:underline">Edit</button>
              )}
            </div>
            {editNotes ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={notesVal}
                  onChange={e => setNotesVal(e.target.value)}
                  rows={3}
                  placeholder="Why this uni? Personal connection, specific lab, professor…"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-[8px] text-[12px] text-[var(--t900)] focus:outline-none focus:border-[var(--blue)] resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setEditNotes(false); setNotesVal(target.notes) }} className="px-3 py-1.5 text-[11px] font-semibold text-[var(--t500)] hover:bg-[var(--bg)] rounded-[6px] transition">Cancel</button>
                  <button onClick={handleSaveNotes} className="px-3 py-1.5 text-[11px] font-semibold bg-[var(--blue)] text-white rounded-[6px] hover:bg-[var(--blue-h)] transition">Save</button>
                </div>
              </div>
            ) : (
              <div className="text-[12px] text-[var(--t500)] leading-[1.6]">
                {target.notes || <span className="italic text-[var(--t300)]">No notes yet.</span>}
              </div>
            )}
          </div>

          {/* Delete */}
          <div className="pt-2 border-t border-[var(--border)] flex justify-end">
            <button
              onClick={handleDelete}
              className="text-[11px] font-semibold text-[var(--t300)] hover:text-[var(--red)] transition flex items-center gap-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Remove university
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main client ───────────────────────────────────────────────

export default function UniversityClient({ initialTargets, userId }: Props) {
  const [targets, setTargets] = useState<UniversityTarget[]>(initialTargets)
  const [showForm, setShowForm] = useState(false)

  function handleAdd(u: UniversityTarget) {
    setTargets(prev => [u, ...prev])
    setShowForm(false)
  }

  function handleDelete(id: string) {
    setTargets(prev => prev.filter(t => t.id !== id))
  }

  function handleUpdate(id: string, patch: Partial<UniversityTarget>) {
    setTargets(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  const byStatus = {
    offer:      targets.filter(t => t.status === 'offer' || t.status === 'enrolled'),
    applied:    targets.filter(t => t.status === 'applied'),
    researching: targets.filter(t => t.status === 'researching'),
    rejected:   targets.filter(t => t.status === 'rejected'),
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-50">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">Application Tracker</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">{targets.length} universities · requirements, deadlines & status</div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add university
        </button>
      </div>

      <div className="p-[28px_36px] flex-1">
        {/* Add form */}
        {showForm && <AddForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />}

        {/* Empty state */}
        {targets.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-[48px] mb-4">🎓</div>
            <div className="font-display font-bold text-[16px] text-[var(--t900)] mb-1">No universities yet</div>
            <div className="text-[13px] text-[var(--t500)] mb-5">Add universities you&apos;re interested in and track requirements, deadlines, and your application status.</div>
            <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-[8px] text-[13px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)] transition">
              + Add your first university
            </button>
          </div>
        )}

        {/* Cards grouped by status */}
        {targets.length > 0 && (
          <div className="space-y-6">
            {byStatus.offer.length > 0 && (
              <section>
                <div className="text-[11px] font-bold text-[var(--t300)] uppercase tracking-widest mb-3">🎉 Offers & Enrolled</div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {byStatus.offer.map(t => <UniversityCard key={t.id} target={t} userId={userId} onDelete={handleDelete} onUpdate={handleUpdate} />)}
                </div>
              </section>
            )}
            {byStatus.applied.length > 0 && (
              <section>
                <div className="text-[11px] font-bold text-[var(--t300)] uppercase tracking-widest mb-3">📬 Applied</div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {byStatus.applied.map(t => <UniversityCard key={t.id} target={t} userId={userId} onDelete={handleDelete} onUpdate={handleUpdate} />)}
                </div>
              </section>
            )}
            {byStatus.researching.length > 0 && (
              <section>
                <div className="text-[11px] font-bold text-[var(--t300)] uppercase tracking-widest mb-3">🔍 Researching</div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {byStatus.researching.map(t => <UniversityCard key={t.id} target={t} userId={userId} onDelete={handleDelete} onUpdate={handleUpdate} />)}
                </div>
              </section>
            )}
            {byStatus.rejected.length > 0 && (
              <section>
                <div className="text-[11px] font-bold text-[var(--t300)] uppercase tracking-widest mb-3">Universities not pursued</div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {byStatus.rejected.map(t => <UniversityCard key={t.id} target={t} userId={userId} onDelete={handleDelete} onUpdate={handleUpdate} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
