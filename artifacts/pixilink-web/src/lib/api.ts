import { cache } from 'react'
import type {
  AgentProfile,
  AgentListing,
  AgentBuilding,
  MarketStats,
  AgentTestimonial,
  BuildingDetail,
  ListingDetail,
  NeighbourhoodSummary,
  NeighbourhoodDetail,
  MonthlyTrendPoint,
  MarketReport,
  TopRealtor,
  HomeData,
  AgentPage,
  AgentAward,
  AgentMedia,
  TeamMember,
  NewsList,
  NewsPost,
  OpenHouseItem,
  PriceMatrix,
  MarketBreakdown,
  NeighbourhoodAiContent,
  AreaIntroContent,
  LandingPage,
  AgentSoldStats,
  SchoolCatchmentSummary,
  SchoolCatchmentDetail,
  AreaComparison,
  BestOfList,
  PriceStory,
} from './types'
import {
  AGENT_FALLBACKS,
  FALLBACK_LISTINGS,
  FALLBACK_SOLD_LISTINGS,
  FALLBACK_BUILDINGS,
  FALLBACK_STATS,
  FALLBACK_TESTIMONIALS,
  FALLBACK_NEIGHBOURHOODS,
  FALLBACK_NEIGHBOURHOOD_DETAILS,
  FALLBACK_MARKET_REPORT,
  FALLBACK_PAGES,
  FALLBACK_AWARDS,
  FALLBACK_MEDIA,
  FALLBACK_TEAM,
  FALLBACK_NEWS,
  FALLBACK_OPEN_HOUSES,
  FALLBACK_PRICE_MATRIX,
} from './fallback'

const LARAVEL_URL = process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_INTERNAL_URL = process.env.LARAVEL_INTERNAL_URL || LARAVEL_URL
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null

function laravelHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' }
  if (LARAVEL_HOST) h['Host'] = LARAVEL_HOST
  return h
}

async function laravelFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const signal = opts.signal ?? AbortSignal.timeout(4000)
  return fetch(`${LARAVEL_URL}${path}`, {
    ...opts,
    signal,
    headers: { ...laravelHeaders(), ...((opts.headers as Record<string, string>) || {}) },
  })
}

// Maps internal agent slug → region preview prefix (for website.pixilink.com/path-mode agents).
// Custom-domain agents (e.g. sharene → shareneshuster.com) are in this map during staging;
// once the custom domain is live, agentCanonicalBase() uses custom_domain first (takes priority).
const RESIDENCITY_SLUG_MAP: Record<string, string> = {
  'tricity': 'tricity',
  'saeed-farhani-ppqu': 'burnaby',
  'sharene': 'sharene',
}

/**
 * Returns the canonical base (domain + optional path prefix) for an agent.
 * Use as: `https://${agentCanonicalBase(agent)}/some/path`
 *
 * - Custom domain agents  → their custom_domain (e.g. "southsurreywhiterock.com")
 * - Region-preview agents → "website.pixilink.com/{region}" (e.g. "website.pixilink.com/burnaby")
 *   NOTE: residencity.ca is retired (July 2026) and its Docker container is stopped
 *   (503s on every path) — region agents' live URL now lives on website.pixilink.com
 *   via a Laravel-side reverse proxy (see routes/web.php on the server). Do NOT
 *   point this back at residencity.ca.
 * - Unknown fallback      → "southsurreywhiterock.com"
 */
export function agentCanonicalBase(agent: AgentProfile | null | undefined): string {
  const custom = agent?.settings?.custom_domain
  if (custom) return custom
  if (agent?.slug && RESIDENCITY_SLUG_MAP[agent.slug]) {
    return `website.pixilink.com/${RESIDENCITY_SLUG_MAP[agent.slug]}`
  }
  return 'southsurreywhiterock.com'
}

/**
 * Returns the region-preview path prefix (e.g. "tricity") for an internal agent
 * slug, or null if the agent has no region mapping. Pure function of the slug —
 * deliberately does NOT depend on any request header. Middleware sets
 * x-agent-prefix/x-residencity-zone headers on its rewrite, but those don't
 * reliably survive into every downstream Server Component render (layout output
 * for a given /agent/:slug segment can be reused across requests independently
 * of that specific request's injected headers). Always prefer this slug-based
 * lookup as the primary source of truth; treat header values as a redundant hint,
 * not the only source.
 */
export function regionSlugForAgent(internalSlug: string | null | undefined): string | null {
  if (!internalSlug) return null
  return RESIDENCITY_SLUG_MAP[internalSlug] ?? null
}

/**
 * Resolves the agent URL prefix for server-component link generation.
 *
 * Priority:
 *  1. x-agent-prefix header (set by middleware for every request):
 *     - ''           → custom domain (suburbia.ca, southsurreywhiterock.com)
 *     - '/tricity'   → website.pixilink.com region-path preview
 *  2. regionSlug    → fallback for any env where middleware header is absent
 *  3. /agent/{slug} → dev path-mode for non-region agents
 *
 * Callers must NOT check regionSlugForAgent() themselves — that skips the
 * header and produces /tricity/… links on suburbia.ca, causing 500s.
 */
export function resolveAgentPrefix(
  slug: string,
  xAgentPrefix: string | null,
): string {
  if (xAgentPrefix !== null) return xAgentPrefix
  const regionSlug = regionSlugForAgent(slug)
  return regionSlug ? `/${regionSlug}` : `/agent/${slug}`
}

/**
 * Returns the agent URL prefix for CLIENT components (no server headers available).
 *
 * Client components cannot read x-agent-prefix from request headers, so this
 * function detects the routing mode from window.location.hostname instead:
 *  - Shared platform domains (website.pixilink.com, residencity.ca, localhost)
 *    use path-mode routing → delegates to resolveAgentPrefix(slug, null).
 *  - Any other hostname is a custom domain where the agent occupies the root
 *    → returns '' so links go to '/', '/sign-in', etc. (not '/tricity/sign-in').
 *
 * Always use this in client components instead of calling regionSlugForAgent()
 * or resolveAgentPrefix(slug, null) directly.
 */
