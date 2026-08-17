import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getBuildings, getAgentTerritories, agentCanonicalBase, agentAreaDisplay, resolveAgentPrefix } from '@/lib/api'
import PageQuickLinks from '@/components/PageQuickLinks'
import BuildingsSearchFilter from '@/components/BuildingsSearchFilter.client'
import { notFound } from 'next/navigation'
import { requireNotShowcase } from '@/lib/showcase'
import type { Metadata } from 'next'

function areaToSlug(area: string): string {
  return area.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}


interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string>>
}

export const revalidate = 300

export async function generateStaticParams() {
  return [{ slug: 'randy' }]
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const [agent, territories] = await Promise.all([getAgent(slug), getAgentTerritories(slug)])
  if (!agent) return { title: 'Buildings' }
  const domain = agentCanonicalBase(agent)

  // Belt-and-suspenders noindex for decorative-only param pages (sort/view/page).
  const DECORATIVE_KEYS = new Set(['sort', 'view', 'page', 'dir'])
  const MEANINGFUL_KEYS = new Set(['area', 'status', 'yearMin', 'yearMax', 'title', 'hasListings', 'construction'])
  const spKeys = Object.keys(sp)
  const hasDecorativeOnly = spKeys.length > 0
    && !spKeys.some(k => MEANINGFUL_KEYS.has(k))
    && spKeys.every(k => DECORATIVE_KEYS.has(k))

  return {
    title: `Condo Buildings — ${agent.name}`,
    description: `Browse strata condo buildings in ${agentAreaDisplay(territories)}. View active listings, sold history, amenities and building details with ${agent.name}, ${agent.brokerage}.`,
    alternates: { canonical: `https://${domain}/buildings` },
    ...(hasDecorativeOnly ? { robots: { index: false, follow: true } } : {}),
  }
}

const PAGE_SIZE = 50

