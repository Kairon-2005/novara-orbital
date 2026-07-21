'use client'

// Client-side locale context. Layouts resolve the locale server-side (cookie +
// panel default) and provide it here; client components read it with
// useLocale() and pick from a colocated { en: {...}, zh: {...} } dictionary —
// the same pattern JourneyCard's lang prop established.

import { createContext, useContext } from 'react'
import type { Locale } from '@/lib/locale'

const LocaleContext = createContext<Locale>('en')

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

export function useLocale(): Locale {
  return useContext(LocaleContext)
}
