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
  category: 'auth' | 'balance' | 'rate_limit' | 'network' | 'timeout' | 'empty' | 'unknown'
  /** Shown to the user. */
  message: string
  /** True when trying again, unchanged, could plausibly work. */
  retryable: boolean
}

type Errorish = { status?: number; code?: string; errno?: string; message?: string; cause?: unknown }

/**
 * The SDK wraps transport failures, so the useful detail is nested: the outer
 * error says only "Connection error." with an undefined code, while the real
 * ETIMEDOUT sits on `cause`. Flatten the chain before matching.
 */
function chain(err: unknown, depth = 5): Errorish[] {
  const links: Errorish[] = []
  let current: unknown = err
  while (current && typeof current === 'object' && links.length < depth) {
    links.push(current as Errorish)
    current = (current as Errorish).cause
  }
  return links
}

export function describeAiError(err: unknown): AiFailure {
  const links = chain(err)
  const status = links.map(l => l.status).find(s => typeof s === 'number')
  const code = links
    .flatMap(l => [l.code, l.errno])
    .filter((c): c is string => typeof c === 'string')
    .join(' ')
    .toLowerCase()
  const text = links
    .map(l => l.message)
    .filter((m): m is string => typeof m === 'string')
    .join(' ')
    .toLowerCase()

  // Unreachable host: distinct from a slow one, and distinct from a bad key.
  // Checked before the generic timeout case, which these would also match.
  if (
    code.includes('etimedout') || code.includes('econnrefused') ||
    code.includes('enotfound') || code.includes('econnreset') ||
    code.includes('eai_again') || text.includes('connection error')
  ) {
    return {
      category: 'network',
      message: 'The server could not reach the AI service. This is a connectivity problem on our side, not something you did.',
      retryable: false,
    }
  }

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
  if (text.includes('timed out') || text.includes('timeout')) {
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
