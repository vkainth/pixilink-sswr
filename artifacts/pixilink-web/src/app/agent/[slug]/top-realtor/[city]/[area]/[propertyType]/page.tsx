import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { unstable_noStore } from 'next/cache'
import { getAgent, getLandingPageEnriched, getAgentSoldStats } from '@/lib/api'
import { getCoAgents } from '@/lib/types'
import TopRealtorPage from '@/components/top-realtor/TopRealtorPage'

const VALID_PROPERTY_TYPES = new Set(['condos', 'townhouses', 'houses'])

const PROPERTY_TYPE_LABELS: Record<string, { singular: string; plural: string }> = {
  condos: { singular: 'Condo', plural: 'Condos' },
  townhouses: { singular: 'Townhouse', plural: 'Townhouses' },
  houses: { singular: 'House', plural: 'Houses' },
}

interface Props {
  params: Promise<{ slug: string; city: string; area: string; propertyType: string }>
}

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, city, area, propertyType } = await params
  if (!VALID_PROPERTY_TYPES.has(propertyType)) return {}

  const [agent, enriched, soldStats] = await Promise.all([
    getAgent(slug),
    getLandingPageEnriched(slug, city, area),
    getAgentSoldStats(slug),
  ])
  if (!agent || !enriched) return {}

  const coAgents = getCoAgents(agent)
  const isDual = coAgents.length > 0
  const displayNames = isDual
    ? `${agent.name} & ${coAgents.map(c => c.name).join(' & ')}`
    : agent.name

  const { page } = enriched
  const locationName = page.area_display_name || page.city_display_name
  const province = page.province || 'BC'
  const ptLabel = PROPERTY_TYPE_LABELS[propertyType]

  const title = `Best Realtor to Sell a ${ptLabel.singular} in ${locationName}, ${province} | ${displayNames}${agent.brokerage ? ` — ${agent.brokerage}` : ''}`

  const awardClause = page.award_badges.length ? ` ${page.award_badges[0]}.` : ''
  const isTriCity = slug === 'tricity'
  const soldClause = isTriCity
    ? ` 100+ homes sold across the Tri-Cities at ${soldStats?.avg_sale_to_list ?? ''}% avg sale-to-list.`
    : soldStats && soldStats.sold_count > 0
    ? ` ${soldStats.sold_count} homes sold across the Tri-Cities at ${soldStats.avg_sale_to_list}% avg sale-to-list.`
    : page.stat_sold_volume ? ` ${page.stat_sold_volume} in career sales.` : ''
  const description = `${displayNames} ${isDual ? 'are' : 'is'} the top-rated ${ptLabel.singular.toLowerCase()} realtor${isDual ? ' team' : ''} in ${locationName}, ${province}.${awardClause}${soldClause} Get a free ${ptLabel.singular.toLowerCase()} evaluation. No commitment required.`

  const canonical = agent.settings?.custom_domain
    ? `https://${agent.settings.custom_domain}/top-realtor/${city}/${area}/${propertyType}`
    : `https://website.pixilink.com/agent/${slug}/top-realtor/${city}/${area}/${propertyType}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: 'website' },
  }
}

export default async function TopRealtorPropertyTypePage({ params }: Props) {
  const { slug, city, area, propertyType } = await params

  if (!VALID_PROPERTY_TYPES.has(propertyType)) {
    notFound()
  }

  const [agent, enriched, soldStats] = await Promise.all([
    getAgent(slug),
    getLandingPageEnriched(slug, city, area),
    getAgentSoldStats(slug),
  ])
  if (!agent || !enriched) {
    unstable_noStore()
    notFound()
  }

  return (
    <TopRealtorPage
      agent={agent}
      page={enriched.page}
      widget={enriched.widget}
      buyers={enriched.buyers}
      agentSlug={slug}
      allPages={enriched.allPages}
      propertyType={propertyType}
      soldStats={soldStats}
    />
  )
}
