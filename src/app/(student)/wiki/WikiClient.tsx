'use client'

import { useCallback, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Typora-like reading styles for KB markdown (tables, lists, emphasis).
const MD_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  h1: () => null, // doc title is rendered by the page header, skip duplicates
  h2: ({ children }) => <h3 className="font-display font-semibold text-[14px] text-[var(--t900)] mt-4 mb-1.5">{children}</h3>,
  h3: ({ children }) => <h4 className="font-semibold text-[13px] text-[var(--t900)] mt-3 mb-1">{children}</h4>,
  p: ({ children }) => <p className="text-[13px] leading-relaxed text-[var(--t500)] my-2">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-[13px] leading-relaxed text-[var(--t500)]">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-[var(--t700)]">{children}</strong>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-[var(--blue)] hover:underline break-all">{children}</a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 border border-[var(--border)] rounded-lg">
      <table className="w-full text-[12.5px] border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-[var(--bg)]">{children}</thead>,
  th: ({ children }) => <th className="text-left font-semibold text-[var(--t700)] px-3 py-2 border-b border-[var(--border)] whitespace-nowrap">{children}</th>,
  td: ({ children }) => <td className="text-[var(--t500)] px-3 py-2 border-b border-[var(--border)] last:border-b-0 align-top">{children}</td>,
  code: ({ children }) => <code className="text-[12px] bg-[var(--bg)] px-1 py-0.5 rounded">{children}</code>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[var(--blue-100)] pl-3 my-2 text-[var(--t500)]">{children}</blockquote>
  ),
  hr: () => <hr className="border-[var(--border)] my-4" />,
}

