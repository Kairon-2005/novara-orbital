// Server-only Supabase client — DO NOT import in Client Components
// This file imports next/headers which is only available server-side

import { createServerClient as ssrServer, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const createServerClient = () => {
  const cookieStore = cookies()
  return ssrServer<Database>(URL, ANON, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet: Array<{ name: string; value: string; options: CookieOptions }>) => {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Auth refresh still works; session updates on the next request.
        }
      },
    },
  })
}

// Route handlers use the same cookie-aware client
export const createRouteClient = createServerClient

// Service-role client — bypasses RLS and the verification-guard trigger. SERVER
// ONLY; never import in a Client Component. Use for privileged writes the user
// must not control directly: verification verdicts, and notifications addressed
// to a *different* user. See docs/PRD-admission-cases.md §A.3 / §A.9.4.
export const createAdminClient = () =>
  createClient<Database>(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
