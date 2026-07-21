// Server-side locale read. Server Components call getLocale('<panel default>')
// — 'en' in the student panel, 'zh' in the parent panel.
import { cookies } from 'next/headers'
import { LOCALE_COOKIE, resolveLocale, type Locale } from './locale'

export function getLocale(fallback: Locale): Locale {
  return resolveLocale(cookies().get(LOCALE_COOKIE)?.value, fallback)
}
