'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/db/client'
import { useToast } from '@/components/ui/toast'
import type { SchoolType, RoomType } from '@/types/database'

interface School { id: string; school_name: string; slug: string; school_type: string; zone: string | null; is_active: boolean }
interface Homestay { id: string; family_name: string; address: string; room_type: string; monthly_rate_sgd: number; zone: string | null; is_active: boolean }

const SCHOOL_TYPES = ['primary', 'secondary', 'jc', 'poly', 'university', 'language_school', 'diploma']
const ROOM_TYPES = ['single', 'shared', 'studio']
const inp = 'px-2.5 py-1.5 border border-[var(--border)] rounded-lg text-[12px] bg-white'

export default function DirectoryClient({ schools, homestays }: { schools: School[]; homestays: Homestay[] }) {
  const supabase = createBrowserClient()
  const toast = useToast()
  const [sList, setSList] = useState(schools)
  const [hList, setHList] = useState(homestays)
  const [s, setS] = useState({ school_name: '', slug: '', school_type: 'secondary', zone: '' })
  const [h, setH] = useState({ family_name: '', address: '', room_type: 'single', monthly_rate_sgd: '', zone: '' })

  async function addSchool() {
    if (!s.school_name.trim() || !s.slug.trim()) { toast({ title: 'Name and slug required', variant: 'error' }); return }
    const { data, error } = await supabase.from('schools').insert({
      school_name: s.school_name.trim(), slug: s.slug.trim(), school_type: s.school_type as SchoolType, zone: s.zone.trim() || null,
    }).select('id, school_name, slug, school_type, zone, is_active').single()
    if (error || !data) { toast({ title: 'Could not add school', description: error?.message, variant: 'error' }); return }
    setSList((x) => [...x, data]); setS({ school_name: '', slug: '', school_type: 'secondary', zone: '' })
  }

  async function addHomestay() {
    if (!h.family_name.trim() || !h.address.trim() || !h.monthly_rate_sgd) { toast({ title: 'Family, address, rate required', variant: 'error' }); return }
    const { data, error } = await supabase.from('homestay_listings').insert({
      family_name: h.family_name.trim(), address: h.address.trim(), room_type: h.room_type as RoomType,
      monthly_rate_sgd: Number(h.monthly_rate_sgd), zone: h.zone.trim() || null,
    }).select('id, family_name, address, room_type, monthly_rate_sgd, zone, is_active').single()
    if (error || !data) { toast({ title: 'Could not add homestay', description: error?.message, variant: 'error' }); return }
    setHList((x) => [...x, data]); setH({ family_name: '', address: '', room_type: 'single', monthly_rate_sgd: '', zone: '' })
  }

  async function toggleSchool(id: string, is_active: boolean) {
    setSList((x) => x.map((r) => r.id === id ? { ...r, is_active } : r))
    await supabase.from('schools').update({ is_active }).eq('id', id)
  }
  async function delSchool(id: string) {
    setSList((x) => x.filter((r) => r.id !== id))
    await supabase.from('schools').delete().eq('id', id)
  }
  async function toggleHomestay(id: string, is_active: boolean) {
    setHList((x) => x.map((r) => r.id === id ? { ...r, is_active } : r))
    await supabase.from('homestay_listings').update({ is_active }).eq('id', id)
  }
  async function delHomestay(id: string) {
    setHList((x) => x.filter((r) => r.id !== id))
    await supabase.from('homestay_listings').delete().eq('id', id)
  }

  return (
    <div className="page-content max-w-[860px]">
      <h1 className="font-display font-bold text-[22px] text-[var(--t900)]">Directory</h1>
      <p className="text-[13px] text-[var(--t500)] mt-1 mb-4">Manage schools &amp; homestay listings (replaces manual SQL).</p>

      <h2 className="font-display font-semibold text-[14px] text-[var(--t900)] mb-2">Schools ({sList.length})</h2>
      <div className="card p-3 mb-2 flex flex-wrap gap-2 items-center">
        <input className={`${inp} flex-1 min-w-[140px]`} placeholder="School name" value={s.school_name} onChange={(e) => setS({ ...s, school_name: e.target.value })} />
        <input className={inp} placeholder="slug" value={s.slug} onChange={(e) => setS({ ...s, slug: e.target.value })} />
        <select className={inp} value={s.school_type} onChange={(e) => setS({ ...s, school_type: e.target.value })}>{SCHOOL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <input className={inp} placeholder="zone" value={s.zone} onChange={(e) => setS({ ...s, zone: e.target.value })} />
        <button onClick={addSchool} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-[var(--blue)] text-white">Add</button>
      </div>
      <div className="card divide-y divide-[var(--border)] mb-6">
        {sList.map((r) => (
          <div key={r.id} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0 text-[13px] text-[var(--t900)] truncate">{r.school_name} <span className="text-[var(--t300)]">· {r.school_type}{r.zone ? ` · ${r.zone}` : ''}</span></div>
            <label className="text-[11px] text-[var(--t500)] flex items-center gap-1"><input type="checkbox" checked={r.is_active} onChange={(e) => toggleSchool(r.id, e.target.checked)} /> active</label>
            <button onClick={() => delSchool(r.id)} className="text-[12px] text-[#E02424] font-semibold">Delete</button>
          </div>
        ))}
      </div>

      <h2 className="font-display font-semibold text-[14px] text-[var(--t900)] mb-2">Homestay listings ({hList.length})</h2>
      <div className="card p-3 mb-2 flex flex-wrap gap-2 items-center">
        <input className={`${inp} flex-1 min-w-[120px]`} placeholder="Family name" value={h.family_name} onChange={(e) => setH({ ...h, family_name: e.target.value })} />
        <input className={`${inp} flex-1 min-w-[140px]`} placeholder="Address" value={h.address} onChange={(e) => setH({ ...h, address: e.target.value })} />
        <select className={inp} value={h.room_type} onChange={(e) => setH({ ...h, room_type: e.target.value })}>{ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <input className={`${inp} w-24`} type="number" placeholder="S$/mo" value={h.monthly_rate_sgd} onChange={(e) => setH({ ...h, monthly_rate_sgd: e.target.value })} />
        <input className={inp} placeholder="zone" value={h.zone} onChange={(e) => setH({ ...h, zone: e.target.value })} />
        <button onClick={addHomestay} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-[var(--blue)] text-white">Add</button>
      </div>
      <div className="card divide-y divide-[var(--border)]">
        {hList.map((r) => (
          <div key={r.id} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0 text-[13px] text-[var(--t900)] truncate">{r.family_name} <span className="text-[var(--t300)]">· {r.room_type} · S${r.monthly_rate_sgd}{r.zone ? ` · ${r.zone}` : ''}</span></div>
            <label className="text-[11px] text-[var(--t500)] flex items-center gap-1"><input type="checkbox" checked={r.is_active} onChange={(e) => toggleHomestay(r.id, e.target.checked)} /> active</label>
            <button onClick={() => delHomestay(r.id)} className="text-[12px] text-[#E02424] font-semibold">Delete</button>
          </div>
        ))}
      </div>
    </div>
  )
}
