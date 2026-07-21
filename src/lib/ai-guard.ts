// ─────────────────────────────────────────────────────────────────────────────
// AI guard — every model call goes through one budgeted, retrying seam
// ─────────────────────────────────────────────────────────────────────────────
// Roadmap generation has its own yearly quota (roadmap-quota.ts); every other
// AI feature gets a per-user per-day cap here so a single account can't run
// unbounded spend. Pure core: the usage store is injected (DB adapter in
// ai-guard-server.ts, in-memory fake in tests).

export type GuardedFeature = 'assess' | 'requirements' | 'plan' | 'plan_from_source' | 'translate' | 'parse_material' | 'essay_feedback'

export const FEATURE_DAILY_CAPS: Record<GuardedFeature, number> = {
  assess: 10,
  requirements: 20,
  plan: 20,
  plan_from_source: 10,
  translate: 10,
  parse_material: 20,
  essay_feedback: 8,
}

export interface AiUsageStore {
  getUsedToday(userId: string, feature: GuardedFeature, today: string): Promise<number>
  increment(userId: string, feature: GuardedFeature, today: string): Promise<void>
}

export class AiQuotaError extends Error {
  readonly feature: GuardedFeature
  constructor(feature: GuardedFeature) {
    super(`Daily AI limit reached for ${feature}. Try again tomorrow.`)
    this.name = 'AiQuotaError'
    this.feature = feature
  }
}

/** Transient = worth one retry: rate limits, upstream 5xx, timeouts, network. */
export function isTransientAiError(err: unknown): boolean {
  const status = (err as { status?: number })?.status
  if (status === 429 || (typeof status === 'number' && status >= 500)) return true
  const msg = err instanceof Error ? err.message.toLowerCase() : ''
  return msg.includes('timed out') || msg.includes('timeout') || msg.includes('econnreset') || msg.includes('fetch failed')
}

/**
 * Budget-check → call (retry once on transient failure) → record usage.
 * Usage counts completed calls only: a failed call costs the user nothing.
 */
export async function guardedAiCall<T>(
  store: AiUsageStore,
  ctx: { userId: string; feature: GuardedFeature; today: string },
  fn: () => Promise<T>,
): Promise<T> {
  const used = await store.getUsedToday(ctx.userId, ctx.feature, ctx.today)
  if (used >= FEATURE_DAILY_CAPS[ctx.feature]) throw new AiQuotaError(ctx.feature)

  let result: T
  try {
    result = await fn()
  } catch (err) {
    if (!isTransientAiError(err)) throw err
    result = await fn() // single retry; a second failure surfaces to the caller
  }

  await store.increment(ctx.userId, ctx.feature, ctx.today)
  return result
}
