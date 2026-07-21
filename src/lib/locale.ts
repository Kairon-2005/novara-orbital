// Locale resolution (pure). Panel defaults are role-shaped — student surfaces
// default to English, parent surfaces to Simplified Chinese — and a user's
// explicit choice (persisted in the NEXT_LOCALE cookie by ProfileMenu's
// language toggle) overrides the default everywhere.

export type Locale = 'en' | 'zh'

export const LOCALE_COOKIE = 'NEXT_LOCALE'

export function resolveLocale(cookieValue: string | undefined | null, fallback: Locale): Locale {
  return cookieValue === 'en' || cookieValue === 'zh' ? cookieValue : fallback
}
