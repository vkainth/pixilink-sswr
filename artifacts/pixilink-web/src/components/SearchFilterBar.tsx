'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export interface SearchFilterBarProps {
  agentPrefix: string
  cities: string[]
  citySubareaMap: Record<string, string[]>
}

const TYPES = ['Apartment', 'Townhouse', 'House', 'Duplex']
const BEDS = [
  { label: 'Any', value: '' },
  { label: '1+', value: '1' },
  { label: '2+', value: '2' },
  { label: '3+', value: '3' },
  { label: '4+', value: '4' },
]
const SORTS = [
  { label: 'Newest', value: '' },
  { label: 'Price ↑', value: 'price_asc' },
  { label: 'Price ↓', value: 'price_desc' },
  { label: 'Most Beds', value: 'beds' },
  { label: 'Days Listed', value: 'dom' },
]
const PRICE_STEPS = [
  { label: 'No Min', value: '' },
  { label: '$400K', value: '400000' },
  { label: '$600K', value: '600000' },
  { label: '$700K', value: '700000' },
  { label: '$800K', value: '800000' },
  { label: '$1M', value: '1000000' },
  { label: '$1.25M', value: '1250000' },
  { label: '$1.5M', value: '1500000' },
  { label: '$2M', value: '2000000' },
  { label: '$2.5M', value: '2500000' },
  { label: '$3M+', value: '3000000' },
]
const YEAR_BUILT_OPTIONS = [
  { label: 'Any Age', value: '' },
  { label: 'New (≤ 1 yr)', value: 'new' },
  { label: 'Under 5 yrs', value: 'under5' },
  { label: '5–10 years', value: '5to10' },
  { label: '10+ years', value: '10plus' },
]

const selectSt: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
  fontSize: 12, fontWeight: 500, background: '#fff', color: 'var(--text)',
  cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
  paddingRight: 24, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', minWidth: 90,
}
const chip = (active: boolean): React.CSSProperties => ({
  display: 'inline-block', padding: '6px 14px', borderRadius: 20, fontSize: 12,
  fontWeight: active ? 700 : 500, background: active ? '#1a1a1a' : '#fff',
  color: active ? '#fff' : 'var(--text)', border: `1px solid ${active ? '#1a1a1a' : 'var(--border)'}`,
  textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap' as const,
})
const labelSt: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
}