export function clientAgentPrefix(slug: string): string {
  if (typeof window === 'undefined') return ''
  const { hostname } = window.location
  if (
    hostname === 'localhost' ||
    hostname === 'website.pixilink.com' ||
    hostname === 'residencity.ca'
  ) {
    return resolveAgentPrefix(slug, null)
  }
  return ''
}

export const getAgent = cache(async (slug: string): Promise<AgentProfile | null> => {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      if (data && typeof data.slug === 'string') return data as AgentProfile
    }
  } catch {
    // fall through to fallback
  }
  return AGENT_FALLBACKS[slug] ?? null
})

export async function getAgentByDomain(domain: string): Promise<AgentProfile | null> {
  try {
    const res = await laravelFetch(`/api-internal/agent/by-domain/${encodeURIComponent(domain)}`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (data && typeof data.slug === 'string') return data as AgentProfile
    }
  } catch {
    // fall through
  }
  return null
}

export interface ListingsParams {
  status?: 'Active' | 'Sold' | 'Terminated'
  type?: string
  city?: string
  subarea?: string
  min_price?: number
  max_price?: number
  beds?: number
  baths?: number
  sort?:
    | 'newest' | 'price_asc' | 'price_desc' | 'beds' | 'dom'
    | 'address_asc' | 'address_desc'
    | 'type_asc' | 'type_desc'
    | 'beds_asc' | 'beds_desc'
    | 'baths_asc' | 'baths_desc'
    | 'sqft_asc' | 'sqft_desc'
    | 'lot_size_asc' | 'lot_size_desc'
    | 'frontage_asc' | 'frontage_desc'
    | 'levels_asc' | 'levels_desc'
    | 'price_asc' | 'price_desc'
    | 'dom_asc' | 'dom_desc'
    | 'date_asc' | 'date_desc'
  page?: number
  limit?: number
  days_back?: number
  price_reduced?: boolean
  month?: string
  year?: number
  min_year?: number
  max_year?: number
  min_lot_size?: number
  with_suite?: boolean
  two_suites?: boolean
  coach_home?: boolean
  laneway_house?: boolean
  legal_suite?: boolean
  noFallback?: boolean
  all_search?: boolean
}

/**
 * True when a listings query is scoped to a specific subarea/neighbourhood.
 * A timeout/error on one of these must NEVER be papered over with
 * FALLBACK_LISTINGS: the fallback set is a fixed 9 fake addresses that would be
 * rendered as if they were real inventory for that subarea (misrepresentation,
 * and cached for 5 minutes as duplicate/thin fake content across hundreds of URLs).
 */
function isSubareaFiltered(params: ListingsParams): boolean {
  return !!params.subarea
}

/**
 * True when a listings query carries meaningful filter context that makes
 * FALLBACK_LISTINGS factually wrong to display. Covers:
 *  - Subarea-scoped queries (see isSubareaFiltered above)
 *  - Suite/mortgage-helper flags: showing "1234 Fake St" as a result of
 *    "houses with suite" is a direct factual misrepresentation.
 *  - Price-range filters: fake fallback listings have random prices that
 *    clearly don't match the requested band, confusing users and SEO bots.
 *
 * For these queries, a transient backend failure should return an empty result
 * set (the "no homes found" state) rather than fabricated placeholder data.
 * Unfiltered calls (e.g. homepage widgets) may still fall back — showing
 * something generic there is a reasonable degradation, not a factual claim.
 */
function isMeaningfullyFiltered(params: ListingsParams): boolean {
  return !!(
    params.subarea ||
    params.with_suite ||
    params.two_suites ||
    params.coach_home ||
    params.laneway_house ||
    params.legal_suite ||
    params.min_price ||
    params.max_price
  )
}

