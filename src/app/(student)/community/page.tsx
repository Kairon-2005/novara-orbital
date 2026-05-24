'use client'

import { useState, useMemo } from 'react'

// ── Types (mirrors community_posts + community_comments table) ────────────────

type PostCategory = 'school_journey' | 'how_i_got_in' | 'resources' | 'ask_community'

type Post = {
  id: string
  author: string        // display name (or 'Anonymous')
  avatar_letter: string
  is_anonymous: boolean
  category: PostCategory
  title: string
  body: string
  tags: string[]
  upvotes: number
  comments: number
  created_at: string    // YYYY-MM-DD
  upvoted_by_me: boolean
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_POSTS: Post[] = [
  {
    id: 'p1', author: 'Wei Zhang', avatar_letter: 'W', is_anonymous: false,
    category: 'school_journey',
    title: 'One year at ACS International — what nobody tells you',
    body: 'I moved from Beijing to Singapore in Jan 2025. The biggest shock wasn\'t the academics — it was how competitive CCA season is. If you want to join Robotics or Debate you need to start networking from Week 1. Happy to answer questions!',
    tags: ['ACS International', 'IB', 'Transfer Student'],
    upvotes: 47, comments: 12, created_at: '2026-04-10', upvoted_by_me: false,
  },
  {
    id: 'p2', author: 'Anonymous', avatar_letter: '?', is_anonymous: true,
    category: 'how_i_got_in',
    title: 'How I got into UWCSEA with a scholarship — full breakdown',
    body: 'Got a Davis UWC scholarship for UWCSEA Dover. The process took 8 months. Interview tips: they care deeply about your UWC mission statement response. Don\'t just say "I want to learn from diversity" — give a specific project you\'d start.',
    tags: ['UWCSEA', 'Scholarship', 'Admissions'],
    upvotes: 93, comments: 31, created_at: '2026-03-22', upvoted_by_me: false,
  },
  {
    id: 'p3', author: 'Priya Menon', avatar_letter: 'P', is_anonymous: false,
    category: 'resources',
    title: 'Free IB resources that actually helped me score 42/45',
    body: 'Sharing my resource list: (1) IB Mathematics AA HL — use IBDP Study Guide by Cambridge, not the Oxford one. (2) For Extended Essay, the EE guide by Lanterna is gold. (3) OSC revision courses in Nov are worth it. DM me for my EE template.',
    tags: ['IB', 'Study Tips', 'Extended Essay'],
    upvotes: 128, comments: 44, created_at: '2026-03-15', upvoted_by_me: true,
  },
  {
    id: 'p4', author: 'James Park', avatar_letter: 'J', is_anonymous: false,
    category: 'ask_community',
    title: 'Is it possible to transfer from a local JC to an international school mid-year?',
    body: 'I\'m currently in RI (Year 1 JC) and realising the A-Level system doesn\'t suit me at all. I\'m a US citizen and would prefer the IB. Has anyone done a mid-year transfer? Is it even possible? Would I have to repeat the year?',
    tags: ['Transfer', 'IB vs A-Level', 'RI'],
    upvotes: 15, comments: 8, created_at: '2026-05-01', upvoted_by_me: false,
  },
  {
    id: 'p5', author: 'Aisha Rahman', avatar_letter: 'A', is_anonymous: false,
    category: 'school_journey',
    title: 'Navigating Singapore as a Muslim international student — tips',
    body: 'Finding halal food near school, prayer rooms, and handling fasting during exams — here\'s what I wish I knew before arriving. Most international schools are very accommodating once you speak to the student welfare office early.',
    tags: ['Muslim Student', 'Halal', 'Welfare'],
    upvotes: 62, comments: 19, created_at: '2026-04-28', upvoted_by_me: false,
  },
  {
    id: 'p6', author: 'Anonymous', avatar_letter: '?', is_anonymous: true,
    category: 'ask_community',
    title: 'Homestay family asked for 6-month deposit — is this normal?',
    body: 'My homestay agency is asking for a 6-month refundable deposit in addition to the monthly fee. This seems excessive. Is this standard practice? Any recommendations for more reputable agencies?',
    tags: ['Homestay', 'Scam Alert', 'Agency'],
    upvotes: 34, comments: 27, created_at: '2026-05-10', upvoted_by_me: false,
  },
  {
    id: 'p7', author: 'Lucas Müller', avatar_letter: 'L', is_anonymous: false,
    category: 'resources',
    title: 'Singapore student pass renewal — complete step-by-step guide 2026',
    body: 'Updated guide for Student\'s Pass renewal via ICA\'s SOLAR system. Key dates, required documents, and what to do if your FIN expires before renewal is approved. My school admin got it wrong, so I had to figure this out myself.',
    tags: ['Student Pass', 'ICA', 'Visa'],
    upvotes: 89, comments: 23, created_at: '2026-02-14', upvoted_by_me: false,
  },
  {
    id: 'p8', author: 'Mei Lin', avatar_letter: 'M', is_anonymous: false,
    category: 'how_i_got_in',
    title: 'Hwa Chong DSA — how it works for international students',
    body: 'HCI\'s Direct School Admission is officially for local students only, but international students can apply through the international student application stream. Timeline, documents, and the two-stage interview process explained.',
    tags: ['HCI', 'DSA', 'Hwa Chong', 'Admissions'],
    upvotes: 71, comments: 18, created_at: '2026-01-30', upvoted_by_me: false,
  },
]

const CATEGORIES: { value: PostCategory | 'all'; label: string; emoji: string }[] = [
  { value: 'all',           label: 'All Posts',        emoji: '📋' },
  { value: 'school_journey', label: 'School Journey',  emoji: '🎒' },
  { value: 'how_i_got_in',  label: 'How I Got In',     emoji: '🎓' },
  { value: 'resources',     label: 'Resources',         emoji: '📚' },
  { value: 'ask_community', label: 'Ask Community',     emoji: '❓' },
]

const SORT_OPTIONS = ['Most Upvoted', 'Most Recent', 'Most Comments']

const CAT_STYLE: Record<PostCategory, { bg: string; color: string }> = {
  school_journey: { bg: '#EBF5FF', color: '#1A56DB' },
  how_i_got_in:   { bg: '#F3FAF7', color: '#057A55' },
  resources:      { bg: '#F5F3FF', color: '#7C3AED' },
  ask_community:  { bg: '#FFFBEB', color: '#B45309' },
}

function catLabel(c: PostCategory) {
  return CATEGORIES.find(x => x.value === c)?.label ?? c
}

function relativeDate(dateStr: string) {
  const days = Math.round((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}

// ── Create Post Modal ─────────────────────────────────────────────────────────

function CreatePostModal({ onAdd, onClose }: { onAdd: (p: Post) => void; onClose: () => void }) {
  const [title,   setTitle]   = useState('')
  const [body,    setBody]    = useState('')
  const [cat,     setCat]     = useState<PostCategory>('ask_community')
  const [tagInput, setTagInput] = useState('')
  const [tags,    setTags]    = useState<string[]>([])
  const [anon,    setAnon]    = useState(false)

  function addTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags(prev => [...prev, t])
      setTagInput('')
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    onAdd({
      id: `p-${Date.now()}`,
      author: anon ? 'Anonymous' : 'You',
      avatar_letter: anon ? '?' : 'Y',
      is_anonymous: anon,
      category: cat,
      title: title.trim(),
      body: body.trim(),
      tags,
      upvotes: 0,
      comments: 0,
      created_at: new Date().toISOString().slice(0, 10),
      upvoted_by_me: false,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="bg-white rounded-[12px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-[560px] border border-[var(--border)] max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-white z-10">
          <span className="font-display font-bold text-[15px] text-[var(--t900)]">Create Post</span>
          <button onClick={onClose} className="text-[var(--t400)] hover:text-[var(--t900)] text-[20px] leading-none">×</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                <button key={c.value} type="button" onClick={() => setCat(c.value as PostCategory)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium border-[1.5px] transition-all ${
                    cat === c.value
                      ? 'bg-[var(--blue-50)] text-[var(--blue)] border-[var(--blue)]'
                      : 'bg-white text-[var(--t700)] border-[var(--border)] hover:bg-[var(--bg)]'
                  }`}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="Write a clear, descriptive title…"
              className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] text-[var(--t900)] focus:outline-none focus:border-[var(--blue)] placeholder:text-[var(--t300)]" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">Body *</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} required rows={5}
              placeholder="Share your experience, question, or resource…"
              className="w-full px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] text-[var(--t900)] focus:outline-none focus:border-[var(--blue)] resize-none placeholder:text-[var(--t300)]" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--t700)] mb-1.5">Tags (up to 5)</label>
            <div className="flex items-center gap-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Type and press Enter"
                className="flex-1 px-3 py-2 border-[1.5px] border-[var(--border)] rounded-[8px] text-[13px] focus:outline-none focus:border-[var(--blue)] placeholder:text-[var(--t300)]" />
              <button type="button" onClick={addTag}
                className="px-3 py-2 rounded-[8px] border border-[var(--border)] text-[12px] font-semibold text-[var(--t700)] hover:bg-[var(--bg)]">
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(t => (
                  <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-[var(--blue-50)] text-[var(--blue)] rounded-full text-[11px] font-medium">
                    {t}
                    <button type="button" onClick={() => setTags(p => p.filter(x => x !== t))} className="text-[var(--blue)] hover:text-[var(--red)] leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="anon" checked={anon} onChange={e => setAnon(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--blue)]" />
            <label htmlFor="anon" className="text-[12px] text-[var(--t700)] cursor-pointer">Post anonymously</label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-[8px] text-[13px] font-semibold text-[var(--t700)] border border-[var(--border)] bg-white hover:bg-[var(--bg)]">
              Cancel
            </button>
            <button type="submit"
              className="px-4 py-2 rounded-[8px] text-[13px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)]">
              Post
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Post Card ─────────────────────────────────────────────────────────────────

function PostCard({ post, onUpvote }: { post: Post; onUpvote: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const catStyle = CAT_STYLE[post.category]
  const preview  = post.body.slice(0, 180)
  const hasMore  = post.body.length > 180

  return (
    <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-[18px_20px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)] transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-[var(--blue-50)] flex items-center justify-center text-[13px] font-bold text-[var(--blue)] flex-shrink-0">
          {post.avatar_letter}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-semibold text-[var(--t900)]">{post.author}</span>
            <span className="text-[11px] text-[var(--t300)]">·</span>
            <span className="text-[11px] text-[var(--t500)]">{relativeDate(post.created_at)}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: catStyle.bg, color: catStyle.color }}>
              {catLabel(post.category)}
            </span>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="font-display font-bold text-[14px] text-[var(--t900)] leading-snug mb-2">{post.title}</div>

      {/* Body */}
      <div className="text-[13px] text-[var(--t700)] leading-relaxed mb-3">
        {expanded ? post.body : preview}
        {hasMore && !expanded && '…'}
        {hasMore && (
          <button onClick={() => setExpanded(v => !v)}
            className="ml-2 text-[var(--blue)] text-[12px] font-medium hover:underline">
            {expanded ? 'Less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.tags.map(t => (
            <span key={t} className="px-2 py-0.5 bg-[var(--bg)] text-[var(--t500)] rounded-full text-[10px] font-medium">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-4 border-t border-[var(--border)] pt-3 mt-1">
        <button onClick={() => onUpvote(post.id)}
          className={`flex items-center gap-1.5 text-[12px] font-semibold transition-colors ${
            post.upvoted_by_me ? 'text-[var(--blue)]' : 'text-[var(--t500)] hover:text-[var(--blue)]'
          }`}>
          <span className="text-[14px]">{post.upvoted_by_me ? '▲' : '△'}</span>
          {post.upvotes}
        </button>
        <button className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--t500)] hover:text-[var(--t900)]">
          <span className="text-[13px]">💬</span>
          {post.comments} comments
        </button>
        <button className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--t500)] hover:text-[var(--t900)] ml-auto">
          Share
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const [posts,      setPosts]    = useState<Post[]>(MOCK_POSTS)
  const [activecat,  setCat]      = useState<PostCategory | 'all'>('all')
  const [sort,       setSort]     = useState('Most Upvoted')
  const [search,     setSearch]   = useState('')
  const [showModal,  setModal]    = useState(false)

  function handleUpvote(id: string) {
    setPosts(prev => prev.map(p =>
      p.id !== id ? p
        : { ...p, upvoted_by_me: !p.upvoted_by_me, upvotes: p.upvoted_by_me ? p.upvotes - 1 : p.upvotes + 1 }
    ))
  }

  const filtered = useMemo(() => {
    let arr = posts.filter(p => {
      if (activecat !== 'all' && p.category !== activecat) return false
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())
                 && !p.body.toLowerCase().includes(search.toLowerCase())
                 && !p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) return false
      return true
    })
    if (sort === 'Most Upvoted')   arr = [...arr].sort((a, b) => b.upvotes - a.upvotes)
    if (sort === 'Most Recent')    arr = [...arr].sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (sort === 'Most Comments')  arr = [...arr].sort((a, b) => b.comments - a.comments)
    return arr
  }, [posts, activecat, sort, search])

  const catCounts = useMemo(() => {
    const m: Record<string, number> = { all: posts.length }
    posts.forEach(p => { m[p.category] = (m[p.category] ?? 0) + 1 })
    return m
  }, [posts])

  return (
    <div className="flex flex-col min-h-screen">

      {/* Topbar */}
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-40">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">Community</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">{posts.length} posts · Students helping students</div>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-h)]">
          ✏ New Post
        </button>
      </div>

      <div className="p-[28px_36px] flex-1">
        <div className="grid gap-6" style={{ gridTemplateColumns: '200px 1fr', alignItems: 'start' }}>

          {/* ── LEFT: Category sidebar ──────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-3">
              <div className="font-display font-semibold text-[12px] text-[var(--t300)] uppercase tracking-wide px-2 mb-2">Categories</div>
              {CATEGORIES.map(c => (
                <button key={c.value} onClick={() => setCat(c.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all ${
                    activecat === c.value
                      ? 'bg-[var(--blue-50)] text-[var(--blue)]'
                      : 'text-[var(--t700)] hover:bg-[var(--bg)]'
                  }`}>
                  <span>{c.emoji} {c.label}</span>
                  <span className={`text-[11px] font-bold ${activecat === c.value ? 'text-[var(--blue)]' : 'text-[var(--t300)]'}`}>
                    {catCounts[c.value] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Community rules */}
            <div className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
              <div className="font-display font-semibold text-[13px] text-[var(--t900)] mb-3">Community Rules</div>
              {['Be kind & respectful', 'No school bashing', 'Verify before sharing', 'Protect privacy', 'No solicitation'].map((r, i) => (
                <div key={r} className="flex items-start gap-2 py-1.5 text-[12px] text-[var(--t700)]">
                  <span className="text-[var(--blue)] font-bold flex-shrink-0">{i + 1}.</span> {r}
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Posts ─────────────────────────────────────────────────── */}
          <div>
            {/* Search + sort */}
            <div className="flex items-center gap-3 mb-4">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search posts, tags…"
                className="flex-1 px-4 py-2 border-[1.5px] border-[var(--border)] rounded-[9px] text-[13px] text-[var(--t900)] focus:outline-none focus:border-[var(--blue)] placeholder:text-[var(--t300)] bg-white" />
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="px-3 py-2 border border-[var(--border)] rounded-[8px] text-[13px] text-[var(--t900)] bg-white focus:outline-none focus:border-[var(--blue)] cursor-pointer">
                {SORT_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-4xl mb-4">🔍</div>
                <div className="font-display font-bold text-[16px] text-[var(--t700)] mb-1">No posts found</div>
                <div className="text-[13px] text-[var(--t500)]">
                  {search ? 'Try a different search term.' : 'Be the first to post in this category!'}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-[12px] text-[var(--t500)]">
                  {filtered.length} post{filtered.length !== 1 ? 's' : ''}
                  {search && <span> matching &ldquo;{search}&rdquo;</span>}
                </div>
                {filtered.map(p => (
                  <PostCard key={p.id} post={p} onUpvote={handleUpvote} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <CreatePostModal
          onAdd={p => setPosts(prev => [p, ...prev])}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  )
}
