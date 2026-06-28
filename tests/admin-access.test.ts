import { describe, it, expect } from 'vitest'
import { isAdmin } from '@/lib/admin/access'

describe('isAdmin', () => {
  it('is true only for the admin role', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true)
    expect(isAdmin({ role: 'student' })).toBe(false)
    expect(isAdmin({ role: 'parent' })).toBe(false)
  })

  it('is false for null / missing profile', () => {
    expect(isAdmin(null)).toBe(false)
    expect(isAdmin(undefined)).toBe(false)
  })
})
