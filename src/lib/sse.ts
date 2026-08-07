// Minimal Server-Sent Events frame parsing for fetch-based streaming.
//
// EventSource can't be used here because the request is a POST, so the frames
// are parsed by hand. A network chunk boundary falls wherever it likes — very
// often mid-frame — so the caller must carry the trailing partial across reads.

export type SseEvent = { event: string; data: string }

/**
 * Split whatever has arrived into complete frames plus the leftover tail.
 * Feed the returned `rest` back in front of the next chunk.
 */
export function parseSseFrames(buffer: string): { events: SseEvent[]; rest: string } {
  // Frames are delimited by a blank line. Normalise CRLF first so a proxy that
  // rewrites line endings doesn't make every frame unparseable.
  const normalized = buffer.replace(/\r\n/g, '\n')
  const parts = normalized.split('\n\n')
  const rest = parts.pop() ?? ''

  const events: SseEvent[] = []
  for (const part of parts) {
    let event: string | undefined
    // Per the SSE spec `data:` may repeat and the values join with newlines.
    const data: string[] = []
    for (const line of part.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data.push(line.slice(5).trim())
    }
    if (event && data.length) events.push({ event, data: data.join('\n') })
  }

  return { events, rest }
}
