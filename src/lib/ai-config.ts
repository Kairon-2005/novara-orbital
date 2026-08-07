// Where the AI calls go, and which models they ask for.
//
// Centralised because the provider is not a fixed property of this app: the
// code speaks the OpenAI-compatible dialect, so DashScope, Gemini's compat
// endpoint, Groq, OpenRouter and others are all reachable by changing config
// alone. Keeping the model names here too means swapping providers never means
// hunting hardcoded strings through a dozen call sites.
//
// The QWEN_* names are the original ones and still work, so existing
// deployments keep running unchanged.

export const AI_BASE_URL =
  process.env.AI_BASE_URL ??
  process.env.QWEN_BASE_URL ??
  'https://dashscope.aliyuncs.com/compatible-mode/v1'

export const AI_API_KEY = process.env.AI_API_KEY ?? process.env.QWEN_API_KEY ?? ''

/** Workhorse model: roadmaps, assessments, classification, critique. */
export const AI_MODEL = process.env.AI_MODEL ?? 'qwen-plus'

/** Reserved for translation, where wording quality matters most. */
export const AI_MODEL_STRONG = process.env.AI_MODEL_STRONG ?? 'qwen-max'

export const EMBEDDING_MODEL = process.env.AI_EMBEDDING_MODEL ?? 'text-embedding-v3'

// Changing this invalidates every stored vector — the Qdrant collection must be
// re-ingested, since dimensions have to match what was indexed.
export const EMBEDDING_DIMENSIONS = Number(process.env.AI_EMBEDDING_DIMENSIONS ?? 1024)

/** True when a key is present at all — distinguishes "misconfigured" from "upstream refused". */
export const aiConfigured = () => AI_API_KEY.length > 0
