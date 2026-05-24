// Browser-only Supabase client — safe to import in Client Components
// For server components and route handlers, import from @/db/server instead

import { createBrowserClient as ssrBrowser } from '@supabase/ssr'
import type { Database } from '@/types/database'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const createBrowserClient = () =>
  ssrBrowser<Database>(URL, ANON)
