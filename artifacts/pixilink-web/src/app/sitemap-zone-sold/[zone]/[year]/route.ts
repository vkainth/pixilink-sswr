export const dynamic = 'force-dynamic'

import { urlset, xmlResponse, isoDate, RESIDENCITY_ZONES } from '@/lib/sitemap-utils'
import { getListings } from '@/lib/api'
import type { UrlEntry } from '@/lib/sitemap-utils'

const BASE_URL = 'https://residencity.ca'
const PAGE_LIMIT = 250
const START_YEAR = 2018

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ zone: string; year: string }> }
): Promise<Response> {
  const { zone, year: yearStr } = await params
  const year = parseInt(yearStr, 10)
  const currentYear = new Date().getFullYear()

  if (isNaN(year) || year < START_YEAR || year > currentYear) {
    return xmlResponse(urlset([]))
  }

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
        status: 'Sold',
        year,
        limit: PAGE_LIMIT,
        page,
      })
      total = t
      for (const listing of listings) {
        if (listing.mls_no || listing.slug) {
          entries.push({
            loc: `${BASE_URL}/${zone}/listing/${listing.slug ?? listing.mls_no}`,
            lastmod: listing.sold_date ? isoDate(new Date(listing.sold_date)) : undefined,
            changefreq: 'monthly',
            priority: 0.7,
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
