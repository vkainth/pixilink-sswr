import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''

// Domain → agent slug map. Add new agent domains here as they onboard.
const DOMAIN_SLUG_MAP: Record<string, string> = {
  'findfraservalleyhomes.com': 'randy',
  'www.findfraservalleyhomes.com': 'randy',
  // Legacy domain — kept so middleware can issue 301 redirects (see OLD_DOMAIN_REDIRECTS).
  'southsurreywhiterock.com': 'randy',
  'www.southsurreywhiterock.com': 'randy',
  'randydyck.com': 'randy',
  'www.randydyck.com': 'randy',
  'suburbia.ca': 'tricity',
  'www.suburbia.ca': 'tricity',
  'shareneshuster.com': 'sharene',
  'www.shareneshuster.com': 'sharene',
  'sharene.pixilink.com': 'sharene',
}

// Canonical domain per agent slug — where an agent's site actually lives.
//
// Why this exists: /agent/{slug} pages are ISR-cached under ONE key regardless of which
// host rendered them, but the links inside embed a host-dependent prefix (x-agent-prefix
// → resolveAgentPrefix). When the same agent was reachable both at her custom domain
// (prefix '') and at the website.pixilink.com/{region} preview (prefix '/{region}'),
// whichever context rendered first after each revalidate poisoned the cache for the
// other — shareneshuster.com served links like /sharene/about, which 404 there. The fix
// is to give a domain-owning agent exactly one rendering context: every preview path
// 308s here instead of rendering.
// Kept in sync manually with DOMAIN_OWNING_SLUGS in lib/api.ts (which cannot be
// imported here — edge bundle).
const SLUG_CANONICAL_DOMAIN: Record<string, string> = {
  'randy': 'findfraservalleyhomes.com',
  'tricity': 'suburbia.ca',
  'sharene': 'shareneshuster.com',
}

// Old domain → new canonical domain 301 redirects.
// Also used for www → non-www canonicalization.
const OLD_DOMAIN_REDIRECTS: Record<string, string> = {
  'southsurreywhiterock.com': 'findfraservalleyhomes.com',
  'www.southsurreywhiterock.com': 'findfraservalleyhomes.com',
  'www.findfraservalleyhomes.com': 'findfraservalleyhomes.com',
}

// residencity.ca hosts — ALL routing for these hosts goes through region logic below.
const RESIDENCITY_HOSTS = new Set(['residencity.ca', 'www.residencity.ca'])

// website.pixilink.com (admin/preview host) — restores the original bare-region-path
// preview workflow (e.g. website.pixilink.com/tricity, /burnaby) that predates
// residencity.ca being split into its own app. Deliberately narrow: only the
// region→agent rewrite (Case B below) applies here, none of residencity.ca's other
// host-wide behavior (hub root page, /agent/ redirect-back, bare /sign-in redirect)
// — those must not affect the shared admin/preview domain.
const REGION_PREVIEW_HOSTS = new Set(['website.pixilink.com'])

// ── Dynamic residencity.ca region map ────────────────────────────────────────
// Fetched from /api-internal/regions (DB-backed). Refreshed every 5 minutes
// using a module-level in-memory cache (Edge-runtime compatible — no ISR).
// Fallback to hardcoded map if the API is unreachable.
let _regionMapCache: Record<string, string> | null = null
let _regionMapCachedAt = 0
const REGION_MAP_TTL_MS = 5 * 60 * 1000 // 5 minutes
const REGION_MAP_FALLBACK: Record<string, string> = { 'tricity': 'tricity', 'burnaby': 'saeed-farhani-ppqu' }

async function getRegionMap(): Promise<Record<string, string>> {
  const now = Date.now()
  if (_regionMapCache && now - _regionMapCachedAt < REGION_MAP_TTL_MS) {
    return _regionMapCache
  }
  try {
    const laravelUrl = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
    const laravelHost = process.env.LARAVEL_API_HOST || null
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (laravelHost) headers['Host'] = laravelHost
    const res = await fetch(`${laravelUrl}/api-internal/regions`, { headers })
    if (res.ok) {
      const data: unknown = await res.json()
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        _regionMapCache = data as Record<string, string>
        _regionMapCachedAt = now
        return _regionMapCache
      }
    }
  } catch {
    // fall through to fallback
  }
  return _regionMapCache ?? REGION_MAP_FALLBACK
}

function getAdminSecret(): Uint8Array | null {
  const s = process.env.ADMIN_JWT_SECRET
  if (!s) return null
  return new TextEncoder().encode(s)
}

function getAgentPortalSecret(): Uint8Array {
  const s = process.env.AGENT_PORTAL_JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'fallback-dev-secret'
  return new TextEncoder().encode(s)
}

async function isValidAdminToken(token: string): Promise<boolean> {
  const secret = getAdminSecret()
  if (!secret) return false
  try {
    await jwtVerify(token, secret)
    return true
  } catch {
    return false
  }
}

async function isValidAgentPortalToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getAgentPortalSecret())
    return true
  } catch {
    return false
  }
}

// ── Subarea slug ↔ MLS label map (mirrors subareaUtils.ts) ───────────────────
// Kept in sync manually — update BOTH this file and subareaUtils.ts when adding new subareas.
// Source of truth: bccondosandhomes.agent_settings.subarea_whitelist (JSON) per agent.

