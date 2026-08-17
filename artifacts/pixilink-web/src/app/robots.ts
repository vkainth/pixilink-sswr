import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { getAgentByDomain } from '@/lib/api'

export const dynamic = 'force-dynamic'

// residencity.ca is a shared path-based domain (multiple agents under /region/ paths).
// It gets a blanket allow since individual agent seo_noindex flags don't apply here.
const RESIDENCITY_HOSTS = new Set(['residencity.ca', 'www.residencity.ca'])

export default async function robots(): Promise<MetadataRoute.Robots> {
  const hdrs = await headers()
  const host = (hdrs.get('x-forwarded-host') || hdrs.get('host') || '').split(':')[0]

  if (RESIDENCITY_HOSTS.has(host)) {
    return {
      rules: [{ userAgent: '*', allow: '/' }],
      sitemap: [
        `https://residencity.ca/tricity/sitemap.xml`,
        `https://residencity.ca/burnaby/sitemap.xml`,
      ],
    }
  }

  // Use the DB as the sole source of truth for which domains are live agents.
  // Unknown/dev/staging hosts that don't resolve to an agent are blocked.
  // Any deployed agent domain automatically gets the correct allow/disallow
  // from its seo_noindex setting without needing a hardcoded allowlist.
  const agent = await getAgentByDomain(host)

  if (!agent) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    }
  }

  const noindex = agent.settings?.seo_noindex ?? false

  if (noindex) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    }
  }

  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      // Prevent Googlebot crawling filter/sort/view/page variants — these are
      // "Alternate page with proper canonical tag" in GSC and waste crawl budget.
      // Google supports * wildcards in robots.txt.
      disallow: [
        '/*?*sort=*',
        '/*?*view=list*',
        '/*?*page=*',
      ],
    }],
    sitemap: [
      `https://${host}/sitemap.xml`,
    ],
  }
}
