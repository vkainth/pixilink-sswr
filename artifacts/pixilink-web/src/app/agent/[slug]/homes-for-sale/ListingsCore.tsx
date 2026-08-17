import { playfair } from '@/lib/fonts'
import { preload } from 'react-dom'
import { getAgent, getListings, authMe, getAgentTerritories, getMarketReport, getAgentPriceStory, agentAreaDisplay, agentCanonicalBase, resolveAgentPrefix, getLandingPages } from '@/lib/api'
import PageQuickLinks from '@/components/PageQuickLinks'
import PropertyTypeTrendChart from '@/components/PropertyTypeTrendChart.client'
import type { ListingsParams } from '@/lib/api'
import type { MarketSummary } from '@/lib/types'
import { imgUrl, resolveSiteConfig } from '@/lib/types'
import ListingStrip from '@/components/ListingStrip'
import ListingsTable from '@/components/ListingsTable'
import { SoldPriceBanner } from '@/components/SoldPriceGate'
import NeighbourhoodSoldGate from '@/components/NeighbourhoodSoldGate.client'
import FilterDropdowns from './FilterDropdowns.client'
import FilterNavLink from './FilterNavLink.client'
import { ListingsProgressProvider } from './ListingsProgressContext.client'
import StickyFilterWrapper from './StickyFilterWrapper.client'
import { fromSubareaSlug, subareaDisplayName, normalizeToSubareaSlug } from './subareaUtils'
import { marketBadge } from '@/lib/market'
import { notFound } from 'next/navigation'
import { cookies, headers } from 'next/headers'


const ALLOWED_PER_PAGE = [24, 48, 50, 100, 200, 250] as const
type PerPage = typeof ALLOWED_PER_PAGE[number]

export const TYPE_LABELS: Record<string, { plural: string; singular: string }> = {
  Apartment: { plural: 'Condos', singular: 'Condo' },
  Townhouse: { plural: 'Townhouses', singular: 'Townhouse' },
  House:     { plural: 'Houses', singular: 'House' },
  Duplex:    { plural: 'Duplexes', singular: 'Duplex' },
}

const TYPE_NORM: Record<string, string> = {
  apartment: 'Apartment',
  condo:     'Apartment',
  townhouse: 'Townhouse',
  house:     'House',
  duplex:    'Duplex',
}

export function normalizeType(raw: string): string {
  return TYPE_NORM[raw.toLowerCase()] ?? ''
}

export function shortPrice(n: number): string {
  // Format as millions — round to 1 decimal then check if it's a whole number
  // so $999,500 (0.9995M → rounds to 1.0M) displays as "$1M", not "$1.0M"
  if (n >= 1_000_000) {
    const mRounded = parseFloat((n / 1_000_000).toFixed(1))
    return `$${mRounded % 1 === 0 ? mRounded.toFixed(0) : mRounded.toFixed(1)}M`
  }
  const k = Math.round(n / 1_000)
  // Guard: $999,500 rounds to 1000K — fall through to M formatting instead
  if (k >= 1_000) {
    const mRounded = parseFloat((n / 1_000_000).toFixed(1))
    return `$${mRounded % 1 === 0 ? mRounded.toFixed(0) : mRounded.toFixed(1)}M`
  }
  return `$${k}K`
}

export function buildListingsTitle(sp: Record<string, string>, location: string, agentName: string): string {
  const isSold  = sp.status === 'sold'
  const tl      = TYPE_LABELS[normalizeType(sp.type || '')]
  const beds    = sp.beds ? parseInt(sp.beds) : null
  const minP    = sp.min_price ? parseInt(sp.min_price) : null
  const maxP    = sp.max_price ? parseInt(sp.max_price) : null

  const bedsStr  = beds  ? `${beds}-Bedroom ` : ''
  const noun     = tl ? tl.plural : 'Homes'
  const action   = isSold ? 'Sold' : 'for Sale'

  let priceStr = ''
  if (minP && maxP) priceStr = ` ${shortPrice(minP)}–${shortPrice(maxP)}`
  else if (maxP)    priceStr = ` Under ${shortPrice(maxP)}`
  else if (minP)    priceStr = ` Over ${shortPrice(minP)}`

  return `${bedsStr}${noun} ${action} in ${location}${priceStr} | ${agentName}`
}

export function buildListingsDesc(sp: Record<string, string>, location: string, agentName: string): string {
  const isSold   = sp.status === 'sold'
  const tl       = TYPE_LABELS[normalizeType(sp.type || '')]
  const beds     = sp.beds ? parseInt(sp.beds) : null
  const maxP     = sp.max_price ? parseInt(sp.max_price) : null
  const firstName = agentName.split(' ')[0]

  const typeWord  = tl ? tl.plural.toLowerCase() : 'homes'
  const bedsWord  = beds ? `${beds}-bedroom ` : ''
  const priceWord = maxP ? ` under ${shortPrice(maxP)}` : ''

  if (isSold) {
    return `View ${bedsWord}${typeWord} recently sold in ${location}${priceWord}. Compare sold prices, days on market and real MLS® data with ${agentName}.`
  }
  return `Browse ${bedsWord}${typeWord} for sale in ${location}${priceWord}. Live MLS® listings updated every 5 minutes. Contact ${firstName} to book a private showing.`
}

const TYPE_PAGE_PATHS: Record<string, string> = {
  House:     '/houses-for-sale',
  Apartment: '/condos-for-sale',
  Townhouse: '/townhouses-for-sale',
  Duplex:    '/duplexes-for-sale',
}

