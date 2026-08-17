export const dynamic = 'force-dynamic'

import { resolveAgentFromHost, buildBaseUrl, urlset, xmlResponse, isoDate } from '@/lib/sitemap-utils'
import { getLandingPages, getNeighbourhoods } from '@/lib/api'
import type { UrlEntry } from '@/lib/sitemap-utils'

const PROPERTY_TYPES = ['condos', 'townhouses', 'houses'] as const

export async function GET(): Promise<Response> {
  const agent = await resolveAgentFromHost()
  if (!agent) return xmlResponse(urlset([]))

  const base = buildBaseUrl(agent)
  const now = isoDate(new Date())
  const entries: UrlEntry[] = []

  // Fetch landing pages and neighbourhoods in parallel.
  // Neighbourhoods serve two purposes: territory-driven fallback pages and the
  // active-inventory guard for property-type variant URLs.
  let landingPages: Awaited<ReturnType<typeof getLandingPages>> = []
  let neighbourhoodActiveMap = new Map<string, number>()

  await Promise.allSettled([
    getLandingPages(agent.slug).then(pages => { landingPages = pages }),
    getNeighbourhoods(agent.slug).then(neighbourhoods => {
      for (const n of neighbourhoods) {
        neighbourhoodActiveMap.set(n.slug, n.active_count)
      }
    }),
  ])

  // DB-managed landing pages (highest priority — may have custom content)
  const dbSlugs = new Set<string>()
  for (const lp of landingPages) {
    const loc = lp.area_slug
      ? `${base}/top-realtor/${lp.city_slug}/${lp.area_slug}`
      : `${base}/top-realtor/${lp.city_slug}`
    entries.push({
      loc,
      lastmod: lp.updated_at ? isoDate(new Date(lp.updated_at)) : now,
      changefreq: 'weekly',
      priority: 0.9,
    })
    dbSlugs.add(lp.area_slug ?? lp.city_slug)

    // Property-type variants only exist for area-level pages
    // (/top-realtor/{city}/{area}/condos|townhouses|houses).
    // Guard: only emit when inventory is positively confirmed non-zero.
    // The backend omits zero-inventory areas from the neighbourhood list
    // rather than returning them with active_count=0, so `undefined` in the
    // map means "no active listings found" — not "unknown". We require an
    // explicit active_count > 0 to avoid thin/empty 200 pages in the sitemap.
    if (lp.area_slug) {
      const activeCount = neighbourhoodActiveMap.get(lp.area_slug)
      if (activeCount !== undefined && activeCount > 0) {
        for (const propertyType of PROPERTY_TYPES) {
          entries.push({
            loc: `${base}/top-realtor/${lp.city_slug}/${lp.area_slug}/${propertyType}`,
            lastmod: lp.updated_at ? isoDate(new Date(lp.updated_at)) : now,
            changefreq: 'weekly',
            priority: 0.8,
          })
        }
      }
    }
  }

  // Territory-driven pages: every neighbourhood that doesn't already have a DB entry.
  // This auto-generates /top-realtor/{slug} for all agent territories with no admin work.
  for (const [slug, activeCount] of neighbourhoodActiveMap) {
    if (dbSlugs.has(slug)) continue
    if (activeCount === 0) continue
    entries.push({
      loc: `${base}/top-realtor/${slug}`,
      lastmod: now,
      changefreq: 'weekly',
      priority: 0.8,
    })
  }

  return xmlResponse(urlset(entries))
}
