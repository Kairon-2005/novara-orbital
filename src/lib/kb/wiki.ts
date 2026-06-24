// Wiki reader helpers (pure): rebuild a readable document from its
// ingested chunks. The vector store is the runtime source of truth, so the
// wiki shows exactly what the AI retrieves from.

import type { KbPointPayload } from './store'
import type { KbCategory, KbUniversity } from '@/types/kb'

export interface WikiSection {
  section: string
  text: string
}

export interface WikiDoc {
  docId: string
  title: string
  category: KbCategory
  university: KbUniversity | null
  topic: string
  sourceUrls: string[]
  lastVerified: string
  sections: WikiSection[]
}

/** Rebuild a document from its chunk payloads (already in section order). */
export function assembleDoc(chunks: KbPointPayload[]): WikiDoc | null {
  if (chunks.length === 0) return null
  const first = chunks[0]

  const sections: WikiSection[] = []
  for (const chunk of chunks) {
    const last = sections[sections.length - 1]
    if (last && last.section === chunk.section) {
      last.text += `\n\n${chunk.text}`
    } else {
      sections.push({ section: chunk.section, text: chunk.text })
    }
  }

  return {
    docId: first.docId,
    title: first.title,
    category: first.category,
    university: first.university,
    topic: first.topic,
    sourceUrls: first.sourceUrls,
    lastVerified: first.lastVerified,
    sections,
  }
}
