import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getBuildings, getNeighbourhoodDetail, agentCanonicalBase, resolveAgentPrefix } from '@/lib/api'
import PageQuickLinks from '@/components/PageQuickLinks'
import BuildingsSearchFilter from '@/components/BuildingsSearchFilter.client'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string; area: string }>
  searchParams: Promise<Record<string, string>>
}

export const dynamic = 'force-dynamic'

function areaSlugToDisplay(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function areaToSlug(area: string): string {
  return area.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const AREA_DESCRIPTIONS: Record<string, string> = {
  'brentwood-park': 'Brentwood Park is Burnaby\'s fastest-growing high-rise corridor, anchored by the Brentwood Town Centre SkyTrain station. Dozens of new concrete towers have transformed this neighbourhood into a vibrant urban hub with walkable amenities, restaurants, and direct transit connections to downtown Vancouver.',
  'metrotown': 'Metrotown is Burnaby\'s largest commercial and residential centre, surrounding Metropolis at Metrotown — one of BC\'s biggest shopping malls. With two SkyTrain stations and a dense mix of condos and highrise towers, it offers exceptional connectivity and a self-contained urban lifestyle.',
  'highgate': 'Highgate is a well-established Burnaby neighbourhood between Metrotown and Edmonds, known for its mix of older condos and newer concrete buildings. The area offers good transit access and is popular with first-time buyers seeking value within Burnaby.',
  'edmonds': 'Edmonds is one of Burnaby\'s most affordable SkyTrain-adjacent neighbourhoods, undergoing steady redevelopment. It attracts buyers looking for entry-level condos with direct access to the Expo Line.',
  'sullivan-heights': 'Sullivan Heights is a quieter residential area in north Burnaby near Simon Fraser University. The neighbourhood offers townhouses and smaller condo buildings with a suburban feel and easy highway access.',
  'south-surrey-white-rock': 'South Surrey and White Rock offer a relaxed coastal lifestyle along the Semiahmoo Peninsula, with sandy beaches, a vibrant waterfront promenade, and a strong sense of community. The area is popular with families and retirees alike, featuring a wide range of detached homes, townhouses, and condos.',
  'white-rock': 'White Rock is a seaside city renowned for its sandy beach, long pier, and village atmosphere. Perched on the hillside above the waterfront, its condo buildings offer some of the best ocean views in the Lower Mainland.',
  'cloverdale': 'Cloverdale is a charming historic community in south Surrey with a small-town feel and growing strata developments. It offers larger lots, newer townhouses, and condos at prices often below Surrey City Centre.',
  'morgan-creek': 'Morgan Creek is a prestigious master-planned community in South Surrey, known for its golf course, walking trails, and upscale detached homes. Strata townhouses here offer proximity to top schools and the Grandview Corners shopping district.',
  'grandview': 'Grandview Heights is one of Surrey\'s newest planned communities, featuring modern townhouses, condos, and the Grandview Corners retail hub. The area is highly sought after by families for its top-rated schools and Fraser Highway corridor access.',
  'ocean-park': 'Ocean Park is a secluded seaside enclave in South Surrey with a village-like character and mature tree-lined streets. The neighbourhood offers a mix of single-family homes and boutique strata buildings, with easy access to Crescent Beach.',
  'fleetwood': 'Fleetwood is a growing family neighbourhood in North Surrey along the future SkyTrain extension corridor. New townhouse and low-rise condo projects are expanding rapidly, making it a popular choice for buyers priced out of more central areas.',
  'whalley': 'Surrey City Centre (Whalley) is undergoing one of BC\'s largest urban transformations, with dozens of highrise towers rising around the King George SkyTrain hub. It offers the most affordable new condos in Metro Vancouver with direct rail access to downtown.',
  'guildford': 'Guildford is a well-established North Surrey neighbourhood centred on Guildford Town Centre. A mix of older wood-frame and newer concrete condos offers good value, and upcoming SkyTrain service will significantly boost the area\'s connectivity.',
  'newton': 'Newton is a large, diverse Surrey district known for its commercial activity along King George Boulevard. Strata developments here offer some of the most affordable options in Metro Vancouver for buyers seeking square footage.',
  'port-moody': 'Port Moody is a scenic waterfront city at the eastern end of Burrard Inlet, celebrated for its craft breweries, Inlet Centre, and Rocky Point Park. New highrise towers around Moody Centre and Inlet Centre SkyTrain stations have made it a sought-after option for commuters.',
  'coquitlam': 'Coquitlam has transformed dramatically with the Evergreen SkyTrain extension, driving significant condo and highrise development around Coquitlam Centre. The city blends suburban convenience with growing urban density and easy mountain access.',
  'langley': 'Langley offers a mix of small-town charm and rapid new development, with some of the most affordable detached homes and townhouses in the Lower Mainland. Its strong sense of community and rural surroundings attract families seeking space outside the city.',
  'abbotsford': 'Abbotsford is the Fraser Valley\'s largest city, offering diverse strata options at prices well below Metro Vancouver. Strong amenities, a university, and direct highway access make it a practical choice for buyers seeking affordability.',
  'richmond': 'Richmond is a cosmopolitan waterfront city directly south of Vancouver, known for its diverse food scene, the YVR airport corridor, and extensive SkyTrain coverage. New concrete towers on No. 3 Road and Garden City cater to buyers seeking urban amenities at mid-range prices.',
  'burnaby': 'Burnaby occupies the geographic heart of Metro Vancouver and offers three distinct SkyTrain corridors linking to both downtown Vancouver and Coquitlam. Its condo market spans affordable wood-frame buildings to luxury highrise towers along Kingsway and Brentwood.',
  'surrey': 'Surrey is Metro Vancouver\'s fastest-growing city and home to a rapidly expanding skyline around King George SkyTrain. From the established South Surrey communities to the emerging City Centre district, there is a broad range of strata options for every budget.',
  'new-westminster': 'New Westminster is Metro Vancouver\'s historic first capital, offering affordably priced condos with exceptional SkyTrain connectivity. Its revitalized waterfront, tight-knit neighbourhoods, and proximity to Columbia SkyTrain make it an increasingly popular choice.',
  'maple-ridge': 'Maple Ridge sits at the foot of the Golden Ears Mountains and offers some of the most affordable strata options in Greater Vancouver. Townhouses and low-rise condos dominate, attracting buyers who want space, nature, and community.',
  'pitt-meadows': 'Pitt Meadows is a small, scenic community bordered by Golden Ears Provincial Park and the Pitt River marshes. Strata options are limited but affordable, and the West Coast Express provides direct rail access to downtown Vancouver.',
  'north-vancouver': 'North Vancouver — spread across the City and District — offers mountain views, outdoor recreation, and a mix of established and newer strata buildings. It is highly sought after for its scenery, top schools, and proximity to downtown Vancouver via SeaBus.',
  'west-vancouver': 'West Vancouver is one of Canada\'s most affluent municipalities, with dramatic ocean and mountain views. Its strata market is dominated by luxury buildings in Ambleside and Dundarave, catering to buyers seeking premium coastal living.',
  'delta': 'Delta encompasses Ladner, Tsawwassen, and North Delta, each with its own distinct character. Ladner and Tsawwassen offer quiet suburban strata communities popular with retirees, while North Delta provides more affordable options for families.',
  'langley-city': 'Langley City is a compact urban core within the Township of Langley, offering affordable condos and growing density along Fraser Highway. The planned SkyTrain extension will further increase demand and transit accessibility.',
  'chilliwack': 'Chilliwack is a rapidly growing Fraser Valley city offering some of BC\'s most affordable strata housing. Surrounded by mountains and farmland, it attracts buyers seeking a quieter lifestyle with easy highway connections to Metro Vancouver.',
  'mission': 'Mission sits on a hillside above the Fraser River with a small-town feel and growing new development. It is one of BC\'s most affordable markets for buyers willing to commute via West Coast Express or the Trans-Canada Highway.',
}

function getAreaDescription(areaSlug: string, displayName: string, city?: string): string | null {
  if (AREA_DESCRIPTIONS[areaSlug]) return AREA_DESCRIPTIONS[areaSlug]
  for (const key of Object.keys(AREA_DESCRIPTIONS)) {
    if (areaSlug.startsWith(key) || key.startsWith(areaSlug)) return AREA_DESCRIPTIONS[key]
  }
  return null
}

export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, area } = await params
  const [agent, detail] = await Promise.all([
    getAgent(slug),
    getNeighbourhoodDetail(slug, area).catch(() => null),
  ])
  const displayName = detail?.name ?? areaSlugToDisplay(area)
  const city = detail?.city ?? ''
  const canonicalBase = agentCanonicalBase(agent)
  if (!agent) return { title: `Buildings in ${displayName}` }

  const title = city && city !== displayName
    ? `Condo Buildings in ${displayName}, ${city} — ${agent.name}`
    : `Condo Buildings in ${displayName} — ${agent.name}`

  const locationLabel = city && city !== displayName ? `${displayName}, ${city}` : displayName
  const description = detail?.description
    ? `${locationLabel} condo buildings — ${detail.description.slice(0, 110).trimEnd()}… Active listings and sold history with ${agent.name}.`
    : `Browse strata condo buildings in ${locationLabel}. View active listings, sold history, amenities and building details with ${agent.name}, ${agent.brokerage}.`

  return {
    title,
    description,
    alternates: {
      canonical: `https://${canonicalBase}/buildings/${area}`,
    },
  }
}

