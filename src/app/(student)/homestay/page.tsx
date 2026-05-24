'use client'

import { useState, useMemo } from 'react'

// ── Types (mirrors homestay_listings table) ───────────────────────────────────

type RoomType = 'single' | 'shared'

type HomestayListing = {
  id: string
  family_name: string
  zone: string
  address: string
  distance_km: Record<string, number>  // school_slug → km
  price_sgd: number                     // per month
  room_type: RoomType
  meals_included: boolean
  rating: number                        // 1–5
  reviews: number
  highlights: string[]
  available: boolean
  emoji: string                         // family avatar placeholder
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_LISTINGS: HomestayListing[] = [
  {
    id: 'h1', family_name: 'The Tan Family', zone: 'Bishan',
    address: 'Bishan Street 22, Singapore 570243',
    distance_km: { 'acs-international': 0.4, 'raffles-institution': 0.8, 'hwa-chong': 3.2 },
    price_sgd: 950, room_type: 'single', meals_included: true,
    rating: 4.9, reviews: 28, available: true, emoji: '🏠',
    highlights: ['Quiet study environment', 'Home-cooked meals', 'MRT 5 min walk', 'Fast WiFi', 'No curfew'],
  },
  {
    id: 'h2', family_name: 'The Lim Family', zone: 'Bishan',
    address: 'Marymount Road, Singapore 574361',
    distance_km: { 'acs-international': 0.7, 'raffles-institution': 1.1, 'hwa-chong': 3.5 },
    price_sgd: 900, room_type: 'single', meals_included: false,
    rating: 4.7, reviews: 14, available: true, emoji: '🏡',
    highlights: ['Private bathroom', 'Near Caldecott MRT', 'English-speaking family', 'Desk & bookshelf'],
  },
  {
    id: 'h3', family_name: 'The Wong Family', zone: 'Clementi',
    address: 'Clementi Avenue 3, Singapore 129803',
    distance_km: { 'acs-international': 4.1, 'uwc-dover': 0.6, 'nus': 1.2 },
    price_sgd: 800, room_type: 'single', meals_included: true,
    rating: 4.8, reviews: 35, available: true, emoji: '🏘',
    highlights: ['Near UWCSEA & NUS', 'Meals included', 'Experienced host', 'Comfortable room', 'Near Clementi MRT'],
  },
  {
    id: 'h4', family_name: 'The Chen Family', zone: 'Holland Village',
    address: 'Holland Road, Singapore 278707',
    distance_km: { 'tanglin-trust': 0.5, 'uwc-dover': 1.8, 'canadian-international': 5.0 },
    price_sgd: 1200, room_type: 'single', meals_included: true,
    rating: 5.0, reviews: 9, available: true, emoji: '🏰',
    highlights: ['Prestigious neighbourhood', 'Bilingual family', 'Walking to Tanglin', 'Study room', 'Tutoring available'],
  },
  {
    id: 'h5', family_name: 'The Raj Family', zone: 'Ang Mo Kio',
    address: 'Ang Mo Kio Ave 6, Singapore 560501',
    distance_km: { 'nanyang-polytechnic': 0.3, 'raffles-institution': 2.8 },
    price_sgd: 700, room_type: 'shared', meals_included: false,
    rating: 4.5, reviews: 22, available: true, emoji: '🏗',
    highlights: ['Budget-friendly', 'Near NYP', 'Friendly flatmates', 'Common kitchen access'],
  },
  {
    id: 'h6', family_name: 'The Lee Family', zone: 'Mountbatten',
    address: 'Broadrick Road, Singapore 439501',
    distance_km: { 'etonhouse-broadrick': 0.2, 'sji-international': 1.9 },
    price_sgd: 1050, room_type: 'single', meals_included: true,
    rating: 4.6, reviews: 17, available: true, emoji: '🏖',
    highlights: ['Steps from EtonHouse', 'Near East Coast Park', 'Air-conditioned room', 'Quiet residential area'],
  },
  {
    id: 'h7', family_name: 'The Sharma Family', zone: 'Woodlands',
    address: 'Woodlands Drive 14, Singapore 737722',
    distance_km: { 'national-junior-college': 0.9, 'raffles-institution': 8.0 },
    price_sgd: 650, room_type: 'shared', meals_included: true,
    rating: 4.3, reviews: 11, available: false, emoji: '🌲',
    highlights: ['Most affordable', 'Meals included', 'Spacious apartment', 'Near Woodlands MRT'],
  },
  {
    id: 'h8', family_name: 'The Goh Family', zone: 'Clementi',
    address: 'West Coast Road, Singapore 127965',
    distance_km: { 'canadian-international': 0.8, 'uwc-dover': 1.0, 'nus': 1.5 },
    price_sgd: 880, room_type: 'single', meals_included: false,
    rating: 4.7, reviews: 20, available: true, emoji: '🌊',
    highlights: ['2 schools within 1 km', 'West Coast Park nearby', 'Study desk + wardrobe', 'Flexible mealtimes'],
  },
]

const SCHOOL_OPTIONS = [
  { slug: 'acs-international', name: 'ACS International' },
  { slug: 'uwc-dover',         name: 'UWC South East Asia (Dover)' },
  { slug: 'tanglin-trust',     name: 'Tanglin Trust School' },
  { slug: 'raffles-institution', name: 'Raffles Institution' },
  { slug: 'hwa-chong',         name: 'Hwa Chong Institution' },
  { slug: 'national-junior-college', name: 'National Junior College' },
  { slug: 'nanyang-polytechnic', name: 'Nanyang Polytechnic' },
  { slug: 'etonhouse-broadrick', name: 'EtonHouse (Broadrick)' },
  { slug: 'canadian-international', name: 'Canadian International School' },
  { slug: 'sji-international', name: 'SJI International' },
  { slug: 'nus',               name: 'NUS' },
]

const DISTANCE_OPTIONS = ['Any', '≤ 0.5 km', '≤ 1 km', '≤ 2 km']
const PRICE_OPTIONS    = ['Any', '< $800', '$800–1,000', '$1,000–1,200', '> $1,200']
const ROOM_OPTIONS     = ['Any type', 'Single', 'Shared']

function priceMatch(p: number, filter: string) {
  if (filter === 'Any')        return true
  if (filter === '< $800')     return p < 800
  if (filter === '$800–1,000') return p >= 800  && p <= 1000
  if (filter === '$1,000–1,200') return p > 1000 && p <= 1200
  if (filter === '> $1,200')   return p > 1200
  return true
}

function distMatch(km: number | undefined, filter: string) {
  if (filter === 'Any') return true
  if (km === undefined) return false
  if (filter === '≤ 0.5 km') return km <= 0.5
  if (filter === '≤ 1 km')   return km <= 1
  if (filter === '≤ 2 km')   return km <= 2
  return true
}

// ── Pill ─────────────────────────────────────────────────────────────────────

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-[5px] rounded-full text-[11px] font-medium border-[1.5px] whitespace-nowrap transition-all ${
        active ? 'bg-[var(--blue-50)] text-[var(--blue)] border-[var(--blue)]'
               : 'bg-white text-[var(--t700)] border-[var(--border)] hover:bg-[var(--bg)]'
      }`}>
      {children}
    </button>
  )
}

// ── Star rating ───────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-[11px]">
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
    </span>
  )
}

// ── Listing Card ──────────────────────────────────────────────────────────────

function ListingCard({ listing, schoolSlug, saved, onToggleSave }: {
  listing: HomestayListing
  schoolSlug: string
  saved: boolean
  onToggleSave: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const dist = listing.distance_km[schoolSlug]
  const distText = dist !== undefined ? `${dist} km from school` : 'Distance unavailable'

  const gradients: Record<string, string> = {
    Bishan:        'linear-gradient(135deg,#EBF5FF,#F3F6FB)',
    Clementi:      'linear-gradient(135deg,#F3FAF7,#F3F6FB)',
    'Holland Village': 'linear-gradient(135deg,#FDF4FF,#F3F6FB)',
    'Ang Mo Kio':  'linear-gradient(135deg,#FFFBEB,#F3F6FB)',
    Mountbatten:   'linear-gradient(135deg,#F0FDF4,#F3F6FB)',
    Woodlands:     'linear-gradient(135deg,#F5F3FF,#F3F6FB)',
  }
  const grad = gradients[listing.zone] ?? gradients.Bishan

  return (
    <div className="bg-white border border-[var(--border)] rounded-[10px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)]">
      {/* Top emoji area */}
      <div className="h-[90px] flex items-center justify-center text-[36px] relative" style={{ background: grad }}>
        {listing.emoji}
        {!listing.available && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-[11px] font-bold text-[var(--t500)] bg-[#F3F4F6] px-2 py-1 rounded-full">Not available</span>
          </div>
        )}
        <button onClick={onToggleSave}
          className="absolute top-2 right-2 text-[18px] leading-none"
          title={saved ? 'Unsave' : 'Save'}>
          {saved ? '♥' : '♡'}
        </button>
      </div>

      {/* Info */}
      <div className="p-[14px_16px] flex-1">
        <div className="flex items-start justify-between mb-1">
          <div className="font-display font-bold text-[13px] text-[var(--t900)] leading-snug">{listing.family_name}</div>
          <div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              listing.room_type === 'single' ? 'bg-[#EBF5FF] text-[#1A56DB]' : 'bg-[#F3F4F6] text-[var(--t500)]'
            }`}>
              {listing.room_type === 'single' ? 'Single' : 'Shared'}
            </span>
          </div>
        </div>
        <div className="text-[11px] text-[var(--t500)] mb-1">📍 {listing.zone} · {distText}</div>
        <div className="flex items-center gap-1 mb-2.5">
          <span className="text-[#F59E0B] text-[11px]"><Stars rating={listing.rating} /></span>
          <span className="text-[11px] text-[var(--t500)]">{listing.rating} ({listing.reviews})</span>
        </div>

        <div className="font-display font-bold text-[15px] text-[var(--t900)]">SGD {listing.price_sgd.toLocaleString()}</div>
        <div className="text-[10px] text-[var(--t300)] mb-2">per month · {listing.meals_included ? 'Meals included' : 'No meals'}</div>

        {expanded && (
          <div className="mt-2 pt-2 border-t border-[var(--border)]">
            <div className="flex flex-wrap gap-1.5">
              {listing.highlights.map(h => (
                <span key={h} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg)] text-[var(--t700)]">
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-[var(--border)] flex items-center justify-between">
        <button onClick={() => setExpanded(v => !v)}
          className="text-[12px] text-[var(--blue)] font-medium hover:underline">
          {expanded ? 'Less ↑' : 'Details ↓'}
        </button>
        {listing.available && (
          <button className="px-3 py-1.5 rounded-[7px] text-[12px] font-semibold border-[1.5px] border-[var(--blue)] text-[var(--blue)] hover:bg-[var(--blue-50)] transition">
            Enquire →
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomestayPage() {
  const [school,   setSchool]   = useState('acs-international')
  const [distance, setDistance] = useState('Any')
  const [price,    setPrice]    = useState('Any')
  const [roomType, setRoomType] = useState('Any type')
  const [sort,     setSort]     = useState('Recommended')
  const [saved,    setSaved]    = useState<Set<string>>(new Set())

  function toggleSave(id: string) {
    setSaved(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const filtered = useMemo(() => {
    return MOCK_LISTINGS.filter(l => {
      if (!priceMatch(l.price_sgd, price))                                  return false
      if (!distMatch(l.distance_km[school], distance))                      return false
      if (roomType === 'Single' && l.room_type !== 'single')                return false
      if (roomType === 'Shared' && l.room_type !== 'shared')                return false
      return true
    })
  }, [school, distance, price, roomType])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    if (sort === 'Price: Low–High')   arr.sort((a, b) => a.price_sgd - b.price_sgd)
    if (sort === 'Price: High–Low')   arr.sort((a, b) => b.price_sgd - a.price_sgd)
    if (sort === 'Closest first')     arr.sort((a, b) => (a.distance_km[school] ?? 99) - (b.distance_km[school] ?? 99))
    if (sort === 'Rating')            arr.sort((a, b) => b.rating - a.rating)
    return arr
  }, [filtered, sort, school])

  const schoolName = SCHOOL_OPTIONS.find(s => s.slug === school)?.name ?? 'Your School'
  const availableCount = sorted.filter(l => l.available).length

  return (
    <div className="flex flex-col min-h-screen">

      {/* Topbar */}
      <div className="bg-white border-b border-[var(--border)] px-9 h-14 flex items-center justify-between sticky top-0 z-40">
        <div>
          <div className="font-display font-bold text-[17px] text-[var(--t900)]">Homestay Finder</div>
          <div className="text-[11px] text-[var(--t500)] mt-0.5">
            Families near {schoolName} · {availableCount} available listing{availableCount !== 1 ? 's' : ''}
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[var(--blue)] text-[var(--blue)] hover:bg-[var(--blue-50)]">
          ♥ Saved ({saved.size})
        </button>
      </div>

      <div className="p-[20px_36px] flex-1">

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap bg-white border border-[var(--border)] rounded-[10px] px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <span className="text-[11px] font-bold text-[var(--t300)] uppercase tracking-[.06em]">School</span>
          <select value={school} onChange={e => setSchool(e.target.value)}
            className="px-3 py-1.5 border border-[var(--border)] rounded-[7px] text-[12px] text-[var(--t900)] bg-white focus:outline-none focus:border-[var(--blue)] cursor-pointer">
            {SCHOOL_OPTIONS.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select>

          <div className="w-px h-5 bg-[var(--border)]" />

          <span className="text-[11px] font-bold text-[var(--t300)] uppercase tracking-[.06em]">Distance</span>
          <div className="flex gap-1.5">
            {DISTANCE_OPTIONS.map(d => <Pill key={d} active={distance === d} onClick={() => setDistance(d)}>{d}</Pill>)}
          </div>

          <div className="w-px h-5 bg-[var(--border)]" />

          <span className="text-[11px] font-bold text-[var(--t300)] uppercase tracking-[.06em]">Price</span>
          <div className="flex gap-1.5">
            {PRICE_OPTIONS.map(p => <Pill key={p} active={price === p} onClick={() => setPrice(p)}>{p}</Pill>)}
          </div>

          <div className="w-px h-5 bg-[var(--border)]" />

          <span className="text-[11px] font-bold text-[var(--t300)] uppercase tracking-[.06em]">Room</span>
          <div className="flex gap-1.5">
            {ROOM_OPTIONS.map(r => <Pill key={r} active={roomType === r} onClick={() => setRoomType(r)}>{r}</Pill>)}
          </div>
        </div>

        {/* Results bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-[13px] text-[var(--t500)]">
            Showing <strong className="text-[var(--t900)]">{sorted.length}</strong> listing{sorted.length !== 1 ? 's' : ''}
            {(distance !== 'Any' || price !== 'Any' || roomType !== 'Any type') && (
              <button onClick={() => { setDistance('Any'); setPrice('Any'); setRoomType('Any type') }}
                className="ml-3 text-[var(--blue)] text-[12px] font-medium hover:underline">
                Clear filters
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[12px] text-[var(--t500)]">Sort:</label>
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="px-3 py-1.5 border border-[var(--border)] rounded-[7px] text-[12px] text-[var(--t900)] bg-white focus:outline-none focus:border-[var(--blue)] cursor-pointer">
              <option>Recommended</option>
              <option>Price: Low–High</option>
              <option>Price: High–Low</option>
              <option>Closest first</option>
              <option>Rating</option>
            </select>
          </div>
        </div>

        {/* Distance key */}
        <div className="flex items-center gap-3 mb-4 text-[11px] text-[var(--t500)]">
          <span className="font-semibold text-[var(--t700)]">Distance legend from {schoolName}:</span>
          {[['#057A55','≤ 0.5 km — walking'],['#1A56DB','≤ 1 km — 10 min walk'],['#F59E0B','≤ 2 km — short bus ride']].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />{l}
            </span>
          ))}
        </div>

        {/* Grid */}
        {sorted.length > 0 ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {sorted.map(l => (
              <ListingCard key={l.id} listing={l} schoolSlug={school}
                saved={saved.has(l.id)} onToggleSave={() => toggleSave(l.id)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <div className="font-display font-bold text-[16px] text-[var(--t700)] mb-1">No listings match</div>
            <div className="text-[13px] text-[var(--t500)]">Try adjusting your filters.</div>
          </div>
        )}
      </div>
    </div>
  )
}