const QUICK_SEARCHES: Record<string, Array<{ label: string; params: Record<string, string> }>> = {
  Townhouse: [
    { label: 'Townhouses Under $750K',             params: { max_price: '750000' } },
    { label: '2-Bedroom Townhouses Under $800K',   params: { beds: '2', max_price: '800000' } },
    { label: '2-Bedroom Townhouses Under $900K',   params: { beds: '2', max_price: '900000' } },
    { label: 'Townhouses $800K–$1M',               params: { min_price: '800000', max_price: '1000000' } },
    { label: '3-Bedroom Townhouses $900K–$1.2M',  params: { beds: '3', min_price: '900000', max_price: '1200000' } },
    { label: '3-Bedroom Townhouses $1.1M–$1.5M',  params: { beds: '3', min_price: '1100000', max_price: '1500000' } },
    { label: 'Townhouses $1M–$1.3M',              params: { min_price: '1000000', max_price: '1300000' } },
    { label: '4-Bedroom Townhouses $1.2M–$1.5M',  params: { beds: '4', min_price: '1200000', max_price: '1500000' } },
    { label: '4-Bedroom Townhouses Over $1.5M',   params: { beds: '4', min_price: '1500000' } },
    { label: 'Townhouses Over $1.5M',             params: { min_price: '1500000' } },
  ],
  Apartment: [
    { label: 'Condos Under $500K',                params: { max_price: '500000' } },
    { label: '1-Bedroom Condos Under $600K',       params: { beds: '1', max_price: '600000' } },
    { label: '2-Bedroom Condos Under $700K',       params: { beds: '2', max_price: '700000' } },
    { label: 'Condos $600K–$800K',                params: { min_price: '600000', max_price: '800000' } },
    { label: '2-Bedroom Condos $700K–$900K',      params: { beds: '2', min_price: '700000', max_price: '900000' } },
    { label: '2-Bedroom Condos Over $900K',        params: { beds: '2', min_price: '900000' } },
    { label: 'Condos $800K–$1M',                  params: { min_price: '800000', max_price: '1000000' } },
    { label: '3-Bedroom Condos $900K–$1.2M',      params: { beds: '3', min_price: '900000', max_price: '1200000' } },
    { label: '3-Bedroom Condos Over $1.2M',        params: { beds: '3', min_price: '1200000' } },
    { label: 'Condos Over $1M',                   params: { min_price: '1000000' } },
  ],
  House: [
    { label: 'Houses Under $1.5M',                params: { max_price: '1500000' } },
    { label: '3-Bedroom Houses Under $1.5M',       params: { beds: '3', max_price: '1500000' } },
    { label: '4-Bedroom Houses Under $1.5M',       params: { beds: '4', max_price: '1500000' } },
    { label: 'Houses $1.5M–$2M',                  params: { min_price: '1500000', max_price: '2000000' } },
    { label: '4-Bedroom Houses $1.5M–$2M',        params: { beds: '4', min_price: '1500000', max_price: '2000000' } },
    { label: '4-Bedroom Houses Over $2M',          params: { beds: '4', min_price: '2000000' } },
    { label: '5-Bedroom Houses Over $2M',          params: { beds: '5', min_price: '2000000' } },
    { label: 'Houses $2M–$2.5M',                  params: { min_price: '2000000', max_price: '2500000' } },
    { label: 'Houses Over $2.5M',                 params: { min_price: '2500000' } },
    { label: '5-Bedroom Houses Over $3M',          params: { beds: '5', min_price: '3000000' } },
  ],
}

function getPageNums(cur: number, tot: number): (number | '...')[] {
  if (tot <= 7) return Array.from({ length: tot }, (_, i) => i + 1)
  const set = new Set<number>([1, tot])
  for (let i = Math.max(1, cur - 2); i <= Math.min(tot, cur + 2); i++) set.add(i)
  const sorted = [...set].sort((a, b) => a - b)
  const result: (number | '...')[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...')
    result.push(sorted[i])
  }
  return result
}

interface ListingsCoreProps {
  slug: string
  sp: Record<string, string>
  lockedType?: string       // 'House' | 'Apartment' | 'Townhouse' — locks type, enables market bar + switcher
  seoFooter?: React.ReactNode
  pathSubarea?: string      // subarea slug when encoded in the URL path (e.g. 'elgin-chantrell')
  pathBeds?: string         // beds number as string when encoded in path (e.g. '3')
  pathYear?: string         // year string when encoded in path as built-YYYY (e.g. '2025')
  priceReducedPath?: boolean // true when on a /price-reduced path segment
  suiteParams?: Record<string, string> // baked-in suite filters for pre-searched pages (not shown in FilterDropdowns)
  lockedIntro?: string      // overrides auto-generated intro paragraph
  lockedH1?: string         // overrides auto-generated H1/title base text (e.g. "Houses with Suite for Sale in {location}") for pre-searched suite pages where suiteParams isn't reflected in sp
}

