export const dynamic = 'force-dynamic'

import { urlset, xmlResponse, RESIDENCITY_ZONES } from '@/lib/sitemap-utils'
import { getListings } from '@/lib/api'
import type { UrlEntry } from '@/lib/sitemap-utils'

const BASE_URL = 'https://residencity.ca'
const PAGE_LIMIT = 250

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ zone: string }> }
): Promise<Response> {
  const { zone } = await params
  const zoneConfig = RESIDENCITY_ZONES.find(z => z.slug === zone)

  if (!zoneConfig?.agentSlug) {
    return xmlResponse(urlset([]))
  }

  const entries: UrlEntry[] = []

  try {
    let page = 1
    let collected = 0
    let total = Infinity

    while (collected < total) {
      const { listings, total: t } = await getListings(zoneConfig.agentSlug, {
        status: 'Active',
        limit: PAGE_LIMIT,
        page,
      })
      total = t
      for (const listing of listings) {
        if (listing.mls_no || listing.slug) {
          entries.push({
            loc: `${BASE_URL}/${zone}/listing/${listing.slug ?? listing.mls_no}`,
            changefreq: 'daily',
            priority: 0.8,
          })
        }
      }
      collected += listings.length
      if (listings.length < PAGE_LIMIT) break
      page++
    }
  } catch {
    // return whatever was collected before the failure
  }

  return xmlResponse(urlset(entries))
}