const SUBAREA_SLUG_MAP: Array<{ slug: string; mlsLabel: string; displayName?: string }> = [
  // ── South Surrey / White Rock (Randy Dyck) ───────────────────────────────
  { slug: 'white-rock',           mlsLabel: 'White Rock' },
  { slug: 'crescent-beach',       mlsLabel: 'Crescent Bch Ocean Pk' },
  { slug: 'elgin-chantrell',      mlsLabel: 'Elgin Chantrell' },
  { slug: 'grandview-surrey',     mlsLabel: 'Grandview Surrey' },
  // displayName differs from mlsLabel — DB territory uses "Grandview Heights", MLS uses "Grandview Surrey"
  { slug: 'grandview-heights',    mlsLabel: 'Grandview Surrey',        displayName: 'Grandview Heights' },
  { slug: 'morgan-creek',         mlsLabel: 'Morgan Creek' },
  { slug: 'sunnyside-park',       mlsLabel: 'Sunnyside Park Surrey' },
  { slug: 'king-george-corridor', mlsLabel: 'King George Corridor' },
  { slug: 'pacific-douglas',      mlsLabel: 'Pacific Douglas' },
  { slug: 'rosemary-heights',     mlsLabel: 'Rosemary Hgts' },
  { slug: 'hazelmere',            mlsLabel: 'Hazelmere' },
  // MLS label is "Ocean Park Surrey" (per agent_settings subarea_whitelist); 0 active MLS rows currently
  { slug: 'ocean-park',           mlsLabel: 'Ocean Park Surrey',       displayName: 'Ocean Park' },
  { slug: 'semiahmoo',            mlsLabel: 'Semiahmoo' },
  { slug: 'fleetwood-tynehead',   mlsLabel: 'Fleetwood Tynehead' },
  { slug: 'clayton',              mlsLabel: 'Clayton' },
  { slug: 'brookswood',           mlsLabel: 'Brookswood Langley' },
  { slug: 'south-surrey',         mlsLabel: 'South Surrey White Rock' },
  // ── Coquitlam (Tri-Cities — Nav Shahram / Reza Hedayat) ─────────────────
  { slug: 'burke-mountain',       mlsLabel: 'Burke Mountain' },
  { slug: 'canyon-springs',       mlsLabel: 'Canyon Springs' },
  { slug: 'cape-horn',            mlsLabel: 'Cape Horn' },
  { slug: 'central-coquitlam',    mlsLabel: 'Central Coquitlam' },
  { slug: 'chineside',            mlsLabel: 'Chineside' },
  { slug: 'coquitlam-east',       mlsLabel: 'Coquitlam East' },
  { slug: 'coquitlam-west',       mlsLabel: 'Coquitlam West' },
  { slug: 'eagle-ridge-cq',       mlsLabel: 'Eagle Ridge CQ' },
  { slug: 'harbour-chines',       mlsLabel: 'Harbour Chines' },
  { slug: 'harbour-place',        mlsLabel: 'Harbour Place' },
  { slug: 'hockaday',             mlsLabel: 'Hockaday' },
  { slug: 'maillardville',        mlsLabel: 'Maillardville' },
  { slug: 'meadow-brook',         mlsLabel: 'Meadow Brook' },
  { slug: 'new-horizons',         mlsLabel: 'New Horizons' },
  { slug: 'north-coquitlam',      mlsLabel: 'North Coquitlam' },
  { slug: 'park-ridge-estates',   mlsLabel: 'Park Ridge Estates' },
  { slug: 'ranch-park',           mlsLabel: 'Ranch Park' },
  { slug: 'river-springs',        mlsLabel: 'River Springs' },
  { slug: 'scott-creek',          mlsLabel: 'Scott Creek' },
  { slug: 'summitt-view',         mlsLabel: 'Summitt View' },
  { slug: 'upper-eagle-ridge',    mlsLabel: 'Upper Eagle Ridge' },
  { slug: 'westwood-plateau',     mlsLabel: 'Westwood Plateau' },
  // ── Port Coquitlam (Tri-Cities) ──────────────────────────────────────────
  { slug: 'birchland-manor',      mlsLabel: 'Birchland Manor' },
  { slug: 'central-pt-coquitlam', mlsLabel: 'Central Pt Coquitlam' },
  { slug: 'citadel-pq',           mlsLabel: 'Citadel PQ' },
  { slug: 'glenwood-pq',          mlsLabel: 'Glenwood PQ' },
  { slug: 'lincoln-park-pq',      mlsLabel: 'Lincoln Park PQ' },
  { slug: 'lower-mary-hill',      mlsLabel: 'Lower Mary Hill' },
  { slug: 'mary-hill',            mlsLabel: 'Mary Hill' },
  { slug: 'oxford-heights',       mlsLabel: 'Oxford Heights' },
  { slug: 'riverwood',            mlsLabel: 'Riverwood' },
  { slug: 'woodland-acres-pq',    mlsLabel: 'Woodland Acres PQ' },
  // ── Port Moody (Tri-Cities) ───────────────────────────────────────────────
  { slug: 'anmore',               mlsLabel: 'Anmore' },
  { slug: 'barber-street',        mlsLabel: 'Barber Street' },
  { slug: 'belcarra',             mlsLabel: 'Belcarra' },
  { slug: 'college-park-pm',      mlsLabel: 'College Park PM' },
  { slug: 'glenayre',             mlsLabel: 'Glenayre' },
  { slug: 'heritage-mountain',    mlsLabel: 'Heritage Mountain' },
  { slug: 'heritage-woods-pm',    mlsLabel: 'Heritage Woods PM' },
  { slug: 'mountain-meadows',     mlsLabel: 'Mountain Meadows' },
  { slug: 'north-shore-pt-moody', mlsLabel: 'North Shore Pt Moody' },
  { slug: 'port-moody-centre',    mlsLabel: 'Port Moody Centre' },
  // ── Burnaby (Saeed Farhani) ───────────────────────────────────────────────
  { slug: 'metrotown',            mlsLabel: 'Metrotown' },
  { slug: 'brentwood-park',       mlsLabel: 'Brentwood Park' },
  { slug: 'edmonds-be',           mlsLabel: 'Edmonds BE',              displayName: 'Edmonds' },
  { slug: 'edmonds',              mlsLabel: 'Edmonds BE',              displayName: 'Edmonds' },
  { slug: 'simon-fraser-univ',    mlsLabel: 'Simon Fraser Univer.',    displayName: 'Simon Fraser University' },
  { slug: 'highgate',             mlsLabel: 'Highgate' },
  { slug: 'south-slope',          mlsLabel: 'South Slope' },
  { slug: 'forest-glen-bs',       mlsLabel: 'Forest Glen BS',          displayName: 'Forest Glen' },
  { slug: 'sullivan-heights',     mlsLabel: 'Sullivan Heights' },
  { slug: 'capitol-hill-bn',      mlsLabel: 'Capitol Hill BN',         displayName: 'Capitol Hill' },
  { slug: 'government-road',      mlsLabel: 'Government Road' },
  { slug: 'sperling-duthie',      mlsLabel: 'Sperling-Duthie' },
  { slug: 'burnaby-lake',         mlsLabel: 'Burnaby Lake' },
  { slug: 'east-burnaby',         mlsLabel: 'East Burnaby' },
  { slug: 'parkcrest',            mlsLabel: 'Parkcrest' },
  { slug: 'central-bn',           mlsLabel: 'Central BN',              displayName: 'Central Burnaby' },
  { slug: 'willingdon-heights',   mlsLabel: 'Willingdon Heights' },
  { slug: 'vancouver-heights-bn', mlsLabel: 'Vancouver Heights' },
  { slug: 'central-park-bs',      mlsLabel: 'Central Park BS',         displayName: 'Central Park' },
  { slug: 'montecito',            mlsLabel: 'Montecito' },
  { slug: 'burnaby-hospital',     mlsLabel: 'Burnaby Hospital' },
  { slug: 'the-crest',            mlsLabel: 'The Crest' },
  { slug: 'cariboo',              mlsLabel: 'Cariboo' },
  { slug: 'upper-deer-lake',      mlsLabel: 'Upper Deer Lake' },
  { slug: 'westridge-bn',         mlsLabel: 'Westridge BN',            displayName: 'Westridge' },
  { slug: 'garden-village',       mlsLabel: 'Garden Village' },
  { slug: 'buckingham-heights',   mlsLabel: 'Buckingham Heights' },
  { slug: 'deer-lake',            mlsLabel: 'Deer Lake' },
  { slug: 'simon-fraser-hills',   mlsLabel: 'Simon Fraser Hills' },
  { slug: 'deer-lake-place',      mlsLabel: 'Deer Lake Place' },
]

/**
 * Normalise a raw MLS label for fuzzy matching:
 * - trim surrounding whitespace
 * - strip a trailing period (MLS labels sometimes appear as "Crescent Bch Ocean Pk." in URLs)
 * - collapse internal whitespace
 * - lower-case for case-insensitive comparison
 */