export async function getListings(slug: string, params: ListingsParams = {}): Promise<{ listings: AgentListing[]; total: number }> {
  const subareaFiltered = isSubareaFiltered(params)
  const meaningfullyFiltered = isMeaningfullyFiltered(params)
  try {
    const qs = new URLSearchParams()
    if (params.status)    qs.set('status', params.status)
    if (params.type)      qs.set('type', params.type)
    if (params.city)      qs.set('city', params.city)
    if (params.subarea)   qs.set('subarea', params.subarea)
    if (params.min_price) qs.set('min_price', String(params.min_price))
    if (params.max_price) qs.set('max_price', String(params.max_price))
    if (params.beds)      qs.set('beds', String(params.beds))
    if (params.baths)     qs.set('baths', String(params.baths))
    if (params.sort)      qs.set('sort', params.sort)
    if (params.page)      qs.set('page', String(params.page))
    if (params.limit)     qs.set('limit', String(params.limit))
    if (params.days_back) qs.set('days_back', String(params.days_back))
    if (params.price_reduced) qs.set('price_reduced', '1')
    if (params.month)        qs.set('month', params.month)
    if (params.year)         qs.set('year', String(params.year))
    if (params.min_year)     qs.set('min_year', String(params.min_year))
    if (params.max_year)     qs.set('max_year', String(params.max_year))
    if (params.min_lot_size) qs.set('min_lot_size', String(params.min_lot_size))
    if (params.with_suite)   qs.set('with_suite', '1')
    if (params.two_suites)   qs.set('two_suites', '1')
    if (params.coach_home)   qs.set('coach_home', '1')
    if (params.laneway_house) qs.set('laneway_house', '1')
    if (params.legal_suite)  qs.set('legal_suite', '1')
    if (params.all_search)   qs.set('all_search', '1')
    // Suite/coach-home/laneway/legal-suite filters and subarea-scoped queries
    // (the long-tail subarea x type x bed-count combo pages) can be slow on a
    // cache-cold request (uncached scan on the backend) — use a longer timeout
    // than the default 4s so a cold cache doesn't spuriously time out before the
    // backend cache (see featuredListings() Cache::remember) has a chance to
    // warm. This only matters for the first request after a cache expiry/restart.
    const isSuiteFiltered = !!(params.with_suite || params.two_suites || params.coach_home || params.laneway_house || params.legal_suite)
    const needsLongerTimeout = isSuiteFiltered || subareaFiltered
    const res = await laravelFetch(`/api-internal/agent/${slug}/listings?${qs}`, {
      next: { revalidate: 300 },
      ...(needsLongerTimeout ? { signal: AbortSignal.timeout(LISTING_FETCH_TIMEOUT_MS) } : {}),
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return { listings: data as AgentListing[], total: data.length }
      if (data && Array.isArray(data.data)) return { listings: data.data as AgentListing[], total: data.total ?? data.data.length }
    }
    if (subareaFiltered) {
      throw new TransientBackendError(`Subarea-filtered listings fetch failed: HTTP ${res.status}`)
    }
  } catch (err) {
    if (subareaFiltered) {
      // Never paper over a transient failure on a subarea-scoped query with fake
      // fallback listings — surface it so the caller's nearest error.tsx renders
      // a retriable error instead of Next.js caching fabricated content for the
      // `revalidate` window.
      if (err instanceof TransientBackendError) throw err
      throw new TransientBackendError(`Subarea-filtered listings fetch error: ${err instanceof Error ? err.message : String(err)}`)
    }
    // fall through to fallback below for unfiltered/non-subarea queries
  }
  // Never serve fake placeholder listings for meaningfully-filtered queries
  // (suite flags, price range, or subarea). An empty result is honest; fake
  // addresses shown as "houses with suite $800K–$1.1M" is misrepresentation.
  if (params.noFallback || meaningfullyFiltered) return { listings: [], total: 0 }
  const fallback = params.status === 'Sold' ? FALLBACK_SOLD_LISTINGS : FALLBACK_LISTINGS
  const page = params.page ?? 1
  const limit = params.limit ?? 24
  const slice = fallback.slice((page - 1) * limit, page * limit)
  return { listings: slice, total: fallback.length }
}

/**
 * Returns listings personally listed by this agent (by agent_id / MLS agent code).
 * Backed by GET /api-internal/agent/{slug}/own-listings?status=Active|Sold&limit=N
 * Returns same shape as getListings(). Falls back to empty on error.
 */
export async function getOwnListings(
  slug: string,
  params: { status?: 'Active' | 'Sold'; limit?: number } = {}
): Promise<{ listings: AgentListing[]; total: number }> {
  try {
    const qs = new URLSearchParams()
    if (params.status) qs.set('status', params.status)
    if (params.limit)  qs.set('limit', String(params.limit))
    const res = await laravelFetch(`/api-internal/agent/${slug}/own-listings?${qs}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return { listings: data as AgentListing[], total: data.length }
      if (data && Array.isArray(data.data)) return { listings: data.data as AgentListing[], total: data.total ?? data.data.length }
    }
  } catch {
    // fall through
  }
  return { listings: [], total: 0 }
}

/**
 * Thrown when a listing detail fetch fails for a *transient* reason — a network
 * error, a timeout, or a non-404 error status (5xx, etc.). The caller should
 * surface a retriable error (500) rather than a 404 so the failure is never
 * cached as a sticky "listing gone" for the revalidate window.
 */
export class TransientBackendError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TransientBackendError'
  }
}

const LISTING_FETCH_TIMEOUT_MS = 8000
const LISTING_FETCH_RETRIES = 2

function normalizeListing(data: unknown): ListingDetail | null {
  if (!data || typeof data !== 'object' || !(data as { id?: unknown }).id) return null
  // Normalize: ensure array fields always exist so the page never crashes
  // on .length access even if the API omits them.
  return {
    features: [],
    amenities: [],
    similar_active: [],
    similar_sold: [],
    open_house: null,
    building: null,
    neighbourhood: null,
    ...(data as Partial<ListingDetail>),
  } as ListingDetail
}

/**
 * Single attempt at fetching a listing detail.
 * - HTTP 404 => genuine not-found => returns null.
 * - Network error / timeout / any other non-2xx => throws TransientBackendError.
 * - HTTP 200 with no valid listing id (garbled/error JSON from artisan serve under
 *   load) => throws TransientBackendError so retries and error.tsx are reached,
 *   not notFound().
 *
 * The first attempt uses the shared ISR cache (`revalidate: 300`); retries use
 * `no-store` so they actually hit the backend instead of being short-circuited
 * by Next.js request memoization / the data cache returning the failed attempt.
 */
async function fetchListingDetailOnce(slug: string, listingSlug: string, fresh: boolean): Promise<ListingDetail | null> {
  let res: Response
  try {
    res = await laravelFetch(`/api-internal/agent/${slug}/listing/${listingSlug}`, {
      signal: AbortSignal.timeout(LISTING_FETCH_TIMEOUT_MS),
      ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: 300 } }),
    })
  } catch (err) {
    throw new TransientBackendError(`Listing fetch network error: ${err instanceof Error ? err.message : String(err)}`)
  }
  if (res.status === 404) return null
  if (!res.ok) throw new TransientBackendError(`Listing fetch failed: HTTP ${res.status}`)
  let data: unknown
  try {
    data = await res.json()
  } catch (err) {
    throw new TransientBackendError(`Listing response parse error: ${err instanceof Error ? err.message : String(err)}`)
  }
  const listing = normalizeListing(data)
  if (listing === null) {
    throw new TransientBackendError('Listing fetch returned 200 but no valid listing data')
  }
  return listing
}

/**
 * Fetch a listing detail, distinguishing a genuine not-found (returns null) from
 * a transient backend failure (throws TransientBackendError after a bounded
 * retry). Wrapped in React `cache()` so `generateMetadata` and the page body
 * share a single result per request and can never disagree.
 */
export const getListingDetail = cache(async (slug: string, listingSlug: string): Promise<ListingDetail | null> => {
  let lastErr: unknown
  for (let attempt = 0; attempt <= LISTING_FETCH_RETRIES; attempt++) {
    try {
      return await fetchListingDetailOnce(slug, listingSlug, attempt > 0)
    } catch (err) {
      lastErr = err
      if (attempt < LISTING_FETCH_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)))
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new TransientBackendError('Listing fetch failed')
})

export async function getBuildings(slug: string, limit?: number): Promise<AgentBuilding[]> {
  try {
    const qs = limit ? `?limit=${limit}` : ''
    const res = await laravelFetch(`/api-internal/agent/${slug}/buildings${qs}`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data as AgentBuilding[]
    }
  } catch {
    // fall through
  }
  return FALLBACK_BUILDINGS
}

export async function getBuildingDetail(slug: string, buildingSlug: string): Promise<BuildingDetail | null> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/building/${buildingSlug}`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (data && data.id) return { features: [], amenities: [], maintenance_fee_includes: [], photos: [], features_data: null, walk_score: null, transit_score: null, bike_score: null, developer: null, suite_sizes: null, agent_take: null, ...data } as BuildingDetail
    }
  } catch {
    // fall through
  }
  return null
}

export async function getMarketStats(slug: string): Promise<MarketStats> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/stats`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (data && typeof data.active_count === 'number') return data as MarketStats
    }
  } catch {
    // fall through
  }
  return FALLBACK_STATS
}

export async function getTestimonials(slug: string): Promise<AgentTestimonial[]> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/testimonials`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data as AgentTestimonial[]
    }
  } catch {
    // fall through
  }
  return FALLBACK_TESTIMONIALS
}

