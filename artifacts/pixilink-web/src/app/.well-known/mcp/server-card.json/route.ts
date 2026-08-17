import { headers } from 'next/headers'
import { getAgentByDomain, agentCanonicalBase } from '@/lib/api'

export const dynamic = 'force-dynamic'

const RESIDENCITY_HOSTS = new Set(['residencity.ca', 'www.residencity.ca'])

export async function GET(): Promise<Response> {
  const hdrs = await headers()
  const host = (hdrs.get('x-forwarded-host') || hdrs.get('host') || '').split(':')[0]
  const canon = host.startsWith('www.') ? host.slice(4) : host

  let agentName = 'Pixilink Real Estate'
  let agentDescription = 'Real estate data service providing MLS listings, market statistics, and neighbourhood guides for Metro Vancouver.'
  let siteBase = `https://${canon}`

  if (!RESIDENCITY_HOSTS.has(host)) {
    const agent = await getAgentByDomain(host)
    if (agent) {
      agentName = agent.name ?? agentName
      siteBase = `https://${agentCanonicalBase(agent)}`
      agentDescription = `Real estate data service for ${agentName}. Provides active listings, sold comparables, market statistics, and neighbourhood guides for the local service area.`
    }
  }

  const serverCard = {
    schema_version: '1.0',
    serverInfo: {
      name: `${agentName} Real Estate Assistant`,
      version: '1.0.0',
    },
    description: agentDescription,
    homepage: `${siteBase}/`,
    capabilities: {
      resources: {
        listChanged: false,
        listing_search: {
          description: 'Browse active MLS listings filtered by property type, price, and area',
          uri: `${siteBase}/homes-for-sale`,
        },
        market_data: {
          description: 'Access local market statistics, price trends, and absorption rates',
          uri: `${siteBase}/market`,
        },
        neighbourhood_guides: {
          description: 'Read neighbourhood lifestyle profiles and area market summaries',
          uri: `${siteBase}/neighbourhoods`,
        },
      },
    },
    transports: [
      {
        type: 'http',
        url: `${siteBase}/`,
        description: 'Public website — listing search, market data, and neighbourhood guides available as structured HTML and linked data',
      },
      {
        type: 'http',
        url: `${siteBase}/.well-known/api-catalog`,
        description: 'RFC 9727 API catalog describing all machine-readable service endpoints',
      },
    ],
    contact: {
      url: `${siteBase}/`,
    },
  }

  return new Response(JSON.stringify(serverCard, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
