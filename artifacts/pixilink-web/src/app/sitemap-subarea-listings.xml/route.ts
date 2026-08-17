export const dynamic = 'force-dynamic'

import { resolveAgentFromHost, buildBaseUrl, urlset, xmlResponse, isoDate } from '@/lib/sitemap-utils'
import type { UrlEntry } from '@/lib/sitemap-utils'
import { getListings } from '@/lib/api'
import { fromSubareaSlug } from '@/app/agent/[slug]/homes-for-sale/subareaUtils'

// Each type path maps to the `type` filter value used by getListings().
// `homes-for-sale` = undefined (unified "all types" route).
const TYPE_PATHS: { path: string; type?: string; hasBedsPages: boolean; hasPriceReduced: boolean }[] = [
  { path: 'houses-for-sale', type: 'House', hasBedsPages: true, hasPriceReduced: true },
  { path: 'condos-for-sale', type: 'Apartment', hasBedsPages: true, hasPriceReduced: true },
  { path: 'townhouses-for-sale', type: 'Townhouse', hasBedsPages: true, hasPriceReduced: true },
  { path: 'homes-for-sale', type: undefined, hasBedsPages: true, hasPriceReduced: false },
  { path: 'duplexes-for-sale', type: 'Duplex', hasBedsPages: true, hasPriceReduced: false },
]

const SUBAREA_SLUGS = [
  'white-rock',
  'crescent-beach',
  'elgin-chantrell',
  'grandview-surrey',
  'morgan-creek',
  'sunnyside-park',
  'king-george-corridor',
  'pacific-douglas',
  'rosemary-heights',
  'hazelmere',
  'ocean-park',
  'brookswood',
  'south-surrey',
] as const

const BED_COUNTS = [1, 2, 3, 4, 5] as const

// In-process cache: this route runs `force-dynamic` inside a long-lived Docker
// Node process, so a module-scope Map survives across requests within the same
// process and lets repeat sitemap fetches (crawlers re-poll this hourly-cached
// route often) skip re-querying the backend for combos we already checked
// recently. TTL keeps it from going stale as inventory changes.
const COUNT_CACHE_TTL_MS = 30 * 60 * 1000
const countCache = new Map<string, { total: number; ts: number }>()

// A real backend error on a subarea-filtered query throws (getListings never
// fabricates fallback data for those), so a cache miss + failed check should
// fail OPEN (assume nonzero / include the URL) rather than silently stripping
// valid URLs out of the sitemap during a transient backend blip.
async function hasListings(slug: string, params: { type?: string; subarea: string; beds?: number; min_year?: number }): Promise<boolean> {
  const key = JSON.stringify(params)
  const cached = countCache.get(key)
  if (cached && Date.now() - cached.ts < COUNT_CACHE_TTL_MS) return cached.total > 0

  try {
    const { total } = await getListings(slug, { status: 'Active', limit: 1, noFallback: true, ...params })
    countCache.set(key, { total, ts: Date.now() })
    return total > 0
  } catch {
    return true
  }
}

async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

export async function GET(): Promise<Response> {
  const agent = await resolveAgentFromHost()
  if (!agent) return xmlResponse(urlset([]))

  const base = buildBaseUrl(agent)
  const now = isoDate(new Date())
  const entries: UrlEntry[] = []

  // homes-for-sale built-YYYY pages (subarea-scoped) — only include if the
  // subarea actually has any homes built in the current year on MLS® right now.
  // currentYear is computed at request time so the sitemap advances automatically
  // each calendar year without any manual code change.
  const builtYear = new Date().getFullYear()
  const builtYearHits = await mapLimit(SUBAREA_SLUGS, 8, async (subarea) => {
    const ok = await hasListings(agent.slug, { subarea: fromSubareaSlug(subarea), min_year: builtYear })
    return { subarea, ok }
  })
  for (const { subarea, ok } of builtYearHits) {
    if (!ok) continue
    entries.push({
      loc: `${base}/homes-for-sale/${subarea}/built-${builtYear}`,
      lastmod: now,
      changefreq: 'monthly',
      priority: 0.6,
    })
  }

  for (const { path: typePath, type, hasBedsPages, hasPriceReduced } of TYPE_PATHS) {
    if (hasPriceReduced) {
      // Not subarea-scoped and low-volume (one URL per type) — always include;
      // not worth an extra backend round trip to gate a single low-risk entry.
      entries.push({
        loc: `${base}/${typePath}/price-reduced`,
        lastmod: now,
        changefreq: 'weekly',
        priority: 0.6,
      })
    }

    const subareaResults = await mapLimit(SUBAREA_SLUGS, 8, async (subarea) => {
      const mlsLabel = fromSubareaSlug(subarea)
      const total = await hasListings(agent.slug, { type, subarea: mlsLabel })
      return { subarea, mlsLabel, total }
    })

    for (const { subarea, mlsLabel, total } of subareaResults) {
      if (!total) continue

      entries.push({
        loc: `${base}/${typePath}/${subarea}`,
        lastmod: now,
        changefreq: 'weekly',
        priority: 0.6,
      })

      if (!hasBedsPages) continue

      const bedsHits = await mapLimit(BED_COUNTS, 5, async (beds) => {
        const ok = await hasListings(agent.slug, { type, subarea: mlsLabel, beds })
        return { beds, ok }
      })
      for (const { beds, ok } of bedsHits) {
        if (!ok) continue
        entries.push({
          loc: `${base}/${typePath}/${subarea}/${beds}-bedrooms`,
          lastmod: now,
          changefreq: 'weekly',
          priority: 0.6,
        })
      }
    }
  }

  return xmlResponse(urlset(entries))
}
