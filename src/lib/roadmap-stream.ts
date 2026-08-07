// Incremental parsing for a roadmap that is still being streamed.
//
// The model emits one big JSON object, so nothing is parseable with JSON.parse
// until the very last byte. But each entry inside "years" is complete long
// before that — this walks the partial buffer and hands back every year object
// that has closed, so the UI can render year-by-year instead of spinning.
//
// It also doubles as the salvage path: if the stream is cut short (time budget
// exhausted, function killed), whatever years already closed are still usable.

/**
 * Every complete object inside the top-level "years" array of a partial JSON
 * buffer. Incomplete trailing objects are ignored, so the result only grows as
 * more of the stream arrives. Returns [] until the array itself has started.
 */
export function extractCompleteYears(buffer: string): unknown[] {
  const key = buffer.indexOf('"years"')
  if (key === -1) return []
  const arrayStart = buffer.indexOf('[', key)
  if (arrayStart === -1) return []

  const years: unknown[] = []
  let depth = 0
  let objectStart = -1
  let inString = false
  let escaped = false

  for (let i = arrayStart + 1; i < buffer.length; i++) {
    const ch = buffer[i]

    // String state first — braces and brackets inside string literals (a title
    // containing "{", say) must not move the depth counter.
    if (escaped) { escaped = false; continue }
    if (ch === '\\') { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue

    if (ch === '{') {
      if (depth === 0) objectStart = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && objectStart !== -1) {
        try {
          years.push(JSON.parse(buffer.slice(objectStart, i + 1)))
        } catch {
          // Shouldn't happen for a balanced slice, but a malformed year is not
          // worth failing the whole roadmap over — skip it.
        }
        objectStart = -1
      }
    } else if (ch === ']' && depth === 0) {
      break // end of the years array
    }
  }

  return years
}

/**
 * Best-effort parse of a streamed roadmap body. Prefers the clean whole-object
 * parse; falls back to salvaging the complete years when the buffer is partial.
 */
export function parseStreamedRoadmap(buffer: string): unknown {
  try {
    return JSON.parse(buffer)
  } catch {
    return { years: extractCompleteYears(buffer) }
  }
}