export async function getNeighbourhoods(slug: string): Promise<NeighbourhoodSummary[]> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/neighbourhoods`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data as NeighbourhoodSummary[]
    }
  } catch {
    // fall through
  }
  return FALLBACK_NEIGHBOURHOODS
}

export interface PersonaListingsResult {
  listings: AgentListing[]
  areas: { subarea: string; count: number }[]
  total: number
}

/**
 * Fetch listings that qualify for a persona (tag-driven landing page), e.g.
 * "downsizer-homes", "luxury-finishes-homes", "high-end-appliance-homes".
 * Backed by personaListings() on the prod AgentDataController — qualifies via
 * listing.ai_tags OR the parent building's amenity_tags (joined by strata_no).
 * Pass `subarea` to scope to a single area sub-page.
 */
export async function getPersonaListings(
  slug: string,
  persona: string,
  subarea?: string,
): Promise<PersonaListingsResult> {
  try {
    const qs = subarea ? `?subarea=${encodeURIComponent(subarea)}` : ''
    const res = await laravelFetch(`/api-internal/agent/${slug}/persona/${persona}${qs}`, { next: { revalidate: 600 } })
    if (res.ok) {
      const data = await res.json()
      if (data && Array.isArray(data.listings)) {
        // personaListings() returns a lighter-weight row shape (bedrooms/baths/price/
        // listingid) than the AgentListing contract used by ListingCard/ListingStrip
        // (beds/baths/list_price/mls_no/status) — normalize here at the boundary.
        interface RawPersonaListing {
          id: string
          listingid: string
          address: string
          city: string
          subarea: string | null
          type: string | null
          bedrooms: number | null
          baths: number | null
          price: number | null
          sqft: number | null
          photo_url: string | null
          slug: string | null
        }
        const listings: AgentListing[] = (data.listings as RawPersonaListing[]).map(l => ({
          id: Number(l.id),
          mls_no: l.listingid,
          address: l.address,
          city: l.city,
          subarea: l.subarea,
          status: 'Active',
          list_price: l.price ?? 0,
          sold_price: null,
          beds: l.bedrooms ?? 0,
          baths: l.baths ?? 0,
          sqft: l.sqft ?? 0,
          photo_url: l.photo_url,
          type: l.type,
          style: null,
          slug: l.slug,
          dom: null,
        }))
        return {
          listings,
          areas: Array.isArray(data.areas) ? data.areas : [],
          total: data.total ?? listings.length,
        }
      }
    }
  } catch {
    // fall through
  }
  return { listings: [], areas: [], total: 0 }
}

export async function getNeighbourhoodDetail(
  slug: string,
  subareaSlug: string,
  type?: string,
): Promise<NeighbourhoodDetail | null> {
  try {
    const qs = type ? `?type=${encodeURIComponent(type)}` : ''
    const res = await laravelFetch(`/api-internal/agent/${slug}/neighbourhood/${subareaSlug}${qs}`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (data && typeof data.name === 'string') return data as NeighbourhoodDetail
    }
  } catch {
    // fall through
  }
  return FALLBACK_NEIGHBOURHOOD_DETAILS[subareaSlug] ?? null
}

export async function getSchoolCatchments(slug: string): Promise<SchoolCatchmentSummary[]> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/schools`, { next: { revalidate: 1800 } })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data as SchoolCatchmentSummary[]
    }
  } catch {
    // fall through
  }
  return []
}

export async function getSchoolCatchmentDetail(
  slug: string,
  schoolSlug: string,
): Promise<SchoolCatchmentDetail | null> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/schools/${schoolSlug}`, { next: { revalidate: 1800 } })
    if (res.ok) {
      const data = await res.json()
      if (data && data.school && typeof data.school.name === 'string') return data as SchoolCatchmentDetail
    }
  } catch {
    // fall through
  }
  return null
}

export async function getNeighbourhoodSold(slug: string, subareaSlug: string): Promise<AgentListing[]> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/neighbourhood/${encodeURIComponent(subareaSlug)}/sold`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data as AgentListing[]
    }
  } catch {
    // fall through
  }
  return FALLBACK_SOLD_LISTINGS.slice(0, 30)
}

