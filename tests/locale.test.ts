import { describe, it, expect } from 'vitest'
import { resolveLocale } from '@/lib/locale'

describe('resolveLocale', () => {
  it('honours a valid saved choice over the panel default', () => {
    expect(resolveLocale('zh', 'en')).toBe('zh')
    expect(resolveLocale('en', 'zh')).toBe('en')
  })

  it('falls back to the panel default when unset or garbage', () => {
    expect(resolveLocale(undefined, 'en')).toBe('en')
    expect(resolveLocale(null, 'zh')).toBe('zh')
    expect(resolveLocale('fr', 'en')).toBe('en')
    expect(resolveLocale('', 'zh')).toBe('zh')
  })
})
