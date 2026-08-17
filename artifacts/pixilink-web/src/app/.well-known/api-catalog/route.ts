import { headers } from 'next/headers'
import { getAgentByDomain, agentCanonicalBase } from '@/lib/api'

export const dynamic = 'force-dynamic'

const RESIDENCITY_HOSTS = new Set(['residencity.ca', 'www.residencity.ca'])

export async function GET(): Promise<Response> {
  const hdrs = await headers()
  const host = (hdrs.get('x-forwarded-host') || hdrs.get('host') || '').split(':')[0]
  const canon = host.startsWith('www.') ? host.slice(4) : host

  let siteBase = `https://${canon}`

  if (!RESIDENCITY_HOSTS.has(host)) {
    const agent = await getAgentByDomain(host)
    if (agent) {
      siteBase = `https://${agentCanonicalBase(agent)}`
    }
  }

  const linkset = {
    linkset: [
      {
        anchor: `${siteBase}/`,
        'service-doc': [
          { href: `${siteBase}/llms.txt`, type: 'text/plain' },
        ],
        'service-desc': [
          { href: `${siteBase}/sitemap.xml`, type: 'application/xml' },
        ],
      },
    ],
  }

  return new Response(JSON.stringify(linkset, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/linkset+json',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
