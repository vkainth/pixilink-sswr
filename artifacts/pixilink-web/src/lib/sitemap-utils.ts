import { headers } from 'next/headers'
import { getAgentByDomain } from '@/lib/api'
import type { AgentProfile } from '@/lib/types'

// ── Residencity zone config ───────────────────────────────────────────────────
// Mirrors the slug/agentSlug fields from artifacts/residencity/src/lib/zones.ts.
// Only the slug→agentSlug mapping is needed here; keep in sync when new zones
// graduate from 'available' to 'sold' on the residencity portal.

export const RESIDENCITY_HOSTS = new Set(['residencity.ca', 'www.residencity.ca'])

export interface ResidencityZone {
  slug: string
  agentSlug?: string
}

export const RESIDENCITY_ZONES: ResidencityZone[] = [
  { slug: 'south-surrey',    agentSlug: 'randy' },
  { slug: 'burnaby',         agentSlug: 'saeed-farhani-ppqu' },
  { slug: 'tricity',         agentSlug: 'tricity' },
  { slug: 'vancouver-west' },
  { slug: 'vancouver-east' },
  { slug: 'north-vancouver' },
  { slug: 'west-vancouver' },
  { slug: 'richmond' },
  { slug: 'surrey-central' },
  { slug: 'cloverdale' },
  { slug: 'langley' },
  { slug: 'abbotsford' },
  { slug: 'maple-ridge' },
  { slug: 'delta' },
  { slug: 'new-westminster' },
  { slug: 'mission' },
  { slug: 'squamish' },
  { slug: 'fraser-valley' },
  { slug: 'whistler' },
]

// Reverse of api.ts's RESIDENCITY_SLUG_MAP — internal agent slug → live region path
// on website.pixilink.com. residencity.ca is retired (dead container, 503s), so
// this must point at website.pixilink.com's Laravel-side region proxy instead.
function regionPathForAgentSlug(slug: string): string | null {
  const zone = RESIDENCITY_ZONES.find(z => z.agentSlug === slug && z.slug !== 'south-surrey')
  return zone ? zone.slug : null
}

export function agentSitemapUrl(customDomain: string | null | undefined, slug: string): string {
  if (customDomain) return `https://${customDomain}/sitemap.xml`
  const region = regionPathForAgentSlug(slug)
  const base = region ? `website.pixilink.com/${region}` : `website.pixilink.com/agent/${slug}`
  return `https://${base}/sitemap.xml`
}

export async function resolveAgentFromHost(): Promise<AgentProfile | null> {
  const hdrs = await headers()
  const host = (hdrs.get('x-forwarded-host') || hdrs.get('host') || '').split(':')[0]
  if (!host) return null
  return getAgentByDomain(host)
}

export function buildBaseUrl(agent: AgentProfile): string {
  if (agent.settings?.custom_domain) return `https://${agent.settings.custom_domain}`
  const region = regionPathForAgentSlug(agent.slug)
  return region
    ? `https://website.pixilink.com/${region}`
    : `https://website.pixilink.com/agent/${agent.slug}`
}

export function last24Months(): { year: number; month: number }[] {
  const results: { year: number; month: number }[] = []
  const now = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    results.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  return results
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}

export function sitemapIndex(locs: string[]): string {
  const items = locs
    .map((loc) => `  <sitemap>\n    <loc>${loc}</loc>\n  </sitemap>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`
}

export interface UrlEntry {
  loc: string
  lastmod?: string
  changefreq?: string
  priority?: number
}

export function urlset(entries: UrlEntry[]): string {
  const items = entries
    .map((e) => {
      const parts = [`    <loc>${e.loc}</loc>`]
      if (e.lastmod) parts.push(`    <lastmod>${e.lastmod}</lastmod>`)
      if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`)
      if (e.priority !== undefined) parts.push(`    <priority>${e.priority.toFixed(1)}</priority>`)
      return `  <url>\n${parts.join('\n')}\n  </url>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`
}
