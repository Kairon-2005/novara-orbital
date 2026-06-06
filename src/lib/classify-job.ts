// Background classification job: download a stored document, extract its text,
// run the AI classifier, and persist the structured JSON. Kept off the upload
// request path. Reused by the on-demand route and the cron sweep.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { extractText } from '@/lib/extract'
import { classifyEvidence } from '@/lib/classifier'
import type { EvidenceClassification } from '@/types/evidence'

type DB = SupabaseClient<Database>

function mimeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'application/pdf'
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return `image/${ext === 'jpg' ? 'jpeg' : ext}`
  return 'text/plain'
}

export async function classifyDocument(supabase: DB, docId: string): Promise<EvidenceClassification | null> {
  const { data: doc } = await supabase
    .from('student_documents')
    .select('id, file_name, file_type, storage_path')
    .eq('id', docId)
    .maybeSingle()
  if (!doc) return null

  const { data: blob, error } = await supabase.storage.from('student-documents').download(doc.storage_path)
  if (error || !blob) return null

  const buffer = Buffer.from(await blob.arrayBuffer())
  const text = await extractText(buffer, mimeFromName(doc.file_name))
  const classification = await classifyEvidence({ fileName: doc.file_name, fileType: doc.file_type, text })

  await supabase
    .from('student_documents')
    .update({ extracted_text: text || null, classification })
    .eq('id', docId)

  return classification
}
