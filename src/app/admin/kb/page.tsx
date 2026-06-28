import { createServerClient } from '@/db/server'
import { qdrantConfigured, QdrantStore } from '@/lib/kb/store'
import KbClient from './KbClient'

export const dynamic = 'force-dynamic'

export default async function AdminKbPage() {
  const supabase = createServerClient()
  const { data: contributions } = await supabase
    .from('kb_contributions')
    .select('id, title, url, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  let docs: { docId: string; title: string }[] = []
  if (qdrantConfigured()) {
    try {
      docs = (await new QdrantStore().listDocs()).map((d) => ({ docId: d.docId, title: d.title }))
    } catch { /* KB unreachable — show contributions only */ }
  }

  return <KbClient contributions={contributions ?? []} docs={docs} />
}
