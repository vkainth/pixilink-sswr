export const dynamic = 'force-dynamic'

import { resolveAgentFromHost, buildBaseUrl, urlset, xmlResponse, isoDate } from '@/lib/sitemap-utils'
import { resolveSiteConfig } from '@/lib/types'
import { getAiPages } from '@/lib/ai-pages-api'
import type { UrlEntry } from '@/lib/sitemap-utils'

export async function GET(): Promise<Response> {
  const agent = await resolveAgentFromHost()
  if (!agent) return xmlResponse(urlset([]))
  // This whole route family is requireNotShowcase, so for a showcase agent every URL here
  // would 404. Answer with an empty set rather than dead links — a crawler holding an old
  // sitemap index still fetches this file.
  if (resolveSiteConfig(agent).layout_preset === 'showcase') return xmlResponse(urlset([]))

  const base = buildBaseUrl(agent)
  const entries: UrlEntry[] = []

  entries.push({
    loc: `${base}/guide`,
    lastmod: isoDate(new Date()),
    changefreq: 'monthly',
    priority: 0.6,
  })

  try {
    const pages = await getAiPages(agent.slug, 'lifestyle_seo')
    for (const page of pages) {
      entries.push({
        loc: `${base}/guide/${page.slug}`,
        lastmod: page.generated_at ? isoDate(new Date(page.generated_at)) : isoDate(new Date()),
        changefreq: 'monthly',
        priority: 0.6,
      })
    }
  } catch {
    // return empty on failure
  }

  return xmlResponse(urlset(entries))
}
