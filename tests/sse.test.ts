import { describe, it, expect } from 'vitest'
import { parseSseFrames } from '@/lib/sse'

describe('parseSseFrames', () => {
  it('parses complete frames and reports no leftover', () => {
    const { events, rest } = parseSseFrames('event: year\ndata: {"year":2026}\n\n')
    expect(events).toEqual([{ event: 'year', data: '{"year":2026}' }])
    expect(rest).toBe('')
  })

  it('parses several frames from one chunk', () => {
    const buf = 'event: year\ndata: 1\n\nevent: year\ndata: 2\n\nevent: done\ndata: 3\n\n'
    expect(parseSseFrames(buf).events).toEqual([
      { event: 'year', data: '1' },
      { event: 'year', data: '2' },
      { event: 'done', data: '3' },
    ])
  })

  it('holds back an incomplete trailing frame', () => {
    const { events, rest } = parseSseFrames('event: year\ndata: 1\n\nevent: ye')
    expect(events).toEqual([{ event: 'year', data: '1' }])
    expect(rest).toBe('event: ye')
  })

  // The case that matters: chunk boundaries land wherever the network puts them.
  it('recovers every frame when fed one character at a time', () => {
    const full = 'event: start\ndata: {"a":1}\n\nevent: year\ndata: {"b":2}\n\nevent: done\ndata: {"c":3}\n\n'
    const seen: string[] = []
    let rest = ''
    for (const ch of full) {
      const out = parseSseFrames(rest + ch)
      out.events.forEach(e => seen.push(`${e.event}:${e.data}`))
      rest = out.rest
    }
    expect(seen).toEqual(['start:{"a":1}', 'year:{"b":2}', 'done:{"c":3}'])
    expect(rest).toBe('')
  })

  it('handles CRLF line endings from a rewriting proxy', () => {
    const { events } = parseSseFrames('event: year\r\ndata: {"year":2026}\r\n\r\n')
    expect(events).toEqual([{ event: 'year', data: '{"year":2026}' }])
  })

  it('joins repeated data lines with newlines', () => {
    const { events } = parseSseFrames('event: msg\ndata: a\ndata: b\n\n')
    expect(events).toEqual([{ event: 'msg', data: 'a\nb' }])
  })

  it('ignores frames missing an event or data line', () => {
    expect(parseSseFrames('data: orphan\n\n').events).toEqual([])
    expect(parseSseFrames('event: lonely\n\n').events).toEqual([])
    expect(parseSseFrames(': keep-alive comment\n\n').events).toEqual([])
  })

  it('does not split on a blank line inside a JSON string value', () => {
    // The route JSON-encodes payloads, so a literal newline can't appear raw —
    // it arrives escaped, and must not be treated as a frame delimiter.
    const { events, rest } = parseSseFrames('event: year\ndata: {"t":"a\\n\\nb"}\n\n')
    expect(events).toEqual([{ event: 'year', data: '{"t":"a\\n\\nb"}' }])
    expect(rest).toBe('')
    expect(JSON.parse(events[0].data)).toEqual({ t: 'a\n\nb' })
  })
})
