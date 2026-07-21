// Who may a school-notice upload be recorded against? The target student is
// derived from the session — a student targets themself, a parent targets the
// linked child — and any conflicting form-supplied studentId is rejected.
// This is the gate in front of a service-role (RLS-bypassing) insert.

export type NoticeTargetDecision =
  | { ok: true; studentId: string }
  | { ok: false; error: string; status: 403 }

export function decideNoticeTarget(input: {
  callerId: string
  callerRole: string | null
  linkedStudentId: string | null
  requestedStudentId: string | null
}): NoticeTargetDecision {
  let studentId: string
  if (input.callerRole === 'parent') {
    if (!input.linkedStudentId) return { ok: false, error: 'No linked student', status: 403 }
    studentId = input.linkedStudentId
  } else {
    studentId = input.callerId
  }
  if (input.requestedStudentId && input.requestedStudentId !== studentId) {
    return { ok: false, error: 'Forbidden', status: 403 }
  }
  return { ok: true, studentId }
}
