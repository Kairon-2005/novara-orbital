import { createServerClient } from '@/db/server'
import WikiClient from './WikiClient'

// Knowledge Wiki — read-only view over the RAG knowledge base. The list and
// documents are fetched client-side from /api/kb/* (the vector store is the
// runtime source of truth, so students see exactly what the AI retrieves from).

export default async function WikiPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <p className="p-10 text-red-500">Not authenticated.</p>

  return <WikiClient />
}
