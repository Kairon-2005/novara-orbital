// Document access. Maps storage metadata rows into the document view model.

import type { DB } from './client'
import type { MockDocument } from '@/types/models'

export async function getStudentDocuments(supabase: DB, userId: string): Promise<MockDocument[]> {
  const { data } = await supabase
    .from('student_documents')
    .select('id, file_name, file_type, upload_date, storage_path')
    .eq('student_id', userId)

  return (data ?? []).map(d => ({
    id:            d.id,
    file_name:     d.file_name,
    file_type:     d.file_type,
    upload_date:   d.upload_date,
    size_kb:       0,
    parent_access: false,
  }))
}

export type EvidenceForAssessment = { type: string; summary: string; dimensions: string[]; relevance: string }

// Classified evidence shaped for the assessment prompt. Falls back to the raw
// file type when a document hasn't been classified yet.
export async function getEvidenceForAssessment(supabase: DB, userId: string): Promise<EvidenceForAssessment[]> {
  const { data } = await supabase
    .from('student_documents')
    .select('file_type, classification')
    .eq('student_id', userId)

  return (data ?? []).map(d => ({
    type:       d.classification?.evidenceType ?? d.file_type,
    summary:    d.classification?.summary ?? '',
    dimensions: d.classification?.linkedDimensions ?? [],
    relevance:  d.classification?.relevance ?? 'medium',
  }))
}

// Has the student uploaded any document since the given timestamp?
export async function hasEvidenceSince(supabase: DB, userId: string, sinceIso: string): Promise<boolean> {
  const { data } = await supabase
    .from('student_documents')
    .select('id')
    .eq('student_id', userId)
    .gt('created_at', sinceIso)
    .limit(1)
  return (data?.length ?? 0) > 0
}
