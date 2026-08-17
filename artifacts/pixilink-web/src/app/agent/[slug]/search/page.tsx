import { playfair } from '@/lib/fonts'
import { Suspense } from 'react'
import { headers } from 'next/headers'
import { getAgent, getAllCities, getListings, getNeighbourhoods, getMarketStats, agentCanonicalBase, resolveAgentPrefix } from '@/lib/api'
import { toHomesForSaleHref } from '../homes-for-sale/subareaUtils'
import type { ListingsParams } from '@/lib/api'
import type { NeighbourhoodWidget } from '@/lib/types'
import { formatPrice, resolveSiteConfig } from '@/lib/types'
import ShowcaseSearchClient from '@/components/ShowcaseSearchClient'
import SearchFilterBar from '@/components/SearchFilterBar'
import ListingStrip from '@/components/ListingStrip'
import InsightBar from '@/components/InsightBar'
import PageQuickLinks from '@/components/PageQuickLinks'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string>>
}

export const revalidate = 300

const PAGE_SIZE = 48

export async function generateStaticParams() {
  return [{ slug: 'randy' }]
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const agent = await getAgent(slug)
  if (!agent) return {}
  const shortArea = 'All of BC'
  const domain = agentCanonicalBase(agent)
  const type = sp.type ? `${sp.type} ` : ''
  const status = sp.status === 'Sold' ? 'Sold ' : ''
  const areaLabel = sp.subarea || sp.city ? ` in ${sp.subarea || sp.city}` : ` in ${shortArea}`
  const yearLabel = sp.year_built
    ? ` · ${({ new: 'New', under5: 'Under 5 yrs', '5to10': '5–10 yrs', '10plus': '10+ yrs' } as Record<string,string>)[sp.year_built] ?? ''}`
    : ''
  const title = `Search ${status}${type}Homes${areaLabel}${yearLabel} — ${agent.name}`
  const description = `Search ${status.trim() || 'all'} ${type.trim() || ''} MLS® listings${areaLabel} with ${agent.name}. Filter by city, area, property type, year built and price.`
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', images: [{ url: `https://${domain}/opengraph.jpg`, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description },
  }
}

const YEAR_BUILT_LABELS: Record<string, string> = {
  new: 'New (≤ 1 yr)',
  under5: 'Under 5 yrs',
  '5to10': '5–10 years',
  '10plus': '10+ years',
}

