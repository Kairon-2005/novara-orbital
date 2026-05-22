import { createClientComponentClient, createServerComponentClient, createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// ── Browser (Client Components) ──────────────────────────────
export const createBrowserClient = () =>
  createClientComponentClient<Database>()

// ── Server Components ─────────────────────────────────────────
export const createServerClient = () =>
  createServerComponentClient<Database>({ cookies })

// ── API Route Handlers ────────────────────────────────────────
export const createRouteClient = () =>
  createRouteHandlerClient<Database>({ cookies })