export default async function BuildingsPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const buildingsBase = `${agentPrefix}/buildings`
  const [agent, buildings, territories] = await Promise.all([getAgent(slug), getBuildings(slug, 2000), getAgentTerritories(slug)])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const area = sp.area || ''
  const view = sp.view === 'grid' ? 'grid' : 'list'

  const sort = sp.sort || 'active'
  const descByDefault = ['active', 'newest', 'largest', 'built'].includes(sort)
  const dir: 'asc' | 'desc' = sp.dir === 'asc' ? 'asc' : sp.dir === 'desc' ? 'desc' : (descByDefault ? 'desc' : 'asc')
  const mul = dir === 'desc' ? -1 : 1

  // New filter params
  const statusFilter = sp.status || ''
  const yearMin = sp.yearMin ? parseInt(sp.yearMin, 10) : null
  const yearMax = sp.yearMax ? parseInt(sp.yearMax, 10) : null
  const titleFilter = sp.title || ''
  const hasListingsFilter = sp.hasListings || ''
  const constructionFilter = sp.construction || ''

  // Dedupe areas case-insensitively and count buildings per area
  const areaMap = new Map<string, string>()
  const areaCountMap = new Map<string, number>()
  for (const b of buildings) {
    const raw = (b.subarea || b.city || '').trim()
    if (!raw) continue
    const key = raw.toLowerCase()
    if (!areaMap.has(key)) areaMap.set(key, raw)
    areaCountMap.set(key, (areaCountMap.get(key) ?? 0) + 1)
  }
  const areas = [...areaMap.values()].sort()

  const baseFiltered = area
    ? buildings.filter(b => (b.subarea || b.city || '').toLowerCase() === area.toLowerCase())
    : buildings

  function normalizeConstruction(raw: string | null | undefined): string {
    const v = (raw || '').toLowerCase()
    if (v.includes('concrete')) return 'Concrete'
    if (v.includes('wood') || v.includes('frame')) return 'Wood Frame'
    return raw ? raw : ''
  }

  // Apply new server-side filters
  const advancedFiltered = baseFiltered.filter(b => {
    if (statusFilter && (b.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false
    if (yearMin !== null && (b.year_built || 0) < yearMin) return false
    if (yearMax !== null && (b.year_built || 0) > yearMax) return false
    if (titleFilter && (b.title_to_land || '').toLowerCase() !== titleFilter.toLowerCase()) return false
    if (hasListingsFilter === 'with' && !(b.active_listings > 0)) return false
    if (hasListingsFilter === 'without' && b.active_listings > 0) return false
    if (constructionFilter && normalizeConstruction(b.construction) !== constructionFilter) return false
    return true
  })

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  const streetNo = (b: typeof buildings[number]) => parseInt(String(b.street_no || '').replace(/[^0-9]/g, ''), 10) || 0
  const filtered = [...advancedFiltered].sort((a, b) => {
    switch (sort) {
      case 'name':    return mul * collator.compare(a.name || '', b.name || '')
      case 'address': {
        const c = collator.compare(a.street_name || '', b.street_name || '')
        return mul * (c !== 0 ? c : streetNo(a) - streetNo(b))
      }
      case 'subarea': return mul * collator.compare(a.subarea || a.city || '', b.subarea || b.city || '')
      case 'postal':  return mul * collator.compare(a.postal_code || '', b.postal_code || '')
      case 'levels':  return mul * ((a.levels || 0) - (b.levels || 0))
      case 'status':  return mul * collator.compare(a.status || '', b.status || '')
      case 'built':
      case 'newest':  return mul * ((a.year_built || 0) - (b.year_built || 0))
      case 'title':   return mul * collator.compare(a.title_to_land || '', b.title_to_land || '')
      case 'largest': return mul * ((a.units || 0) - (b.units || 0))
      default:        return mul * ((a.active_listings || 0) - (b.active_listings || 0))
    }
  })

  // Pagination
  const totalFiltered = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE))
  const page = Math.min(Math.max(1, parseInt(sp.page || '1', 10) || 1), totalPages)
  const pageStart = (page - 1) * PAGE_SIZE
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const hasAdvancedFilters = !!(statusFilter || yearMin || yearMax || titleFilter || hasListingsFilter || constructionFilter)

  function viewLink(overrides: Record<string, string>) {
    const merged: Record<string, string> = { ...sp, ...overrides }
    // area is now a path segment — strip it from query params
    delete merged.area
    Object.keys(merged).forEach(k => { if (!merged[k]) delete merged[k] })
    const p = new URLSearchParams(merged)
    const q = p.toString()
    return q ? `?${q}` : buildingsBase
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-block', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 500,
    background: active ? 'var(--primary-bg)' : '#fff', color: active ? '#fff' : 'var(--text)',
    border: `1px solid ${active ? 'var(--primary-bg)' : 'var(--border)'}`, textDecoration: 'none', cursor: 'pointer',
  })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Strata Buildings Directory',
    description: `Browse strata and condo buildings in ${agentAreaDisplay(territories)}. Active listings, floor plans and building details from ${agent.name}.`,
    provider: { '@type': 'RealEstateAgent', name: agent.name },
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Header */}
      <div style={{ background: '#fff', padding: '48px 0', borderBottom: '1px solid #e5e7eb' }}>
        <div className="container">
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>Condo Buildings</div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 400, lineHeight: 1.15, margin: 0, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            Buildings in {agentAreaDisplay(territories)}
            {buildings.length > 0 && (
              <span style={{ background: hasAdvancedFilters ? '#dbeafe' : '#f3f4f6', color: hasAdvancedFilters ? '#1d4ed8' : '#6b7280', padding: '4px 14px', borderRadius: 20, fontSize: 14, fontWeight: 600 }}>
                {hasAdvancedFilters ? `${totalFiltered} of ${buildings.length}` : `${buildings.length}`} buildings
              </span>
            )}
          </h1>
          <p style={{ color: '#555', marginTop: 14, fontSize: 15, maxWidth: 560, lineHeight: 1.7 }}>
            Browse strata buildings across the area. View active listings, sold history, amenities and building details
            for each complex.
          </p>
        </div>
      </div>

      {/* Area / Sort / View chips */}
      {buildings.length > 0 && (
        <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '14px 0' }}>
          <div className="container" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {areas.length > 1 && (
              <>
                <a href={buildingsBase} style={chipStyle(!area)}>All Areas</a>
                {areas.map(a => (
                  <a key={a} href={`${buildingsBase}/${areaToSlug(a)}`} style={chipStyle(area === a)}>{a}</a>
                ))}
              </>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <a href={viewLink({ view: '' })} style={chipStyle(view === 'list')} title="List view">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: 'block' }}>
                  <rect x="1" y="3" width="14" height="2" rx="1" fill="currentColor"/>
                  <rect x="1" y="7" width="14" height="2" rx="1" fill="currentColor"/>
                  <rect x="1" y="11" width="14" height="2" rx="1" fill="currentColor"/>
                </svg>
              </a>
              <a href={viewLink({ view: 'grid' })} style={chipStyle(view === 'grid')} title="Grid view">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: 'block' }}>
                  <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor"/>
                  <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor"/>
                  <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor"/>
                  <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="container" style={{ padding: '36px var(--container-padding) 48px' }}>
        <BuildingsSearchFilter
          buildings={paginated}
          allBuildings={buildings}
          slug={slug}
          view={view}
          sp={sp}
          sort={sort}
          dir={dir}
          area={area}
          totalFiltered={totalFiltered}
          page={page}
          pageSize={PAGE_SIZE}
          statusFilter={statusFilter}
          yearMinFilter={sp.yearMin || ''}
          yearMaxFilter={sp.yearMax || ''}
          titleFilter={titleFilter}
          hasListingsFilter={hasListingsFilter}
          constructionFilter={constructionFilter}
          buildingsBase={buildingsBase}
          agentPrefix={agentPrefix}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
            {page > 1 ? (
              <a href={viewLink({ page: String(page - 1) })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', border: '1px solid var(--border)', borderRadius: 8, background: '#fff', color: 'var(--text)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                ← Prev
              </a>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--off-white)', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, opacity: 0.5, cursor: 'default' }}>
                ← Prev
              </span>
            )}
            <span style={{ fontSize: 13, color: 'var(--text-muted)', padding: '0 8px' }}>
              Page <strong style={{ color: 'var(--text)' }}>{page}</strong> of <strong style={{ color: 'var(--text)' }}>{totalPages}</strong>
            </span>
            {page < totalPages ? (
              <a href={viewLink({ page: String(page + 1) })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', border: '1px solid var(--border)', borderRadius: 8, background: '#fff', color: 'var(--text)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                Next →
              </a>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--off-white)', color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, opacity: 0.5, cursor: 'default' }}>
                Next →
              </span>
            )}
          </div>
        )}

        {/* Browse by area */}
        {areas.length > 1 && (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 26px', marginTop: 40 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: 'var(--text)' }}>Browse by Area</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
              {areas.map(a => {
                const count = areaCountMap.get(a.toLowerCase()) ?? 0
                return (
                  <a key={a} href={`${buildingsBase}/${areaToSlug(a)}`} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 8, textDecoration: 'none', color: 'var(--text)', fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span>Buildings in {a}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 8px', letterSpacing: '0.02em' }}>{count}</span>
                      <span style={{ color: 'var(--accent)' }}>→</span>
                    </span>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* Browse by neighbourhood */}
        {areas.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 26px', marginTop: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: 'var(--text)' }}>Browse by Neighbourhood</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
              {areas.map(a => (
                <a key={a} href={`${agentPrefix}/neighbourhood/${a.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
                  style={{ background: 'var(--off-white)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 8, textDecoration: 'none', color: 'var(--text)', fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{a} guide</span>
                  <span style={{ color: 'var(--accent)' }}>→</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <PageQuickLinks slug={slug} context="buildings" exclude="/buildings" />
    </div>
  )
}
