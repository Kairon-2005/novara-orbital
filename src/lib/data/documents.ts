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