/**
 * Fetches ONE real, verified price-reduction/sold narrative for the given agent
 * (optionally scoped to a subarea slug). Returns null when no qualifying listing
 * exists — the backend never fabricates a count, so absence is a valid, common
 * result and callers must render nothing rather than invent copy.
 *
 * Note: this Laravel/PHP endpoint serializes `response()->json(null)` as the
 * literal string "{}" rather than "null" — treat a missing `mls_no` key as
 * "no story" instead of relying on falsy/null checks on the parsed body.
 */
export interface BuildingLastSold {
  unit: string | null
  sold_date: string
  building_name: string | null
  mls_num: string
}

/**
 * Client-only fetch — returns the most recently sold unit in the same building
 * (matched by strata_no), excluding the subject listing itself.
 * Returns null when the building has no sold history or strata_no is absent.
 * No caching — this is called client-side after an 8 s timer.
 */
export async function getBuildingLastSold(agentSlug: string, mls: string): Promise<BuildingLastSold | null> {
  try {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
    const res = await fetch(
      `${basePath}/api/building-last-sold/${encodeURIComponent(agentSlug)}/${encodeURIComponent(mls)}`,
      { credentials: 'include' },
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data || typeof data.sold_date !== 'string') return null
    return data as BuildingLastSold
  } catch {
    return null
  }
}

export interface CompellingSold {
  mls_num: string
  unit: string | null
  building_name: string | null
  sold_date: string
  over_asking: number
  days_on_market: number | null
}

/**
 * Client-only fetch — finds the most dramatic recent sold nearby:
 * $10K+ over asking OR sold in ≤7 days. Prefers same building; falls
 * back to same subarea + property type. Returns null when nothing qualifies.
 * No caching — called client-side after an 8 s timer.
 */
export async function getBuildingCompellingSold(agentSlug: string, mls: string): Promise<CompellingSold | null> {
  try {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
    const res = await fetch(
      `${basePath}/api/building-compelling-sold/${encodeURIComponent(agentSlug)}/${encodeURIComponent(mls)}`,
      { credentials: 'include' },
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data || typeof data.mls_num !== 'string') return null
    return data as CompellingSold
  } catch {
    return null
  }
}

export async function getAgentPriceStory(slug: string, subarea?: string): Promise<PriceStory | null> {
  try {
    const qs = subarea ? `?subarea=${encodeURIComponent(subarea)}` : ''
    const res = await laravelFetch(`/api-internal/agent/${slug}/price-story${qs}`, { next: { revalidate: 1800 } })
    if (res.ok) {
      const data = await res.json()
      if (data && typeof data === 'object' && typeof data.mls_no === 'string' && data.mls_no) {
        return data as PriceStory
      }
    }
  } catch {
    // fall through
  }
  return null
}

export async function getNeighbourhoodReports(slug: string, subareaSlug: string): Promise<MonthlyTrendPoint[]> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/neighbourhood/${encodeURIComponent(subareaSlug)}/reports`, { next: { revalidate: 600 } })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) {
        return (data as Record<string, unknown>[]).map(r => ({
          month: String(r.month ?? ''),
          sold: Number(r.sold ?? 0),
          avg_price: Number(r.avg_price ?? 0),
          avg_dom: Number(r.avg_dom ?? 0),
          avg_ppsf: Number(r.avg_ppsf ?? 0),
          active: r.active !== undefined
            ? Number(r.active)
            : r.active_count !== undefined
            ? Number(r.active_count)
            : undefined,
          avg_list_price: r.avg_list_price !== undefined ? Number(r.avg_list_price) : undefined,
        }))
      }
    }
  } catch {
    // fall through
  }
  return FALLBACK_MARKET_REPORT.monthly_trend
}

export async function getMarketReport(slug: string, subarea?: string): Promise<MarketReport> {
  try {
    const qs = subarea ? `?subarea=${encodeURIComponent(subarea)}` : ''
    const res = await laravelFetch(`/api-internal/agent/${slug}/market-report${qs}`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      if (data && data.overall) {
        return {
          ...data,
          monthly_trend_by_type: Array.isArray(data.monthly_trend_by_type) ? data.monthly_trend_by_type : [],
        } as MarketReport
      }
    }
  } catch {
    // fall through
  }
  return FALLBACK_MARKET_REPORT
}

export async function getTopRealtor(slug: string): Promise<TopRealtor | null> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/top-realtor`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (data && data.agent) return data as TopRealtor
    }
  } catch {
    // fall through
  }
  return null
}

export async function getHome(slug: string): Promise<HomeData | null> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/home`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (data && data.agent) return data as HomeData
    }
  } catch {
    // fall through
  }
  return null
}

export async function getPages(slug: string): Promise<AgentPage[]> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/pages`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data as AgentPage[]
    }
  } catch {
    // fall through
  }
  // Return empty — never fall back to another agent's hardcoded pages
  return []
}

export async function getPage(slug: string, pageSlug: string): Promise<AgentPage | null> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/page/${pageSlug}`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (data && typeof data.slug === 'string') return data as AgentPage
    }
  } catch {
    // fall through
  }
  return FALLBACK_PAGES.find((p) => p.slug === pageSlug) ?? null
}

export async function getAwards(slug: string): Promise<AgentAward[]> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/awards`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data as AgentAward[]
    }
  } catch {
    // fall through
  }
  return FALLBACK_AWARDS
}

/**
 * Returns a sorted list of all active MLS cities province-wide (no agent scoping).
 * Used by the search page so visitors can browse any city, not just the agent's territory.
 */
