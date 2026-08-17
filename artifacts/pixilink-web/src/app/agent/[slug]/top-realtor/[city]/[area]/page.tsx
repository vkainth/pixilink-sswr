import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { unstable_noStore } from 'next/cache'
import { getAgent, getLandingPageEnriched, getAgentSoldStats } from '@/lib/api'
import { getCoAgents } from '@/lib/types'
import TopRealtorPage from '@/components/top-realtor/TopRealtorPage'

interface Props {
  params: Promise<{ slug: string; city: string; area: string }>
}

export const revalidate = 3600

function deriveSiteName(agent: { name: string; settings?: { custom_domain?: string | null } | null }, cityName: string): string {
  if (agent.settings?.custom_domain) return agent.settings.custom_domain
  return `${cityName} Real Estate`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, city, area } = await params
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
  const siteName = deriveSiteName(agent, page.city_display_name)

  const awardClause = page.award_badges.length ? ` ${page.award_badges[0]}.` : ''
  const yearsClause = page.stat_years_exp ? ` ${page.stat_years_exp}+ years of local expertise.` : ''
  const isTriCity = slug === 'tricity'
  const soldClause = isTriCity
    ? ` 100+ homes sold across the Tri-Cities — $122M+ total, ${soldStats?.avg_sale_to_list ?? ''}% avg sale-to-list.`
    : soldStats && soldStats.sold_count > 0
    ? ` ${soldStats.sold_count} homes sold across the Tri-Cities — $${(soldStats.total_volume / 1_000_000).toFixed(1)}M total, ${soldStats.avg_sale_to_list}% avg sale-to-list.`
    : page.stat_sold_volume ? ` ${page.stat_sold_volume} in sales.` : ''

  // Dual-agent sites always use combined names — never defer to page.meta_title/description
  // which was authored for a single agent.
  const title = isDual
    ? `Top Realtor in ${locationName}, ${province} | ${displayNames}${agent.brokerage ? ` — ${agent.brokerage}` : ''} | ${siteName}`
    : (page.meta_title || `Top Realtor in ${locationName}, ${province} | ${displayNames}${agent.brokerage ? ` — ${agent.brokerage}` : ''} | ${siteName}`)

  const description = isDual
    ? `${displayNames}${agent.brokerage ? ` — ${agent.brokerage}` : ''} are the top-rated realtor team in ${locationName}, ${province}.${awardClause}${yearsClause}${soldClause} Free home evaluation. No commitment required.`
    : (page.meta_description || `${displayNames}${agent.brokerage ? ` — ${agent.brokerage}` : ''} is a top-rated realtor in ${locationName}, ${province}.${awardClause}${yearsClause}${soldClause} Free home evaluation. No commitment required.`)

  const canonical = agent.settings?.custom_domain
    ? `https://${agent.settings.custom_domain}/top-realtor/${city}/${area}`
    : `https://website.pixilink.com/agent/${slug}/top-realtor/${city}/${area}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: 'website' },
  }
}

export default async function TopRealtorAreaPage({ params }: Props) {
  const { slug, city, area } = await params

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
      soldStats={soldStats}
    />
  )
}