export default function SearchFilterBar({ agentPrefix, cities, citySubareaMap }: SearchFilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const sp = Object.fromEntries(searchParams.entries())

  const status = sp.status === 'Sold' ? 'Sold' : 'Active'
  const type = sp.type || ''
  const beds = sp.beds || ''
  const city = sp.city || ''
  const subarea = sp.subarea || ''
  const minPrice = sp.min || sp.min_price || ''
  const maxPrice = sp.max || sp.max_price || ''
  const yearBuilt = sp.year_built || ''

  const filterLink = useCallback((overrides: Record<string, string>) => {
    const current: Record<string, string> = {}
    searchParams.forEach((v, k) => { current[k] = v })
    const merged: Record<string, string> = { ...current, ...overrides }
    if ('min_price' in merged && merged['min_price']) { merged['min'] = merged['min'] || merged['min_price'] }
    delete merged['min_price']
    if ('max_price' in merged && merged['max_price']) { merged['max'] = merged['max'] || merged['max_price'] }
    delete merged['max_price']
    Object.keys(merged).forEach(k => { if (merged[k] === '' || merged[k] === undefined) delete merged[k] })
    const q = new URLSearchParams(merged).toString()
    return agentPrefix + (q ? `/search?${q}` : '/search')
  }, [searchParams, agentPrefix])

  const push = (overrides: Record<string, string>) => {
    router.push(filterLink(overrides))
  }

  const subareas = city ? (citySubareaMap[city] ?? []) : []
  const hasFilters = !!(type || beds || minPrice || maxPrice || city || subarea || yearBuilt || sp.sort || sp.status === 'Sold')

  const minPriceNum = minPrice ? parseInt(minPrice) : 0
  const maxPriceNum = maxPrice ? parseInt(maxPrice) : 0

  const handleMinPrice = (val: string) => {
    const newMin = val ? parseInt(val) : 0
    const overrides: Record<string, string> = { min: val, page: '' }
    // If current max is set and would be <= new min, clear it
    if (maxPriceNum > 0 && newMin > 0 && maxPriceNum <= newMin) {
      overrides['max'] = ''
    }
    push(overrides)
  }

  const handleMaxPrice = (val: string) => {
    const newMax = val ? parseInt(val) : 0
    const overrides: Record<string, string> = { max: val, page: '' }
    // If current min is set and would be >= new max, clear it
    if (minPriceNum > 0 && newMax > 0 && minPriceNum >= newMax) {
      overrides['min'] = ''
    }
    push(overrides)
  }

  return (
    <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '12px 0', position: 'sticky', top: 0, zIndex: 20 }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Row 1: Status + Type chips + Beds chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={labelSt}>Status</span>
          {([{ label: 'For Sale', value: 'Active' }, { label: 'Sold', value: 'Sold' }] as const).map(s => (
            <a
              key={s.value}
              href={filterLink({ status: s.value === 'Active' ? '' : s.value, page: '' })}
              style={chip(status === s.value)}
            >
              {s.label}
            </a>
          ))}
          <span style={{ ...labelSt, marginLeft: 8 }}>Type</span>
          <a href={filterLink({ type: '', page: '' })} style={chip(!type)}>All</a>
          {TYPES.map(t => (
            <a key={t} href={filterLink({ type: t, page: '' })} style={chip(type === t)}>{t}</a>
          ))}
          <span style={{ ...labelSt, marginLeft: 8 }}>Beds</span>
          {BEDS.map(b => (
            <a key={b.label} href={filterLink({ beds: b.value, page: '' })} style={chip(beds === b.value)}>{b.label}</a>
          ))}
        </div>

        {/* Row 2: Dropdowns — City, Subarea, Year Built, Min Price, Max Price + Sort + Clear */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>

          {/* City */}
          {cities.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <label style={{ ...labelSt, display: 'block' }}>City</label>
              <select
                style={selectSt}
                value={city}
                onChange={e => push({ city: e.target.value, subarea: '', page: '' })}
              >
                <option value="">All Cities</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Subarea (cascading — only visible when city chosen and has subareas) */}
          {city && subareas.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <label style={{ ...labelSt, display: 'block' }}>Area</label>
              <select
                style={selectSt}
                value={subarea}
                onChange={e => push({ subarea: e.target.value, page: '' })}
              >
                <option value="">All Areas</option>
                {subareas.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {/* Year Built */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <label style={{ ...labelSt, display: 'block' }}>Year Built</label>
            <select
              style={selectSt}
              value={yearBuilt}
              onChange={e => push({ year_built: e.target.value, page: '' })}
            >
              {YEAR_BUILT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Min Price — disable options at or above selected max */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <label style={{ ...labelSt, display: 'block' }}>Min Price</label>
            <select
              style={selectSt}
              value={minPrice}
              onChange={e => handleMinPrice(e.target.value)}
            >
              {PRICE_STEPS.map(o => {
                const optNum = o.value ? parseInt(o.value) : 0
                const disabled = o.value !== '' && maxPriceNum > 0 && optNum >= maxPriceNum
                return (
                  <option key={o.value} value={o.value} disabled={disabled}>{o.label}</option>
                )
              })}
            </select>
          </div>

          {/* Max Price — disable options at or below selected min */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <label style={{ ...labelSt, display: 'block' }}>Max Price</label>
            <select
              style={selectSt}
              value={maxPrice}
              onChange={e => handleMaxPrice(e.target.value)}
            >
              {PRICE_STEPS.map(o => {
                const optNum = o.value ? parseInt(o.value) : 0
                const disabled = o.value !== '' && minPriceNum > 0 && optNum <= minPriceNum
                return (
                  <option key={o.value} value={o.value} disabled={disabled}>
                    {o.label === 'No Min' ? 'No Max' : o.label}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <label style={{ ...labelSt, display: 'block' }}>Sort</label>
            <select
              style={selectSt}
              value={sp.sort || ''}
              onChange={e => push({ sort: e.target.value, page: '' })}
            >
              {SORTS.map(s => (
                <option key={s.label} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Clear all */}
          {hasFilters && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ ...labelSt, display: 'block', visibility: 'hidden' }}>.</span>
              <a
                href={agentPrefix + '/search'}
                style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, textDecoration: 'none', padding: '6px 4px', whiteSpace: 'nowrap' as const }}
              >
                ✕ Clear all
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