export async function ListingsCore({ slug, sp, lockedType, seoFooter, pathSubarea, pathBeds, pathYear, priceReducedPath, suiteParams, lockedIntro, lockedH1 }: ListingsCoreProps) {
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const jar = await cookies()
  const sessionToken = jar.get('pxl_session')?.value

  const isSold = sp.status === 'sold'

  const type = lockedType ?? normalizeType(sp.type || '')
  const basePath = lockedType ? (TYPE_PAGE_PATHS[lockedType] ?? '/homes-for-sale') : '/homes-for-sale'

  // currentPath includes path-encoded subarea/beds/year/price-reduced so filter links
  // (pagination, view toggle, sort) stay on the correct path rather than falling back
  // to the base type page.
  const currentPath = pathSubarea
    ? (pathBeds
        ? `${basePath}/${pathSubarea}/${pathBeds}-bedrooms`
        : pathYear
        ? `${basePath}/${pathSubarea}/built-${pathYear}`
        : priceReducedPath
        ? `${basePath}/${pathSubarea}/price-reduced`
        : `${basePath}/${pathSubarea}`)
    : priceReducedPath
    ? `${basePath}/price-reduced`
    : basePath

  const beds       = sp.beds         ? parseInt(sp.beds)         : undefined
  const minP       = sp.min_price    ? parseInt(sp.min_price)    : undefined
  const maxP       = sp.max_price    ? parseInt(sp.max_price)    : undefined
  const minYear    = sp.min_year     ? parseInt(sp.min_year)     : undefined
  const minLotSize = sp.min_lot_size ? parseInt(sp.min_lot_size) : undefined
  const sort  = (sp.sort as ListingsParams['sort']) || undefined
  const view  = sp.view === 'list' ? 'list' : 'grid'
  const page  = sp.page ? Math.max(1, parseInt(sp.page)) : 1
  const priceReduced = !isSold && (priceReducedPath || sp.price_reduced === '1')

  const withSuite    = sp.with_suite    === '1' || suiteParams?.with_suite    === '1'
  const twoSuites    = sp.two_suites    === '1' || suiteParams?.two_suites    === '1'
  const coachHome    = sp.coach_home    === '1' || suiteParams?.coach_home    === '1'
  const lanewayHouse = sp.laneway_house === '1' || suiteParams?.laneway_house === '1'
  const legalSuite   = sp.legal_suite   === '1' || suiteParams?.legal_suite   === '1'

  const subareaSlug    = sp.subarea || ''
  const subareaMls     = fromSubareaSlug(subareaSlug)
  const subareaDisplay = subareaSlug ? subareaDisplayName(subareaSlug) : ''

  const rawPP   = parseInt(sp.per_page ?? '')
  const perPage: PerPage = (ALLOWED_PER_PAGE as readonly number[]).includes(rawPP) ? (rawPP as PerPage) : 50

  const fetchMarket = !!(lockedType && !isSold)
  // Top Realtor callout appears on property-type hub pages only (not sold, not subarea sub-pages)
  const fetchTopRealtor = !!(lockedType && !isSold && !pathSubarea)
  // Bottom-of-page SEO section (recently sold + price-reduction narrative) only
  // renders on the first page of active-listing pages — avoids redundant fetches
  // on paginated/sold views where it doesn't apply.
  const fetchBottomSection = !isSold && page === 1

  const [agent, { listings, total }, user, territories, marketReport, recentSold, priceStory, landingPages] = await Promise.all([
    getAgent(slug),
    getListings(slug, {
      status:        isSold ? 'Sold' : 'Active',
      type:          type || undefined,
      subarea:       subareaMls || undefined,
      min_price:     minP,
      max_price:     maxP,
      beds,
      sort,
      page,
      limit:         perPage,
      price_reduced: priceReduced || undefined,
      month:         (isSold && sp.month) ? sp.month : undefined,
      min_year:      minYear,
      min_lot_size:  minLotSize,
      with_suite:    withSuite || undefined,
      two_suites:    twoSuites || undefined,
      coach_home:    coachHome || undefined,
      laneway_house: lanewayHouse || undefined,
      legal_suite:   legalSuite || undefined,
    }),
    sessionToken ? authMe(sessionToken) : Promise.resolve(null),
    getAgentTerritories(slug),
    fetchMarket ? getMarketReport(slug) : Promise.resolve(null),
    fetchBottomSection
      ? getListings(slug, { status: 'Sold', type: type || undefined, subarea: subareaMls || undefined, beds, limit: 6 }).then(r => r.listings)
      : Promise.resolve([]),
    fetchBottomSection ? getAgentPriceStory(slug, subareaMls || undefined) : Promise.resolve(null),
    fetchTopRealtor ? getLandingPages(slug) : Promise.resolve([]),
  ])

  if (!agent) notFound()

  const isShowcase = resolveSiteConfig(agent).layout_preset === 'showcase'

  // Preload the LCP image (first listing card) so the browser discovers it
  // before the JS bundle hydrates. The <img> inside ListingCard already uses
  // fetchPriority="high" + loading="eager" for the priority card, but a
  // <link rel="preload"> in <head> lets the browser start the fetch earlier
  // (during HTML parsing) without waiting for the component JS to execute.
  if (!isSold && listings.length > 0 && listings[0].photo_url) {
    preload(imgUrl(listings[0].photo_url, 400, 248), {
      as: 'image',
      fetchPriority: 'high',
    })
  }

  const totalPages = Math.ceil(total / perPage) || 1
  const isLoggedIn = user?.next_step === 'done'
  const firstName  = agent.name.split(' ')[0]

  const subareas          = agent.settings?.subarea_whitelist ?? []
  const showSubareaFilter = subareas.length > 1

  const shortArea = agentAreaDisplay(territories)

  // Only link to /top-realtor/{city}/{area}/{type} when an area-level landing page
  // actually exists for the territory — never fall back to a city-level page and
  // append the type, as that would construct a route that doesn't exist.
  const TYPE_REALTOR_SLUG: Record<string, string> = {
    House: 'houses',
    Apartment: 'condos',
    Townhouse: 'townhouses',
  }
  const topRealtorUrl = (() => {
    if (!fetchTopRealtor || !lockedType) return null
    const typeSlug = TYPE_REALTOR_SLUG[lockedType] ?? null
    if (!typeSlug || landingPages.length === 0) return null
    const toTopSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    for (const t of territories) {
      if (!t.subarea) continue
      const subareaSlug = toTopSlug(t.subarea)
      const match = landingPages.find(p => p.area_slug === subareaSlug)
      if (match) return `${agentPrefix}/top-realtor/${match.city_slug}/${subareaSlug}/${typeSlug}`
    }
    return null
  })()

  // filterLink builds URLs for pagination, sort, view toggle.
  // It uses currentPath (not basePath) so path-encoded params stay in the path.
  function filterLink(overrides: Record<string, string>) {
    const merged: Record<string, string> = { ...sp, ...overrides }
    if (lockedType) {
      delete merged.type
    } else if (merged.type) {
      merged.type = merged.type.toLowerCase()
    }
    // Strip path-encoded params — they live in the URL path, not the query string
    if (pathSubarea)      delete merged.subarea
    if (pathBeds)         delete merged.beds
    if (pathYear)         delete merged.min_year
    if (priceReducedPath) delete merged.price_reduced

    if (merged.subarea) merged.subarea = normalizeToSubareaSlug(merged.subarea)
    Object.keys(merged).forEach(k => { if (!merged[k]) delete merged[k] })
    const p = new URLSearchParams(merged)
    const q = p.toString()
    return q ? `${agentPrefix}${currentPath}?${q}` : `${agentPrefix}${currentPath}`
  }

  // quickSearchLink builds a clean URL from basePath + given params (ignores current sp)
  function quickSearchLink(params: Record<string, string>): string {
    const clean: Record<string, string> = {}
    Object.entries(params).forEach(([k, v]) => { if (v) clean[k] = v })
    const q = new URLSearchParams(clean).toString()
    return ap(q ? `${basePath}?${q}` : basePath)
  }

  function typeSwitchHref(targetPath: string) {
    const keep: Record<string, string> = {}
    if (sp.beds)      keep.beds      = sp.beds
    if (sp.min_price) keep.min_price = sp.min_price
    if (sp.max_price) keep.max_price = sp.max_price
    if (sp.subarea)   keep.subarea   = normalizeToSubareaSlug(sp.subarea)
    if (sp.status)    keep.status    = sp.status
    const q = new URLSearchParams(keep).toString()
    return q ? `${targetPath}?${q}` : targetPath
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-block', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 500,
    background: active ? 'var(--primary-bg)' : '#fff', color: active ? '#fff' : 'var(--text)',
    border: `1px solid ${active ? 'var(--primary-bg)' : 'var(--border)'}`, textDecoration: 'none',
  })

  const location       = subareaDisplay || shortArea
  const normalizedSp   = { ...sp, ...(type ? { type: type.toLowerCase() } : {}) }

  function fmtMonth(m: string): string {
    const [y, mo] = m.split('-')
    const d = new Date(Number(y), Number(mo) - 1, 1)
    return d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
  }
  const activeMonth = isSold && sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : null
  const monthLabel  = activeMonth ? fmtMonth(activeMonth) : null

  // Suite-filter label — only used when a suite toggle is active via ?param=1
  // (not on the dedicated /laneway-house, /with-suite, etc. path pages which
  // supply lockedH1 directly, so this branch is unreachable there).
  const suiteLabel = lanewayHouse
    ? `Laneway Houses`
    : legalSuite
    ? `Houses with Legal Suite`
    : coachHome
    ? `Houses with Coach Home`
    : twoSuites
    ? `Houses with Two Suites`
    : withSuite
    ? `Houses with Suite`
    : null

  // Price range suffix — appended to suite-context H1s (both the suiteLabel
  // query-param branch AND lockedH1 on dedicated suite path pages like
  // /with-suite, /legal-suite, /coach-home, /laneway-house) when price filters
  // are active. Mirrors the format in buildListingsTitle for consistency.
  // e.g. "Houses with Suite for Sale in South Surrey $800K–$1.1M"
  const suitePriceStr = minP && maxP
    ? ` ${shortPrice(minP)}–${shortPrice(maxP)}`
    : maxP ? ` Under ${shortPrice(maxP)}`
    : minP ? ` Over ${shortPrice(minP)}`
    : ''

  const baseTitle      = lockedH1
    ? `${lockedH1}${suitePriceStr}`
    : priceReducedPath
    ? `Price Reduced ${TYPE_LABELS[type]?.plural ?? 'Homes'} for Sale in ${location}`
    : monthLabel
    ? `${TYPE_LABELS[normalizeType(sp.type || '')]?.plural ?? 'Homes'} Sold in ${monthLabel} — ${location}`
    : (pathYear || minYear)
    ? `New ${TYPE_LABELS[type]?.plural ?? 'Homes'} (Built ${pathYear ?? String(minYear)}+) for Sale in ${location}`
    : suiteLabel
    ? `${suiteLabel} for Sale in ${location}${suitePriceStr}`
    : buildListingsTitle(normalizedSp, location, '').replace(/\s*\|.*$/, '')
  const h1             = total > 0 ? `${total.toLocaleString()} ${baseTitle}` : baseTitle
  const agentDisplayName = agent.name
  const agentFirstName   = agent.name.split(' ')[0]

  // Derives real, page-level signals from the actual listings returned for
  // this query (price range + most common styles) so intro copy can cite
  // facts from the current result set instead of generic boilerplate.
  function listingSignals(): { minPrice: number | null; maxPrice: number | null; topStyles: string[] } | null {
    if (!listings || listings.length === 0) return null
    const prices = listings
      .map(l => (isSold ? l.sold_price : l.list_price))
      .filter((p): p is number => typeof p === 'number' && p > 0)
    const minPrice = prices.length ? Math.min(...prices) : null
    const maxPrice = prices.length ? Math.max(...prices) : null
    const styleCounts = new Map<string, number>()
    listings.forEach(l => {
      if (l.style) styleCounts.set(l.style, (styleCounts.get(l.style) ?? 0) + 1)
    })
    const topStyles = [...styleCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([s]) => s)
    return { minPrice, maxPrice, topStyles }
  }

  // Year-built price tier breakdown — only on unfiltered type-locked active pages (page 1).
  // Three parallel sold-listing calls each target a different year bucket via min_year;
  // results are trimmed client-side to the exact range so buckets don't overlap.
  // Only displayed when all three buckets have at least 3 sales with known sold prices.
  let yearTierLine = ''
  const fetchYearTiers = lockedType && !isSold && page === 1
    && !sp.beds && !sp.min_price && !sp.max_price
  if (fetchYearTiers) {
    try {
      const [rawNew, rawRecent, rawAll] = await Promise.all([
        getListings(slug, { status: 'Sold', type: lockedType, min_year: 2024, limit: 50 }).then(r => r.listings),
        getListings(slug, { status: 'Sold', type: lockedType, min_year: 2020, limit: 50 }).then(r => r.listings),
        getListings(slug, { status: 'Sold', type: lockedType, limit: 50 }).then(r => r.listings),
      ])
      // Trim each raw result to its exact year range so buckets don't overlap
      const newBucket    = rawNew.filter(l => typeof l.year_built === 'number' && l.year_built >= 2024)
      const recentBucket = rawRecent.filter(l => typeof l.year_built === 'number' && l.year_built >= 2020 && l.year_built <= 2023)
      const estBucket    = rawAll.filter(l => typeof l.year_built === 'number' && l.year_built > 0 && l.year_built < 2020)
      const avgSold = (ls: typeof rawNew): number | null => {
        const prices = ls.map(l => l.sold_price).filter((p): p is number => typeof p === 'number' && p > 0)
        return prices.length >= 3 ? prices.reduce((a, b) => a + b, 0) / prices.length : null
      }
      const newAvg    = avgSold(newBucket)
      const recentAvg = avgSold(recentBucket)
      const estAvg    = avgSold(estBucket)
      if (newAvg !== null && recentAvg !== null && estAvg !== null) {
        yearTierLine = ` New (2024+) avg ${shortPrice(newAvg)} · 2–5 yrs ${shortPrice(recentAvg)} · 5+ yrs ${shortPrice(estAvg)}.`
      }
    } catch {
      // non-critical — intro renders without the tier breakdown
    }
  }

  function cap(s: string): string {
    return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s
  }

  function buildListingsIntro(count: number): string {
    const tl       = TYPE_LABELS[type]
    const typeWord = tl ? tl.plural.toLowerCase() : 'homes'
    const bedsWord = sp.beds ? `${sp.beds}-bedroom ` : ''
    const signals  = listingSignals()
    const rangeClause = signals?.minPrice && signals?.maxPrice
      ? ` Current listings on this page range from ${shortPrice(signals.minPrice)} to ${shortPrice(signals.maxPrice)}.`
      : ''
    const styleClause = signals && signals.topStyles.length > 0
      ? ` Common styles here include ${signals.topStyles.join(' and ')}.`
      : ''

    if (pathYear || minYear) {
      const yearVal = pathYear ?? String(minYear)
      const countClause = count > 0
        ? `${count.toLocaleString()} new ${bedsWord}${typeWord} built ${yearVal} or later currently listed`
        : `No new ${bedsWord}${typeWord} built ${yearVal} or later currently active`
      return `New construction ${bedsWord}${typeWord} built ${yearVal} or later in ${location}. ${countClause}.${rangeClause} Live MLS® data, updated every 5 minutes.`
    }
    if (priceReducedPath) {
      return `Price-reduced ${bedsWord}${typeWord} for sale in ${location}. These are motivated sellers — price drops, reduced listings, and below-asking opportunities. ${count > 0 ? `${count.toLocaleString()} price-reduced ${typeWord}` : `No price-reduced ${typeWord}`} currently available.${rangeClause} Live MLS® data updated every 5 minutes.`
    }
    if (isSold) {
      if (monthLabel) {
        const suffix = count > 0 ? `${count.toLocaleString()} ${bedsWord}${typeWord} sold in ${monthLabel}` : `No ${bedsWord}${typeWord} found for ${monthLabel}`
        return cap(`${bedsWord}${typeWord} sold in ${location} — ${suffix}. View sold prices, days on market and real MLS® data with ${agentDisplayName}.`)
      }
      return buildListingsDesc({ ...normalizedSp, status: 'sold' }, location, agentDisplayName)
    }
    if (subareaDisplay) {
      const countClause = count > 0
        ? `${count.toLocaleString()} ${bedsWord}${typeWord} currently listed in ${subareaDisplay}, ${shortArea}`
        : `No ${bedsWord}${typeWord} currently active in ${subareaDisplay}, ${shortArea}`
      return cap(`${bedsWord}${typeWord} for sale in ${subareaDisplay}, ${shortArea}. ${countClause}.${rangeClause}${styleClause} ${agentDisplayName} specializes in this area.`)
    }
    if (type && !sp.beds && !sp.min_price && !sp.max_price && typeStats) {
      const marketClause = typeStats.avg_sold_price > 0
        ? ` The avg recent sale is ${shortPrice(typeStats.avg_sold_price)} — ${typeStats.sold_30d} sold last 30 days${typeStats.avg_dom > 0 ? `, avg ${Math.round(typeStats.avg_dom)} days on market` : ''}.`
        : ''
      const neighbourhoodHint = `${agentFirstName} covers ${type === 'House' ? 'detached homes' : type === 'Apartment' ? 'condos' : type === 'Townhouse' ? 'townhome communities' : 'all property types'} across ${shortArea}.`
      return cap(`${typeWord} for sale in ${shortArea}: ${count > 0 ? `${count.toLocaleString()} ${typeWord} currently listed` : `no ${typeWord} currently listed`}.${marketClause}${yearTierLine}${rangeClause}${styleClause} ${neighbourhoodHint}`)
    }
    if (type || sp.beds) {
      const countClause = count > 0 ? `${count.toLocaleString()} ${bedsWord}${typeWord} currently active` : 'no properties currently active'
      return cap(`${bedsWord}${typeWord} for sale in ${shortArea}: ${countClause} across ${agentFirstName}'s territory.${rangeClause}${styleClause} Live MLS® data, updated every 5 minutes.`)
    }
    return `${agentDisplayName} represents buyers and sellers across ${shortArea}. Browse all ${count > 0 ? `${count.toLocaleString()} ` : ''}active MLS® listings below, updated every 5 minutes.`
  }
  const domain   = agentCanonicalBase(agent)
  const pageNums = totalPages > 1 ? getPageNums(page, totalPages) : []

  let typeStats: MarketSummary | null = null
  let typeBadge: ReturnType<typeof marketBadge> | null = null
  if (marketReport && lockedType && !isSold) {
    const row = marketReport.by_type.find(r => r.type === lockedType) ?? marketReport.overall
    typeStats = row
    typeBadge = marketBadge(row.market_type)
  }

  const pageDesc = lockedIntro ?? buildListingsIntro(total)

  const typeSwitcher = [
    { label: 'All Homes',   path: '/homes-for-sale',      type: null },
    { label: 'Condos',      path: '/condos-for-sale',     type: 'Apartment' },
    { label: 'Townhouses',  path: '/townhouses-for-sale', type: 'Townhouse' },
    { label: 'Houses',      path: '/houses-for-sale',     type: 'House' },
  ]

  const pgBtnBase: React.CSSProperties = {
    padding: '8px 13px', border: '1px solid var(--border)', borderRadius: 6,
    fontSize: 13, background: '#fff', textDecoration: 'none',
    color: 'var(--text)', minWidth: 36, textAlign: 'center' as const, display: 'inline-block',
  }
  const pgBtnActive: React.CSSProperties = {
    ...pgBtnBase,
    background: 'var(--primary-bg)', color: '#fff',
    border: '1px solid var(--primary-bg)', fontWeight: 700,
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `https://${domain}/` },
      { '@type': 'ListItem', position: 2, name: isSold ? 'Recently Sold' : `${TYPE_LABELS[type]?.plural ?? 'Homes'} for Sale`, item: `https://${domain}${basePath}` },
      ...(pathSubarea ? [{ '@type': 'ListItem', position: 3, name: subareaDisplay, item: `https://${domain}${basePath}/${pathSubarea}` }] : []),
      ...(priceReducedPath && !pathSubarea ? [{ '@type': 'ListItem', position: 3, name: 'Price Reduced', item: `https://${domain}${basePath}/price-reduced` }] : []),
      ...(priceReducedPath && pathSubarea ? [{ '@type': 'ListItem', position: 4, name: 'Price Reduced', item: `https://${domain}${basePath}/${pathSubarea}/price-reduced` }] : []),
    ],
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SearchResultsPage',
    name: buildListingsTitle(normalizedSp, location, agent.name),
    description: pageDesc,
    url: `https://${domain}${currentPath}`,
    numberOfItems: total,
    provider: {
      '@type': 'RealEstateAgent',
      name: agent.name,
      telephone: agent.phone,
      areaServed: location,
    },
    ...(listings.length > 0 && {
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: total,
        itemListElement: listings.slice(0, 10).map((l, i) => ({
          '@type': 'ListItem',
          position: (page - 1) * perPage + i + 1,
          item: {
            '@type': 'RealEstateListing',
            name: l.address,
            url: `https://${domain}/${isSold ? 'sold' : 'listing'}/${l.mls_no}`,
            numberOfRooms: l.beds,
            floorSize: l.sqft ? { '@type': 'QuantitativeValue', value: l.sqft, unitCode: 'FTK' } : undefined,
            ...(l.list_price ? { offers: { '@type': 'Offer', price: l.list_price, priceCurrency: 'CAD' } } : {}),
            ...(l.photo_url ? { image: l.photo_url } : {}),
          },
        })),
      },
    }),
  }

  // FAQPage schema + visible accordion — AEO coverage for search/listing pages.
  // Skipped for /sold pages (buildListingsIntro already covers sold-specific
  // copy and "is there inventory" framing doesn't apply the same way there).
  function buildFaqs(count: number): { q: string; a: string }[] {
    const tl        = TYPE_LABELS[type]
    const typeWord  = tl ? tl.plural.toLowerCase() : 'homes'
    const typeSing  = tl ? tl.singular.toLowerCase() : 'home'
    const bedsWord  = sp.beds ? `${sp.beds}-bedroom ` : ''
    const areaName  = location

    if (priceReducedPath) {
      return [
        {
          q: `Are there price-reduced ${typeWord} for sale in ${areaName}?`,
          a: count > 0
            ? `Yes — there are currently ${count.toLocaleString()} ${typeWord} in ${areaName} with a recent price reduction, based on live MLS® data updated every 5 minutes.`
            : `Not right now — there are no ${typeWord} in ${areaName} with a recent price reduction at this moment. Price drops happen daily; ${agentFirstName} can set up an alert so you hear about the next one immediately.`,
        },
        {
          q: `What does "price reduced" mean on an MLS® listing?`,
          a: `A price-reduced listing is one where the seller has lowered the asking price at least once since it was originally listed — often a sign of a motivated seller and room to negotiate below the current asking price.`,
        },
        {
          q: `How do I get notified about new price drops in ${areaName}?`,
          a: `${agentDisplayName} can set up a saved search alert that notifies you the moment a ${typeSing} in ${areaName} gets a price reduction. Call ${agent!.phone} to set one up.`,
        },
      ]
    }

    if (count === 0) {
      return [
        {
          q: `Are there any ${bedsWord}${typeWord} for sale in ${areaName} right now?`,
          a: `There are currently no ${bedsWord}${typeWord} actively listed for sale in ${areaName}. Inventory changes daily on MLS® — ${agentFirstName} can set up an instant alert so you're notified the moment a matching property lists, and can share off-market opportunities in the meantime.`,
        },
        {
          q: `How current are the listings on this page?`,
          a: `Listings pull directly from MLS® and refresh every 5 minutes, so this page reflects live, real-time inventory rather than a cached snapshot — it isn't a display bug, ${areaName} simply has no active matching inventory at the moment.`,
        },
        {
          q: `What should I do if there's no inventory matching my search?`,
          a: `Set up a saved search alert with ${agentDisplayName} to be notified the moment a matching ${typeSing} lists, or broaden your search by trying nearby neighbourhoods or a different bedroom count. Call ${agent!.phone} for personalized options.`,
        },
      ]
    }

    return [
      {
        q: `How many ${bedsWord}${typeWord} are for sale in ${areaName}?`,
        a: `There are currently ${count.toLocaleString()} ${bedsWord}${typeWord} actively listed for sale in ${areaName}, based on live MLS® data that refreshes every 5 minutes.`,
      },
      {
        q: `What is the price range for ${bedsWord}${typeWord} in ${areaName}?`,
        a: `Prices vary by building, lot size, condition, and proximity to amenities. Browse the current listings above for real asking prices, or contact ${agentDisplayName} for a personalized price range based on your must-haves.`,
      },
      {
        q: `Who can help me buy a ${typeSing} in ${areaName}?`,
        a: `${agentDisplayName} specializes in ${areaName} and the surrounding area, and can arrange private showings, provide comparable sales data, and guide you through making an offer. Call ${agent!.phone} to get started.`,
      },
    ]
  }

  const faqs = isSold ? [] : buildFaqs(total)
  const faqJsonLd = faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  } : null

  return (
    <ListingsProgressProvider>
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}
      <style>{`
        @media (max-width: 640px) { .pg-numbered { display: none !important; } .pg-mobile { display: flex !important; } }
        @media (min-width: 641px) { .pg-mobile { display: none !important; } }
      `}</style>

      {/* Header */}
      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>
            {isSold ? 'Recently Sold' : priceReducedPath ? 'Price Reduced Homes' : 'Homes For Sale'}
          </div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(28px,4.5vw,52px)', fontWeight: 400, lineHeight: 1.15, margin: 0, color: '#1a1a1a' }}>{h1}</h1>
          <p style={{ color: '#555', marginTop: 14, fontSize: 15, maxWidth: 720, lineHeight: 1.75 }}>
            {pageDesc}
          </p>
        </div>
      </div>

      {/* Type switcher pill row — all listing pages */}
      {(
        <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
          <div className="container">
            <div style={{ display: 'inline-flex', background: '#f9fafb', border: '1px solid var(--border)', borderRadius: 24, padding: 3, gap: 2 }}>
              {typeSwitcher.map(item => {
                const isActive = item.type === (lockedType ?? null)
                return (
                  <FilterNavLink
                    key={item.label}
                    href={ap(typeSwitchHref(item.path))}
                    style={{
                      padding: '6px 18px', fontWeight: isActive ? 700 : 500, fontSize: 13,
                      background: isActive ? '#1a1a1a' : 'transparent',
                      color: isActive ? '#fff' : '#555',
                      borderRadius: 20, textDecoration: 'none', display: 'inline-block',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.label}
                  </FilterNavLink>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Compact market stats bar — only when type is locked + data available */}
      {typeStats && typeBadge && !isSold && (
        <div style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}>
          <style>{`
            @media (max-width: 767px) {
              .stats-bar-link { display: none !important; }
              .stats-bar-dot  { display: none !important; }
              .stats-bar-row  { gap: 8px !important; }
            }
          `}</style>
          <div className="container" style={{ padding: '10px var(--container-padding)' }}>
            <div className="stats-bar-row" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'nowrap' }}>
              <span style={{
                background: typeBadge.bg, color: typeBadge.color,
                padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {typeBadge.label}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                <strong style={{ color: 'var(--text)' }}>{typeStats.active}</strong> active
              </span>
              <span className="stats-bar-dot" style={{ color: 'var(--border)', userSelect: 'none', flexShrink: 0 }}>·</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                <strong style={{ color: 'var(--text)' }}>{typeStats.sold_30d}</strong> sold / 30d
              </span>
              <a
                className="stats-bar-link"
                href={ap('/market')}
                style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                Full market report →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Filters — sticky below nav */}
      <StickyFilterWrapper>
        <FilterDropdowns
          params={sp}
          isSold={isSold}
          showSubareaFilter={showSubareaFilter}
          subareas={subareas}
          lockedType={lockedType}
          pathSubarea={pathSubarea}
          pathBeds={pathBeds}
          priceReducedPath={priceReducedPath}
        />
      </StickyFilterWrapper>

      {/* Results */}
      <div className="container" style={{ padding: '28px var(--container-padding) 48px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {listings.length === 0
              ? 'No homes found'
              : (
                <>
                  <strong style={{ color: 'var(--text)' }}>{total.toLocaleString()}</strong>
                  {' '}home{total !== 1 ? 's' : ''}
                  {totalPages > 1 && <> — Page {page} of {totalPages}</>}
                </>
              )}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <FilterNavLink href={filterLink({ view: '' })} style={chipStyle(view === 'grid')}>Grid</FilterNavLink>
            <FilterNavLink href={filterLink({ view: 'list' })} style={chipStyle(view === 'list')}>List</FilterNavLink>
          </div>
        </div>

        {listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 18, marginBottom: 12 }}>No homes match these filters.</p>
            <a href={ap(`${basePath}${isSold ? '?status=sold' : ''}`)} style={{ color: 'var(--accent)', fontWeight: 600 }}>Clear filters</a>
          </div>
        ) : (
          <>
            {view === 'list' ? (
              <ListingsTable
                rows={listings}
                isSold={isSold}
                isLoggedIn={isLoggedIn}
                slug={slug}
                type={type}
                sort={sp.sort || ''}
                sortHref={(v) => filterLink({ sort: v, page: '' })}
              />
            ) : (
              <ListingStrip listings={listings} isLoggedIn={isLoggedIn} />
            )}

            {isSold && !isLoggedIn && (
              <SoldPriceBanner city={subareaDisplay || shortArea} slug={slug} agentPrefix={agentPrefix} />
            )}

            {totalPages > 1 && (
              <div style={{ marginTop: 48 }}>
                <div className="pg-numbered" style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                  {page > 1 && (
                    <FilterNavLink href={filterLink({ page: String(page - 1) })} style={pgBtnBase}>«</FilterNavLink>
                  )}
                  {pageNums.map((n, i) =>
                    n === '...'
                      ? <span key={`el-${i}`} style={{ padding: '8px 4px', fontSize: 13, color: 'var(--text-muted)' }}>…</span>
                      : <FilterNavLink key={n} href={filterLink({ page: String(n) })} style={n === page ? pgBtnActive : pgBtnBase}>{n}</FilterNavLink>
                  )}
                  {page < totalPages && (
                    <FilterNavLink href={filterLink({ page: String(page + 1) })} style={pgBtnBase}>»</FilterNavLink>
                  )}
                </div>
                <div className="pg-mobile" style={{ display: 'none', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
                  {page > 1 && (
                    <FilterNavLink href={filterLink({ page: String(page - 1) })}
                      style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff', textDecoration: 'none', color: 'var(--text)' }}>← Prev</FilterNavLink>
                  )}
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {page} / {totalPages}</span>
                  {page < totalPages && (
                    <FilterNavLink href={filterLink({ page: String(page + 1) })}
                      style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff', textDecoration: 'none', color: 'var(--text)' }}>Next →</FilterNavLink>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Quick Searches — only on hub type pages, not subarea/beds sub-pages, not sold */}
        {lockedType && !isSold && !pathSubarea && !pathBeds && QUICK_SEARCHES[lockedType] && (
          <div style={{ marginTop: 40, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', fontWeight: 600, marginBottom: 14 }}>
              Quick Searches
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {QUICK_SEARCHES[lockedType].map(chip => (
                <FilterNavLink
                  key={chip.label}
                  href={quickSearchLink(chip.params)}
                  style={{
                    display: 'inline-block', padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: 'rgba(201,168,76,0.10)', color: 'var(--accent)',
                    border: '1px solid rgba(201,168,76,0.28)', textDecoration: 'none', whiteSpace: 'nowrap',
                  }}
                >
                  {chip.label}
                </FilterNavLink>
              ))}
            </div>
          </div>
        )}

        {/* Suite / Mortgage Helper searches — House and Townhouse hub pages only */}
        {lockedType && (lockedType === 'House' || lockedType === 'Townhouse') && !isSold && !pathSubarea && !pathBeds && (
          <div style={{ marginTop: 16, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7c3aed', fontWeight: 600, marginBottom: 14 }}>
              Suite &amp; Mortgage Helper
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {lockedType === 'House' && ([
                { label: 'With Suite',       href: ap('/houses-for-sale/with-suite') },
                { label: 'Legal Suite',      href: ap('/houses-for-sale/legal-suite') },
                { label: 'Mortgage Helper',  href: ap('/houses-for-sale/mortgage-helper') },
                { label: 'Coach Home',       href: ap('/houses-for-sale/coach-home') },
                { label: 'Laneway House',    href: ap('/houses-for-sale/laneway-house') },
              ].map(chip => (
                <FilterNavLink
                  key={chip.label}
                  href={chip.href}
                  style={{
                    display: 'inline-block', padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: 'rgba(124,58,237,0.08)', color: '#7c3aed',
                    border: '1px solid rgba(124,58,237,0.25)', textDecoration: 'none', whiteSpace: 'nowrap',
                  }}
                >
                  {chip.label}
                </FilterNavLink>
              )))}
              {lockedType === 'Townhouse' && (
                <FilterNavLink
                  href={ap('/townhouses-for-sale/with-suite')}
                  style={{
                    display: 'inline-block', padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: 'rgba(124,58,237,0.08)', color: '#7c3aed',
                    border: '1px solid rgba(124,58,237,0.25)', textDecoration: 'none', whiteSpace: 'nowrap',
                  }}
                >
                  Townhouses with Suite
                </FilterNavLink>
              )}
            </div>
          </div>
        )}

        {/* Market stats + trend chart — hub type pages only, not sold, not subarea/beds sub-pages */}
        {lockedType && !isSold && !pathSubarea && !pathBeds && typeStats && (
          <section style={{ marginTop: 48 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 16px' }}>
              {shortArea} {TYPE_LABELS[lockedType]?.singular ?? lockedType} Market
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {[
                { label: 'Homes For Sale', value: typeStats.active.toLocaleString() },
                { label: 'Avg Sold Price',  value: typeStats.avg_sold_price > 0 ? shortPrice(typeStats.avg_sold_price) : '—' },
                {
                  label: 'Avg $/sqft',
                  value: (() => {
                    const ppsf = (typeStats as unknown as Record<string, unknown>).avg_per_sqft
                    return ppsf && Number(ppsf) > 0 ? `$${Math.round(Number(ppsf))}` : '—'
                  })(),
                },
                { label: 'Avg Days on Market', value: typeStats.avg_dom > 0 ? `${Math.round(typeStats.avg_dom)} days` : '—' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)' }}>{s.value}</div>
                </div>
              ))}
            </div>
            {marketReport && marketReport.monthly_trend_by_type.length > 0 && (
              <PropertyTypeTrendChart data={marketReport.monthly_trend_by_type} lockedType={lockedType} />
            )}
          </section>
        )}

        {/* Browse by Neighbourhood — hub type pages only, not on subarea sub-pages, not sold */}
        {lockedType && !isSold && !pathSubarea && subareas && subareas.length > 0 && (
          <section style={{ marginTop: 40, background: '#f7f8f9', border: '1px solid var(--border)', borderRadius: 12, padding: '22px 24px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 14px' }}>
              Browse {TYPE_LABELS[lockedType]?.plural ?? lockedType} by Neighbourhood
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {subareas.map(mls => {
                const saSlug = normalizeToSubareaSlug(mls)
                const saName = subareaDisplayName(mls)
                return (
                  <FilterNavLink
                    key={saSlug}
                    href={ap(`${basePath}/${saSlug}`)}
                    style={{
                      background: '#fff', border: '1px solid var(--border)', color: 'var(--text)',
                      padding: '9px 16px', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 500,
                    }}
                  >
                    {saName} →
                  </FilterNavLink>
                )
              })}
            </div>
          </section>
        )}

        {/* Top Realtor callout — property type hub pages only */}
        {topRealtorUrl && (
          <section style={{ marginTop: 40, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>Local Expert</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 4 }}>
                Top {TYPE_LABELS[lockedType!]?.plural ?? lockedType} Specialist in {shortArea}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                See why {firstName} is a trusted {(TYPE_LABELS[lockedType!]?.singular ?? lockedType)?.toLowerCase()} agent in {shortArea}.
              </div>
            </div>
            <a href={topRealtorUrl} style={{ display: 'inline-block', background: 'var(--primary-bg)', color: '#fff', padding: '10px 18px', borderRadius: 7, fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Meet {firstName} →
            </a>
          </section>
        )}

        {/* Agent CTA strip */}
        <div style={{ marginTop: 48, background: 'var(--primary-bg)', borderRadius: 12, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
              {isSold ? 'Thinking of selling?' : 'Not seeing the right home?'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
              {isSold
                ? `${firstName} can provide a free home evaluation based on current sold data in your neighbourhood.`
                : `${firstName} can set up custom alerts and share off-market opportunities the moment they list.`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={`tel:${agent.phone}`} style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '12px 22px', borderRadius: 7, fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>📞 {agent.phone}</a>
            <a href={ap('/home-evaluation')} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 22px', borderRadius: 7, fontWeight: 600, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>What&apos;s my home worth?</a>
          </div>
        </div>

        {/* FAQ accordion — visible counterpart to the FAQPage schema above */}
        {faqs.length > 0 && (
          <section style={{ marginTop: 40, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 28px' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', fontWeight: 600, marginBottom: 18 }}>
              Common Questions
            </div>
            {faqs.map(({ q, a }) => (
              <details key={q} style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
                <summary style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--primary-bg)' }}>{q}</summary>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.75, marginTop: 10 }}>{a}</p>
              </details>
            ))}
          </section>
        )}

        {/* Internal cross-links */}
        <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { l: 'All Homes',              h: ap('/homes-for-sale') },
            { l: 'Condos for Sale',           h: ap('/condos-for-sale') },
            { l: 'Townhouses for Sale',       h: ap('/townhouses-for-sale') },
            { l: 'Houses for Sale',           h: ap('/houses-for-sale') },
            { l: 'Luxury Homes for Sale',     h: ap('/luxury-homes') },
            { l: 'Ocean View Homes',          h: ap('/ocean-view-homes') },
            { l: 'Recently Sold',             h: ap('/sold') },
            ...(!isShowcase ? [{ l: 'Condo Buildings', h: ap('/buildings') }] : []),
          ].map(x => (
            <a key={x.l} href={x.h} style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>{x.l}</a>
          ))}
        </div>

        {/* Local-area context + recently sold + one factual price-reduction narrative — active pages, page 1 only */}
        {fetchBottomSection && (
          <section style={{ marginTop: 48 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 16px' }}>
              Living in {location}
            </h2>
            <p style={{ fontSize: 14.5, color: '#4b5563', lineHeight: 1.8, maxWidth: 760, marginBottom: priceStory ? 16 : 0 }}>
              {location} is part of {shortArea}, an area known for its mix of established neighbourhoods and family-friendly
              amenities. Local public and independent schools, parks, shopping, and transit connections all factor into value
              here — {agentFirstName} can walk you through which schools and amenities serve a specific address before you buy.
            </p>
            {priceStory && (priceStory.status !== 'Sold' || isLoggedIn) && (
              <p style={{ fontSize: 14.5, color: '#4b5563', lineHeight: 1.8, maxWidth: 760, background: '#f8f7f4', border: '1px solid #e8e4dc', borderRadius: 8, padding: '16px 20px' }}>
                <strong style={{ color: '#1a1a1a' }}>Recent market activity: </strong>
                {priceStory.address ? `${priceStory.address}` : `A ${priceStory.status === 'Sold' ? 'sold' : 'listed'} property`}
                {priceStory.subarea ? ` in ${priceStory.subarea}` : ''} was originally listed at {shortPrice(priceStory.original_price)}
                {priceStory.reduction_count > 1
                  ? `, reduced ${priceStory.reduction_count} times`
                  : ', reduced'}
                {' '}to {shortPrice(priceStory.final_price)}
                {priceStory.status === 'Sold' ? ' before selling' : ' and remains active'} — a real example of the kind of
                negotiating room {agentFirstName} watches for on behalf of buyers.
              </p>
            )}
            {priceStory && priceStory.status === 'Sold' && !isLoggedIn && (
              <p style={{ fontSize: 14.5, color: '#4b5563', lineHeight: 1.8, maxWidth: 760, background: '#f8f7f4', border: '1px solid #e8e4dc', borderRadius: 8, padding: '16px 20px' }}>
                <strong style={{ color: '#1a1a1a' }}>Recent market activity: </strong>
                {priceStory.address ? `${priceStory.address}` : 'A sold property'}
                {priceStory.subarea ? ` in ${priceStory.subarea}` : ''} was originally listed at {shortPrice(priceStory.original_price)}
                {priceStory.reduction_count > 1
                  ? `, reduced ${priceStory.reduction_count} times`
                  : ', reduced'}
                {' '}before selling — a real example of the kind of negotiating room {agentFirstName} watches for
                on behalf of buyers.{' '}
                <a href={ap('/sign-in')} style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'underline' }}>
                  Sign in to see the final sold price.
                </a>
              </p>
            )}
            {recentSold.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-bg)', margin: '0 0 14px' }}>
                  Recently Sold {subareaDisplay ? `in ${subareaDisplay}` : `Near ${shortArea}`}
                </h3>
                <NeighbourhoodSoldGate
                  listings={recentSold}
                  agentSlug={slug}
                  agentPrefix={agentPrefix}
                  city={subareaDisplay || shortArea}
                />
              </div>
            )}
          </section>
        )}
      </div>
      {seoFooter && !isSold && page === 1 && (
        <div className="container" style={{ padding: '0 var(--container-padding) 64px' }}>
          {seoFooter}
        </div>
      )}
      <PageQuickLinks slug={slug} context="search" />
    </div>
    </ListingsProgressProvider>
  )
}