export async function getAllCities(): Promise<string[]> {
  try {
    const res = await laravelFetch('/api-internal/cities', { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data as string[]
    }
  } catch {
    // fall through
  }
  return []
}

export const getAgentTerritories = cache(async (slug: string): Promise<import('./types').AgentTerritory[]> => {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/territories`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data as import('./types').AgentTerritory[]
    }
  } catch {
    // fall through
  }
  return []
})

const CITY_DISPLAY_RENAME: Record<string, string> = {
  'Surrey': 'South Surrey',
}

export function agentAreaDisplay(territories: import('./types').AgentTerritory[]): string {
  const cities = [
    ...new Set(
      territories
        .map(t => (t.city ? (CITY_DISPLAY_RENAME[t.city] ?? t.city) : null))
        .filter((c): c is string => !!c)
    ),
  ]
  return cities.length > 0 ? cities.join(' & ') : 'South Surrey & White Rock'
}

export const authMe = cache(async (token: string): Promise<import('./types').AuthUser | null> => {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    }
    if (LARAVEL_HOST) headers['Host'] = LARAVEL_HOST
    const res = await fetch(`${LARAVEL_INTERNAL_URL}/api-internal/auth/me`, {
      headers,
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data.user as import('./types').AuthUser) || null
  } catch {
    return null
  }
})

export async function getMedia(slug: string, collection?: string): Promise<AgentMedia[]> {
  try {
    const qs = collection ? `?collection=${encodeURIComponent(collection)}` : ''
    const res = await laravelFetch(`/api-internal/agent/${slug}/media${qs}`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data as AgentMedia[]
    }
  } catch {
    // fall through
  }
  return collection ? FALLBACK_MEDIA.filter((m) => m.collection === collection) : FALLBACK_MEDIA
}

export async function getTeam(slug: string): Promise<TeamMember[]> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/team`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data as TeamMember[]
    }
  } catch {
    // fall through
  }
  // Return empty array so callers can build their own fallback from the live agent profile.
  // This avoids rendering stale/wrong identity for non-Randy agents when the API is unavailable.
  return []
}

export async function getNews(slug: string, page = 1, limit = 12): Promise<NewsList> {
  try {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    const res = await laravelFetch(`/api-internal/agent/${slug}/news?${qs}`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (data && Array.isArray(data.posts)) return data as NewsList
    }
  } catch {
    // fall through
  }
  // Return empty — never fall back to another agent's hardcoded news
  return { posts: [], total: 0 }
}

export async function getNewsPost(slug: string, postSlug: string): Promise<NewsPost | null> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/news/${postSlug}`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (data && typeof data.slug === 'string') return data as NewsPost
    }
  } catch {
    // fall through
  }
  return FALLBACK_NEWS.find((p) => p.slug === postSlug) ?? null
}

export async function getOpenHouses(slug: string): Promise<OpenHouseItem[]> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/open-houses`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data as OpenHouseItem[]
    }
  } catch {
    // fall through
  }
  return FALLBACK_OPEN_HOUSES
}

export async function getPriceMatrix(slug: string, subarea?: string): Promise<PriceMatrix> {
  try {
    const qs = subarea ? `?subarea=${encodeURIComponent(subarea)}` : ''
    const res = await laravelFetch(`/api-internal/agent/${slug}/price-matrix${qs}`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (data && Array.isArray(data.rows)) return data as PriceMatrix
    }
  } catch {
    // fall through
  }
  return FALLBACK_PRICE_MATRIX
}

export async function getMarketBreakdown(slug: string, subarea?: string): Promise<MarketBreakdown> {
  const empty: MarketBreakdown = {
    by_bedroom: [], by_bathroom: [], by_decade: [], by_lot_size: [], by_levels: [],
  }
  try {
    const qs = subarea ? `?subarea=${encodeURIComponent(subarea)}` : ''
    const res = await laravelFetch(`/api-internal/agent/${slug}/market-breakdown${qs}`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (
        data &&
        Array.isArray(data.by_bedroom) &&
        Array.isArray(data.by_bathroom) &&
        Array.isArray(data.by_decade) &&
        Array.isArray(data.by_lot_size) &&
        Array.isArray(data.by_levels)
      ) return data as MarketBreakdown
    }
  } catch {
    // fall through
  }
  return empty
}

