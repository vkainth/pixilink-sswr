export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { resolveAgentFromHost, buildBaseUrl, sitemapIndex, xmlResponse, RESIDENCITY_HOSTS, RESIDENCITY_ZONES } from '@/lib/sitemap-utils'

const SOLD_START_YEAR = 2018

export async function GET(): Promise<Response> {
  const hdrs = await headers()
  const host = (hdrs.get('x-forwarded-host') || hdrs.get('host') || '').split(':')[0]

  if (RESIDENCITY_HOSTS.has(host)) {
    return residencitySitemapIndex()
  }

  const agent = await resolveAgentFromHost()
  if (!agent) {
    return xmlResponse(sitemapIndex([]))
  }

  const base = buildBaseUrl(agent)
  const currentYear = new Date().getFullYear()

  const soldYearLocs: string[] = []
  for (let y = currentYear; y >= SOLD_START_YEAR; y--) {
    soldYearLocs.push(`${base}/sitemap-sold-${y}.xml`)
  }

  const locs = [
    `${base}/sitemap-general.xml`,
    `${base}/sitemap-listings.xml`,
    `${base}/sitemap-buildings.xml`,
    `${base}/sitemap-market.xml`,
    `${base}/sitemap-neighbourhoods.xml`,
    `${base}/sitemap-landing-pages.xml`,
    `${base}/sitemap-subarea-listings.xml`,
    `${base}/sitemap-guides.xml`,
    ...soldYearLocs,
    `${base}/sitemap-terminated-listings.xml`,
  ]

  return xmlResponse(sitemapIndex(locs))
}

function residencitySitemapIndex(): Response {
  const base = 'https://residencity.ca'
  const currentYear = new Date().getFullYear()
  const locs: string[] = []

  for (const zone of RESIDENCITY_ZONES) {
    locs.push(`${base}/sitemap-${zone.slug}-active.xml`)
    for (let y = currentYear; y >= SOLD_START_YEAR; y--) {
      locs.push(`${base}/sitemap-${zone.slug}-sold-${y}.xml`)
    }
  }

  return xmlResponse(sitemapIndex(locs))
}