function normalizeMlsLabel(label: string): string {
  return label.trim().replace(/\.$/, '').replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Normalize any subarea value (URL slug, MLS label, or display name) to its canonical slug.
 * Accepts:
 *   - exact slug  (e.g. 'grandview-heights')
 *   - exact MLS label (e.g. 'Grandview Surrey')
 *   - exact display name (e.g. 'Grandview Heights' — DB territory name differs from MLS code)
 *   - fuzzy MLS label variants (trailing periods, extra whitespace, case differences)
 * Returns null if the value is unrecognised (no redirect should fire).
 */
function normalizeSubareaToSlug(value: string): string | null {
  // 1. Exact slug match (fastest path — already canonical)
  const bySlug = SUBAREA_SLUG_MAP.find(e => e.slug === value)
  if (bySlug) return bySlug.slug
  // 2. Exact MLS label match
  const byMls = SUBAREA_SLUG_MAP.find(e => e.mlsLabel === value)
  if (byMls) return byMls.slug
  // 3. Display name match (for territory names that differ from MLS codes, e.g. ?subarea=Grandview+Heights)
  const byDisplay = SUBAREA_SLUG_MAP.find(e => e.displayName === value)
  if (byDisplay) return byDisplay.slug
  // 4. Fuzzy MLS label match (handles trailing periods, spacing, case variants)
  const normalizedValue = normalizeMlsLabel(value)
  const byFuzzy = SUBAREA_SLUG_MAP.find(e => normalizeMlsLabel(e.mlsLabel) === normalizedValue)
  if (byFuzzy) return byFuzzy.slug
  return null
}

const KNOWN_SUBAREA_SLUGS = new Set(SUBAREA_SLUG_MAP.map(e => e.slug))

// ── Clean SEO URL redirect helpers ───────────────────────────────────────────

const TYPE_TO_PAGE: Record<string, string> = {
  house:     '/houses-for-sale',
  apartment: '/condos-for-sale',
  condo:     '/condos-for-sale',
  townhouse: '/townhouses-for-sale',
  duplex:    '/duplexes-for-sale',
}

// Maps type value → the segment used in the clean path (for /homes-for-sale?type=X redirects)
const TYPE_TO_SEGMENT: Record<string, string> = {
  house:     'houses-for-sale',
  apartment: 'condos-for-sale',
  condo:     'condos-for-sale',
  townhouse: 'townhouses-for-sale',
  duplex:    'duplexes-for-sale',
}

/**
 * Redirect /homes-for-sale?type=X[&other params] to the dedicated type page,
 * preserving all params EXCEPT type (which is baked into the destination path).
 * Returns null if the type value doesn't map to a known type page.
 */
function buildTypePageRedirect(
  agentPrefix: string,
  sp: URLSearchParams,
  base: URL,
): NextResponse | null {
  const type = (sp.get('type') ?? '').toLowerCase()
  const dest = TYPE_TO_PAGE[type]
  if (!dest) return null

  const remaining = new URLSearchParams()
  for (const [k, v] of sp.entries()) {
    if (k !== 'type') remaining.set(k, v)
  }
  const qs = remaining.toString()
  const cleanPath = `${agentPrefix}${dest}`
  const destination = new URL(qs ? `${cleanPath}?${qs}` : cleanPath, base)
  return NextResponse.redirect(destination, 301)
}

/**
 * If the request matches a /homes-for-sale?type=X&subarea=Y[&beds=Z] pattern
 * that has a clean URL equivalent, return a 301 to the clean path.
 * Subarea can be a known slug OR a raw MLS label — both are normalised.
 */
function buildCleanUrlRedirect(
  agentPrefix: string,
  sp: URLSearchParams,
  base: URL,
): NextResponse | null {
  const type    = (sp.get('type') ?? '').toLowerCase()
  const subarea = sp.get('subarea') ?? ''
  const status  = sp.get('status') ?? ''

  const typeSegment = TYPE_TO_SEGMENT[type]
  if (!typeSegment || !subarea || status) return null

  const slug = normalizeSubareaToSlug(subarea)
  if (!slug) return null

  const bedsRaw = sp.get('beds') ?? ''
  const bedsN   = bedsRaw ? parseInt(bedsRaw, 10) : 0

  const cleanPath = bedsN >= 1
    ? `${agentPrefix}/${typeSegment}/${slug}/${bedsN}-bedrooms`
    : `${agentPrefix}/${typeSegment}/${slug}`

  // Keep non-routing params (price, sort, etc); drop routing params that move into the path
  const remaining = new URLSearchParams()
  for (const [k, v] of sp.entries()) {
    if (!['type', 'subarea', 'beds', 'page', 'status'].includes(k)) {
      remaining.set(k, v)
    }
  }
  const qs          = remaining.toString()
  const destination = new URL(qs ? `${cleanPath}?${qs}` : cleanPath, base)
  return NextResponse.redirect(destination, 301)
}

/**
 * Handle clean URL redirects for the dedicated type pages
 * (/{type}-for-sale?subarea=X, ?beds=Y, ?price_reduced=1).
 *
 * typedPagePath: e.g. '/houses-for-sale'
 * agentPrefix:  '' in production domain mode, '/agent/:slug' in dev path mode
 */
function buildTypedPageCleanRedirect(
  agentPrefix: string,
  typedPagePath: string,
  sp: URLSearchParams,
  base: URL,
): NextResponse | null {
  const subarea      = sp.get('subarea') ?? ''
  const priceReduced = sp.get('price_reduced') ?? ''
  const status       = sp.get('status') ?? ''

  // Never redirect sold listings to clean paths (sold filtering uses ?status=sold)
  if (status) return null

  // /type-for-sale?price_reduced=1 → /type-for-sale/price-reduced
  if (priceReduced === '1' && !subarea) {
    const dest = new URL(`${agentPrefix}${typedPagePath}/price-reduced`, base)
    return NextResponse.redirect(dest, 301)
  }

  // /type-for-sale?subarea=X[&beds=Y] → /type-for-sale/{slug}[/{N}-bedrooms]
  if (subarea) {
    const slug = normalizeSubareaToSlug(subarea)
    if (!slug) return null

    const bedsRaw = sp.get('beds') ?? ''
    const bedsN   = bedsRaw ? parseInt(bedsRaw, 10) : 0

    const cleanPath = bedsN >= 1
      ? `${agentPrefix}${typedPagePath}/${slug}/${bedsN}-bedrooms`
      : `${agentPrefix}${typedPagePath}/${slug}`

    // Keep non-routing params; drop params now encoded in the path
    const remaining = new URLSearchParams()
    for (const [k, v] of sp.entries()) {
      if (!['subarea', 'beds', 'page', 'price_reduced'].includes(k)) {
        remaining.set(k, v)
      }
    }
    const qs  = remaining.toString()
    const dest = new URL(qs ? `${cleanPath}?${qs}` : cleanPath, base)
    return NextResponse.redirect(dest, 301)
  }

  return null
}

/**
 * Handle /homes-for-sale?subarea=X with NO type param → /homes-for-sale/{slug}
 * Fires only when subarea is present and type is absent (type-present case is
 * already handled by buildCleanUrlRedirect which routes to the typed page).
 */
function buildHomesSubareaRedirect(
  agentPrefix: string,
  sp: URLSearchParams,
  base: URL,
): NextResponse | null {
  const type    = (sp.get('type') ?? '').toLowerCase()
  const subarea = sp.get('subarea') ?? ''
  const status  = sp.get('status') ?? ''

  if (type || !subarea || status) return null

  const slug = normalizeSubareaToSlug(subarea)
  if (!slug) return null

  const cleanPath = `${agentPrefix}/homes-for-sale/${slug}`

  const remaining = new URLSearchParams()
  for (const [k, v] of sp.entries()) {
    if (!['subarea', 'page'].includes(k)) remaining.set(k, v)
  }
  const qs = remaining.toString()
  return NextResponse.redirect(new URL(qs ? `${cleanPath}?${qs}` : cleanPath, base), 301)
}

/**
 * Strip decorative-only query params (sort, view, page=1) from listing pages.
 * Returns a 301 redirect to the clean path if ALL present params are decorative
 * and there are no meaningful content params alongside them.
 *
 * soldPage: pass true for /sold — treats status=sold as decorative (it's redundant there)
 */
function buildDecorativeOnlyRedirect(
  cleanPath: string,
  sp: URLSearchParams,
  base: URL,
  options?: { soldPage?: boolean },
): NextResponse | null {
  const allKeys = [...sp.keys()]
  if (allKeys.length === 0) return null

  const decorativeSet = new Set(
    options?.soldPage
      ? ['sort', 'status', 'page']
      : ['sort', 'page'],
  )

  // All present params must be decorative — any meaningful content param aborts
  if (!allKeys.every(k => decorativeSet.has(k))) return null

  // Don't redirect page > 1 — let noindex handle those (users may share deep links)
  const pageVal = sp.get('page')
  if (pageVal && parseInt(pageVal, 10) > 1) return null

  // All params are decorative and page ≤ 1: 301 to the bare path
  const resp = NextResponse.redirect(new URL(cleanPath, base), 301)
  resp.headers.set('Cache-Control', 'no-store')
  return resp
}

// ── AI agent discovery helpers ────────────────────────────────────────────────

function canonicalHost(h: string): string {
  return h.startsWith('www.') ? h.slice(4) : h
}

function addAiDiscoveryHeaders(resp: NextResponse, host: string, pathPrefix?: string): void {
  const canon = canonicalHost(host)
  const base = pathPrefix ? `https://${canon}${pathPrefix}` : `https://${canon}`
  resp.headers.set('Content-Signal', 'ai-train=no, search=yes, ai-input=no')
  resp.headers.set('Link', `<${base}/llms.txt>; rel="service-doc"`)
}

// ── Main middleware ───────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  // Detect RSC navigation fetches (Next.js client-side navigation).
  // We must NOT return early here for production custom-domain requests (e.g. suburbia.ca)
  // because the domain-to-slug rewrite hasn't happened yet. Returning NextResponse.next()
  // without the rewrite causes Next.js to 404 the RSC fetch, the client falls back to a
  // hard navigation, and Varnish caches that response under the canonical URL — poisoning it.
  //
  // Instead we carry `isRSC` through and apply Cache-Control: private, no-store to the
  // final rewrite/next response at the bottom of the function. Note: Varnish strips
  // Cache-Control from all backend responses (see its vcl_backend_response), so the
  // complete fix also requires adding RSC header detection to the Varnish VCL:
  //
  //   # In vcl_recv, before the existing bypass block:
  //   if (req.http.RSC == "1" || req.http.Next-Router-State-Tree) { return(pass); }
  //
  // That change requires root/WHM access on the server.
  const isRSC = req.headers.get('RSC') === '1' || !!req.headers.get('Next-Router-State-Tree')

  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(':')[0]
  const pathname = req.nextUrl.pathname

  // Strip basePath to get the clean path
  let cleanPath = BASE_PATH && pathname.startsWith(BASE_PATH)
    ? pathname.slice(BASE_PATH.length) || '/'
    : pathname

  // cPanel Apache may inject /index.php before proxying — treat it as /
  if (cleanPath === '/index.php') cleanPath = '/'

  // Ad-landing pages (e.g. /get-home-value) render with no site nav/footer —
  // AgentLayout reads this header to skip its normal chrome. Detected by suffix
  // so it works whether the request arrives via a custom domain (bare path),
  // a region preview host (/region/get-home-value), or dev mode (/agent/slug/get-home-value).
  const MINIMAL_LANDING_SUFFIXES = ['/get-home-value']
  const cleanPathNoSlash = cleanPath.length > 1 && cleanPath.endsWith('/') ? cleanPath.slice(0, -1) : cleanPath
  const isMinimalLanding = MINIMAL_LANDING_SUFFIXES.some(s => cleanPathNoSlash.endsWith(s))

  // Flag used to skip production-domain-mode redirect branches for residencity.ca.
  const isResidencity = RESIDENCITY_HOSTS.has(host)

  // ── HTTP → HTTPS redirect for production custom domains ────────────────────
  // Varnish sets x-forwarded-proto: http on plain-HTTP requests (before TLS
  // termination). Redirecting here ensures http:// URL variants never render a
  // page that Googlebot could index as a separate URL.
  // NOTE: Apache ProxyPass to port 4000 always sets x-forwarded-proto: http
  // even when the original request came in over HTTPS via Cloudflare. Use
  // CF-Visitor header as the authoritative signal for Cloudflare-proxied sites
  // (suburbia.ca, southsurreywhiterock.com) — if CF-Visitor says https, the
  // original request was HTTPS and we must NOT redirect (causes 504 loop).
  if (!isResidencity && DOMAIN_SLUG_MAP[host]) {
    const proto = (req.headers.get('x-forwarded-proto') || '').split(',')[0].trim()
    const cfVisitor = req.headers.get('cf-visitor') || ''
    const reallyHttp = proto === 'http' && !cfVisitor.includes('"scheme":"https"')
    if (reallyHttp) {
      const dest = `https://${host}${pathname}${req.nextUrl.search}`
      const resp = NextResponse.redirect(dest, 301)
      resp.headers.set('Cache-Control', 'no-store')
      return resp
    }
  }

  // ── Old domain → new canonical domain 301 redirects ───────────────────────
  // southsurreywhiterock.com → findfraservalleyhomes.com
  if (OLD_DOMAIN_REDIRECTS[host]) {
    const newHost = OLD_DOMAIN_REDIRECTS[host]
    const dest = `https://${newHost}${pathname}${req.nextUrl.search}`
    const resp = NextResponse.redirect(dest, 301)
    resp.headers.set('Cache-Control', 'no-store')
    return resp
  }

  // ── website.pixilink.com: region agents ─────────────────────────────────────
  // Case A — /agent/:internalSlug/... → redirect to /:regionSlug/...
  // Catches any hardcoded /agent/{slug} link emitted by server/client code
  // (many pages build these directly) for the two agents that are actually
  // live via a region path on this host. Without this, following one of those
  // links falls through to Laravel's own /agent/{slug} staging page instead of
  // the real Next.js page — this was the cause of broken building/listing
  // links on website.pixilink.com/tricity and /burnaby (July 2026).
  // A matching Laravel-side proxy change (routes/web.php on the server) is
  // required so these /agent/{slug} requests reach this Next.js middleware in
  // the first place — see replit.md.
  if (!isResidencity && REGION_PREVIEW_HOSTS.has(host) && cleanPath.startsWith('/agent/')) {
    const agentMatch = cleanPath.match(/^\/agent\/([^/]+)(\/.*)?$/)
    if (agentMatch) {
      const internalSlug = agentMatch[1]
      const rest = agentMatch[2] || ''
      // Domain-owning agents first: rendering /agent/{slug} here would cache HTML with
      // '/agent/{slug}'-prefixed links that the custom domain then serves (the ISR entry
      // is shared across hosts — see SLUG_CANONICAL_DOMAIN). One hop to the real site.
      const canonicalDomain = SLUG_CANONICAL_DOMAIN[internalSlug]
      if (canonicalDomain) {
        return NextResponse.redirect(`https://${canonicalDomain}${rest || '/'}${req.nextUrl.search}`, 308)
      }
      const regionMap = await getRegionMap()
      const regionSlug = Object.entries(regionMap).find(([, s]) => s === internalSlug)?.[0]
      if (regionSlug) {
        const scheme = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim()
        const qs = req.nextUrl.search
        const dest = `${scheme}://${host}/${regionSlug}${rest}${qs}`
        return NextResponse.redirect(dest, 308)
      }
    }
    // Not a region-mapped slug — fall through untouched (Laravel's own
    // dev/staging /agent/{slug} pages for agents without a live domain yet).
  }

  // ── website.pixilink.com bare-region-path preview (Case B) ─────────────────
  // Restores e.g. website.pixilink.com/tricity, /burnaby as bare-path previews,
  // without touching /admin, /api/*, /sign-in, or root on this host —
  // those all fall through untouched to the rest of the middleware below.
  if (!isResidencity && REGION_PREVIEW_HOSTS.has(host)) {
    const regionMatch = cleanPath.match(/^\/([^/]+)(\/.*)?$/)
    if (regionMatch) {
      const regionSlug = regionMatch[1]
      const regionMap = await getRegionMap()
      const internalSlug = regionMap[regionSlug]
      if (internalSlug) {
        const rest = regionMatch[2] || ''
        // A domain-owning agent must have exactly ONE rendering context. Rendering
        // this preview path would cache /agent/{slug} HTML with '/{region}'-prefixed
        // links, which the custom domain then serves — every link 404s there (see
        // SLUG_CANONICAL_DOMAIN). Redirect instead of rendering. Region-only agents
        // (no canonical domain, e.g. burnaby) keep the preview as their real site.
        const canonicalDomain = SLUG_CANONICAL_DOMAIN[internalSlug]
        if (canonicalDomain) {
          return NextResponse.redirect(`https://${canonicalDomain}${rest || '/'}${req.nextUrl.search}`, 308)
        }
        const url = req.nextUrl.clone()
        url.pathname = `/agent/${internalSlug}${rest}`
        const requestHeaders = new Headers(req.headers)
        requestHeaders.set('x-agent-prefix', `/${regionSlug}`)
        requestHeaders.set('x-residencity-zone', regionSlug)
        if (isMinimalLanding) requestHeaders.set('x-minimal-layout', '1')
        const regionResp = NextResponse.rewrite(url, { request: { headers: requestHeaders } })
        addAiDiscoveryHeaders(regionResp, host, `/${regionSlug}`)
        return regionResp
      }
    }
  }

  // ── Residencity.ca: handle ALL requests before any other checks ────────────
  // Placed here (before the /agent/ early-return) so we can redirect hardcoded
  // /agent/:slug/... server-side links back to the canonical /:region/... URL.
  if (isResidencity) {
    // Fetch DB-driven region map once per request (module-level cache refreshes every 5 min).
    const regionMap = await getRegionMap()

    // Case A — /agent/:internalSlug/... → redirect to /:regionSlug/...
    // Catches any hardcoded /agent/ links emitted by server-rendered pages.
    // Constructs the redirect URL explicitly from the effective host so we
    // never accidentally redirect to a different domain via req.nextUrl.clone().
    if (cleanPath.startsWith('/agent/')) {
      const agentMatch = cleanPath.match(/^\/agent\/([^/]+)(\/.*)?$/)
      if (agentMatch) {
        const internalSlug = agentMatch[1]
        const rest         = agentMatch[2] || ''
        const regionSlug   = Object.entries(regionMap)
          .find(([, s]) => s === internalSlug)?.[0]
        if (regionSlug) {
          const scheme = req.headers.get('x-forwarded-proto') || 'https'
          const qs = req.nextUrl.search  // preserve query string (e.g. ?type=house)
          const dest = `${scheme}://${host}/${regionSlug}${rest}${qs}`
          return NextResponse.redirect(dest, 308)
        }
      }
      return NextResponse.next()
    }

    // Case B-pre — /buildings... without a region prefix (old links / bookmarks).
    // Redirect to /burnaby/buildings[/area-slug] so the region rewrite can take over.
    if (cleanPath === '/buildings' || cleanPath.startsWith('/buildings/')) {
      const scheme = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim()
      let targetPath = cleanPath
      const newSearch = new URLSearchParams(req.nextUrl.search)
      const areaParam = newSearch.get('area')
      if (cleanPath === '/buildings' && areaParam) {
        const areaSlug = areaParam.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        newSearch.delete('area')
        targetPath = `/buildings/${areaSlug}`
      }
      const qs = newSearch.toString()
      return NextResponse.redirect(`${scheme}://${host}/burnaby${targetPath}${qs ? `?${qs}` : ''}`, 301)
    }

    // Case B — /[region-slug]/[rest] → run SEO redirects, then rewrite internally
    const regionMatch = cleanPath.match(/^\/([^/]+)(\/.*)?$/)
    if (regionMatch) {
      const regionSlug   = regionMatch[1]
      const rest         = regionMatch[2] || ''
      const internalSlug = regionMap[regionSlug]
      if (internalSlug) {
        const agentPrefix = `/${regionSlug}`
        const sp          = req.nextUrl.searchParams

        // SEO: /burnaby/buildings?area=X → /burnaby/buildings/area-slug (old query-param style)
        if (rest === '/buildings' && sp.get('area')) {
          const areaRaw  = sp.get('area')!
          const areaSlug = areaRaw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
          const remaining = new URLSearchParams()
          for (const [k, v] of sp.entries()) { if (k !== 'area') remaining.set(k, v) }
          const qs = remaining.toString()
          const destPath = `${agentPrefix}/buildings/${areaSlug}`
          return NextResponse.redirect(new URL(qs ? `${destPath}?${qs}` : destPath, req.nextUrl), 301)
        }

        // SEO: /south-surrey/homes-for-sale?type=X&subarea=Y → clean URL
        if (rest === '/homes-for-sale') {
          const redirect = buildCleanUrlRedirect(agentPrefix, sp, req.nextUrl)
                        ?? buildTypePageRedirect(agentPrefix, sp, req.nextUrl)
                        ?? buildHomesSubareaRedirect(agentPrefix, sp, req.nextUrl)
          if (redirect) return redirect
        }

        // SEO: /south-surrey/{type}-for-sale?subarea=X[&beds=Y] → clean URL
        const typedMatch = rest.match(/^\/(houses-for-sale|condos-for-sale|townhouses-for-sale|duplexes-for-sale)$/)
        if (typedMatch) {
          const redirect = buildTypedPageCleanRedirect(agentPrefix, `/${typedMatch[1]}`, sp, req.nextUrl)
          if (redirect) return redirect
        }

        // SEO: /south-surrey/{type}-for-sale/{raw-subarea} → normalize to canonical slug
        const subareaMatch = rest.match(/^\/(homes-for-sale|houses-for-sale|condos-for-sale|townhouses-for-sale|duplexes-for-sale)\/([^/]+)$/)
        if (subareaMatch) {
          const typeSegment = subareaMatch[1]
          const rawSubarea  = decodeURIComponent(subareaMatch[2])
          // Strip redundant ?subarea= when slug is already in path
          if (KNOWN_SUBAREA_SLUGS.has(rawSubarea) && sp.get('subarea')) {
            const remaining = new URLSearchParams()
            for (const [k, v] of sp.entries()) {
              if (k !== 'subarea') remaining.set(k, v)
            }
            const qs = remaining.toString()
            const destPath = `${agentPrefix}/${typeSegment}/${rawSubarea}`
            return NextResponse.redirect(new URL(qs ? `${destPath}?${qs}` : destPath, req.nextUrl), 301)
          }
          // Normalize raw MLS label to canonical slug
          if (!KNOWN_SUBAREA_SLUGS.has(rawSubarea)) {
            const slug = normalizeSubareaToSlug(rawSubarea)
            if (slug) {
              const qs = sp.toString()
              const destPath = `${agentPrefix}/${typeSegment}/${slug}`
              return NextResponse.redirect(new URL(qs ? `${destPath}?${qs}` : destPath, req.nextUrl), 301)
            }
          }
        }

        // SEO: /south-surrey/market?tab=archive[&type=X] → clean archive URL
        const tab  = sp.get('tab')  ?? ''
        const type = sp.get('type') ?? ''
        if (rest === '/market') {
          const ARCHIVE_TYPE_SLUG: Record<string, string> = {
            condos: 'condos', townhouses: 'townhouses',
            houses: 'detached', detached: 'detached', duplexes: 'duplexes',
          }
          if (tab === 'archive') {
            const typeSlug = ARCHIVE_TYPE_SLUG[type.toLowerCase()]
            if (typeSlug) return NextResponse.redirect(new URL(`${agentPrefix}/market/archive/${typeSlug}`, req.nextUrl), 301)
            const dest = new URL(`${agentPrefix}/market/archive`, req.nextUrl)
            dest.search = ''
            return NextResponse.redirect(dest, 301)
          }
          if (tab === 'overview' && !sp.has('subarea')) {
            const dest = new URL(`${agentPrefix}/market`, req.nextUrl)
            dest.search = ''
            return NextResponse.redirect(dest, 301)
          }
        }

        // SEO: /south-surrey/market/archive?type=X → /south-surrey/market/archive/{typeSlug}
        if (rest === '/market/archive' && type) {
          const ARCHIVE_TYPE_SLUG: Record<string, string> = {
            condos: 'condos', townhouses: 'townhouses',
            houses: 'detached', detached: 'detached', duplexes: 'duplexes',
          }
          const typeSlug = ARCHIVE_TYPE_SLUG[type.toLowerCase()]
          if (typeSlug) return NextResponse.redirect(new URL(`${agentPrefix}/market/archive/${typeSlug}`, req.nextUrl), 301)
        }

        // SEO: /south-surrey/market/archive/houses → /south-surrey/market/archive/detached
        const housesMatch = rest.match(/^\/market\/archive\/houses(\/.*)?$/)
        if (housesMatch) {
          const tail = housesMatch[1] ?? ''
          return NextResponse.redirect(new URL(`${agentPrefix}/market/archive/detached${tail}`, req.nextUrl), 301)
        }

        // SEO: /market/{subarea}?month=YYYY-MM → /market/{subarea}/m/YYYY-MM
        const mktSubareaMatchR = rest.match(/^\/market\/([\w-]+)$/)
        if (mktSubareaMatchR) {
          const monthQp = sp.get('month')
          if (monthQp && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthQp)) {
            return NextResponse.redirect(
              new URL(`${agentPrefix}/market/${mktSubareaMatchR[1]}/m/${monthQp}`, req.nextUrl),
              301,
            )
          }
        }

        // Rewrite to internal agent path — browser URL stays at /south-surrey/...
        const url = req.nextUrl.clone()
        url.pathname = `/agent/${internalSlug}${rest}`
        const requestHeaders = new Headers(req.headers)
        requestHeaders.set('x-agent-prefix', `/${regionSlug}`)
        if (isMinimalLanding) requestHeaders.set('x-minimal-layout', '1')
        return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
      }
    }

    // Root of residencity.ca or unrecognised region — rewrite to the hub page.
    // We use a rewrite (not a header stamp) because Apache/Docker may replace
    // the Host header before the Node.js runtime sees it, making header
    // propagation from middleware to server components unreliable in this setup.
    if (cleanPath === '/') {
      const url = req.nextUrl.clone()
      url.pathname = '/residencity'
      return NextResponse.rewrite(url)
    }

    // Bare /sign-in (or /forgot-password) with no region prefix — there is no
    // single agent to sign in to at the apex domain, so send the visitor to
    // the hub to pick their area instead of a hard 404.
    if (cleanPath === '/sign-in' || cleanPath === '/forgot-password') {
      const scheme = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim()
      return NextResponse.redirect(`${scheme}://${host}/`, 302)
    }

    return NextResponse.next()
  }

  // ── Clean SEO URL redirects (must run before the /agent/ early return) ────
  //
  // Dev path mode: /agent/:slug/homes-for-sale?type=X&subarea=Y → /agent/:slug/X-for-sale/Y
  const devHFSMatch = cleanPath.match(/^\/agent\/([^/]+)\/homes-for-sale$/)
  if (devHFSMatch) {
    const agentSlug   = devHFSMatch[1]
    const agentPrefix = `/agent/${agentSlug}`
    const sp          = req.nextUrl.searchParams
    const redirect    = buildCleanUrlRedirect(agentPrefix, sp, req.nextUrl)
                     ?? buildTypePageRedirect(agentPrefix, sp, req.nextUrl)
                     ?? buildHomesSubareaRedirect(agentPrefix, sp, req.nextUrl)
                     ?? buildDecorativeOnlyRedirect(cleanPath, sp, req.nextUrl)
    if (redirect) return redirect
  }

  // Production domain mode: /homes-for-sale?type=X[&subarea=Y] → clean URL
  if (!isResidencity && cleanPath === '/homes-for-sale') {
    const sp       = req.nextUrl.searchParams
    const redirect = buildCleanUrlRedirect('', sp, req.nextUrl)
                  ?? buildTypePageRedirect('', sp, req.nextUrl)
                  ?? buildHomesSubareaRedirect('', sp, req.nextUrl)
                  ?? buildDecorativeOnlyRedirect('/homes-for-sale', sp, req.nextUrl)
    if (redirect) return redirect
  }

  // Dev path mode: redirect query-string filters on type-specific listing pages
  const devTypedMatch = cleanPath.match(/^\/agent\/([^/]+)\/(houses-for-sale|condos-for-sale|townhouses-for-sale)$/)
  if (devTypedMatch) {
    const agentSlug      = devTypedMatch[1]
    const agentPrefix    = `/agent/${agentSlug}`
    const typedPagePath  = `/${devTypedMatch[2]}`
    const sp             = req.nextUrl.searchParams
    const redirect = buildTypedPageCleanRedirect(agentPrefix, typedPagePath, sp, req.nextUrl)
                  ?? buildDecorativeOnlyRedirect(cleanPath, sp, req.nextUrl)
    if (redirect) return redirect
  }

  // Production domain mode: redirect query-string filters on type-specific pages
  const prodTypedMatch = !isResidencity && cleanPath.match(/^\/(houses-for-sale|condos-for-sale|townhouses-for-sale)$/)
  if (prodTypedMatch) {
    const typedPagePath = `/${prodTypedMatch[1]}`
    const sp            = req.nextUrl.searchParams
    const redirect = buildTypedPageCleanRedirect('', typedPagePath, sp, req.nextUrl)
                  ?? buildDecorativeOnlyRedirect(cleanPath, sp, req.nextUrl)
    if (redirect) return redirect
  }

  // Strip decorative-only params from /sold (prod) and /agent/:slug/sold (dev)
  const devSoldMatch = cleanPath.match(/^\/agent\/([^/]+)\/sold$/)
  if (devSoldMatch) {
    const sp = req.nextUrl.searchParams
    const redirect = buildDecorativeOnlyRedirect(cleanPath, sp, req.nextUrl, { soldPage: true })
    if (redirect) return redirect
  }
  if (!isResidencity && cleanPath === '/sold') {
    const sp = req.nextUrl.searchParams
    const redirect = buildDecorativeOnlyRedirect('/sold', sp, req.nextUrl, { soldPage: true })
    if (redirect) return redirect
  }

  // Strip decorative-only params from /buildings (prod) and /agent/:slug/buildings (dev)
  const devBuildingsMatch = cleanPath.match(/^\/agent\/([^/]+)\/buildings$/)
  if (devBuildingsMatch) {
    const sp = req.nextUrl.searchParams
    const redirect = buildDecorativeOnlyRedirect(cleanPath, sp, req.nextUrl)
    if (redirect) return redirect
  }
  if (!isResidencity && cleanPath === '/buildings') {
    const sp = req.nextUrl.searchParams
    const redirect = buildDecorativeOnlyRedirect('/buildings', sp, req.nextUrl)
    if (redirect) return redirect
  }

  // Dev path mode: handle unknown subarea slugs on subarea paths.
  // Two cases:
  //   a) Path subarea segment is a known slug but ?subarea= QS is also present — strip the QS.
  //   b) Path subarea segment is NOT a known slug (e.g. raw MLS label "Crescent Bch Ocean Pk."
  //      with a trailing period that Next.js fails to route) — normalise and 301 to the clean slug.
  const devSubareaQsMatch = cleanPath.match(/^\/agent\/([^/]+)\/(homes-for-sale|houses-for-sale|condos-for-sale|townhouses-for-sale)\/([^/]+)$/)
  if (devSubareaQsMatch) {
    const rawSubarea = decodeURIComponent(devSubareaQsMatch[3])
    const sp = req.nextUrl.searchParams
    const subareaQs = sp.get('subarea') ?? ''
    // (a) Strip redundant ?subarea= when the path already contains a known slug
    if (subareaQs && KNOWN_SUBAREA_SLUGS.has(rawSubarea)) {
      const remaining = new URLSearchParams()
      for (const [k, v] of sp.entries()) {
        if (k !== 'subarea') remaining.set(k, v)
      }
      const qs   = remaining.toString()
      const dest = new URL(qs ? `${cleanPath}?${qs}` : cleanPath, req.nextUrl)
      return NextResponse.redirect(dest, 301)
    }
    // (b) Normalise raw MLS label / dotted path-segment to its canonical slug
    if (!KNOWN_SUBAREA_SLUGS.has(rawSubarea)) {
      const slug = normalizeSubareaToSlug(rawSubarea)
      if (slug) {
        const agentSlug   = devSubareaQsMatch[1]
        const typeSegment = devSubareaQsMatch[2]
        const qs          = sp.toString()
        const destPath    = `/agent/${agentSlug}/${typeSegment}/${slug}`
        return NextResponse.redirect(new URL(qs ? `${destPath}?${qs}` : destPath, req.nextUrl), 301)
      }
    }
  }

  // Production domain mode: normalize raw MLS labels / dotted path-segment subareas.
  // e.g. /townhouses-for-sale/Crescent%20Bch%20Ocean%20Pk. → /townhouses-for-sale/crescent-beach
  const prodSubareaPathMatch = !isResidencity && cleanPath.match(/^\/(homes-for-sale|houses-for-sale|condos-for-sale|townhouses-for-sale)\/([^/]+)$/)
  if (prodSubareaPathMatch) {
    const rawSubarea = decodeURIComponent(prodSubareaPathMatch[2])
    if (!KNOWN_SUBAREA_SLUGS.has(rawSubarea)) {
      const slug = normalizeSubareaToSlug(rawSubarea)
      if (slug) {
        const typeSegment = prodSubareaPathMatch[1]
        const sp          = req.nextUrl.searchParams
        const qs          = sp.toString()
        const destPath    = `/${typeSegment}/${slug}`
        return NextResponse.redirect(new URL(qs ? `${destPath}?${qs}` : destPath, req.nextUrl), 301)
      }
    }
  }

  // ── Market tab/type → clean archive URLs (301, query-string stripped) ───
  // Config-level redirects always forward the original query string to the
  // destination. Handling these here gives full control so the browser lands
  // on a canonical URL with no leftover ?tab= or ?type= params.
  {
    const sp = req.nextUrl.searchParams
    const tab  = sp.get('tab')  ?? ''
    const type = sp.get('type') ?? ''

    // Maps ?type value (case-insensitive) → archive path segment
    const ARCHIVE_TYPE: Record<string, string> = {
      condos: 'condos', townhouses: 'townhouses',
      houses: 'houses', detached: 'houses',
    }
    const typeSeg = ARCHIVE_TYPE[type.toLowerCase()] ?? ''

    // Production domain mode: /market  |  Dev path mode: /agent/:slug/market
    const mktProd = !isResidencity && cleanPath === '/market'
    const mktDev  = cleanPath.match(/^\/agent\/([^/]+)\/market$/)

    if (mktProd || mktDev) {
      const pfx = mktDev ? `/agent/${mktDev[1]}` : ''
      if (tab === 'archive') {
        // tab=archive → /market/archive (with optional clean type path)
        const ARCHIVE_TYPE_SLUG: Record<string, string> = {
          condos: 'condos', townhouses: 'townhouses', houses: 'detached', detached: 'detached', duplexes: 'duplexes',
        }
        const dest = new URL(`${pfx}/market/archive`, req.nextUrl)
        dest.search = ''
        const typeSlug = ARCHIVE_TYPE_SLUG[type.toLowerCase()]
        if (typeSlug) return NextResponse.redirect(new URL(`${pfx}/market/archive/${typeSlug}`, req.nextUrl), 301)
        return NextResponse.redirect(dest, 301)
      }
      if (tab === 'overview' && !sp.has('subarea')) {
        const dest = new URL(`${pfx}/market`, req.nextUrl)
        dest.search = ''
        return NextResponse.redirect(dest, 301)
      }
    }

    // SEO: /market/{subarea}?month=YYYY-MM → canonical /market/{subarea}/m/YYYY-MM
    const mktSubareaProd = !isResidencity && cleanPath.match(/^\/market\/([\w-]+)$/)
    const mktSubareaDev  = cleanPath.match(/^\/agent\/([^/]+)\/market\/([\w-]+)$/)
    if (mktSubareaProd || mktSubareaDev) {
      const monthQp = sp.get('month')
      if (monthQp && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthQp)) {
        const pfx = mktSubareaDev ? `/agent/${mktSubareaDev[1]}` : ''
        const subareaSlug = mktSubareaDev ? mktSubareaDev[2] : mktSubareaProd![1]
        return NextResponse.redirect(
          new URL(`${pfx}/market/${subareaSlug}/m/${monthQp}`, req.nextUrl),
          301,
        )
      }
    }

    // Redirect ?type=X on /market/archive → clean path /market/archive/{typeSlug}
    const archProd = cleanPath === '/market/archive'
    const archDev  = cleanPath.match(/^\/agent\/([^/]+)\/market\/archive$/)
    if ((archProd || archDev) && type) {
      const ARCHIVE_TYPE_SLUG: Record<string, string> = {
        condos: 'condos', townhouses: 'townhouses', houses: 'detached', detached: 'detached', duplexes: 'duplexes',
      }
      const typeSlug = ARCHIVE_TYPE_SLUG[type.toLowerCase()]
      if (typeSlug) {
        const pfx = archDev ? `/agent/${archDev[1]}` : ''
        return NextResponse.redirect(new URL(`${pfx}/market/archive/${typeSlug}`, req.nextUrl), 301)
      }
    }

    // Redirect legacy /market/archive/houses → /market/archive/detached
    const housesSegProd = cleanPath.match(/^\/market\/archive\/houses(\/.*)?$/)
    const housesSegDev  = cleanPath.match(/^\/agent\/([^/]+)\/market\/archive\/houses(\/.*)?$/)
    if (housesSegProd || housesSegDev) {
      const pfx = housesSegDev ? `/agent/${housesSegDev[1]}` : ''
      const rest = (housesSegProd ? housesSegProd[1] : housesSegDev![2]) ?? ''
      return NextResponse.redirect(new URL(`${pfx}/market/archive/detached${rest}`, req.nextUrl), 301)
    }
  }

  // Already on an agent path, or an API/internal route — no rewrite needed
  if (cleanPath.startsWith('/agent/') || cleanPath.startsWith('/api/')) {
    // Showcase preset: gate removed pages in dev path mode (/agent/{slug}/...)
    if (isMinimalLanding) {
      const requestHeaders = new Headers(req.headers)
      requestHeaders.set('x-minimal-layout', '1')
      return NextResponse.next({ request: { headers: requestHeaders } })
    }
    return NextResponse.next()
  }

  // Admin routes: protect all /admin/* except /admin/login
  if (cleanPath.startsWith('/admin')) {
    if (cleanPath === '/admin/login' || cleanPath === '/admin/login/') {
      return NextResponse.next()
    }

    const token = req.cookies.get('admin_token')?.value
    if (!token || !(await isValidAdminToken(token))) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  }

  // Agent portal routes: protect all /agent-portal/* except /agent-portal/login
  if (cleanPath.startsWith('/agent-portal')) {
    if (cleanPath === '/agent-portal/login' || cleanPath === '/agent-portal/login/') {
      return NextResponse.next()
    }

    const token = req.cookies.get('agent_portal_token')?.value
    if (!token || !(await isValidAgentPortalToken(token))) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/agent-portal/login'
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  }

  // SEO files + .well-known/* served at root level — do not rewrite to /agent/:slug
  if (
    cleanPath === '/robots.txt' ||
    cleanPath === '/sitemap.xml' ||
    (cleanPath.startsWith('/sitemap-') && cleanPath.endsWith('.xml')) ||
    cleanPath.startsWith('/.well-known/')
  ) {
    const resp = NextResponse.next()
    // Add AI discovery headers on .well-known/* responses for all known production hosts
    if (cleanPath.startsWith('/.well-known/') && (DOMAIN_SLUG_MAP[host] || REGION_PREVIEW_HOSTS.has(host))) {
      addAiDiscoveryHeaders(resp, host)
    }
    return resp
  }

  // Try to match known agent custom domain
  const slug = DOMAIN_SLUG_MAP[host]
  if (slug) {
    // Enforce HTTPS on custom-domain requests.
    // Cloudflare passes CF-Visitor: {"scheme":"http"} on plain-HTTP requests and
    // CF-Visitor: {"scheme":"https"} on HTTPS requests.
    // Use a negative lookahead-equivalent check to avoid matching "https" ⊇ "http".
    const cfVisitor = req.headers.get('CF-Visitor') ?? ''
    if (cfVisitor.includes('"scheme":"http"') && !cfVisitor.includes('"scheme":"https"')) {
      const httpsResp = NextResponse.redirect(`https://${host}${pathname}${req.nextUrl.search}`, 302)
      httpsResp.headers.set('Cache-Control', 'no-store')
      return httpsResp
    }

    // Safety net: strip accidental region-slug prefix from domain-mode links.
    // e.g. suburbia.ca/tricity/building/... → suburbia.ca/building/...
    // Pages that use resolveAgentPrefix() generate bare paths now, but stale
    // Varnish/CF cache may still serve old /tricity/... hrefs for a while.
    const regionMap = await getRegionMap()
    const regionSlugForDomain = Object.entries(regionMap).find(([, s]) => s === slug)?.[0]
    if (regionSlugForDomain && cleanPath.startsWith(`/${regionSlugForDomain}/`)) {
      const rest = cleanPath.slice(regionSlugForDomain.length + 1)
      const scheme = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim()
      return NextResponse.redirect(`${scheme}://${host}${rest}${req.nextUrl.search}`, 308)
    }

    const url = req.nextUrl.clone()
    url.pathname = `/agent/${slug}${cleanPath === '/' ? '' : cleanPath}`
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-agent-prefix', '')
    if (isMinimalLanding) requestHeaders.set('x-minimal-layout', '1')
    const domainResp = NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    if (isRSC) domainResp.headers.set('Cache-Control', 'private, no-store')
    addAiDiscoveryHeaders(domainResp, host)
    return domainResp
  }

  if (isRSC) {
    const rscFallback = NextResponse.next()
    rscFallback.headers.set('Cache-Control', 'private, no-store')
    return rscFallback
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js)).*)'],
}