export async function getAreaIntro(slug: string): Promise<AreaIntroContent | null> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/area-intro-content`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (data && typeof data.content === 'string') return data as AreaIntroContent
    }
  } catch {
    // fall through
  }
  return null
}

export async function getNeighbourhoodAiContent(
  slug: string,
  subareaSlugsList: string[],
): Promise<Record<string, NeighbourhoodAiContent>> {
  if (subareaSlugsList.length === 0) return {}
  try {
    const qs = new URLSearchParams()
    for (const s of subareaSlugsList) qs.append('subareas[]', s)
    const res = await laravelFetch(`/api-internal/agent/${slug}/neighbourhood-ai-content?${qs}`, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return data as Record<string, NeighbourhoodAiContent>
      }
    }
  } catch {
    // fall through
  }
  return {}
}

export interface LandingPageEnriched {
  page: LandingPage
  widget: import('./types').NeighbourhoodWidget | null
  allPages: LandingPage[]
  buyers: number
}

function synthesizeLandingPage(
  n: import('./types').NeighbourhoodSummary,
  template: LandingPage | null = null,
): LandingPage {
  return {
    id: 0,
    agent_id: template?.agent_id ?? 0,
    city_slug: n.slug,
    city_display_name: n.name,
    area_slug: null,
    area_display_name: '',
    province: 'BC',
    // Inherit response time, stats, awards, cards, and testimonials from the
    // canonical DB page so every synthesized territory page is as rich as the
    // manually-maintained one — no per-territory admin work required.
    respond_time_label: template?.respond_time_label ?? 'within a few hours',
    award_badges: template?.award_badges ?? [],
    stat_years_exp: template?.stat_years_exp ?? null,
    stat_sold_volume: template?.stat_sold_volume ?? null,
    stat_team_size: template?.stat_team_size ?? null,
    stat_award_label: template?.stat_award_label ?? null,
    value_prop_cards: template?.value_prop_cards ?? [],
    testimonials: template?.testimonials ?? [],
    meta_title: null,
    meta_description: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export async function getLandingPageEnriched(
  agentSlug: string,
  citySlug: string,
  areaSlug?: string,
): Promise<LandingPageEnriched | null> {
  const targetSlug = areaSlug ?? citySlug

  // Fetch DB page, all DB pages, and neighbourhoods in parallel
  const [page, allPages, neighbourhoods] = await Promise.all([
    areaSlug ? getLandingPageArea(agentSlug, citySlug, areaSlug) : getLandingPage(agentSlug, citySlug),
    getLandingPages(agentSlug),
    getNeighbourhoods(agentSlug).catch(() => [] as import('./types').NeighbourhoodSummary[]),
  ])

  // Fall back to a synthesized page from territory/neighbourhood data when no DB entry exists.
  // This means every neighbourhood in the agent's territories gets a /top-realtor/{slug} page
  // automatically — no admin work required when adding new agents.
  // Use the first available DB page as a content template so synthesized pages inherit
  // stats, value_prop_cards, testimonials, and award_badges from the canonical page.
  const templatePage = allPages[0] ?? null
  const matchedNeighbourhood = neighbourhoods.find(n => n.slug === targetSlug)

  // Canonical slug set — mirrors the $slugMap keys in the prod AgentDataController so that
  // synthesis is permitted only for known-valid subarea slugs.  Unknown or misspelled slugs
  // (e.g. /top-realtor/white-rok/ocean-parrk) must still 404; this set prevents them from
  // accidentally synthesizing a page.  Update this list when the PHP $slugMap grows.
  const KNOWN_NEIGHBOURHOOD_SLUGS = new Set([
    'south-surrey-white-rock', 'white-rock', 'cloverdale', 'morgan-creek',
    'grandview', 'grandview-surrey', 'grandview-heights', 'ocean-park',
    'semiahmoo', 'fleetwood', 'king-george-corridor', 'pacific-douglas',
    'crescent-bch-ocean-pk', 'sunnyside-park-surrey', 'elgin-chantrell',
    'hazelmere', 'whalley', 'east-newton', 'fraser-heights',
  ])

  // For area routes, also validate citySlug: require a matching DB landing page OR a
  // known-neighbourhood slug for the city.  This prevents invalid city + valid area
  // combinations (e.g. /top-realtor/typo-city/ocean-park) from synthesizing a page.
  const isCityValid = !areaSlug
    || allPages.some(p => p.city_slug === citySlug)
    || KNOWN_NEIGHBOURHOOD_SLUGS.has(citySlug)

  // When a subarea temporarily has zero active listings it won't appear in the neighbourhoods
  // response.  Build a minimal synthetic entry so synthesizeLandingPage can still render a page,
  // but only if the slug is in the known-valid set AND the city is valid.
  const effectiveNeighbourhood: import('./types').NeighbourhoodSummary | null =
    matchedNeighbourhood ?? (
      templatePage && KNOWN_NEIGHBOURHOOD_SLUGS.has(targetSlug) && isCityValid ? {
        name: targetSlug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        city: '',
        subarea: null,
        slug: targetSlug,
        active_count: 0,
      } : null
    )

  let resolvedPage: LandingPage | null = page ?? (effectiveNeighbourhood ? synthesizeLandingPage(effectiveNeighbourhood, templatePage) : null)
  if (!resolvedPage) return null

  // For synthesized area pages (areaSlug present, no DB record), fix up city/area slug
  // context so breadcrumbs and canonical URLs point at the correct city page
  // (e.g. /top-realtor/white-rock) rather than treating the area slug as the city.
  if (!page && areaSlug && resolvedPage.area_slug === null) {
    const cityPage = allPages.find(p => p.city_slug === citySlug)
    const cityDisplayName = cityPage?.city_display_name
      ?? citySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    resolvedPage = {
      ...resolvedPage,
      city_slug: citySlug,
      city_display_name: cityDisplayName,
      area_slug: areaSlug,
      area_display_name: resolvedPage.city_display_name,
    }
  }

  const neighbourhoodSlug = matchedNeighbourhood?.slug ?? targetSlug
  const detail = await getNeighbourhoodDetail(agentSlug, neighbourhoodSlug).catch(() => null)
  const widget = detail?.widget ?? null

  // Buyers estimate — BCC formula: round(max(50, active×15 + sold_30d×30) / 10) × 10
  const buyers = Math.round(
    Math.max(50, (widget?.active ?? 0) * 15 + (widget?.sold_30d ?? 0) * 30) / 10,
  ) * 10

  return { page: resolvedPage, widget, allPages, buyers }
}

export async function getLandingPages(slug: string): Promise<LandingPage[]> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/landing-pages`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data as LandingPage[]
    }
  } catch {
    // fall through
  }
  return []
}

