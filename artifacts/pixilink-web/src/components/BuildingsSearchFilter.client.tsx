'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { AgentBuilding } from '@/lib/types'
import BuildingCard from '@/components/BuildingCard'

interface Props {
  buildings: AgentBuilding[]
  allBuildings: AgentBuilding[]
  slug: string
  view: 'list' | 'grid'
  sp: Record<string, string>
  sort: string
  dir: 'asc' | 'desc'
  area: string
  totalFiltered: number
  page: number
  pageSize: number
  statusFilter: string
  yearMinFilter: string
  yearMaxFilter: string
  titleFilter: string
  hasListingsFilter: string
  constructionFilter: string
  buildingsBase: string
  agentPrefix: string
}

function buildUrl(base: string, sp: Record<string, string>, overrides: Record<string, string>): string {
  const merged: Record<string, string> = { ...sp, ...overrides }
  // area is a path segment, not a query param
  delete merged.area
  Object.keys(merged).forEach(k => { if (!merged[k]) delete merged[k] })
  const p = new URLSearchParams(merged)
  const q = p.toString()
  return q ? `${base}?${q}` : base
}


const selectStyle: React.CSSProperties = {
  padding: '7px 28px 7px 10px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--text)',
  background: '#fff',
  cursor: 'pointer',
  outline: 'none',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
  minWidth: 130,
}

const inputStyle: React.CSSProperties = {
  padding: '7px 10px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--text)',
  background: '#fff',
  outline: 'none',
  width: 88,
}

function normalizeConstruction(raw: string | null | undefined): string {
  const v = (raw || '').toLowerCase()
  if (v.includes('concrete')) return 'Concrete'
  if (v.includes('wood') || v.includes('frame')) return 'Wood Frame'
  return raw ? raw : ''
}

