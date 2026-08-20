export const dynamic = 'force-dynamic'

import { resolveAgentFromHost, buildBaseUrl, urlset, xmlResponse, isoDate } from '@/lib/sitemap-utils'
import { resolveSiteConfig } from '@/lib/types'
import type { UrlEntry } from '@/lib/sitemap-utils'
import { PERSONA_SLUGS } from '@/lib/personas'

export async function GET(): Promise<Response> {
  const agent = await resolveAgentFromHost()
  if (!agent) return xmlResponse(urlset([]))

  const base = buildBaseUrl(agent)
  const now = isoDate(new Date())

  // Showcase agents serve a different page set (requireShowcase/requireNotShowcase), so
  // advertising the hub list to them meant 22 of 37 URLs answered 404/redirect — measured
  // on a live showcase domain. This list is exactly the pages verified 200 there, plus
  // the showcase-only pages the hub list never had (search, sell-with-me,
  // featured-properties).
  if (resolveSiteConfig(agent).layout_preset === 'showcase') {
    const scEntries: UrlEntry[] = [
      { loc: `${base}/`, lastmod: now, changefreq: 'daily', priority: 1.0 },
      { loc: `${base}/about`, lastmod: now, changefreq: 'monthly', priority: 0.8 },
      { loc: `${base}/sell-with-me`, lastmod: now, changefreq: 'monthly', priority: 0.9 },
      { loc: `${base}/featured-properties`, lastmod: now, changefreq: 'daily', priority: 0.9 },
      { loc: `${base}/contact`, lastmod: now, changefreq: 'monthly', priority: 0.7 },
      { loc: `${base}/search`, lastmod: now, changefreq: 'hourly', priority: 0.9 },
      { loc: `${base}/home-evaluation`, lastmod: now, changefreq: 'monthly', priority: 0.9 },
      { loc: `${base}/homes-for-sale`, lastmod: now, changefreq: 'daily', priority: 0.9 },
      { loc: `${base}/houses-for-sale`, lastmod: now, changefreq: 'daily', priority: 0.9 },
      { loc: `${base}/condos-for-sale`, lastmod: now, changefreq: 'daily', priority: 0.9 },
      { loc: `${base}/townhouses-for-sale`, lastmod: now, changefreq: 'daily', priority: 0.9 },
      { loc: `${base}/duplexes-for-sale`, lastmod: now, changefreq: 'daily', priority: 0.8 },
      { loc: `${base}/houses-for-sale/with-suite`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
      { loc: `${base}/houses-for-sale/legal-suite`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
      { loc: `${base}/houses-for-sale/mortgage-helper`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
      { loc: `${base}/houses-for-sale/coach-home`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
      { loc: `${base}/houses-for-sale/laneway-house`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
      { loc: `${base}/townhouses-for-sale/with-suite`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
    ]
    return xmlResponse(urlset(scEntries))
  }

  const entries: UrlEntry[] = [
    { loc: `${base}/`, lastmod: now, changefreq: 'daily', priority: 1.0 },
    { loc: `${base}/listings`, lastmod: now, changefreq: 'hourly', priority: 0.9 },
    { loc: `${base}/sold`, lastmod: now, changefreq: 'daily', priority: 0.8 },
    { loc: `${base}/home-evaluation`, lastmod: now, changefreq: 'monthly', priority: 0.9 },
    { loc: `${base}/top-realtor`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
    { loc: `${base}/market`, lastmod: now, changefreq: 'weekly', priority: 0.9 },
    { loc: `${base}/market/archive`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
    { loc: `${base}/market/archive/condos`, lastmod: now, changefreq: 'weekly', priority: 0.7 },
    { loc: `${base}/market/archive/townhouses`, lastmod: now, changefreq: 'weekly', priority: 0.7 },
    { loc: `${base}/market/archive/houses`, lastmod: now, changefreq: 'weekly', priority: 0.7 },
    { loc: `${base}/neighbourhoods`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
    { loc: `${base}/buildings`, lastmod: now, changefreq: 'weekly', priority: 0.7 },
    { loc: `${base}/condos-for-sale`, lastmod: now, changefreq: 'daily', priority: 0.9 },
    { loc: `${base}/townhomes-for-sale`, lastmod: now, changefreq: 'daily', priority: 0.9 },
    { loc: `${base}/luxury-homes`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
    { loc: `${base}/ocean-view-homes`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
    { loc: `${base}/houses-for-sale`, lastmod: now, changefreq: 'daily', priority: 0.9 },
    { loc: `${base}/townhouses-for-sale`, lastmod: now, changefreq: 'daily', priority: 0.9 },
    { loc: `${base}/duplexes-for-sale`, lastmod: now, changefreq: 'daily', priority: 0.8 },
    { loc: `${base}/homes-for-sale`, lastmod: now, changefreq: 'daily', priority: 0.9 },
    { loc: `${base}/open-houses`, lastmod: now, changefreq: 'daily', priority: 0.8 },
    { loc: `${base}/new-construction`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
    { loc: `${base}/sellers-guide`, lastmod: now, changefreq: 'monthly', priority: 0.7 },
    { loc: `${base}/buyers-guide`, lastmod: now, changefreq: 'monthly', priority: 0.7 },
    { loc: `${base}/buyers`, lastmod: now, changefreq: 'monthly', priority: 0.6 },
    { loc: `${base}/sellers`, lastmod: now, changefreq: 'monthly', priority: 0.6 },
    { loc: `${base}/about`, lastmod: now, changefreq: 'monthly', priority: 0.6 },
    { loc: `${base}/contact`, lastmod: now, changefreq: 'monthly', priority: 0.6 },
    { loc: `${base}/houses-for-sale/with-suite`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
    { loc: `${base}/houses-for-sale/legal-suite`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
    { loc: `${base}/houses-for-sale/mortgage-helper`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
    { loc: `${base}/houses-for-sale/coach-home`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
    { loc: `${base}/houses-for-sale/laneway-house`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
    { loc: `${base}/townhouses-for-sale/with-suite`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
    ...PERSONA_SLUGS.map((personaSlug): UrlEntry => ({
      loc: `${base}/persona/${personaSlug}`,
      lastmod: now,
      changefreq: 'weekly',
      priority: 0.7,
    })),
  ]

  return xmlResponse(urlset(entries))
}