export async function getAgentSoldStats(slug: string): Promise<AgentSoldStats | null> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/sold-stats`, { next: { revalidate: 10800 } })
    if (res.ok) {
      const data = await res.json()
      if (data && typeof data.sold_count === 'number' && data.sold_count > 0) return data as AgentSoldStats
    }
  } catch {
    // fall through
  }
  return null
}

/**
 * Given a list of landing pages for an agent, find the best-matching
 * /top-realtor URL for the supplied subarea/city strings.
 * Returns a full path-prefixed URL (agentPrefix included), or null if no match.
 * Preference: subarea-level page > city-level page.
 */
export function matchTopRealtorUrl(
  pages: LandingPage[],
  agentPrefix: string,
  subarea: string | null | undefined,
  city: string | null | undefined,
): string | null {
  if (pages.length === 0) return null
  const toSlug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const subareaSlug = subarea ? toSlug(subarea) : null
  const citySlug = city ? toSlug(city) : null

  if (subareaSlug) {
    const areaPage = pages.find(p => p.area_slug === subareaSlug)
    if (areaPage) return `${agentPrefix}/top-realtor/${areaPage.city_slug}/${subareaSlug}`
    const subAsCityPage = pages.find(p => p.city_slug === subareaSlug && !p.area_slug)
    if (subAsCityPage) return `${agentPrefix}/top-realtor/${subareaSlug}`
  }

  if (citySlug) {
    const cityPage = pages.find(p => p.city_slug === citySlug && !p.area_slug)
    if (cityPage) return `${agentPrefix}/top-realtor/${citySlug}`
  }

  return null
}

/**
 * Fetch the residencity.ca region slug → agent slug map from the DB.
 * Returns e.g. {"south-surrey":"randy"}.
 * Revalidates every 5 minutes — region assignments change rarely.
 */
export async function getRegionSlugMap(): Promise<Record<string, string>> {
  try {
    const res = await laravelFetch('/api-internal/regions', { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return data as Record<string, string>
      }
    }
  } catch {
    // fall through to hardcoded fallback
  }
  return { 'south-surrey': 'randy' }
}

export async function getLandingPage(slug: string, citySlug: string): Promise<LandingPage | null> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/landing-pages/${citySlug}`, { next: { revalidate: 3600 } })
    if (res.ok) return res.json()
  } catch {
    // fall through
  }
  return null
}

export async function getLandingPageArea(slug: string, citySlug: string, areaSlug: string): Promise<LandingPage | null> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/landing-pages/${citySlug}/${areaSlug}`, { next: { revalidate: 3600 } })
    if (res.ok) return res.json()
  } catch {
    // fall through
  }
  return null
}

export async function getAreaComparisons(slug: string): Promise<AreaComparison[]> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/area-comparisons`, { next: { revalidate: 1800 } })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data as AreaComparison[]
    }
  } catch {
    // fall through
  }
  return []
}

export async function getAreaComparison(slug: string, comparisonSlug: string): Promise<AreaComparison | null> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/area-comparisons/${comparisonSlug}`, { next: { revalidate: 1800 } })
    if (res.ok) return res.json()
  } catch {
    // fall through
  }
  return null
}

export async function getBestOfLists(slug: string): Promise<BestOfList[]> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/best-of`, { next: { revalidate: 1800 } })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data as BestOfList[]
    }
  } catch {
    // fall through
  }
  return []
}

export async function getBestOfList(slug: string, listSlug: string): Promise<BestOfList | null> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/best-of/${listSlug}`, { next: { revalidate: 1800 } })
    if (res.ok) return res.json()
  } catch {
    // fall through
  }
  return null
}

export interface ResidencityOverview {
  sold_count: number
  active_count: number
  avg_sold_price: number
  avg_dom: number
  sold_to_list: number
  days: number
}

/**
 * Fetches reciprocity-eligible active listings for an agent's territory —
 * used when the agent has zero own active MLS listings. Calls the dedicated
 * /api-internal/agent/{slug}/reciprocity-listings endpoint; falls back to
 * territory-scoped getListings if the endpoint is unavailable.
 */
export async function getReciprocityListings(
  slug: string,
  limit = 8
): Promise<{ listings: AgentListing[]; total: number }> {
  try {
    const res = await laravelFetch(
      `/api-internal/agent/${slug}/reciprocity-listings?limit=${limit}`,
      { next: { revalidate: 900 } }
    )
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data?.listings)) return { listings: data.listings, total: data.total ?? data.listings.length }
      if (Array.isArray(data)) return { listings: data, total: data.length }
    }
  } catch {
    // fall through to territory fallback
  }
  // Graceful fallback: territory-scoped active listings
  return getListings(slug, { status: 'Active', limit })
}

export async function getFaqs(slug: string): Promise<import('./types').AgentFaq[]> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/faqs`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data as import('./types').AgentFaq[]
    }
  } catch {
    // fall through
  }
  return []
}

export async function getBoardMarketReport(
  board: string,
  city: string,
  type: string,
): Promise<import('./types').BoardMarketReport | null> {
  try {
    const params = new URLSearchParams({ board, city, type })
    const res = await laravelFetch(`/api-internal/market-board-report?${params}`, {
      cache: 'no-store',
    })
    if (res.ok) return res.json()
  } catch {
    // fall through
  }
  return null
}

export async function getBoardCities(board: string): Promise<import('./types').BoardCitiesResponse | null> {
  try {
    const res = await laravelFetch(`/api-internal/market-board-cities?board=${encodeURIComponent(board)}`, {
      cache: 'no-store',
    })
    if (res.ok) return res.json()
  } catch {
    // fall through
  }
  return null
}

export async function getResidencityOverview(days = 60): Promise<ResidencityOverview | null> {
  try {
    const res = await laravelFetch(`/api-internal/residencity/overview?days=${days}`, { next: { revalidate: 1800 } })
    if (res.ok) {
      const data = await res.json()
      if (data && typeof data.sold_count === 'number') return data as ResidencityOverview
    }
  } catch {
    // fall through
  }
  return null
}

const EMPTY_UNIFIED_SOLDS: import('./types').UnifiedSoldsResponse = {
  items: [],
  total_count: 0,
  total_volume: 0,
  page: 1,
  limit: 24,
}

export async function getUnifiedSolds(slug: string, page = 1): Promise<import('./types').UnifiedSoldsResponse> {
  try {
    const res = await laravelFetch(`/api-internal/agent/${slug}/buyer-solds?page=${page}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
    if (res.ok) return res.json()
  } catch {
    // fall through to safe default
  }
  return EMPTY_UNIFIED_SOLDS
}