function Markdown({ text }: { text: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{text}</ReactMarkdown>
}

// ── Types (mirror the /api/kb responses) ──────────────────────

interface DocSummary {
  docId: string
  title: string
  lastVerified: string
}

interface SearchHit {
  chunkId: string
  docId: string
  title: string
  section: string
  text: string
  score: number
  lastVerified: string
}

interface WikiDoc {
  docId: string
  title: string
  category: string
  university: string | null
  topic: string
  sourceUrls: string[]
  lastVerified: string
  sections: { section: string; text: string }[]
}

const CATEGORY_LABEL: Record<string, string> = {
  'university-official': 'Official',
  'pathway': 'Pathway',
  'general-guide': 'Guide',
  'experience': 'Experience',
}

// Doc ids are kebab-case and prefixed (nus-/ntu-/sg-/general-/experience-),
// so a lightweight grouping is derivable client-side from the id alone.
function groupOf(docId: string): string {
  if (docId.startsWith('nus-')) return 'NUS'
  if (docId.startsWith('ntu-')) return 'NTU'
  if (docId.startsWith('sg-')) return 'Singapore pathways'
  if (docId.startsWith('experience-')) return 'Community experience'
  return 'General guides'
}

const GROUP_ORDER = ['NUS', 'NTU', 'Singapore pathways', 'General guides', 'Community experience']

export default function WikiClient() {
  const [docs, setDocs] = useState<DocSummary[]>([])
  const [configured, setConfigured] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [active, setActive] = useState<WikiDoc | null>(null)
  const [docLoading, setDocLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/kb/docs')
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        // The vector store is reachable-but-down (suspended cluster): a distinct
        // state from "not set up" and from a genuine error.
        if (data.unavailable) { setUnavailable(true); return }
        if (!r.ok) throw new Error(data.error ?? `Request failed (${r.status})`)
        setConfigured(data.configured !== false)
        setDocs(data.docs ?? [])
      })
      .catch((e: Error) => setError(`Failed to load the knowledge base: ${e.message}`))
      .finally(() => setLoading(false))
  }, [])

  const openDoc = useCallback(async (docId: string) => {
    setDocLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/kb/docs/${encodeURIComponent(docId)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setActive(data.doc)
    } catch {
      setError('Failed to load the document.')
    } finally {
      setDocLoading(false)
    }
  }, [])

  const runSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim()) { setHits(null); return }
    setSearching(true)
    setError('')
    try {
      const res = await fetch('/api/kb/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), limit: 8 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setHits(data.hits ?? [])
    } catch {
      setError('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }, [query])

  const inputCls = 'w-full px-3 py-2 border border-[var(--border)] rounded-lg text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--blue-100)]'

  // ── Document reader view ─────────────────────────────────────
  if (active) {
    return (
      <div className="page-content max-w-[860px]">
        <button
          onClick={() => setActive(null)}
          className="text-[13px] text-[var(--blue)] font-semibold mb-4 hover:underline"
        >
          ← Back to all articles
        </button>
        <div className="card p-6">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--blue-50)] text-[var(--blue)]">
              {CATEGORY_LABEL[active.category] ?? active.category}
            </span>
            {active.university && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#F3FAF7] text-[#057A55]">{active.university}</span>
            )}
            <span className="text-[11px] text-[var(--t300)]">Last verified {active.lastVerified}</span>
          </div>
          <h1 className="font-display font-bold text-[22px] text-[var(--t900)] mb-4">{active.title}</h1>

          {active.sections.map((s, i) => (
            <section key={i} className="mb-5">
              {i > 0 && (
                <h2 className="font-display font-semibold text-[15px] text-[var(--t900)] mb-2 pb-1 border-b border-[var(--border)]">
                  {s.section.split(' > ').slice(1).join(' > ') || s.section}
                </h2>
              )}
              <Markdown text={s.text} />
            </section>
          ))}

          {active.sourceUrls.length > 0 && (
            <div className="mt-6 pt-4 border-t border-[var(--border)]">
              <div className="text-[11px] font-bold text-[var(--t300)] uppercase tracking-wide mb-1.5">Official sources</div>
              {active.sourceUrls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer"
                  className="block text-[12px] text-[var(--blue)] hover:underline truncate">{url}</a>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── List + search view ───────────────────────────────────────
  const groups = GROUP_ORDER
    .map((g) => ({ group: g, items: docs.filter((d) => groupOf(d.docId) === g) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="page-content max-w-[860px]">
      <h1 className="font-display font-bold text-[22px] text-[var(--t900)]">Knowledge Wiki</h1>
      <p className="text-[13px] text-[var(--t500)] mt-1 mb-5">
        The verified facts your AI assistant answers from — NUS &amp; NTU admissions, Singapore pathways, and application guides.
      </p>

      <form onSubmit={runSearch} className="flex gap-2 mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Ask anything, e.g. "NUS CS Gaokao requirements"'
          className={inputCls}
        />
        <button
          type="submit"
          disabled={searching}
          className="px-4 py-2 bg-[var(--blue)] text-white text-[13px] font-semibold rounded-lg disabled:opacity-50 whitespace-nowrap"
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p className="text-[13px] text-red-500 mb-4">{error}</p>}
      {unavailable && !loading && (
        <div className="card p-5 text-[13px] text-[var(--t500)]">
          <div className="font-semibold text-[var(--t900)] mb-1">
            The knowledge base is temporarily unavailable
          </div>
          Its search index is offline right now. Everything else in Novara works as
          normal — please try the wiki again shortly.
        </div>
      )}
      {!configured && !loading && (
        <div className="card p-5 text-[13px] text-[var(--t500)]">
          The knowledge base hasn&apos;t been set up yet. Please check back later.
        </div>
      )}

      {hits !== null && (
        <div className="mb-7">
          <div className="text-[11px] font-bold text-[var(--t300)] uppercase tracking-wide mb-2">
            {hits.length === 0 ? 'No matches' : `Top matches (${hits.length})`}
          </div>
          {hits.map((h) => (
            <button
              key={h.chunkId}
              onClick={() => openDoc(h.docId)}
              className="card w-full text-left p-4 mb-2 hover:border-[var(--blue)] transition-colors"
            >
              <div className="text-[12px] font-semibold text-[var(--blue)]">{h.section}</div>
              <div className="text-[12px] text-[var(--t500)] mt-1 line-clamp-3 whitespace-pre-wrap">{h.text}</div>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-[13px] text-[var(--t300)]">Loading articles…</p>
      ) : (
        groups.map(({ group, items }) => (
          <div key={group} className="mb-6">
            <div className="text-[11px] font-bold text-[var(--t300)] uppercase tracking-wide mb-2">{group}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map((d) => (
                <button
                  key={d.docId}
                  onClick={() => openDoc(d.docId)}
                  className="card text-left p-4 hover:border-[var(--blue)] transition-colors"
                >
                  <div className="text-[13px] font-semibold text-[var(--t900)]">{d.title}</div>
                  <div className="text-[11px] text-[var(--t300)] mt-1">Verified {d.lastVerified}</div>
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {docLoading && <p className="text-[13px] text-[var(--t300)] mt-2">Opening…</p>}
    </div>
  )
}
