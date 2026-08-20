'use client'
import React, { useState, useTransition, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { AgentListing } from '@/lib/types'

const SC_CHARCOAL  = 'var(--site-ink)'
const SC_GOLD      = 'var(--site-accent)'
const SC_OFF_WHITE = 'var(--site-canvas)'
const SC_DARK2     = 'var(--site-dark-alt)'

interface Props {
  slug: string
  agentName: string
  agentPrefix: string
  shortArea: string
  cities: string[]
  citySubareaMap: Record<string, string[]>
  currentFilters: Record<string, string>
  initialListings: AgentListing[]
  totalCount: number
  pageSize: number
}

const TYPES = ['Apartment', 'Townhouse', 'House', 'Duplex'] as const

const BEDS_OPTIONS = [
  { label: '1+ bed', value: '1' },
  { label: '2+ beds', value: '2' },
  { label: '3+ beds', value: '3' },
  { label: '4+ beds', value: '4' },
]

const MIN_PRICE_OPTIONS = [
  { label: 'No Min',  value: '' },
  { label: '$400K',   value: '400000' },
  { label: '$600K',   value: '600000' },
  { label: '$700K',   value: '700000' },
  { label: '$800K',   value: '800000' },
  { label: '$1M',     value: '1000000' },
  { label: '$1.25M',  value: '1250000' },
  { label: '$1.5M',   value: '1500000' },
  { label: '$2M',     value: '2000000' },
  { label: '$2.5M',   value: '2500000' },
  { label: '$3M+',    value: '3000000' },
]

// Max Price needs its own list. Reusing MIN_PRICE_OPTIONS put "$3M+" at the top of an
// UPPER bound, which reads as no ceiling at all, and offered no ceiling above $3M on a
// site whose listings reach $5.5M.
const MAX_PRICE_OPTIONS = [
  { label: 'No Max',  value: '' },
  { label: '$600K',   value: '600000' },
  { label: '$800K',   value: '800000' },
  { label: '$1M',     value: '1000000' },
  { label: '$1.25M',  value: '1250000' },
  { label: '$1.5M',   value: '1500000' },
  { label: '$2M',     value: '2000000' },
  { label: '$2.5M',   value: '2500000' },
  { label: '$3M',     value: '3000000' },
  { label: '$4M',     value: '4000000' },
  { label: '$5M',     value: '5000000' },
  { label: '$7.5M',   value: '7500000' },
  { label: '$10M+',   value: '99000000' },
]

const YEAR_BUILT_OPTIONS = [
  { label: 'Any Age',     value: '' },
  { label: 'New (≤ 1yr)', value: 'new' },
  { label: 'Under 5 yrs', value: 'under5' },
  { label: '5–10 years',  value: '5to10' },
  { label: '10+ years',   value: '10plus' },
]

const SORTS = [
  { label: 'Newest',     value: '' },
  { label: 'Price ↑',    value: 'price_asc' },
  { label: 'Price ↓',    value: 'price_desc' },
  { label: 'Most Beds',  value: 'beds' },
  { label: 'Days Listed',value: 'dom' },
]

// Select chevron. The colours here are the only hardcoded palette values left on the
// showcase surfaces: a data: URI is a separate document, so it can carry neither var()
// nor currentColor. Replacing the background-image with an inline <svg> or a CSS-drawn
// caret would let this follow --site-accent like everything else.
const ARROW = (dark = false) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='${dark ? '%231C1C1E' : '%239B8B7A'}' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`

function Sel({
  placeholder, options, value, onChange, active, ariaLabel, disabled,
}: {
  placeholder: string
  // `disabled` on an option greys it rather than removing it, so the list does not change
  // length while the user is reading it.
  options: { label: string; value: string; disabled?: boolean }[]
  value: string
  onChange: (v: string) => void
  active?: boolean
  /** Screen readers otherwise announce the selected VALUE, never the field name — the
   *  placeholder is an <option>, not a label, so there was no accessible name at all. */
  ariaLabel?: string
  disabled?: boolean
}) {
  const isActive = active ?? !!value
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label={ariaLabel ?? placeholder}
      disabled={disabled}
      style={{
        padding: '8px 30px 8px 12px',
        fontSize: 12,
        fontWeight: isActive ? 600 : 400,
        background: isActive ? SC_GOLD : 'rgba(255,255,255,0.06)',
        border: `1px solid ${isActive ? SC_GOLD : 'rgba(155,139,122,0.28)'}`,
        color: isActive ? SC_CHARCOAL : 'rgba(255,255,255,0.75)',
        fontFamily: 'inherit',
        cursor: 'pointer',
        appearance: 'none',
        WebkitAppearance: 'none',
        backgroundImage: ARROW(!isActive),
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 9px center',
        // Was minWidth: 0, which let every select shrink to its longest option — so the
        // row had ragged, inconsistent widths. A floor keeps them aligned.
        minWidth: 92,
        opacity: disabled ? 0.55 : 1,
        letterSpacing: '0.01em',
      }}
    >
      <option value="" style={{ background: SC_CHARCOAL, color: '#fff' }}>
        {value ? `\u2715  Clear ${placeholder}` : placeholder}
      </option>
      {options.map(o => (
        <option key={o.value} value={o.value} disabled={o.disabled} style={{ background: SC_CHARCOAL, color: '#fff' }}>{o.label}</option>
      ))}
    </select>
  )
}

export default function ShowcaseSearchClient({
  agentName, agentPrefix, cities, citySubareaMap,
  currentFilters, initialListings, totalCount, pageSize,
}: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const firstName = agentName.split(' ')[0]
  const ap = (p: string) => `${agentPrefix}${p}`

  const [activeType,      setActiveType]      = useState(currentFilters.type || '')
  const [activeBeds,      setActiveBeds]      = useState(currentFilters.beds || '')
  const [activeMin,       setActiveMin]       = useState(currentFilters.min_price || currentFilters.min || '')
  const [activeMax,       setActiveMax]       = useState(currentFilters.max_price || currentFilters.max || '')
  const [activeCity,      setActiveCity]      = useState(currentFilters.city || '')
  const [activeSubarea,   setActiveSubarea]   = useState(currentFilters.subarea || '')
  const [activeStatus,    setActiveStatus]    = useState(currentFilters.status === 'Sold' ? 'Sold' : 'Active')
  const [activeYearBuilt, setActiveYearBuilt] = useState(currentFilters.year_built || '')
  const [activeSort,      setActiveSort]      = useState(currentFilters.sort || '')
  const [keyword,         setKeyword]         = useState(currentFilters.keyword || '')
  const keywordRef = useRef<HTMLInputElement>(null)

  const subareas   = activeCity ? (citySubareaMap[activeCity] ?? []) : []
  const activePage = currentFilters.page ? Math.max(1, parseInt(currentFilters.page)) : 1
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  function buildUrl(overrides: Record<string, string>) {
    const merged: Record<string, string> = {
      status:     activeStatus === 'Sold' ? 'Sold' : '',
      type:       activeType,
      beds:       activeBeds,
      min_price:  activeMin,
      max_price:  activeMax,
      city:       activeCity,
      subarea:    activeSubarea,
      year_built: activeYearBuilt,
      sort:       activeSort,
      keyword,
      ...overrides,
    }
    const sp = new URLSearchParams()
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v) })
    const qs = sp.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  function pushType(t: string)        { setActiveType(t);        startTransition(() => router.push(buildUrl({ type: t, page: '' }))) }
  function pushBeds(b: string)        { setActiveBeds(b);        startTransition(() => router.push(buildUrl({ beds: b, page: '' }))) }
  function pushCity(c: string)        { setActiveCity(c); setActiveSubarea(''); startTransition(() => router.push(buildUrl({ city: c, subarea: '', page: '' }))) }
  function pushSubarea(s: string)     { setActiveSubarea(s);     startTransition(() => router.push(buildUrl({ subarea: s, page: '' }))) }
  function pushStatus(s: string)      { setActiveStatus(s);      startTransition(() => router.push(buildUrl({ status: s === 'Sold' ? 'Sold' : '', page: '' }))) }
  function pushYearBuilt(y: string)   { setActiveYearBuilt(y);   startTransition(() => router.push(buildUrl({ year_built: y, page: '' }))) }
  function pushSort(s: string)        { setActiveSort(s);        startTransition(() => router.push(buildUrl({ sort: s, page: '' }))) }
  function pushMin(v: string) {
    setActiveMin(v)
    const overrides: Record<string,string> = { min_price: v, page: '' }
    const maxN = activeMax ? parseInt(activeMax) : 0
    const minN = v ? parseInt(v) : 0
    if (maxN > 0 && minN > 0 && maxN <= minN) overrides['max_price'] = ''
    startTransition(() => router.push(buildUrl(overrides)))
  }
  function pushMax(v: string) {
    setActiveMax(v)
    const overrides: Record<string,string> = { max_price: v, page: '' }
    const minN = activeMin ? parseInt(activeMin) : 0
    const maxN = v ? parseInt(v) : 0
    if (minN > 0 && maxN > 0 && maxN <= minN) overrides['min_price'] = ''
    startTransition(() => router.push(buildUrl(overrides)))
  }
  function submitKeyword(e: React.FormEvent) {
    e.preventDefault()
    const kw = keywordRef.current?.value ?? keyword
    setKeyword(kw)
    startTransition(() => router.push(buildUrl({ keyword: kw, page: '' })))
  }
  function clearAll() {
    setActiveType(''); setActiveBeds(''); setActiveMin(''); setActiveMax('')
    setActiveCity(''); setActiveSubarea(''); setActiveStatus('Active')
    setActiveYearBuilt(''); setActiveSort(''); setKeyword('')
    if (keywordRef.current) keywordRef.current.value = ''
    startTransition(() => router.push(pathname))
  }

  const hasFilters = !!(activeType || activeBeds || activeMin || activeMax || activeCity || activeSubarea || activeYearBuilt || activeSort || keyword || activeStatus === 'Sold')

  // Keyword is a SERVER filter now, so initialListings is already the filtered set.
  // Previously this re-filtered client-side over just the current page of 40 out of 50,775,
  // which is why searching a valid MLS number showed "No homes match" while the header
  // still claimed thousands available.
  const displayed = initialListings

  const rangeStart = (activePage - 1) * pageSize + 1
  const rangeEnd   = Math.min(activePage * pageSize, totalCount)
  const displayCount = totalCount.toLocaleString()

  const divider = (
    <span style={{ width: 1, height: 20, background: 'rgba(155,139,122,0.22)', display: 'inline-block', flexShrink: 0 }} />
  )

  return (
    <div style={{ fontFamily: "var(--font-body),'Helvetica Neue',sans-serif", minHeight: '100vh' }}>
      <style>{`
        .sc-card { transition: box-shadow 0.2s ease, transform 0.2s ease; background: #fff; overflow: hidden; text-decoration: none; color: inherit; display: block; }
        .sc-card:hover { transform: translateY(-3px); box-shadow: 0 16px 40px rgba(0,0,0,0.11); }
        .sc-card:hover .sc-card-img img { transform: scale(1.04); }
        .sc-card-img img { transition: transform 0.4s ease; width: 100%; height: 100%; object-fit: cover; display: block; }
        .sc-search-input { transition: border-color 0.15s; }
        .sc-search-input:focus { outline: none; border-color: ${SC_GOLD} !important; }
        .sc-search-input::placeholder { color: rgba(255,255,255,0.3); }
        @media (max-width: 700px) {
          .sc-filter-row { gap: 6px !important; }
          .sc-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 460px) {
          .sc-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Hero / Filter Panel ── */}
      <div style={{ background: SC_CHARCOAL }}>

        {/* Title row */}
        <div style={{ padding: 'clamp(40px,5vw,60px) 0 0' }}>
          <div className="container">
            <h1 style={{
              fontFamily: "var(--font-display),Georgia,serif",
              fontSize: 'clamp(1.9rem,3.8vw,2.8rem)',
              fontWeight: 400, color: '#fff',
              margin: '0 0 6px', lineHeight: 1.1,
            }}>
              Search Homes for Sale
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              {isPending
                ? 'Updating…'
                : totalCount === 0
                  ? 'No homes match these filters'
                  : <><span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{displayCount}</span> homes available</>
              }
              {' '}· Updated daily from MLS®
            </p>
          </div>
        </div>

        {/* Search input */}
        <div style={{ padding: '20px 0 0' }}>
          <div className="container">
            <form onSubmit={submitKeyword} style={{ display: 'flex', maxWidth: 520 }}>
              <input
                ref={keywordRef}
                type="text"
                defaultValue={keyword}
                placeholder="Search address, city or MLS® number…"
                className="sc-search-input"
                style={{
                  flex: 1, padding: '11px 14px', fontSize: 13,
                  background: 'rgba(255,255,255,0.07)',
                  border: `1px solid rgba(155,139,122,0.28)`,
                  borderRight: 'none',
                  color: '#fff', fontFamily: 'inherit',
                }}
              />
              <button type="submit" style={{
                padding: '11px 18px', background: SC_GOLD, color: SC_CHARCOAL,
                border: 'none', fontWeight: 700, fontSize: 11,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
              }}>Search</button>
              {keyword && (
                <button type="button" onClick={() => {
                  setKeyword('')
                  if (keywordRef.current) keywordRef.current.value = ''
                  startTransition(() => router.push(buildUrl({ keyword: '', page: '' })))
                }} style={{
                  padding: '11px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid rgba(155,139,122,0.28)`,
                  borderLeft: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                }}>✕</button>
              )}
            </form>
          </div>
        </div>

        {/* Filter strip */}
        <div style={{ padding: '16px 0 20px', borderBottom: `1px solid rgba(155,139,122,0.12)` }}>
          <div className="container">

            {/* Row A: Status + City + Type + Beds */}
            <div className="sc-filter-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              {/* Status toggle */}
              {(['Active', 'Sold'] as const).map(s => (
                <button key={s} onClick={() => pushStatus(s)} style={{
                  padding: '7px 15px', fontSize: 11, fontWeight: 600,
                  letterSpacing: '0.07em', textTransform: 'uppercase',
                  background: activeStatus === s ? SC_GOLD : 'transparent',
                  color: activeStatus === s ? SC_CHARCOAL : 'rgba(255,255,255,0.55)',
                  border: `1px solid ${activeStatus === s ? SC_GOLD : 'rgba(155,139,122,0.28)'}`,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {s === 'Active' ? 'For Sale' : 'Sold'}
                </button>
              ))}

              {divider}

              {cities.length > 0 && (
                <Sel ariaLabel="Filter by city" placeholder="City" value={activeCity} onChange={pushCity}
                  options={cities.map(c => ({ label: c, value: c }))} />
              )}

              {activeCity && subareas.length > 0 && (
                <Sel ariaLabel="Filter by neighbourhood" placeholder="Neighbourhood" value={activeSubarea} onChange={pushSubarea}
                  options={subareas.map(s => ({ label: s, value: s }))} />
              )}

              {divider}

              <Sel ariaLabel="Property type" placeholder="Type" value={activeType} onChange={pushType}
                options={TYPES.map(t => ({ label: t === 'Apartment' ? 'Condo' : t, value: t }))} />

              <Sel ariaLabel="Minimum bedrooms" placeholder="Beds" value={activeBeds} onChange={pushBeds}
                options={BEDS_OPTIONS} />
            </div>

            {/* Row B: Price + Year Built + Sort + Clear */}
            <div className="sc-filter-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Sel placeholder="Min Price" value={activeMin} onChange={pushMin} ariaLabel="Minimum price"
                options={MIN_PRICE_OPTIONS.filter(o => o.value).map(o => {
                  const maxN = activeMax ? parseInt(activeMax) : 0
                  const optN = parseInt(o.value)
                  // Disabled, not filtered out — with both selects greying their invalid
                  // options, an inverted range is unreachable, so the silent
                  // wipe-the-other-bound guard in pushMin/pushMax never fires.
                  return { label: o.label, value: o.value, disabled: maxN > 0 && optN >= maxN }
                })} />

              <Sel placeholder="Max Price" value={activeMax} onChange={pushMax} ariaLabel="Maximum price"
                options={MAX_PRICE_OPTIONS.filter(o => o.value).map(o => {
                  const minN = activeMin ? parseInt(activeMin) : 0
                  const optN = parseInt(o.value)
                  // Disabled, not removed: options vanishing mid-interaction makes the list
                  // change length as you use it.
                  return { label: o.label, value: o.value, disabled: minN > 0 && optN <= minN }
                })} />

              {divider}

              <Sel ariaLabel="Year built" placeholder="Year Built" value={activeYearBuilt} onChange={pushYearBuilt}
                options={YEAR_BUILT_OPTIONS.filter(o => o.value)} />

              <Sel ariaLabel="Sort results" placeholder="Sort: Newest" value={activeSort} onChange={pushSort}
                options={SORTS.filter(s => s.value)} />

              {hasFilters && (
                <button onClick={clearAll} style={{
                  fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.4)', background: 'transparent',
                  border: '1px solid rgba(155,139,122,0.2)',
                  cursor: 'pointer', padding: '7px 12px',
                  fontWeight: 600, fontFamily: 'inherit',
                }}>Clear</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      <div style={{ background: SC_OFF_WHITE, padding: 'clamp(28px,4vw,44px) 0 clamp(48px,6vw,80px)' }}>
        <div className="container">

          {isPending ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(28,28,30,0.4)' }}>
              <p style={{ fontSize: 15 }}>Loading homes…</p>
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <p style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(1.3rem,2vw,1.7rem)', fontWeight: 400, color: SC_CHARCOAL, marginBottom: 20 }}>
                No homes match these filters
              </p>
              <button onClick={clearAll} style={{ background: SC_GOLD, color: SC_CHARCOAL, padding: '13px 28px', border: 'none', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}>
                Clear All Filters
              </button>
            </div>
          ) : (
            <>
              {/* Count + top pagination */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <p style={{ fontSize: 13, color: 'rgba(28,28,30,0.45)', margin: 0, letterSpacing: '0.01em' }}>
                  Showing <strong style={{ color: SC_CHARCOAL }}>{rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()}</strong> of{' '}
                  <strong style={{ color: SC_CHARCOAL }}>{displayCount}</strong> homes
                  {totalPages > 1 && ` · Page ${activePage} of ${totalPages}`}
                </p>
                {totalPages > 1 && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {activePage > 1 && (
                      <a href={buildUrl({ page: String(activePage - 1) })} style={{ padding: '7px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: SC_CHARCOAL, color: '#fff', textDecoration: 'none', display: 'inline-block' }}>
                        ← Prev
                      </a>
                    )}
                    {activePage < totalPages && (
                      <a href={buildUrl({ page: String(activePage + 1) })} style={{ padding: '7px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: SC_GOLD, color: SC_CHARCOAL, textDecoration: 'none', display: 'inline-block' }}>
                        Next →
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Card grid */}
              <div className="sc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 20 }}>
                {displayed.map(l => (
                  <a key={l.id || l.mls_no} href={ap(`/listing/${l.mls_no}`)} className="sc-card" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

                    {/* Photo with overlaid price */}
                    <div className="sc-card-img" style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', background: '#e5e0d8' }}>
                      {l.photo_url && (
                        <img src={l.photo_url} alt={l.address || ''} loading="lazy" />
                      )}
                      {/* Price overlay */}
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(to top, rgba(28,28,30,0.88) 0%, rgba(28,28,30,0.0) 100%)',
                        padding: '28px 14px 12px',
                      }}>
                        {activeStatus === 'Sold' ? (
                          <span style={{
                            display: 'inline-block',
                            background: SC_GOLD, color: SC_CHARCOAL,
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                            textTransform: 'uppercase', padding: '3px 8px',
                          }}>Sold</span>
                        ) : (
                          <p style={{ color: '#fff', fontWeight: 700, fontSize: 17, margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                            ${l.list_price.toLocaleString()}
                          </p>
                        )}
                      </div>
                      {/* Type badge */}
                      {l.type && (
                        <div style={{
                          position: 'absolute', top: 10, right: 10,
                          background: 'rgba(28,28,30,0.72)', backdropFilter: 'blur(4px)',
                          color: 'rgba(255,255,255,0.85)',
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                          textTransform: 'uppercase', padding: '3px 7px',
                        }}>
                          {l.type === 'Apartment Unit' ? 'Condo' : l.type === 'House/Single Family' ? 'House' : l.type}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: '14px 16px 16px' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: SC_CHARCOAL, margin: '0 0 3px', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {l.address}
                      </p>
                      <p style={{ fontSize: 11, color: SC_GOLD, margin: '0 0 10px', fontWeight: 500, letterSpacing: '0.04em' }}>
                        {l.city || ''}
                      </p>
                      {(l.beds > 0 || l.baths > 0 || l.sqft > 0) && (
                        <div style={{ display: 'flex', gap: 0, fontSize: 11, color: 'rgba(28,28,30,0.5)', flexWrap: 'wrap' }}>
                          {l.beds > 0  && <span style={{ marginRight: 10 }}>{l.beds} <span style={{ color: 'rgba(28,28,30,0.35)' }}>bd</span></span>}
                          {l.baths > 0 && <span style={{ marginRight: 10 }}>{l.baths} <span style={{ color: 'rgba(28,28,30,0.35)' }}>ba</span></span>}
                          {l.sqft > 0  && <span>{l.sqft.toLocaleString()} <span style={{ color: 'rgba(28,28,30,0.35)' }}>sqft</span></span>}
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>

              {/* Bottom pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 40 }}>
                  {activePage > 1 && (
                    <a href={buildUrl({ page: String(activePage - 1) })} style={{ padding: '10px 22px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: SC_CHARCOAL, color: '#fff', textDecoration: 'none', display: 'inline-block' }}>
                      ← Prev
                    </a>
                  )}
                  <span style={{ padding: '10px 14px', fontSize: 11, color: 'rgba(28,28,30,0.4)', letterSpacing: '0.05em' }}>
                    Page {activePage} of {totalPages}
                  </span>
                  {activePage < totalPages && (
                    <a href={buildUrl({ page: String(activePage + 1) })} style={{ padding: '10px 22px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: SC_GOLD, color: SC_CHARCOAL, textDecoration: 'none', display: 'inline-block' }}>
                      Next →
                    </a>
                  )}
                </div>
              )}
            </>
          )}

          {/* CTA strip */}
          <div style={{ marginTop: 56, background: SC_CHARCOAL, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: '0 0 5px' }}>
                Can&rsquo;t find the right home?
              </p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                {firstName} can set up custom MLS® alerts and share off-market opportunities.
              </p>
            </div>
            <a href={ap('/contact')} style={{ background: SC_GOLD, color: SC_CHARCOAL, padding: '13px 26px', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block', flexShrink: 0 }}>
              Contact {firstName}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
