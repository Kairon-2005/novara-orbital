// Turning an upstream AI failure into something the user can act on.
//
// Every failure used to reach the browser as "AI generation failed. Please try
// again." — which is wrong advice for most of them: retrying a rejected API key
// or an exhausted balance just fails again, and the person retrying has no way
// to know that. These messages are fixed strings chosen per category; the raw
// error is logged server-side and never echoed, so a key or endpoint can't leak
// into the UI.

export type AiFailure = {
  /** Stable slug for logs and metrics. */
  category: 'auth' | 'balance' | 'rate_limit' | 'timeout' | 'empty' | 'unknown'
  /** Shown to the user. */
  message: string
  /** True when trying again, unchanged, could plausibly work. */
  retryable: boolean
}

export function describeAiError(err: unknown): AiFailure {
  const e = err as { status?: number; code?: string; message?: string }
  const status = typeof e?.status === 'number' ? e.status : undefined
  const code = typeof e?.code === 'string' ? e.code.toLowerCase() : ''
  const text = typeof e?.message === 'string' ? e.message.toLowerCase() : ''

  // DashScope reports spend problems as 400/403 with a distinctive code rather
  // than the 402 the status code would suggest, so match on the code too.
  if (code.includes('allocated quota') || text.includes('insufficient') || text.includes('arrearage')) {
    return {
      category: 'balance',
      message: 'The AI service reports no remaining balance or quota. Generation is unavailable until it is topped up.',
      retryable: false,
    }
  }
  if (
    status === 401 || status === 403 ||
    code.includes('invalidapikey') || text.includes('invalid api key') ||
    // Our own pre-flight guard: the key is absent from this environment
    // entirely, which upstream would otherwise report as an anonymous 401.
    text.includes('qwen_api_key is not set')
  ) {
    return {
      category: 'auth',
      message: 'The AI service rejected our credentials. This is a configuration problem, not something retrying will fix.',
      retryable: false,
    }
  }
  if (status === 429 || code.includes('throttl') || text.includes('rate limit')) {
    return {
      category: 'rate_limit',
      message: 'The AI service is rate-limiting requests. Please wait a moment and try again.',
      retryable: true,
    }
  }
  if (code === 'etimedout' || code === 'econnreset' || text.includes('timed out') || text.includes('timeout')) {
    return {
      category: 'timeout',
      message: 'The AI service took too long to respond. Please try again.',
      retryable: true,
    }
  }
  // normalizeGeneratedRoadmap's own guard: a stream that produced no usable year.
  if (text.includes('missing a non-empty "years" array')) {
    return {
      category: 'empty',
      message: 'The AI returned an unusable roadmap. Please try again.',
      retryable: true,
    }
  }
  return {
    category: 'unknown',
    message: 'AI generation failed. Please try again.',
    retryable: true,
  }
}
