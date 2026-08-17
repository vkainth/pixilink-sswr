import { headers } from 'next/headers'
import { getAgentByDomain, agentCanonicalBase } from '@/lib/api'

export const dynamic = 'force-dynamic'

const RESIDENCITY_HOSTS = new Set(['residencity.ca', 'www.residencity.ca'])

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function GET(): Promise<Response> {
  const hdrs = await headers()
  const host = (hdrs.get('x-forwarded-host') || hdrs.get('host') || '').split(':')[0]
  const canon = host.startsWith('www.') ? host.slice(4) : host

  let agentName = 'Pixilink Real Estate'
  let agentDescription = 'White-label real estate platform serving MLS listings and market data for Metro Vancouver and the Lower Mainland.'
  let siteBase = `https://${canon}`

  if (!RESIDENCITY_HOSTS.has(host)) {
    const agent = await getAgentByDomain(host)
    if (agent) {
      agentName = agent.name ?? agentName
      siteBase = `https://${agentCanonicalBase(agent)}`
      const territories: string[] = Array.isArray(agent.territories)
        ? (agent.territories as Array<{ city?: string }>).map((t) => t.city ?? '').filter(Boolean)
        : []
      const areaStr = territories.length > 0 ? territories.join(', ') : 'Metro Vancouver'
      agentDescription = `Real estate services by ${agentName} covering ${areaStr}. Provides active listings, sold data, market statistics, and neighbourhood guides.`
    }
  }

  const skills = [
    {
      id: 'listing-search',
      name: 'MLS Listing Search',
      description: 'Search active, sold, and terminated MLS listings by location, property type, price range, and bedroom count.',
      endpoint: `${siteBase}/`,
      methods: ['GET'],
      docs: `${siteBase}/llms.txt`,
    },
    {
      id: 'market-stats',
      name: 'Real Estate Market Statistics',
      description: 'Retrieve current market statistics including active inventory, median prices, and days on market by area.',
      endpoint: `${siteBase}/market`,
      methods: ['GET'],
      docs: `${siteBase}/llms.txt`,
    },
    {
      id: 'neighbourhood-guides',
      name: 'Neighbourhood Guides',
      description: 'Access detailed neighbourhood lifestyle profiles, market data, and area overviews for communities in the service area.',
      endpoint: `${siteBase}/neighbourhoods`,
      methods: ['GET'],
      docs: `${siteBase}/llms.txt`,
    },
  ]

  const sha256 = await sha256Hex(JSON.stringify(skills))

  const skillset = {
    $schema: 'https://agentskills.dev/schema/index/v1.json',
    name: `${agentName} Real Estate Skills`,
    description: agentDescription,
    sha256,
    skills,
  }

  return new Response(JSON.stringify(skillset, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
