'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { apiPath } from '@/lib/admin-api-path'

const P = {
  primary: '#23a9e1', primaryLight: '#e0f2fe',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', success: '#22c55e', successLight: '#dcfce7',
  warning: '#f59e0b', warningLight: '#fffbeb',
  error: '#ef4444', errorLight: '#fee2e2',
  purple: '#8b5cf6', purpleLight: '#ede9fe',
  teal: '#0d9488', tealLight: '#ccfbf1',
}

const PAGE_SIZE = 100

const AMENITY_TAGS = [
  { key: 'air_conditioning', label: '❄️ A/C' },
  { key: 'panel_fridge',     label: '🧊 Panel Fridge' },
  { key: 'gas_appliances',   label: '🔥 Gas' },
  { key: 'electric_appliances', label: '⚡ Electric' },
]

interface Building {
  id: string
  name: string
  city: string
  subarea: string | null
  units: number | null
  year_built: number | null
  strata_no: string | null
  slug: string
  photo_url: string | null
  active_listings: number
  min_price: number | null
  max_price: number | null
  amenity_tags?: string[]
}

interface FeatureSection { title: string; items: string[] }
interface WebSource { title: string; url: string }
type FeatGenStatus = 'idle' | 'generating' | 'preview' | 'saving' | 'saved' | 'error'
type DescGenStatus = 'idle' | 'generating' | 'preview' | 'error'

interface FeatGenState {
  status: FeatGenStatus
  sections: FeatureSection[] | null
  type: string | null
  error: string | null
  webFallback: boolean
  sources: WebSource[]
}

interface DescGenState {
  status: DescGenStatus
  tagline: string | null
  description: string | null
  neighbourhood_context: string | null
  meta_description: string | null
  faqCount: number
  error: string | null
}

