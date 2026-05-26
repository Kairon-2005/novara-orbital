// POST /api/documents/upload
import { createRouteClient } from '@/db/server'
import type { DocumentFileType } from '@/types/database'

export async function POST(req: Request) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file     = formData.get('file') as File | null
    const fileType = (formData.get('fileType') as DocumentFileType | null) ?? 'other'

    if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

    const storagePath = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const buffer      = Buffer.from(await file.arrayBuffer())

    const { error: storageError } = await supabase.storage
      .from('student-documents')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (storageError) throw storageError

    const { data: docRow, error: dbError } = await supabase
      .from('student_documents')
      .insert({ student_id: user.id, file_name: file.name, storage_path: storagePath, file_type: fileType })
      .select('id')
      .single()

    if (dbError) throw dbError

    const { data: signed } = await supabase.storage
      .from('student-documents')
      .createSignedUrl(storagePath, 3600)

    return Response.json({ ok: true, id: docRow.id, signedUrl: signed?.signedUrl ?? null })
  } catch (err) {
    console.error('[documents/upload]', err)
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }
}