const PAGE_SIZE = 50

export default async function BuildingsAreaPage({ params, searchParams }: Props) {
  const { slug, area } = await params
  const sp = await searchParams
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const buildingsBase = `${agentPrefix}/buildings`

  const [agent, buildings, detail] = await Promise.all([
    getAgent(slug),
    getBuildings(slug, 2000),
    getNeighbourhoodDetail(slug, area).catch(() => null),
  ])
  if (!agent) notFound()

  const view = sp.view === 'grid' ? 'grid' : 'list'
  const sort = sp.sort || 'active'
  const descByDefault = ['active', 'newest', 'largest', 'built'].includes(sort)
  const dir: 'asc' | 'desc' = sp.dir === 'asc' ? 'asc' : sp.dir === 'desc' ? 'desc' : (descByDefault ? 'desc' : 'asc')
  const mul = dir === 'desc' ? -1 : 1

  const statusFilter = sp.status || ''
  const yearMin = sp.yearMin ? parseInt(sp.yearMin, 10) : null
  const yearMax = sp.yearMax ? parseInt(sp.yearMax, 10) : null
  const titleFilter = sp.title || ''
  const hasListingsFilter = sp.hasListings || ''
  const constructionFilter = sp.construction || ''

  const matchedArea = buildings.find(b => {
    const raw = (b.subarea || b.city || '').trim()
    return areaToSlug(raw) === area
  })
  const displayName = detail?.name ?? (matchedArea
    ? (matchedArea.subarea || matchedArea.city || '').trim()
    : areaSlugToDisplay(area))
  const city = detail?.city ?? ''

  const baseFiltered = buildings.filter(b => {
    const raw = (b.subarea || b.city || '').trim()
    return areaToSlug(raw) === area
  })

  if (baseFiltered.length === 0) notFound()

  function normalizeConstruction(raw: string | null | undefined): string {
    const v = (raw || '').toLowerCase()
    if (v.includes('concrete')) return 'Concrete'
    if (v.includes('wood') || v.includes('frame')) return 'Wood Frame'
    return raw ? raw : ''
  }

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

  const totalFiltered = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE))
  const page = Math.min(Math.max(1, parseInt(sp.page || '1', 10) || 1), totalPages)
  const pageStart = (page - 1) * PAGE_SIZE
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const hasAdvancedFilters = !!(statusFilter || yearMin || yearMax || titleFilter || hasListingsFilter || constructionFilter)

  // Unique areas for nav strip (alphabetical by display name)
  const allAreas: { slug: string; name: string }[] = Array.from(
    new Map(
      buildings
        .map(b => {
          const raw = (b.subarea || b.city || '').trim()
          if (!raw) return null
          return [areaToSlug(raw), raw] as [string, string]
        })
        .filter((x): x is [string, string] => x !== null)
    ).entries()
  )
    .map(([s, n]) => ({ slug: s, name: n }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const activeListingCount = detail?.widget?.active ?? null
  const introText = detail?.description || getAreaDescription(area, displayName, city)

  function viewLink(overrides: Record<string, string>) {
    const merged: Record<string, string> = { ...sp, ...overrides }
    Object.keys(merged).forEach(k => { if (!merged[k]) delete merged[k] })
    const p = new URLSearchParams(merged)
    const q = p.toString()
    return q ? `?${q}` : './'
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-block', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 500,
    background: active ? 'var(--primary-bg)' : '#fff', color: active ? '#fff' : 'var(--text)',
    border: `1px solid ${active ? 'var(--primary-bg)' : 'var(--border)'}`, textDecoration: 'none', cursor: 'pointer',
  })

  const canonicalBase = agentCanonicalBase(agent)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Strata Buildings in ${displayName}`,
    description: introText || `Browse strata and condo buildings in ${displayName}. Active listings, floor plans and building details from ${agent.name}.`,
    provider: { '@type': 'RealEstateAgent', name: agent.name },
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <link rel="canonical" href={`https://${canonicalBase}/buildings/${area}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <div style={{ background: '#fff', padding: '48px 0', borderBottom: '1px solid #e5e7eb' }}>
        <div className="container">
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>
            <a href={buildingsBase} style={{ color: '#888', textDecoration: 'none' }}>Condo Buildings</a>
            <span style={{ margin: '0 6px' }}>›</span>
            {displayName}{city && city !== displayName ? `, ${city}` : ''}
          </div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 400, lineHeight: 1.15, margin: 0, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            Buildings in {displayName}
            {baseFiltered.length > 0 && (
              <span style={{ background: hasAdvancedFilters ? '#dbeafe' : '#f3f4f6', color: hasAdvancedFilters ? '#1d4ed8' : '#6b7280', padding: '4px 14px', borderRadius: 20, fontSize: 14, fontWeight: 600 }}>
                {hasAdvancedFilters ? `${totalFiltered} of ${baseFiltered.length}` : `${baseFiltered.length}`} buildings
              </span>
            )}
            {activeListingCount !== null && (
              <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '4px 14px', borderRadius: 20, fontSize: 14, fontWeight: 600 }}>
                {activeListingCount.toLocaleString()} active {activeListingCount === 1 ? 'home' : 'homes'}
              </span>
            )}
          </h1>

          {/* Neighbourhood intro paragraph */}
          {introText ? (
            <p style={{ color: '#555', marginTop: 14, fontSize: 15, maxWidth: 640, lineHeight: 1.75 }}>
              {introText}
            </p>
          ) : (
            <p style={{ color: '#555', marginTop: 14, fontSize: 15, maxWidth: 560, lineHeight: 1.7 }}>
              Browse strata buildings in {displayName}. View active listings, sold history, amenities and building details for each complex.
            </p>
          )}

          <div style={{ marginTop: 16 }}>
            <a href={buildingsBase} style={{ color: 'var(--accent)', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
              ← All Buildings
            </a>
          </div>

          {/* Area navigation chip strip */}
          {allAreas.length > 1 && (
            <div style={{ marginTop: 20, overflowX: 'auto', paddingBottom: 4 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', minWidth: 'max-content' }}>
                {allAreas.map(a => (
                  <a
                    key={a.slug}
                    href={`${buildingsBase}/${a.slug}`}
                    style={chipStyle(a.slug === area)}
                  >
                    {a.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View toggle chips */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '14px 0' }}>
        <div className="container" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
          area={displayName}
          totalFiltered={totalFiltered}
          page={page}
          pageSize={PAGE_SIZE}
          statusFilter={statusFilter}
          yearMinFilter={sp.yearMin || ''}
          yearMaxFilter={sp.yearMax || ''}
          titleFilter={titleFilter}
          hasListingsFilter={hasListingsFilter}
          constructionFilter={constructionFilter}
          buildingsBase={`${buildingsBase}/${area}`}
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
      </div>

      <PageQuickLinks slug={slug} context="buildings" exclude="/buildings" />
    </div>
  )
}