export default function BuildingsSearchFilter({
  buildings, allBuildings, slug, view, sp, sort, dir, area,
  totalFiltered, page, pageSize,
  statusFilter, yearMinFilter, yearMaxFilter, titleFilter, hasListingsFilter, constructionFilter,
  buildingsBase,
  agentPrefix,
}: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  // Derive unique option values from full dataset
  const statusOptions = useMemo(() => {
    const set = new Set<string>()
    for (const b of allBuildings) {
      const v = (b.status || '').trim()
      if (v) set.add(v)
    }
    return [...set].sort()
  }, [allBuildings])

  const titleOptions = useMemo(() => {
    const set = new Set<string>()
    for (const b of allBuildings) {
      const v = (b.title_to_land || '').trim()
      if (v) set.add(v)
    }
    return [...set].sort()
  }, [allBuildings])

  const constructionOptions = useMemo(() => {
    const set = new Set<string>()
    for (const b of allBuildings) {
      const v = normalizeConstruction(b.construction)
      if (v === 'Concrete' || v === 'Wood Frame') set.add(v)
    }
    return [...set].sort()
  }, [allBuildings])

  // Text-search filtering (client-side, within current page)
  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return buildings
    return buildings.filter(b => {
      const name = String(b.name ?? '').toLowerCase()
      const address = String(b.address ?? '').toLowerCase()
      const streetName = String(b.street_name ?? '').toLowerCase()
      const streetNo = String(b.street_no ?? '').toLowerCase()
      return name.includes(q) || address.includes(q) || streetName.includes(q) || streetNo.includes(q)
    })
  }, [buildings, query])

  const hasQuery = query.trim().length > 0
  const hasAdvancedFilters = !!(statusFilter || yearMinFilter || yearMaxFilter || titleFilter || hasListingsFilter || constructionFilter)

  const countLabel = hasQuery ? displayed.length : totalFiltered
  const pageLabel = !hasQuery && totalFiltered > pageSize
    ? ` — showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalFiltered)}`
    : ''

  const navigate = useCallback((overrides: Record<string, string>) => {
    router.push(buildUrl(buildingsBase, sp, { ...overrides, page: '' }))
  }, [router, sp, buildingsBase])

  const clearAdvancedFilters = useCallback(() => {
    setQuery('')
    navigate({ status: '', yearMin: '', yearMax: '', title: '', hasListings: '', construction: '' })
  }, [navigate])

  const th: React.CSSProperties = {
    textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 14px', whiteSpace: 'nowrap',
  }
  const td: React.CSSProperties = { fontSize: 13, color: 'var(--text)', padding: '11px 14px', whiteSpace: 'nowrap' }

  function SortHeader({ field, label, align = 'left' }: { field: string; label: string; align?: 'left' | 'right' }) {
    const active = sort === field
    const nextDir = active ? (dir === 'asc' ? 'desc' : 'asc') : (['built'].includes(field) ? 'desc' : 'asc')
    const arrow = active ? (dir === 'asc' ? ' ▲' : ' ▼') : ''
    return (
      <th style={{ ...th, textAlign: align }}>
        <a href={buildUrl(buildingsBase, sp, { sort: field, dir: nextDir, view: view === 'grid' ? 'grid' : '' })}
          style={{ color: active ? 'var(--text)' : 'var(--text-muted)', textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {label}<span style={{ color: 'var(--accent)' }}>{arrow}</span>
        </a>
      </th>
    )
  }

  return (
    <>
      {/* Result count */}
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        {countLabel === 0
          ? (hasQuery ? `No buildings match "${query}" on this page` : 'No buildings found')
          : <>
              <strong style={{ color: 'var(--text)' }}>{countLabel}</strong>
              {' '}building{countLabel !== 1 ? 's' : ''}
              {area && !hasQuery ? ` in ${area}` : ''}
              {hasQuery && <> matching <strong style={{ color: 'var(--text)' }}>"{query}"</strong> on this page</>}
              {pageLabel}
            </>
        }
      </div>

      {/* Empty state */}
      {displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', background: '#fff' }}>
          {hasQuery
            ? <>No buildings match &ldquo;{query}&rdquo; on this page.<div style={{ marginTop: 12 }}><button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Clear search</button></div></>
            : <>No buildings found{area ? ` in ${area}` : ''}{hasAdvancedFilters ? ' with the selected filters' : ''}.<div style={{ marginTop: 12 }}>{hasAdvancedFilters && <button onClick={clearAdvancedFilters} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Clear filters</button>}</div></>
          }
        </div>
      ) : view === 'list' ? (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--off-white)' }}>
                <SortHeader field="name" label="Building Name" />
                <SortHeader field="address" label="Address" />
                <SortHeader field="levels" label="Levels" />
                <SortHeader field="status" label="Status" />
                <SortHeader field="built" label="Built" />
                <SortHeader field="title" label="Title to Land" />
                <SortHeader field="active" label="Homes" align="right" />
              </tr>
              <tr style={{ borderBottom: '2px solid var(--border)', background: '#fafafa' }}>
                {/* Building Name + Address — search input */}
                <th style={{ padding: '6px 14px' }} colSpan={2}>
                  <div style={{ position: 'relative' }}>
                    <svg style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', opacity: 0.35, pointerEvents: 'none' }}
                      width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="search"
                      placeholder="Search name or address…"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      style={{
                        width: '100%', padding: '5px 24px 5px 26px',
                        border: `1px solid ${hasQuery ? 'var(--primary-bg)' : 'var(--border)'}`,
                        borderRadius: 8, fontSize: 12, color: 'var(--text)',
                        background: '#fff', outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    {hasQuery && (
                      <button onClick={() => setQuery('')}
                        style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', fontSize: 15, lineHeight: 1 }}>
                        ×
                      </button>
                    )}
                  </div>
                </th>
                {/* Levels — Construction Type filter */}
                <th style={{ padding: '6px 14px' }}>
                  {constructionOptions.length > 0 && (
                    <select
                      value={constructionFilter}
                      onChange={e => navigate({ construction: e.target.value })}
                      style={{ ...selectStyle, minWidth: 0, width: '100%', padding: '5px 24px 5px 8px', fontSize: 12, borderColor: constructionFilter ? 'var(--primary-bg)' : 'var(--border)' }}
                    >
                      <option value="">Any type</option>
                      {constructionOptions.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </th>
                {/* Status filter */}
                <th style={{ padding: '6px 14px' }}>
                  <select
                    value={statusFilter}
                    onChange={e => navigate({ status: e.target.value })}
                    style={{ ...selectStyle, minWidth: 0, width: '100%', padding: '5px 24px 5px 8px', fontSize: 12, borderColor: statusFilter ? 'var(--primary-bg)' : 'var(--border)' }}
                  >
                    <option value="">Any status</option>
                    {statusOptions.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </th>
                {/* Year Built min/max filter */}
                <th style={{ padding: '6px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="number"
                      placeholder="Min"
                      value={yearMinFilter}
                      min={1900}
                      max={2100}
                      onChange={e => navigate({ yearMin: e.target.value })}
                      style={{ ...inputStyle, width: 62, padding: '5px 6px', fontSize: 12, borderColor: yearMinFilter ? 'var(--primary-bg)' : 'var(--border)' }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>–</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={yearMaxFilter}
                      min={1900}
                      max={2100}
                      onChange={e => navigate({ yearMax: e.target.value })}
                      style={{ ...inputStyle, width: 62, padding: '5px 6px', fontSize: 12, borderColor: yearMaxFilter ? 'var(--primary-bg)' : 'var(--border)' }}
                    />
                  </div>
                </th>
                {/* Title to Land filter */}
                <th style={{ padding: '6px 14px' }}>
                  <select
                    value={titleFilter}
                    onChange={e => navigate({ title: e.target.value })}
                    style={{ ...selectStyle, minWidth: 0, width: '100%', padding: '5px 24px 5px 8px', fontSize: 12, borderColor: titleFilter ? 'var(--primary-bg)' : 'var(--border)' }}
                  >
                    <option value="">Any title</option>
                    {titleOptions.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </th>
                {/* Listings filter + Clear button */}
                <th style={{ padding: '6px 14px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                    <select
                      value={hasListingsFilter}
                      onChange={e => navigate({ hasListings: e.target.value })}
                      style={{ ...selectStyle, minWidth: 0, padding: '5px 24px 5px 8px', fontSize: 12, borderColor: hasListingsFilter ? 'var(--primary-bg)' : 'var(--border)' }}
                    >
                      <option value="">Any</option>
                      <option value="with">With homes</option>
                      <option value="without">No homes</option>
                    </select>
                    {hasAdvancedFilters && (
                      <button
                        onClick={clearAdvancedFilters}
                        style={{
                          padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)',
                          background: 'var(--off-white)', color: 'var(--text)', fontSize: 11, fontWeight: 500,
                          cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(b => {
                const href = `${agentPrefix}/building/${b.slug}`
                const street = (b.address || '').split(',')[0].trim()
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ ...td, maxWidth: 320 }}>
                      <a href={href} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 700 }}>{b.name}</a>
                    </td>
                    <td style={{ ...td, maxWidth: 260 }}>
                      <a href={href} style={{ color: 'var(--text)', textDecoration: 'none' }}>{street || '—'}</a>
                    </td>
                    <td style={td}>{b.levels ?? '—'}</td>
                    <td style={{ ...td, color: 'var(--text-muted)' }}>{b.status || '—'}</td>
                    <td style={td}>{b.year_built || '—'}</td>
                    <td style={{ ...td, color: 'var(--text-muted)' }}>{b.title_to_land || '—'}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: b.active_listings > 0 ? '#16a34a' : 'var(--text-muted)' }}>{b.active_listings || 0}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* Grid view — compact filter bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 340 }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.35, pointerEvents: 'none' }}
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                placeholder="Search by name or address…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{
                  width: '100%', padding: '8px 30px 8px 32px',
                  border: `1px solid ${hasQuery ? 'var(--primary-bg)' : 'var(--border)'}`,
                  borderRadius: 8, fontSize: 13, color: 'var(--text)',
                  background: '#fff', outline: 'none', boxSizing: 'border-box',
                }}
              />
              {hasQuery && (
                <button onClick={() => setQuery('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }}>
                  ×
                </button>
              )}
            </div>
            {(hasAdvancedFilters || hasQuery) && (
              <button
                onClick={clearAdvancedFilters}
                style={{
                  padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--off-white)', color: 'var(--text)', fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                Clear
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 24 }}>
            {displayed.map(b => <BuildingCard key={b.id} building={b} href={`${agentPrefix}/building/${b.slug}`} />)}
          </div>
        </>
      )}
    </>
  )
}
