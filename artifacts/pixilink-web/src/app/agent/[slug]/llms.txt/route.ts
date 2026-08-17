import {
  getAgent,
  getAgentTerritories,
  agentCanonicalBase,
  getMarketStats,
  getNews,
  getTestimonials,
  getAwards,
  getFaqs,
  getNeighbourhoods,
  getLandingPages,
  getPages,
  getAreaComparisons,
  getBestOfLists,
  getOpenHouses,
  getSchoolCatchments,
  getOwnListings,
} from '@/lib/api'
import { buildAgentLlmsTxt } from '@/lib/llms-txt'
import type { LlmsTxtExtras } from '@/lib/llms-txt'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function GET(_req: Request, { params }: Props): Promise<Response> {
  const { slug } = await params

  const [agent, territories, statsRes, newsRes, testimonialsRes, awardsRes, faqsRes, neighbourhoodsRes, landingPagesRes, pagesRes, areaComparisonsRes, bestOfListsRes, openHousesRes, schoolsRes, soldsRes] = await Promise.all([
    getAgent(slug),
    getAgentTerritories(slug),
    Promise.allSettled([getMarketStats(slug)]),
    Promise.allSettled([getNews(slug, 1, 5)]),
    Promise.allSettled([getTestimonials(slug)]),
    Promise.allSettled([getAwards(slug)]),
    Promise.allSettled([getFaqs(slug)]),
    Promise.allSettled([getNeighbourhoods(slug)]),
    Promise.allSettled([getLandingPages(slug)]),
    Promise.allSettled([getPages(slug)]),
    Promise.allSettled([getAreaComparisons(slug)]),
    Promise.allSettled([getBestOfLists(slug)]),
    Promise.allSettled([getOpenHouses(slug)]),
    Promise.allSettled([getSchoolCatchments(slug)]),
    Promise.allSettled([getOwnListings(slug, { status: 'Sold', limit: 50 })]),
  ])

  if (!agent) {
    return new Response('Not found', { status: 404 })
  }

  const extras: LlmsTxtExtras = {
    stats: statsRes[0].status === 'fulfilled' ? statsRes[0].value : undefined,
    news: newsRes[0].status === 'fulfilled' ? newsRes[0].value.posts : undefined,
    testimonials: testimonialsRes[0].status === 'fulfilled' ? testimonialsRes[0].value : undefined,
    awards: awardsRes[0].status === 'fulfilled' ? awardsRes[0].value : undefined,
    faqs: faqsRes[0].status === 'fulfilled' ? faqsRes[0].value : undefined,
    neighbourhoods: neighbourhoodsRes[0].status === 'fulfilled' ? neighbourhoodsRes[0].value : undefined,
    landingPages: landingPagesRes[0].status === 'fulfilled' ? landingPagesRes[0].value : undefined,
    pages: pagesRes[0].status === 'fulfilled' ? pagesRes[0].value : undefined,
    areaComparisons: areaComparisonsRes[0].status === 'fulfilled' ? areaComparisonsRes[0].value : undefined,
    bestOfLists: bestOfListsRes[0].status === 'fulfilled' ? bestOfListsRes[0].value : undefined,
    openHouses: openHousesRes[0].status === 'fulfilled' ? openHousesRes[0].value : undefined,
    schools: schoolsRes[0].status === 'fulfilled' ? schoolsRes[0].value : undefined,
    solds: soldsRes[0].status === 'fulfilled' ? soldsRes[0].value.listings : undefined,
  }

  const siteUrl = `https://${agentCanonicalBase(agent)}`
  const body = buildAgentLlmsTxt(agent, territories, siteUrl, extras)

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}
