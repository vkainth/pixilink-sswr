export const dynamic = 'force-dynamic'

import { resolveAgentFromHost, buildBaseUrl, urlset, xmlResponse, isoDate } from '@/lib/sitemap-utils'
import { getBuildings } from '@/lib/api'
import type { UrlEntry } from '@/lib/sitemap-utils'

function areaToSlug(area: string): string {
  return area.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function GET(): Promise<Response> {
  const agent = await resolveAgentFromHost()
  if (!agent) return xmlResponse(urlset([]))

  const base = buildBaseUrl(agent)
  const now = isoDate(new Date())
  const entries: UrlEntry[] = []

  try {
    const buildings = await getBuildings(agent.slug, 1000)

    // Hub page
    entries.push({ loc: `${base}/buildings`, lastmod: now, changefreq: 'weekly', priority: 0.7 })

    // Area hub pages — one per unique area slug
    const seenAreaSlugs = new Set<string>()
    for (const b of buildings) {
      const raw = (b.subarea || b.city || '').trim()
      if (!raw) continue
      const slug = areaToSlug(raw)
      if (!seenAreaSlugs.has(slug)) {
        seenAreaSlugs.add(slug)
        entries.push({ loc: `${base}/buildings/${slug}`, lastmod: now, changefreq: 'weekly', priority: 0.6 })
      }
    }

    // Individual building detail pages
    for (const b of buildings) {
      if (b.slug) {
        entries.push({ loc: `${base}/building/${b.slug}`, lastmod: now, changefreq: 'monthly', priority: 0.5 })
      }
    }
  } catch {
    // return partial on failure
  }

  return xmlResponse(urlset(entries))
}
