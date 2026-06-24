// The Supabase client type the data-access layer operates on. Derived from the
// server client factory so it always matches what Server Components / Route
// Handlers pass in.
import type { createServerClient } from '@/db/server'

export type DB = ReturnType<typeof createServerClient>
