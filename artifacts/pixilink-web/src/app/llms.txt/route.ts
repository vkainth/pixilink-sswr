import { headers } from 'next/headers'
import {
  getAgentByDomain,
  getAgentTerritories,
  agentCanonicalBase,
  getMarketStats,
  getNews,
  getTestimonials,
  getAwards,
  getNeighbourhoods,
  getLandingPages,
  getPages,
  getAreaComparisons,
  getBestOfLists,
  getOpenHouses,
  getSchoolCatchments,
} from '@/lib/api'
import { buildAgentLlmsTxt, buildResidencityLlmsTxt } from '@/lib/llms-txt'
import type { LlmsTxtExtras } from '@/lib/llms-txt'

export const dynamic = 'force-dynamic'

// residencity.ca apex is a multi-agent hub with no single-agent custom_domain
// mapping — served directly here since the apex path never carries a
// single-agent slug (see src/middleware.ts, which only rewrites
// `/:region/...` paths to `/agent/:slug/...`, not bare `/llms.txt`).
const RESIDENCITY_HOSTS = new Set(['residencity.ca', 'www.residencity.ca'])

function textResponse(body: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}

export async function GET(): Promise<Response> {
  const hdrs = await headers()
  const host = (hdrs.get('x-forwarded-host') || hdrs.get('host') || '').split(':')[0]

  if (RESIDENCITY_HOSTS.has(host)) {
    return textResponse(buildResidencityLlmsTxt())
  }

  // Mirrors robots.ts/sitemap-utils.ts: resolve the actual agent for this
  // request's host (custom domain), rather than assuming a fixed agent.
  const agent = host ? await getAgentByDomain(host) : null

  if (!agent) {
    return new Response('Not found', { status: 404 })
  }

  const slug = agent.slug

  const [territories, statsRes, newsRes, testimonialsRes, awardsRes, neighbourhoodsRes, landingPagesRes, pagesRes, areaComparisonsRes, bestOfListsRes, openHousesRes, schoolsRes] = await Promise.all([
    getAgentTerritories(slug),
    Promise.allSettled([getMarketStats(slug)]),
    Promise.allSettled([getNews(slug, 1, 5)]),
    Promise.allSettled([getTestimonials(slug)]),
    Promise.allSettled([getAwards(slug)]),
    Promise.allSettled([getNeighbourhoods(slug)]),
    Promise.allSettled([getLandingPages(slug)]),
    Promise.allSettled([getPages(slug)]),
    Promise.allSettled([getAreaComparisons(slug)]),
    Promise.allSettled([getBestOfLists(slug)]),
    Promise.allSettled([getOpenHouses(slug)]),
    Promise.allSettled([getSchoolCatchments(slug)]),
  ])

  const extras: LlmsTxtExtras = {
    stats: statsRes[0].status === 'fulfilled' ? statsRes[0].value : undefined,
    news: newsRes[0].status === 'fulfilled' ? newsRes[0].value.posts : undefined,
    testimonials: testimonialsRes[0].status === 'fulfilled' ? testimonialsRes[0].value : undefined,
    awards: awardsRes[0].status === 'fulfilled' ? awardsRes[0].value : undefined,
    neighbourhoods: neighbourhoodsRes[0].status === 'fulfilled' ? neighbourhoodsRes[0].value : undefined,
    landingPages: landingPagesRes[0].status === 'fulfilled' ? landingPagesRes[0].value : undefined,
    pages: pagesRes[0].status === 'fulfilled' ? pagesRes[0].value : undefined,
    areaComparisons: areaComparisonsRes[0].status === 'fulfilled' ? areaComparisonsRes[0].value : undefined,
    bestOfLists: bestOfListsRes[0].status === 'fulfilled' ? bestOfListsRes[0].value : undefined,
    openHouses: openHousesRes[0].status === 'fulfilled' ? openHousesRes[0].value : undefined,
    schools: schoolsRes[0].status === 'fulfilled' ? schoolsRes[0].value : undefined,
  }

  const siteUrl = `https://${agentCanonicalBase(agent)}`

  return textResponse(buildAgentLlmsTxt(agent, territories, siteUrl, extras))
}
