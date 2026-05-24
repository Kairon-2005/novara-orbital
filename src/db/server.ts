// Server-only Supabase client — DO NOT import in Client Components
// This file imports next/headers which is only available server-side

import { createServerClient as ssrServer, type CookieOptions } from '@supabase/ssr'
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
