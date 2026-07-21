// DB adapter for the AI guard + a route helper. Server only (service role):
// counters live in ai_usage, which users can read but never write — so the
// cap can't be reset from the browser.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/db/server'
import { guardedAiCall, AiQuotaError, type AiUsageStore, type GuardedFeature } from './ai-guard'

function createAiUsageStore(): AiUsageStore {
  const admin = createAdminClient()
  return {
    async getUsedToday(userId, feature, today) {
      const { data } = await admin
        .from('ai_usage')
        .select('count')
        .eq('user_id', userId).eq('feature', feature).eq('day', today)
        .maybeSingle()
      return data?.count ?? 0
    },
    async increment(userId, feature, today) {
      const { data } = await admin
        .from('ai_usage')
        .select('count')
        .eq('user_id', userId).eq('feature', feature).eq('day', today)
        .maybeSingle()
      await admin
        .from('ai_usage')
        .upsert(
          { user_id: userId, feature, day: today, count: (data?.count ?? 0) + 1 },
          { onConflict: 'user_id,feature,day' },
        )
    },
  }
}

/** Run an AI call under today's per-user budget for `feature`. */
export function runGuardedAi<T>(userId: string, feature: GuardedFeature, fn: () => Promise<T>): Promise<T> {
  if (!process.env.QWEN_API_KEY) {
    return Promise.reject(new Error('QWEN_API_KEY is not configured'))
  }
  return guardedAiCall(createAiUsageStore(), {
    userId,
    feature,
    today: new Date().toISOString().slice(0, 10),
  }, fn)
}

/** Map a quota refusal to the HTTP response routes should return, else null. */
export function quotaResponse(err: unknown): NextResponse | null {
  if (err instanceof AiQuotaError) {
    return NextResponse.json({ error: err.message, code: 'ai_quota_exceeded' }, { status: 429 })
  }
  return null
}
