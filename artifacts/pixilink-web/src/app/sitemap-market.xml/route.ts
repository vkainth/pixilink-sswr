export const dynamic = 'force-dynamic'

import {
  resolveAgentFromHost,
  buildBaseUrl,
  urlset,
  xmlResponse,
  isoDate,
  last24Months,
} from '@/lib/sitemap-utils'
import { resolveSiteConfig } from '@/lib/types'
import { getNeighbourhoods } from '@/lib/api'
import type { UrlEntry } from '@/lib/sitemap-utils'

const PROPERTY_TYPES = ['condos', 'townhouses', 'houses', 'duplexes']

export async function GET(): Promise<Response> {
  const agent = await resolveAgentFromHost()
  if (!agent) return xmlResponse(urlset([]))
  // This whole route family is requireNotShowcase, so for a showcase agent every URL here
  // would 404. Answer with an empty set rather than dead links — a crawler holding an old
  // sitemap index still fetches this file.
  if (resolveSiteConfig(agent).layout_preset === 'showcase') return xmlResponse(urlset([]))

  const base = buildBaseUrl(agent)
  const now = isoDate(new Date())
  const months = last24Months()
  const entries: UrlEntry[] = []

  let subareaSlug: string[] = []
  try {
    const neighbourhoods = await getNeighbourhoods(agent.slug)
    const seen = new Set<string>()
    for (const n of neighbourhoods) {
      const slug = (n.slug ?? (n.subarea || n.city).toLowerCase().replace(/\s+/g, '-'))
      if (!seen.has(slug)) {
        seen.add(slug)
        subareaSlug.push(slug)
      }
    }
  } catch {
    // proceed with no subarea entries
  }

  // /market hub page
  entries.push({
    loc: `${base}/market`,
    lastmod: now,
    changefreq: 'daily',
    priority: 0.9,
  })

  // /market/{subarea} pages
  for (const slug of subareaSlug) {
    entries.push({
      loc: `${base}/market/${slug}`,
      lastmod: now,
      changefreq: 'weekly',
      priority: 0.8,
    })
  }

  // /market/{subarea}/{type} pages
  for (const slug of subareaSlug) {
    for (const ptype of PROPERTY_TYPES) {
      entries.push({
        loc: `${base}/market/${slug}/${ptype}`,
        lastmod: now,
        changefreq: 'weekly',
        priority: 0.75,
      })
    }
  }

  // /market/archive hub page
  entries.push({
    loc: `${base}/market/archive`,
    lastmod: now,
    changefreq: 'monthly',
    priority: 0.7,
  })

  // /market/archive/{subarea} pages
  for (const slug of subareaSlug) {
    entries.push({
      loc: `${base}/market/archive/${slug}`,
      lastmod: now,
      changefreq: 'monthly',
      priority: 0.65,
    })
  }

  // /market/{subarea}/m/YYYY-MM — monthly snapshot pages (last 24 months per subarea)
  for (const slug of subareaSlug) {
    for (const { year, month } of months) {
      const mm = String(month).padStart(2, '0')
      entries.push({
        loc: `${base}/market/${slug}/m/${year}-${mm}`,
        lastmod: now,
        changefreq: 'monthly',
        priority: 0.7,
      })
    }
  }

  // Last 24 months of /market-report/{year}/{mm} — retained for backward-compat
  for (const { year, month } of months) {
    const mm = String(month).padStart(2, '0')

    entries.push({
      loc: `${base}/market-report/${year}/${mm}`,
      lastmod: now,
      changefreq: 'monthly',
      priority: 0.7,
    })

    for (const ptype of PROPERTY_TYPES) {
      entries.push({
        loc: `${base}/market-report/${year}/${mm}/${ptype}`,
        lastmod: now,
        changefreq: 'monthly',
        priority: 0.65,
      })
    }

    for (const slug of subareaSlug) {
      for (const ptype of PROPERTY_TYPES) {
        entries.push({
          loc: `${base}/market-report/${year}/${mm}/${slug}/${ptype}`,
          lastmod: now,
          changefreq: 'monthly',
          priority: 0.6,
        })
      }
    }
  }

  return xmlResponse(urlset(entries))
}