export default function AgentBuildingsPage() {
  const params = useParams()
  const agentId = params.id as string

  const [buildings, setBuildings] = useState<Building[]>([])
  const [agentSlug, setAgentSlug] = useState<string>('')
  const [routingMode, setRoutingMode] = useState<string>('domain')
  const [customDomain, setCustomDomain] = useState<string | null>(null)
  const [layoutPreset, setLayoutPreset] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [featGen, setFeatGen] = useState<Record<string, FeatGenState>>({})
  const [descGen, setDescGen] = useState<Record<string, DescGenState>>({})
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [noTagsFilter, setNoTagsFilter] = useState(false)
  const [tagEditorOpen, setTagEditorOpen] = useState<string | null>(null)
  const [tagSaving, setTagSaving] = useState<string | null>(null)
  const [tagDraft, setTagDraft] = useState<Record<string, string[]>>({})

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const fetchPage = useCallback((page: number, activeTags?: string[]) => {
    if (!agentId) return
    const tags = activeTags ?? tagFilter
    setLoading(true)
    setError(null)
    const qs = new URLSearchParams({ agentId, limit: String(PAGE_SIZE), page: String(page) })
    tags.forEach(t => qs.append('tags[]', t))
    fetch(apiPath(`/api/admin/buildings?${qs}`))
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setBuildings(data.buildings || [])
          setAgentSlug(data.agent_slug || '')
          setRoutingMode(data.routing_mode || 'domain')
          setCustomDomain(data.custom_domain || null)
          setLayoutPreset(data.layout_preset || null)
          setTotalCount(data.total ?? (data.buildings?.length ?? 0))
        }
      })
      .catch(() => setError('Network error — could not load buildings'))
      .finally(() => setLoading(false))
  }, [agentId, tagFilter])

  useEffect(() => {
    fetchPage(currentPage)
  }, [fetchPage, currentPage])

  const filtered = buildings.filter(b => {
    const matchesSearch = !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.subarea || '').toLowerCase().includes(search.toLowerCase()) ||
      b.city.toLowerCase().includes(search.toLowerCase())
    const matchesTags = tagFilter.length === 0 ||
      tagFilter.every(t => (b.amenity_tags || []).includes(t))
    const matchesNoTags = !noTagsFilter || (b.amenity_tags || []).length === 0
    return matchesSearch && matchesTags && matchesNoTags
  })

  const withActive = buildings.filter(b => b.active_listings > 0).length

  const buildingHref = (b: Building) => {
    if (routingMode === 'domain' && customDomain) {
      return `https://${customDomain}/building/${b.slug}`
    }
    if (agentSlug) {
      return `/agent/${agentSlug}/building/${b.slug}`
    }
    return `/building/${b.slug}`
  }

  function goToPage(p: number) {
    const clamped = Math.max(1, Math.min(totalPages, p))
    setCurrentPage(clamped)
    setSearch('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function setFeatState(id: string, patch: Partial<FeatGenState>) {
    setFeatGen(prev => {
      const existing: FeatGenState = prev[id] ?? { status: 'idle', sections: null, type: null, error: null, webFallback: false, sources: [] }
      return { ...prev, [id]: { ...existing, ...patch } }
    })
  }

  function setDescState(id: string, patch: Partial<DescGenState>) {
    setDescGen(prev => {
      const existing: DescGenState = prev[id] ?? { status: 'idle', tagline: null, description: null, neighbourhood_context: null, meta_description: null, faqCount: 0, error: null }
      return { ...prev, [id]: { ...existing, ...patch } }
    })
  }

  async function generateDesc(b: Building) {
    setDescState(b.id, { status: 'generating', error: null })
    try {
      const res = await fetch(apiPath(`/api/admin/buildings/${b.id}/generate-description`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentSlug, slug: b.slug, name: b.name, city: b.city, subarea: b.subarea }),
      })
      const text = await res.text()
      let data: Record<string, unknown>
      try {
        data = JSON.parse(text) as Record<string, unknown>
      } catch {
        setDescState(b.id, { status: 'error', error: `HTTP ${res.status} — ${text.slice(0, 300)}` })
        return
      }
      if (!res.ok) {
        setDescState(b.id, { status: 'error', error: (data.error as string) || `HTTP ${res.status}` })
      } else {
        setDescState(b.id, {
          status: 'preview',
          tagline: (data.tagline as string) || null,
          description: (data.description as string) || null,
          neighbourhood_context: (data.neighbourhood_context as string) || null,
          meta_description: (data.meta_description as string) || null,
          faqCount: Array.isArray(data.faq) ? (data.faq as unknown[]).length : 0,
        })
      }
    } catch (err) {
      setDescState(b.id, { status: 'error', error: err instanceof Error ? err.message : 'Network error' })
    }
  }

  function dismissDesc(id: string) {
    setDescState(id, { status: 'idle', tagline: null, description: null, neighbourhood_context: null, meta_description: null, faqCount: 0, error: null })
  }

  async function generateFeaturesPreview(b: Building) {
    setFeatState(b.id, { status: 'generating', sections: null, error: null, webFallback: false, sources: [] })
    try {
      const res = await fetch(apiPath(`/api/admin/buildings/${b.id}/generate-features`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentSlug, slug: b.slug, name: b.name, city: b.city, subarea: b.subarea, dryRun: true }),
      })
      const text = await res.text()
      let data: Record<string, unknown>
      try {
        data = JSON.parse(text) as Record<string, unknown>
      } catch {
        setFeatState(b.id, { status: 'error', error: `HTTP ${res.status} — ${text.slice(0, 300)}` })
        return
      }
      if (!res.ok) {
        setFeatState(b.id, { status: 'error', error: (data.error as string) || `HTTP ${res.status}` })
      } else if (data.webFallback && data.insufficient) {
        setFeatState(b.id, { status: 'error', error: '🌐 No usable web data found for this building.' })
      } else {
        setFeatState(b.id, {
          status: 'preview',
          sections: (data.sections as FeatureSection[]) || null,
          type: (data.type as string) || null,
          webFallback: (data.webFallback as boolean) || false,
          sources: (data.sources as WebSource[]) || [],
        })
      }
    } catch (err) {
      setFeatState(b.id, { status: 'error', error: err instanceof Error ? err.message : 'Network error' })
    }
  }

  async function saveFeatures(b: Building) {
    const state = featGen[b.id]
    if (!state?.sections) return
    setFeatState(b.id, { status: 'saving' })
    try {
      const res = await fetch(apiPath(`/api/admin/buildings/${b.id}/save-features`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: state.type, sections: state.sections, agentSlug, buildingSlug: b.slug }),
      })
      const text = await res.text()
      let data: Record<string, unknown> = {}
      try { data = JSON.parse(text) as Record<string, unknown> } catch { /* ignore, not JSON */ }
      if (!res.ok) {
        setFeatState(b.id, { status: 'error', error: (data.error as string) || `HTTP ${res.status} — ${text.slice(0, 200)}` })
      } else {
        setFeatState(b.id, { status: 'saved' })
      }
    } catch (err) {
      setFeatState(b.id, { status: 'error', error: err instanceof Error ? err.message : 'Network error' })
    }
  }

  function discardFeatures(id: string) {
    setFeatState(id, { status: 'idle', sections: null, type: null, error: null })
  }

  return (
    <div>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Buildings</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>
          Buildings in this agent&apos;s territory — auto-populated from assigned cities and subareas.
        </p>
      </div>

      {layoutPreset === 'showcase' && (
        <div style={{ margin: '16px 32px 0', padding: '14px 18px', background: '#fefce8', border: '1px solid #fbbf24', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 3 }}>Buildings are not part of the showcase theme</div>
            <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
              This data is not shown publicly on the agent&apos;s site. Building detail pages, the buildings index, and &ldquo;Condo Buildings&rdquo; quick-links are all suppressed for showcase agents. You can still manage building data here for future use if the theme changes.
            </div>
          </div>
        </div>
      )}

      {routingMode === 'path' && agentSlug && (
        <div style={{ margin: '16px 32px 0', padding: '10px 16px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
          <strong>Dev mode:</strong> Building URLs show as <code style={{ background: '#fef9c3', padding: '1px 5px', borderRadius: 3 }}>/agent/{agentSlug}/building/…</code> here. In production, the agent&apos;s custom domain serves these as <code style={{ background: '#fef9c3', padding: '1px 5px', borderRadius: 3 }}>/building/…</code> — no URL change needed.
        </div>
      )}

      <div style={{ padding: '20px 32px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            ['Total Buildings', loading ? '…' : totalCount, P.text],
            ['With Active Listings', loading ? '…' : withActive, P.success],
            ['No Active Listings', loading ? '…' : buildings.length - withActive, P.muted],
            ['This Page', loading ? '…' : `${buildings.length} bldgs`, P.primary],
          ].map(([label, value, color]) => (
            <div key={String(label)} style={{ background: P.white, borderRadius: 10, padding: '16px 18px', border: `1px solid ${P.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: String(color) }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: P.muted, fontWeight: 600, whiteSpace: 'nowrap' }}>Filter by tag:</span>
          {AMENITY_TAGS.map(tag => (
            <button key={tag.key}
              onClick={() => setTagFilter(prev => prev.includes(tag.key) ? prev.filter(t => t !== tag.key) : [...prev, tag.key])}
              style={{ padding: '5px 11px', background: tagFilter.includes(tag.key) ? '#fef3c7' : P.bg, color: tagFilter.includes(tag.key) ? '#92400e' : P.muted, border: `1px solid ${tagFilter.includes(tag.key) ? '#fbbf24' : P.border}`, borderRadius: 6, fontSize: 11, fontWeight: tagFilter.includes(tag.key) ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              {tag.label}
            </button>
          ))}
          <button
            onClick={() => setNoTagsFilter(v => !v)}
            style={{ padding: '5px 11px', background: noTagsFilter ? P.errorLight : P.bg, color: noTagsFilter ? P.error : P.muted, border: `1px solid ${noTagsFilter ? P.error : P.border}`, borderRadius: 6, fontSize: 11, fontWeight: noTagsFilter ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            🚫 No Tags
          </button>
          {(tagFilter.length > 0 || noTagsFilter) && (
            <button onClick={() => { setTagFilter([]); setNoTagsFilter(false) }} style={{ padding: '5px 10px', background: P.errorLight, color: P.error, border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              Clear filters
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by building name, subarea, or city…"
            style={{ padding: '8px 14px', border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 13, width: 320, outline: 'none', background: P.white, fontFamily: 'inherit' }} />
          <div style={{ fontSize: 12, color: P.muted }}>
            {loading ? 'Loading…' : (
              search
                ? `${filtered.length} match${filtered.length !== 1 ? 'es' : ''} on this page`
                : `Page ${currentPage} of ${totalPages} · ${totalCount} total`
            )}
          </div>
          {search && (
            <div style={{ fontSize: 11, color: P.muted, fontStyle: 'italic' }}>
              Searches this page only — use pagination to browse all buildings
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#fee2e2', borderRadius: 8, color: P.error, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Buildings table */}
        <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: P.muted, fontSize: 14 }}>Loading territory buildings…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: P.muted, fontSize: 14 }}>
              {buildings.length === 0 ? 'No buildings found for this agent\'s territories.' : 'No buildings match your search.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: P.bg }}>
                  {['Building', 'Location', 'Units / Built', 'Active Listings', 'Price Range', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: P.muted, borderBottom: `1px solid ${P.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => {
                  const fg = featGen[b.id] ?? { status: 'idle', sections: null, type: null, error: null }
                  const dg = descGen[b.id] ?? { status: 'idle', tagline: null, description: null, neighbourhood_context: null, meta_description: null, faqCount: 0, error: null }
                  const showFeatPreview = fg.status === 'preview' || fg.status === 'saving' || fg.status === 'saved'
                  const showDescPreview = dg.status === 'preview'
                  const rowBg = dg.status === 'generating' ? '#f0fdf9' : fg.status === 'generating' ? '#faf5ff' : i % 2 === 0 ? P.white : P.bg
                  return (
                    <>
                      <tr key={b.id} style={{ borderBottom: `1px solid ${P.border}`, background: rowBg }}>
                        <td style={{ padding: '14px 16px' }}>
                          <a href={buildingHref(b)} target="_blank" rel="noreferrer"
                            style={{ fontSize: 13, fontWeight: 700, color: P.primary, textDecoration: 'none' }}>
                            {b.name}
                          </a>
                          {b.strata_no && <div style={{ fontSize: 10, color: P.muted, marginTop: 2 }}>Strata {b.strata_no}</div>}
                          {(b.amenity_tags || []).length > 0 && (
                            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 3 }}>
                              {(b.amenity_tags || []).map(t => {
                                const tag = AMENITY_TAGS.find(at => at.key === t)
                                return tag ? <span key={t} style={{ padding: '1px 5px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>{tag.label}</span> : null
                              })}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: P.text }}>{b.subarea || '—'}</div>
                          <div style={{ fontSize: 11, color: P.muted }}>{b.city}</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: 13, color: P.text }}>{b.units ?? '—'} units</div>
                          <div style={{ fontSize: 11, color: P.muted }}>{b.year_built ? `Built ${b.year_built}` : '—'}</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {b.active_listings > 0 ? (
                            <span style={{ background: P.successLight, color: '#15803d', padding: '3px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                              {b.active_listings} active
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: P.muted }}>None</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 12, color: P.muted }}>
                          {b.min_price && b.max_price
                            ? `$${(b.min_price / 1000).toFixed(0)}K – $${(b.max_price / 1000).toFixed(0)}K`
                            : b.min_price
                            ? `From $${(b.min_price / 1000).toFixed(0)}K`
                            : '—'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <a href={buildingHref(b)} target="_blank" rel="noreferrer"
                              style={{ padding: '5px 11px', background: P.bg, color: P.text, border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                              View ↗
                            </a>

                            <button
                              onClick={() => setTagEditorOpen(tagEditorOpen === b.id ? null : b.id)}
                              style={{ padding: '5px 11px', background: (b.amenity_tags || []).length > 0 ? '#fef3c7' : P.bg, color: (b.amenity_tags || []).length > 0 ? '#92400e' : P.muted, border: `1px solid ${(b.amenity_tags || []).length > 0 ? '#fbbf24' : P.border}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                              🏷{(b.amenity_tags || []).length > 0 ? ` ${(b.amenity_tags || []).length}` : ''} Tags
                            </button>

                            {/* Inline description generate */}
                            {dg.status === 'idle' || dg.status === 'error' ? (
                              <button onClick={() => generateDesc(b)} title={dg.error || undefined}
                                style={{ padding: '5px 11px', background: dg.status === 'error' ? P.errorLight : P.tealLight, color: dg.status === 'error' ? P.error : P.teal, border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                                {dg.status === 'error' ? '✗ Retry Desc' : '📄 Gen Desc'}
                              </button>
                            ) : dg.status === 'generating' ? (
                              <span style={{ padding: '5px 11px', background: P.tealLight, color: P.teal, borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>⟳ Writing…</span>
                            ) : dg.status === 'preview' ? (
                              <button onClick={() => dismissDesc(b.id)}
                                style={{ padding: '5px 11px', background: P.tealLight, color: P.teal, border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                                ✓ Desc Saved
                              </button>
                            ) : null}

                            {/* Features generate */}
                            {fg.status === 'idle' || fg.status === 'error' ? (
                              <button onClick={() => generateFeaturesPreview(b)} title={fg.error || undefined}
                                style={{ padding: '5px 11px', background: fg.status === 'error' ? P.errorLight : P.purpleLight, color: fg.status === 'error' ? P.error : P.purple, border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                                {fg.status === 'error' ? '✗ Retry Features' : '🏠 Gen Features'}
                              </button>
                            ) : fg.status === 'generating' ? (
                              <span style={{ padding: '5px 11px', background: P.purpleLight, color: P.purple, borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>⟳ Generating…</span>
                            ) : fg.status === 'saved' ? (
                              <span style={{ padding: '5px 11px', background: P.successLight, color: '#15803d', borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>✓ Features Saved</span>
                            ) : null}

                            {/* Batch link */}
                            <a href={`/admin/buildings/batch-generate${agentSlug ? `?agentSlug=${encodeURIComponent(agentSlug)}` : ''}`}
                              style={{ padding: '5px 11px', background: P.primaryLight, color: P.primary, border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                              ✨ Batch
                            </a>
                          </div>
                          {dg.error && dg.status === 'error' && (
                            <div style={{ fontSize: 10, color: P.error, marginTop: 4, maxWidth: 200, wordBreak: 'break-word' }}>{dg.error}</div>
                          )}
                          {fg.error && fg.status === 'error' && (
                            <div style={{ fontSize: 10, color: P.error, marginTop: 4, maxWidth: 200, wordBreak: 'break-word' }}>{fg.error}</div>
                          )}
                        </td>
                      </tr>

                      {/* Tag editor row */}
                      {tagEditorOpen === b.id && (() => {
                        const draft = tagDraft[b.id] ?? (b.amenity_tags || [])
                        return (
                          <tr key={`${b.id}-tag-editor`} style={{ borderBottom: `1px solid ${P.border}` }}>
                            <td colSpan={6} style={{ padding: '12px 16px 16px 32px', background: '#fffbeb' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>🏷 Amenity Tags</span>
                                {AMENITY_TAGS.map(tag => (
                                  <label key={tag.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: P.text }}>
                                    <input
                                      type="checkbox"
                                      checked={draft.includes(tag.key)}
                                      onChange={e => {
                                        const next = e.target.checked ? [...draft, tag.key] : draft.filter(t => t !== tag.key)
                                        setTagDraft(prev => ({ ...prev, [b.id]: next }))
                                      }}
                                      style={{ width: 14, height: 14 }}
                                    />
                                    {tag.label}
                                  </label>
                                ))}
                                <button
                                  onClick={async () => {
                                    setTagSaving(b.id)
                                    try {
                                      const res = await fetch(apiPath(`/api/admin/buildings/${b.id}/tags`), {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ tags: draft }),
                                      })
                                      if (!res.ok) {
                                        const d = await res.json().catch(() => ({}))
                                        alert((d as { error?: string }).error || 'Save failed')
                                      } else {
                                        setBuildings(prev => prev.map(x => x.id === b.id ? { ...x, amenity_tags: draft } : x))
                                        setTagDraft(prev => { const n = { ...prev }; delete n[b.id]; return n })
                                        setTagEditorOpen(null)
                                      }
                                    } catch { alert('Network error') }
                                    finally { setTagSaving(null) }
                                  }}
                                  disabled={tagSaving === b.id}
                                  style={{ padding: '5px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: tagSaving === b.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                                  {tagSaving === b.id ? 'Saving…' : '✓ Save Tags'}
                                </button>
                                <button
                                  onClick={() => {
                                    setTagDraft(prev => { const n = { ...prev }; delete n[b.id]; return n })
                                    setTagEditorOpen(null)
                                  }}
                                  style={{ padding: '5px 12px', background: P.bg, color: P.muted, border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })()}

                      {/* Description preview row */}
                      {showDescPreview && (
                        <tr key={`${b.id}-desc-preview`} style={{ borderBottom: `1px solid ${P.border}` }}>
                          <td colSpan={6} style={{ padding: '0 16px 16px 32px', background: '#f0fdf9' }}>
                            <div style={{ marginTop: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: P.teal }}>📄 Description saved to database</div>
                                <a href={buildingHref(b)} target="_blank" rel="noreferrer"
                                  style={{ padding: '4px 12px', background: P.teal, color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                                  View on site ↗
                                </a>
                                <button onClick={() => dismissDesc(b.id)}
                                  style={{ padding: '4px 12px', background: P.bg, color: P.muted, border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                                  Dismiss
                                </button>
                              </div>
                              <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {dg.tagline && (
                                  <div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Tagline</div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{dg.tagline}</div>
                                  </div>
                                )}
                                {dg.description && (
                                  <div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Description</div>
                                    <div style={{ fontSize: 12, color: P.text, lineHeight: 1.6 }}>{dg.description}</div>
                                  </div>
                                )}
                                {dg.neighbourhood_context && (
                                  <div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Neighbourhood Context</div>
                                    <div style={{ fontSize: 12, color: P.text, lineHeight: 1.6 }}>{dg.neighbourhood_context}</div>
                                  </div>
                                )}
                                {dg.meta_description && (
                                  <div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Meta Description ({dg.meta_description.length} chars)</div>
                                    <div style={{ fontSize: 12, color: P.muted, fontStyle: 'italic' }}>{dg.meta_description}</div>
                                  </div>
                                )}
                                {dg.faqCount > 0 && (
                                  <div style={{ fontSize: 12, color: P.muted }}>+ {dg.faqCount} FAQ entries saved</div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Features preview row */}
                      {showFeatPreview && fg.sections && (
                        <tr key={`${b.id}-feat-preview`} style={{ borderBottom: `1px solid ${P.border}` }}>
                          <td colSpan={6} style={{ padding: '0 16px 16px 32px', background: fg.webFallback ? '#f0f9ff' : '#faf5ff' }}>
                            <div style={{ marginTop: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: fg.webFallback ? '#0369a1' : P.purple }}>
                                  {fg.webFallback
                                    ? '🌐 Web-sourced Features Preview'
                                    : `🏠 Features Preview ${fg.type === 'plain' ? '(plain-tag)' : '(AI-rewritten)'}`}
                                </div>
                                {fg.status === 'preview' && (
                                  <>
                                    <button onClick={() => saveFeatures(b)}
                                      style={{ padding: '5px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                      ✓ Save to Building
                                    </button>
                                    <button onClick={() => discardFeatures(b.id)}
                                      style={{ padding: '5px 14px', background: P.bg, color: P.muted, border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                                      ✗ Discard
                                    </button>
                                  </>
                                )}
                                {fg.status === 'saving' && <span style={{ fontSize: 11, color: P.muted }}>Saving…</span>}
                                {fg.status === 'saved' && <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>✓ Saved successfully</span>}
                              </div>
                              <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {fg.sections.map((section, si) => (
                                  <div key={si}>
                                    {section.title && (
                                      <div style={{ fontSize: 11, fontWeight: 700, color: P.text, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{section.title}</div>
                                    )}
                                    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                      {section.items.map((item, ii) => (
                                        <li key={ii} style={{ fontSize: 12, color: P.muted, lineHeight: 1.5 }}>{item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                              {fg.webFallback && fg.sources.length > 0 && (
                                <details style={{ marginTop: 8 }}>
                                  <summary style={{ fontSize: 11, color: '#0369a1', cursor: 'pointer', userSelect: 'none' }}>
                                    Sources ({fg.sources.length})
                                  </summary>
                                  <ul style={{ margin: '6px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    {fg.sources.map((src, si) => (
                                      <li key={si}>
                                        <a href={src.url} target="_blank" rel="noreferrer"
                                          style={{ fontSize: 11, color: '#0369a1', wordBreak: 'break-all' }}>
                                          {src.title || src.url}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination controls */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '12px 16px', background: P.white, borderRadius: 10, border: `1px solid ${P.border}` }}>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              style={{ padding: '7px 18px', background: currentPage <= 1 ? P.bg : P.primaryLight, color: currentPage <= 1 ? P.muted : P.primary, border: `1px solid ${currentPage <= 1 ? P.border : '#93c5fd'}`, borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              ← Prev
            </button>
            <div style={{ fontSize: 13, color: P.text, fontWeight: 500 }}>
              Page {currentPage} of {totalPages}
              <span style={{ color: P.muted, fontWeight: 400 }}> · {totalCount} total buildings</span>
            </div>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              style={{ padding: '7px 18px', background: currentPage >= totalPages ? P.bg : P.primaryLight, color: currentPage >= totalPages ? P.muted : P.primary, border: `1px solid ${currentPage >= totalPages ? P.border : '#93c5fd'}`, borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              Next →
            </button>
          </div>
        )}

        <div style={{ marginTop: 12, padding: '12px 16px', background: P.primaryLight, borderRadius: 8, fontSize: 12 }}>
          <span style={{ color: '#0369a1' }}>✨ <strong>Batch Generate</strong> uses Claude to write taglines, descriptions, neighbourhood context, meta descriptions, FAQs, and features for multiple buildings. <a href="/admin/buildings/batch-generate" style={{ color: '#0369a1', fontWeight: 700 }}>Open Batch Generate →</a></span>
        </div>
      </div>
    </div>
  )
}
