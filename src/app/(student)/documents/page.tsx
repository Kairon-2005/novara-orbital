// Server Component — fetches student_documents from Supabase Storage metadata.
import { createServerClient } from '@/db/server'
import DocumentsClient from './DocumentsClient'
import type { MockDocument } from '@/lib/mock-data'

export default async function DocumentsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">Not authenticated.</p>

  const { data: dbDocs } = await supabase
    .from('student_documents')
    .select('id, file_name, file_type, upload_date, storage_path')
    .eq('student_id', user.id)
    .order('upload_date', { ascending: false })

  const documents: MockDocument[] = (dbDocs ?? []).map(d => ({
    id:            d.id,
    file_name:     d.file_name,
    file_type:     d.file_type as MockDocument['file_type'],
    upload_date:   d.upload_date.slice(0, 10),
    size_kb:       0,  // not stored — would need Storage metadata API call
    parent_access: false,
  }))

  return <DocumentsClient initialDocuments={documents} userId={user.id} />
}
