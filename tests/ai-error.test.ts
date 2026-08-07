import { describe, it, expect } from 'vitest'
import { describeAiError } from '@/lib/ai-error'

describe('describeAiError', () => {
  it('flags a rejected key as non-retryable', () => {
    const f = describeAiError({ status: 401, message: 'Incorrect API key provided' })
    expect(f.category).toBe('auth')
    expect(f.retryable).toBe(false)
  })

  it('treats 403 as auth too', () => {
    expect(describeAiError({ status: 403 }).category).toBe('auth')
  })

  it('classifies our missing-env-var guard as auth, not unknown', () => {
    const f = describeAiError(new Error('QWEN_API_KEY is not set in this environment'))
    expect(f.category).toBe('auth')
    expect(f.retryable).toBe(false)
  })

  it('detects an exhausted balance from the DashScope code, not the status', () => {
    // Reported as 400, so status alone would misfile it as unknown/retryable.
    const f = describeAiError({ status: 400, code: 'Allocated quota exceeded', message: 'x' })
    expect(f.category).toBe('balance')
    expect(f.retryable).toBe(false)
  })

  it('detects arrearage and insufficient-balance wording', () => {
    expect(describeAiError({ message: 'Account in arrearage' }).category).toBe('balance')
    expect(describeAiError({ message: 'Insufficient balance' }).category).toBe('balance')
  })

  it('marks rate limiting retryable', () => {
    const f = describeAiError({ status: 429, message: 'Rate limit exceeded' })
    expect(f.category).toBe('rate_limit')
    expect(f.retryable).toBe(true)
  })

  it('recognises our own timeout errors', () => {
    expect(describeAiError(new Error('AI request timed out')).category).toBe('timeout')
    expect(describeAiError(new Error('kb search timed out after 6000ms')).category).toBe('timeout')
  })

  // Verbatim shape from the Vercel log: the outer error carries no status and no
  // code, and the real cause is one level down. Matching only the top level
  // filed this as "unknown" and told the user to just try again.
  it('classifies an unreachable host from the nested cause', () => {
    const wrapped = Object.assign(new Error('Connection error.'), {
      status: undefined,
      code: undefined,
      cause: Object.assign(
        new Error('request to https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions failed'),
        { type: 'system', errno: 'ETIMEDOUT', code: 'ETIMEDOUT' },
      ),
    })
    const f = describeAiError(wrapped)
    expect(f.category).toBe('network')
    expect(f.retryable).toBe(false)
  })

  it('catches the other unreachable-host codes', () => {
    for (const code of ['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'EAI_AGAIN']) {
      expect(describeAiError({ cause: { code } }).category).toBe('network')
    }
  })

  it('does not let a nested transport error mask a real auth status', () => {
    const f = describeAiError(Object.assign(new Error('401 Incorrect API key provided'), { status: 401 }))
    expect(f.category).toBe('auth')
  })

  it('stops walking a self-referential cause chain', () => {
    const loop: { message: string; cause?: unknown } = { message: 'boom' }
    loop.cause = loop
    expect(describeAiError(loop).category).toBe('unknown')
  })

  it('recognises the empty-roadmap guard from normalizeGeneratedRoadmap', () => {
    const f = describeAiError(new Error('generateRoadmap: AI response missing a non-empty "years" array'))
    expect(f.category).toBe('empty')
    expect(f.retryable).toBe(true)
  })

  it('falls back to a retryable generic message', () => {
    const f = describeAiError(new Error('something unexpected'))
    expect(f.category).toBe('unknown')
    expect(f.retryable).toBe(true)
  })

  it('survives junk input', () => {
    for (const junk of [null, undefined, 'a string', 42, {}]) {
      expect(describeAiError(junk).category).toBe('unknown')
    }
  })

  // The raw error may carry request URLs or header echoes — never surface it.
  it('never echoes the underlying error text', () => {
    const f = describeAiError({ status: 401, message: 'key sk-abc123 rejected by https://internal' })
    expect(f.message).not.toContain('sk-abc123')
    expect(f.message).not.toContain('internal')
  })
})