function yearBuiltToRange(value: string, currentYear: number): { min_year?: number; max_year?: number } {
  if (value === 'new')    return { min_year: currentYear - 1 }
  if (value === 'under5') return { min_year: currentYear - 4 }
  if (value === '5to10')  return { min_year: currentYear - 10, max_year: currentYear - 5 }
  if (value === '10plus') return { max_year: currentYear - 10 }
  return {}
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const sp = await searchParams

  const agent = await getAgent(slug)
  if (!agent) notFound()

  if (resolveSiteConfig(agent).layout_preset === 'showcase') {
    const cities = await getAllCities()
    const shortArea = sp.city || 'All of BC'
    const showcaseCitySubareaMap: Record<string, string[]> = {}
    for (const city of cities) {
      showcaseCitySubareaMap[city] = []
    }
    const showcaseYearRange = yearBuiltToRange(sp.year_built || '', new Date().getFullYear())
    const SHOWCASE_PAGE_SIZE = 40
    const showcasePage = sp.page ? Math.max(1, parseInt(sp.page)) : 1
    const { listings: showcaseListings, total: showcaseTotal } = await getListings(slug, {
      status: (sp.status === 'Sold' ? 'Sold' : 'Active') as 'Active' | 'Sold',
      type: sp.type || undefined,
      beds: sp.beds ? parseInt(sp.beds) : undefined,
      min_price: sp.min_price ? parseInt(sp.min_price) : sp.min ? parseInt(sp.min) : undefined,
      max_price: sp.max_price ? parseInt(sp.max_price) : sp.max ? parseInt(sp.max) : undefined,
      city: sp.city || undefined,
      subarea: sp.subarea || undefined,
      min_year: showcaseYearRange.min_year,
      max_year: showcaseYearRange.max_year,
      sort: (sp.sort as ListingsParams['sort']) || undefined,
      page: showcasePage,
      limit: SHOWCASE_PAGE_SIZE,
      all_search: true,
    })
    return (
      <Suspense>
        <ShowcaseSearchClient
          slug={slug}
          agentName={agent.name}
          agentPrefix={agentPrefix}
          shortArea={shortArea}
          cities={cities}
          citySubareaMap={showcaseCitySubareaMap}
          currentFilters={sp}
          initialListings={showcaseListings}
          totalCount={showcaseTotal}
          pageSize={SHOWCASE_PAGE_SIZE}
        />
      </Suspense>
    )
  }

  const type = sp.type || ''
  const beds = sp.beds ? parseInt(sp.beds) : undefined
  // Accept both `min_price` (legacy) and `min` (canonical)
  const minP = sp.min_price ? parseInt(sp.min_price) : sp.min ? parseInt(sp.min) : undefined
  const maxP = sp.max_price ? parseInt(sp.max_price) : sp.max ? parseInt(sp.max) : undefined
  const sort = (sp.sort as ListingsParams['sort']) || undefined
  const status: 'Active' | 'Sold' = sp.status === 'Sold' ? 'Sold' : 'Active'
  // subarea takes precedence; city is secondary; legacy flat `subarea` param also accepted
  const selectedSubarea = sp.subarea || ''
  const selectedCity = sp.city || ''
  const filterSubarea = selectedSubarea || selectedCity
  const page = sp.page ? Math.max(1, parseInt(sp.page)) : 1

  // Year built bucket → min_year / max_year
  // Supports both the new `year_built` bucket param and direct `min_year`/`max_year` params
  const yearBuilt = sp.year_built || ''
  const currentYear = new Date().getFullYear()
  const yearRange = yearBuiltToRange(yearBuilt, currentYear)
  // Allow direct min_year / max_year URL params to override (or supplement) the bucket
  const directMinYear = sp.min_year ? parseInt(sp.min_year) : undefined
  const directMaxYear = sp.max_year ? parseInt(sp.max_year) : undefined
  const effectiveMinYear = directMinYear ?? yearRange.min_year
  const effectiveMaxYear = directMaxYear ?? yearRange.max_year

  const [listings, stats, neighbourhoods, cities] = await Promise.all([
    getListings(slug, {
      status,
      type: type || undefined,
      min_price: minP,
      max_price: maxP,
      beds,
      sort,
      city: selectedCity || undefined,
      subarea: selectedSubarea || undefined,
      min_year: effectiveMinYear,
      max_year: effectiveMaxYear,
      page,
      limit: PAGE_SIZE,
      all_search: true,
    }).then(r => r.listings),
    getMarketStats(slug),
    getNeighbourhoods(slug),
    getAllCities(),
  ])

  const shortArea = selectedCity || selectedSubarea || 'All of BC'
  const firstName = agent.name.split(' ')[0]

  const insightWidget: NeighbourhoodWidget = {
    subarea: shortArea,
    city: 'Surrey',
    active: stats.active_count,
    sold_30d: stats.sold_last_30_days,
    avg_sold_price: stats.avg_sold_price ?? 0,
    avg_dom: stats.avg_dom ?? 0,
    absorption_rate: stats.sold_last_30_days > 0 && stats.active_count > 0
      ? stats.sold_last_30_days / stats.active_count
      : 0,
    market_type: 'sellers',
  }

  // Build city → subareas map (subareas not available province-wide; kept as empty lists)
  const citySubareaMap: Record<string, string[]> = {}
  for (const city of cities) {
    citySubareaMap[city] = []
  }

  // Server-side filterLink for pagination (keeps year_built intact)
  function filterLink(overrides: Record<string, string>) {
    const merged: Record<string, string> = { ...sp, ...overrides }
    if ('min_price' in merged) { merged['min'] = merged['min'] || merged['min_price']; delete merged['min_price'] }
    if ('max_price' in merged) { merged['max'] = merged['max'] || merged['max_price']; delete merged['max_price'] }
    Object.keys(merged).forEach(k => { if (!merged[k]) delete merged[k] })
    const q = new URLSearchParams(merged).toString()
    return ap(q ? `/search?${q}` : '/search')
  }

  const h1Parts: string[] = []
  if (status === 'Sold') h1Parts.push('Sold')
  if (type) h1Parts.push(type === 'Apartment' ? 'Condos' : `${type}s`)
  if (beds) h1Parts.push(`${beds}+ Beds`)
  if (selectedSubarea) h1Parts.push(selectedSubarea)
  else if (selectedCity) h1Parts.push(selectedCity)
  if (yearBuilt && YEAR_BUILT_LABELS[yearBuilt]) h1Parts.push(YEAR_BUILT_LABELS[yearBuilt])
  if (minP && maxP) h1Parts.push(`$${Math.round(minP / 1000)}K–$${Math.round(maxP / 1000)}K`)
  else if (minP) h1Parts.push(`Over $${Math.round(minP / 1000)}K`)
  else if (maxP) h1Parts.push(`Under $${Math.round(maxP / 1000)}K`)
  const h1 = h1Parts.length
    ? `${h1Parts.join(' · ')} ${status === 'Sold' ? 'Properties' : 'for Sale'}`
    : status === 'Sold' ? 'Recently Sold Properties' : 'All Homes for Sale'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SearchResultsPage',
    name: 'Property Search',
    description: `Search MLS® listings in ${shortArea} and surrounding areas. Filter by type, price and beds. Results from ${agent.name}.`,
    provider: { '@type': 'RealEstateAgent', name: agent.name },
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <div style={{ background: '#fff', padding: '40px 0 32px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>
            {status === 'Sold' ? 'Sold Homes' : 'Search Results'}
          </div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(22px,3.5vw,38px)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', margin: '0 0 10px' }}>
            {h1}
            {listings.length > 0 && (
              <span style={{ marginLeft: 14, fontSize: 13, fontWeight: 500, color: '#6b7280', verticalAlign: 'middle', fontFamily: 'inherit' }}>
                {listings.length}{listings.length === PAGE_SIZE ? '+' : ''} listings
              </span>
            )}
          </h1>
          <p style={{ color: '#555', fontSize: 14, maxWidth: 600, lineHeight: 1.6, margin: 0 }}>
            {shortArea} · Updated daily from MLS®
          </p>
        </div>
      </div>

      {/* Popular area quick-links */}
      {neighbourhoods.length > 0 && (
        <div style={{ background: 'var(--off-white)', borderBottom: '1px solid var(--border)', padding: '9px 0' }}>
          <div className="container" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>Browse by area:</span>
            {neighbourhoods.map(n => (
              <a key={n.slug} href={ap(toHomesForSaleHref(n.subarea || n.name))}
                style={{ background: '#fff', border: '1px solid var(--border)', padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: 'var(--text)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                {n.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar (client component — handles all dropdowns + chips) */}
      <Suspense>
        <SearchFilterBar
          agentPrefix={agentPrefix}
          cities={cities}
          citySubareaMap={citySubareaMap}
        />
      </Suspense>

      <div className="container" style={{ padding: '28px var(--container-padding) 64px' }}>
        <div style={{ marginBottom: 18, padding: '9px 14px', background: 'var(--off-white)', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)' }}>
          Not sure where to start?{' '}
          <a href={ap('/market')} style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>See current market conditions →</a>
        </div>
        <InsightBar data={insightWidget} />

        <div style={{ fontSize: 13, color: 'var(--text-muted)', margin: '20px 0 16px' }}>
          {listings.length === 0
            ? 'No homes match these filters'
            : (
              <>
                <strong style={{ color: 'var(--text)' }}>{listings.length}{listings.length === PAGE_SIZE ? '+' : ''}</strong>
                {' '}home{listings.length !== 1 ? 's' : ''} found
                {page > 1 ? ` · page ${page}` : ''}
              </>
            )}
        </div>

        {listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', background: '#fff', borderRadius: 10, border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 17, marginBottom: 12 }}>No homes match these filters.</p>
            <a href={ap('/search')} style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 14 }}>Clear all filters</a>
          </div>
        ) : (
          <>
            <ListingStrip listings={listings} showSoldPrice={status === 'Sold'} />

            {(page > 1 || listings.length === PAGE_SIZE) && (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 48 }}>
                {page > 1 && (
                  <a href={filterLink({ page: String(page - 1) })}
                    style={{ padding: '10px 24px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff', textDecoration: 'none', color: 'var(--text)' }}>← Previous</a>
                )}
                {listings.length === PAGE_SIZE && (
                  <a href={filterLink({ page: String(page + 1) })}
                    style={{ padding: '10px 24px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff', textDecoration: 'none', color: 'var(--text)' }}>Next →</a>
                )}
              </div>
            )}
          </>
        )}

        {/* CTA strip */}
        <div style={{ marginTop: 48, background: 'var(--primary-bg)', borderRadius: 12, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Not finding the right home?</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
              {firstName} can set up custom alerts and share off-market opportunities the moment they become available.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={`tel:${agent.phone}`}
              style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '12px 22px', borderRadius: 7, fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Call {firstName}
            </a>
            <a href={ap('/register')}
              style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 22px', borderRadius: 7, fontWeight: 600, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Set Up Home Alerts
            </a>
          </div>
        </div>

        {/* Market overview */}
        {stats.avg_sold_price && (
          <section style={{ marginTop: 40, background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '24px 28px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px', color: 'var(--primary-bg)' }}>
              {shortArea} Market Overview
            </h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.85, fontSize: 14, margin: '0 0 10px' }}>
              There are currently <strong>{stats.active_count.toLocaleString()} active listings</strong> in the area.
              The average sold price over the past 30 days is <strong>{formatPrice(stats.avg_sold_price)}</strong>,
              with homes typically spending <strong>{stats.avg_dom ?? '—'} days</strong> on market before selling.
            </p>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.85, fontSize: 14, margin: 0 }}>
              {stats.sold_last_30_days > 0
                ? `${stats.sold_last_30_days} homes sold in the last 30 days.`
                : 'Use the filters above to narrow your search.'}
            </p>
          </section>
        )}

        {/* Popular searches */}
        <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { l: 'Condos for Sale', h: ap('/search?type=Apartment') },
            { l: 'Townhouses for Sale', h: ap('/search?type=Townhouse') },
            { l: 'Houses for Sale', h: ap('/search?type=House') },
            { l: 'Sold Condos', h: ap('/search?type=Apartment&status=Sold') },
            { l: 'Under $800K', h: ap('/search?max=800000') },
            { l: 'All Homes', h: ap('/homes-for-sale') },
            { l: 'Recently Sold', h: ap('/sold') },
            { l: 'Market Stats', h: ap('/market') },
          ].map(x => (
            <a key={x.l} href={x.h}
              style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>
              {x.l}
            </a>
          ))}
        </div>
      </div>

      <PageQuickLinks slug={slug} exclude="/search" />
    </div>
  )
}
