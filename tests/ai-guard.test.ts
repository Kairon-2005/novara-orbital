import { describe, it, expect, vi } from 'vitest'
import { guardedAiCall, AiQuotaError, FEATURE_DAILY_CAPS, isTransientAiError, type AiUsageStore } from '@/lib/ai-guard'

function storeWith(used: number): AiUsageStore & { increments: number } {
  const s = {
    increments: 0,
    async getUsedToday() { return used },
    async increment() { s.increments += 1 },
  }
  return s
}

const TODAY = '2026-07-21'

describe('guardedAiCall', () => {
  it('runs the call and records usage when under the cap', async () => {
    const store = storeWith(0)
    const result = await guardedAiCall(store, { userId: 'u1', feature: 'assess', today: TODAY }, async () => 'ok')
    expect(result).toBe('ok')
    expect(store.increments).toBe(1)
  })

  it('refuses with AiQuotaError at the cap without invoking the model', async () => {
    const store = storeWith(FEATURE_DAILY_CAPS.assess)
    const fn = vi.fn()
    await expect(
      guardedAiCall(store, { userId: 'u1', feature: 'assess', today: TODAY }, fn),
    ).rejects.toBeInstanceOf(AiQuotaError)
    expect(fn).not.toHaveBeenCalled()
    expect(store.increments).toBe(0)
  })

  it('retries once on a transient failure, then succeeds', async () => {
    const store = storeWith(0)
    let calls = 0
    const result = await guardedAiCall(store, { userId: 'u1', feature: 'requirements', today: TODAY }, async () => {
      calls += 1
      if (calls === 1) throw Object.assign(new Error('rate limited'), { status: 429 })
      return 'second try'
    })
    expect(result).toBe('second try')
    expect(calls).toBe(2)
    expect(store.increments).toBe(1) // one user action = one usage unit
  })

  it('does not retry a non-transient failure and records no usage', async () => {
    const store = storeWith(0)
    let calls = 0
    await expect(
      guardedAiCall(store, { userId: 'u1', feature: 'plan', today: TODAY }, async () => {
        calls += 1
        throw Object.assign(new Error('bad request'), { status: 400 })
      }),
    ).rejects.toThrow('bad request')
    expect(calls).toBe(1)
    expect(store.increments).toBe(0)
  })

  it('surfaces the second transient failure after the single retry', async () => {
    const store = storeWith(0)
    let calls = 0
    await expect(
      guardedAiCall(store, { userId: 'u1', feature: 'plan', today: TODAY }, async () => {
        calls += 1
        throw Object.assign(new Error('upstream down'), { status: 503 })
      }),
    ).rejects.toThrow('upstream down')
    expect(calls).toBe(2)
    expect(store.increments).toBe(0)
  })
})

describe('isTransientAiError', () => {
  it('classifies 429/5xx/timeouts as transient, 4xx as not', () => {
    expect(isTransientAiError({ status: 429 })).toBe(true)
    expect(isTransientAiError({ status: 500 })).toBe(true)
    expect(isTransientAiError(new Error('AI request timed out'))).toBe(true)
    expect(isTransientAiError({ status: 400 })).toBe(false)
    expect(isTransientAiError(new Error('parse failure'))).toBe(false)
  })
})
