// Server Component — School Navigator over the real `schools` directory
// (world-readable, admin-curated via /admin/directory). Younger students
// use this to find a primary/secondary school before universities matter.
import { createServerClient } from '@/db/server'
import NavigatorClient from './NavigatorClient'

export default async function NavigatorPage() {
  const supabase = createServerClient()
  const { data: schools, error } = await supabase
    .from('schools')
    .select('id, school_name, slug, school_type, curriculum, zone, address, description, website, tuition_range, highlights')
    .eq('is_active', true)
    .order('school_name')

  // Pre-migration schemas lack tuition_range/highlights — degrade rather than blank.
  if (error) {
    const { data: base } = await supabase
      .from('schools')
      .select('id, school_name, slug, school_type, curriculum, zone, address, description, website')
      .eq('is_active', true)
      .order('school_name')
    return <NavigatorClient schools={(base ?? []).map(s => ({ ...s, tuition_range: null, highlights: [] }))} />
  }

  return <NavigatorClient schools={schools ?? []} />
}
