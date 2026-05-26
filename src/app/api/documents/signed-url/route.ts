// GET /api/documents/signed-url?path=<storage_path>
import { createRouteClient } from '@/db/server'

export async function GET(req: Request) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const storagePath = searchParams.get('path')
  if (!storagePath) return Response.json({ error: 'Missing path' }, { status: 400 })

  if (!storagePath.startsWith(`${user.id}/`)) {
    const { data: link } = await supabase
      .from('parent_links').select('student_id').eq('parent_id', user.id).single()
    if (!link || !storagePath.startsWith(`${link.student_id}/`)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data, error } = await supabase.storage
    .from('student-documents').createSignedUrl(storagePath, 3600)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ signedUrl: data.signedUrl })
}
