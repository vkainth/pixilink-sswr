export const dynamic = 'force-dynamic'

import { resolveAgentFromHost, buildBaseUrl, urlset, xmlResponse } from '@/lib/sitemap-utils'
import { getListings } from '@/lib/api'
import type { UrlEntry } from '@/lib/sitemap-utils'

const PAGE_LIMIT = 250

export async function GET(): Promise<Response> {
  const agent = await resolveAgentFromHost()
  if (!agent) return xmlResponse(urlset([]))

  const base = buildBaseUrl(agent)
  const entries: UrlEntry[] = []

  try {
    let page = 1
    let collected = 0
    let total = Infinity

    let emptyRetries = 0
    const MAX_EMPTY_RETRIES = 2

    while (collected < total) {
      const { listings, total: t } = await getListings(agent.slug, {
        status: 'Terminated',
        limit: PAGE_LIMIT,
        page,
        noFallback: true,
      })
      // Only update total from a real response — a failed noFallback call
      // returns total:0 which must not overwrite a previously known real total.
      if (t > 0) total = t
      for (const listing of listings) {
        if (listing.mls_no || listing.slug) {
          entries.push({
            loc: `${base}/listing/${listing.slug ?? listing.mls_no}`,
            changefreq: 'yearly',
            priority: 0.4,
          })
        }
      }
      collected += listings.length
      if (listings.length === 0) {
        if (emptyRetries < MAX_EMPTY_RETRIES) { emptyRetries++; continue }
        break
      }
      emptyRetries = 0
      if (listings.length < PAGE_LIMIT && collected >= total) break
      page++
    }
  } catch {
    // return whatever was collected before the failure
  }

  return xmlResponse(urlset(entries))
}
