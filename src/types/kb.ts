// Knowledge base (LLM wiki + RAG) domain types.
// See docs/PRD-knowledge-base.md.

export type KbCategory = 'university-official' | 'pathway' | 'general-guide' | 'experience'
export type KbUniversity = 'NUS' | 'NTU'

/** Frontmatter of a content/kb/*.md document. */
export interface KbDocMeta {
  id: string
  title: string
  category: KbCategory
  university: KbUniversity | null
  topic: string
  sourceUrls: string[]
  /** ISO date the facts were last checked against sources. */
  lastVerified: string
  refresh: 'quarterly' | 'manual'
  language: 'en' | 'zh'
}

/** One embeddable unit: a heading-bounded slice of a doc plus its doc metadata. */
export interface KbChunk {
  /** Deterministic: `${doc.id}#${index}` */
  id: string
  docId: string
  index: number
  /** Heading trail, e.g. "NUS Admissions Routes > Gaokao route" */
  section: string
  text: string
  meta: KbDocMeta
}

/** A retrieval result. */
export interface KbSearchHit {
  chunkId: string
  docId: string
  title: string
  section: string
  text: string
  score: number
  sourceUrls: string[]
  lastVerified: string
}

export interface KbFilters {
  university?: KbUniversity
  category?: KbCategory
  topic?: string
  limit?: number
}
