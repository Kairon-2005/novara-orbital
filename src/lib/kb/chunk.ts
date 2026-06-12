// KB document parsing + chunking (pure).
//
// Documents are markdown files with a small, controlled YAML frontmatter
// (see docs/PRD-knowledge-base.md §3). The frontmatter vocabulary is ours,
// so a tiny purpose-built parser is used instead of a YAML dependency.

import type { KbDocMeta, KbChunk, KbUniversity, KbCategory } from '@/types/kb'

const unquote = (s: string) => s.replace(/^["']|["']$/g, '').trim()

/** Parse a content/kb markdown file into its metadata and body. */
export function parseKbDoc(raw: string): { meta: KbDocMeta; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) throw new Error('parseKbDoc: missing frontmatter')

  const fields: Record<string, string> = {}
  const lists: Record<string, string[]> = {}
  let currentList: string | null = null

  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^\s+-\s+(.*)$/)
    if (item && currentList) {
      lists[currentList].push(unquote(item[1]))
      continue
    }
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/)
    if (!kv) continue
    const [, key, value] = kv
    if (value === '' || value === '[]') {
      lists[key] = []
      currentList = value === '' ? key : null
    } else {
      fields[key] = unquote(value)
      currentList = null
    }
  }

  const required = ['id', 'title', 'category', 'topic', 'last_verified'] as const
  for (const key of required) {
    if (!fields[key]) throw new Error(`parseKbDoc: missing frontmatter field "${key}"`)
  }

  const university = fields.university
  const meta: KbDocMeta = {
    id: fields.id,
    title: fields.title,
    category: fields.category as KbCategory,
    university: university === 'NUS' || university === 'NTU' ? (university as KbUniversity) : null,
    topic: fields.topic,
    sourceUrls: lists.source_urls ?? [],
    lastVerified: fields.last_verified,
    refresh: fields.refresh === 'manual' ? 'manual' : 'quarterly',
    language: fields.language === 'zh' ? 'zh' : 'en',
  }

  return { meta, body: raw.slice(match[0].length) }
}

// ── Chunking ──────────────────────────────────────────────────

export interface ChunkOptions {
  /** Max characters per chunk. ~1,800 chars ≈ 450 tokens. */
  maxChars?: number
}

const DEFAULT_MAX_CHARS = 1_800

/**
 * Split a parsed doc into heading-bounded chunks. Sections are cut at `##`
 * headings; oversized sections are packed paragraph-by-paragraph under the
 * cap. Every chunk carries the doc metadata and a deterministic id.
 */
export function chunkDoc(meta: KbDocMeta, body: string, opts: ChunkOptions = {}): KbChunk[] {
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS

  // Cut into sections at `##` headings; content before the first `##`
  // (minus any `#` doc-title line) is the intro section.
  const sections: { section: string; content: string }[] = []
  let heading: string | null = null
  let buffer: string[] = []
  const flush = () => {
    const content = buffer.join('\n').replace(/^#\s+.*$/m, '').trim()
    const section = heading ? `${meta.title} > ${heading}` : meta.title
    if (content) sections.push({ section, content })
    buffer = []
  }
  for (const line of body.split(/\r?\n/)) {
    const h2 = line.match(/^##\s+(.*)$/)
    if (h2) {
      flush()
      heading = h2[1].trim()
    } else {
      buffer.push(line)
    }
  }
  flush()

  // Pack each section's paragraphs into pieces under the cap.
  const pieces: { section: string; text: string }[] = []
  for (const { section, content } of sections) {
    let current = ''
    for (const para of content.split(/\n{2,}/)) {
      const next = current ? `${current}\n\n${para}` : para
      if (next.length <= maxChars) {
        current = next
        continue
      }
      if (current) pieces.push({ section, text: current })
      // A single paragraph longer than the cap is hard-split.
      let rest = para
      while (rest.length > maxChars) {
        pieces.push({ section, text: rest.slice(0, maxChars) })
        rest = rest.slice(maxChars)
      }
      current = rest
    }
    if (current) pieces.push({ section, text: current })
  }

  return pieces.map((piece, index) => ({
    id: `${meta.id}#${index}`,
    docId: meta.id,
    index,
    section: piece.section,
    text: piece.text,
    meta,
  }))
}
