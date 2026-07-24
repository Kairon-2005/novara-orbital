'use client'

import { useState } from 'react'

type EventType = 'exam' | 'deadline' | 'cca' | 'finance' | 'personal'

type CalEvent = {
  id: string
  title: string
  date: string
  type: EventType
  notes?: string
}

const EVENT_LABEL: Record<string, string> = {
  exam: 'Exam', deadline: 'Deadline', cca: 'CCA', finance: 'Finance', personal: 'Personal',
}

export function EditEventModal({ event, onSave, onDelete, onClose }: {
  event: CalEvent
  onSave: (updated: CalEvent) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState(event.title)
  const [date,  setDate]  = useState(event.date)
  const [type,  setType]  = useState<EventType>(event.type)
  const [notes, setNotes] = useState(event.notes ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return
    onSave({ ...event, title: title.trim(), date, type, notes: notes.trim() || undefined })
    onClose()
  }

  async function handleDelete() {
    await onDelete(event.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="bg-white rounded-[12px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-[420px] border border-[var(--border)]">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <span className="font-display font-bold text-[15px] text-[var(--t900)]">Edit Event</span>
          <button onClick={onClose} className="text-[var(--t400)] hover:text-[var(--t900)] text-[20px] leading-none">×</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] text-[var(--t900)] focus:outline-none focus:border-[var(--blue)]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] text-[var(--t900)] focus:outline-none focus:border-[var(--blue)]" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">Type</label>
              <select value={type} onChange={e => setType(e.target.value as EventType)}
                className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] text-[var(--t900)] focus:outline-none focus:border-[var(--blue)] bg-white cursor-pointer">
                {Object.entries(EVENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] text-[var(--t900)] focus:outline-none focus:border-[var(--blue)] resize-none" />
          </div>
          <div className="flex justify-between gap-2 pt-1">
            {!confirmDelete ? (
              <button type="button" onClick={() => setConfirmDelete(true)}
                className="px-4 py-2 rounded-[8px] text-[13px] font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50">
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-red-600">Sure?</span>
                <button type="button" onClick={handleDelete}
                  className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold bg-red-600 text-white hover:bg-red-700">
                  Yes, delete
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[var(--border)] text-[var(--t700)] hover:bg-[var(--bg)]">
                  Cancel
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 rounded-[8px] text-[13px] font-semibold text-[var(--t700)] border border-[var(--border)] bg-white hover:bg-[var(--bg)]">
                Cancel
              </button>
              <button type="submit"
                className="px-4 py-2 rounded-[8px] text-[13px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)]">
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}