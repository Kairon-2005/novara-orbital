// ─────────────────────────────────────────────────────────────────────────────
// Text extraction seam
// ─────────────────────────────────────────────────────────────────────────────
// Turns an uploaded file into plain text for AI classification. Today the "light"
// path: pdf-parse for PDFs, tesseract.js OCR for images, utf-8 for text. This is
// the seam where a higher-fidelity extractor (e.g. MinerU, run as a microservice)
// slots in later — callers only ever see `extractText(buffer, mime) -> string`.

export type ExtractorKind = 'pdf' | 'image' | 'text'

/** Pure routing decision: which extractor handles this MIME type. */
export function extractorKind(mime: string): ExtractorKind {
  if (mime === 'application/pdf') return 'pdf'
  if (mime.startsWith('image/')) return 'image'
  return 'text'
}

const MAX_CHARS = 12_000 // keep the LLM prompt bounded

/**
 * Best-effort text extraction. Returns '' rather than throwing — a file that
 * can't be parsed should still upload and store; it just won't be classified.
 */
export async function extractText(buffer: Buffer, mime: string): Promise<string> {
  try {
    let text = ''
    switch (extractorKind(mime)) {
      case 'pdf': {
        // @ts-ignore — pdf-parse ships without bundled types
        const pdfParse = (await import('pdf-parse')).default
        text = (await pdfParse(buffer)).text
        break
      }
      case 'image': {
        const { createWorker } = await import('tesseract.js')
        const worker = await createWorker('eng')
        const { data } = await worker.recognize(buffer)
        await worker.terminate()
        text = data.text
        break
      }
      default:
        text = buffer.toString('utf-8')
    }
    return text.trim().slice(0, MAX_CHARS)
  } catch {
    return ''
  }
}
