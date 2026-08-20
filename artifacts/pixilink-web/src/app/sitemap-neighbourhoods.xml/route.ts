export const dynamic = 'force-dynamic'

import { resolveAgentFromHost, buildBaseUrl, urlset, xmlResponse, isoDate } from '@/lib/sitemap-utils'
import { resolveSiteConfig } from '@/lib/types'
import { getNeighbourhoods } from '@/lib/api'
import type { UrlEntry } from '@/lib/sitemap-utils'

export async function GET(): Promise<Response> {
  const agent = await resolveAgentFromHost()
  if (!agent) return xmlResponse(urlset([]))
  // This whole route family is requireNotShowcase, so for a showcase agent every URL here
  // would 404. Answer with an empty set rather than dead links — a crawler holding an old
  // sitemap index still fetches this file.
  if (resolveSiteConfig(agent).layout_preset === 'showcase') return xmlResponse(urlset([]))

  const base = buildBaseUrl(agent)
  const now = isoDate(new Date())
  const entries: UrlEntry[] = []

  try {
    const neighbourhoods = await getNeighbourhoods(agent.slug)
    const seen = new Set<string>()
    for (const n of neighbourhoods) {
      const slug = n.slug ?? (n.subarea || n.city).toLowerCase().replace(/\s+/g, '-')
      if (seen.has(slug)) continue
      seen.add(slug)
      entries.push({
        loc: `${base}/neighbourhood/${slug}`,
        lastmod: now,
        changefreq: 'weekly',
        priority: 0.8,
      })
      entries.push({
        loc: `${base}/neighbourhood/${slug}/sold`,
        lastmod: now,
        changefreq: 'monthly',
        priority: 0.6,
      })
      entries.push({
        loc: `${base}/neighbourhood/${slug}/reports`,
        lastmod: now,
        changefreq: 'monthly',
        priority: 0.6,
      })
    }
  } catch {
    // return empty on failure
  }

  return xmlResponse(urlset(entries))
}
