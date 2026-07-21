import { describe, it, expect } from 'vitest'
import { decideNoticeTarget } from '@/lib/notice-target'

describe('decideNoticeTarget', () => {
  it('a student records against themself', () => {
    expect(decideNoticeTarget({ callerId: 's1', callerRole: 'student', linkedStudentId: null, requestedStudentId: null }))
      .toEqual({ ok: true, studentId: 's1' })
  })

  it('a parent records against their linked child', () => {
    expect(decideNoticeTarget({ callerId: 'p1', callerRole: 'parent', linkedStudentId: 's1', requestedStudentId: null }))
      .toEqual({ ok: true, studentId: 's1' })
  })

  it('a parent with no link is refused', () => {
    expect(decideNoticeTarget({ callerId: 'p1', callerRole: 'parent', linkedStudentId: null, requestedStudentId: null }))
      .toEqual({ ok: false, error: 'No linked student', status: 403 })
  })

  it('a form-supplied studentId for someone else is forbidden (the old IDOR)', () => {
    expect(decideNoticeTarget({ callerId: 's1', callerRole: 'student', linkedStudentId: null, requestedStudentId: 'victim' }))
      .toEqual({ ok: false, error: 'Forbidden', status: 403 })
    expect(decideNoticeTarget({ callerId: 'p1', callerRole: 'parent', linkedStudentId: 's1', requestedStudentId: 'victim' }))
      .toEqual({ ok: false, error: 'Forbidden', status: 403 })
  })

  it('a matching form-supplied studentId is allowed (back-compat)', () => {
    expect(decideNoticeTarget({ callerId: 's1', callerRole: 'student', linkedStudentId: null, requestedStudentId: 's1' }))
      .toEqual({ ok: true, studentId: 's1' })
  })
})
