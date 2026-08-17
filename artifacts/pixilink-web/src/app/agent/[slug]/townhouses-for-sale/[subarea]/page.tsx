import { getAgent, getMarketReport, getListings, getAgentTerritories, agentAreaDisplay } from '@/lib/api'
import { ListingsCore, shortPrice } from '../../homes-for-sale/ListingsCore'
import { subareaDisplayName, fromSubareaSlug, SUBAREA_MAP } from '../../homes-for-sale/subareaUtils'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string; subarea: string }>
  searchParams: Promise<Record<string, string>>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, subarea } = await params
  const isKnown = SUBAREA_MAP.some(e => e.slug === subarea)
  if (!isKnown) return {}

  const [agent, mr, territories] = await Promise.all([
    getAgent(slug),
    getMarketReport(slug, subarea).catch(() => null),
    getAgentTerritories(slug).catch(() => []),
  ])
  const agentName  = agent?.name || 'Your Local Realtor'
  const firstName  = agentName.split(' ')[0]
  const shortArea  = agentAreaDisplay(territories)
  const domain     = agent?.settings?.custom_domain || 'southsurreywhiterock.com'
  const canonical  = `https://${domain}/townhouses-for-sale/${subarea}`
  const area       = subareaDisplayName(subarea)

  const stats = mr?.by_type.find(r => r.type === 'Townhouse') ?? mr?.overall ?? null

  const title = `Townhouses for Sale in ${area} | ${shortArea} | ${agentName}`
  const description = stats && stats.active > 0
    ? `${stats.active} townhouse${stats.active !== 1 ? 's' : ''} for sale in ${area}${stats.avg_sold_price > 0 ? ` — avg recent sale ${shortPrice(stats.avg_sold_price)}` : ''}. Live MLS® listings updated every 5 minutes. Contact ${firstName} to book a private showing.`
    : `Browse townhouses for sale in ${area}. Live MLS® listings updated every 5 minutes — spacious layouts, private yards, and attached garages. Contact ${firstName} to book a private showing.`

  // See condos-for-sale/[subarea]/[beds]/page.tsx for the fail-open rationale.
  let noindex = false
  try {
    const { total } = await getListings(slug, { status: 'Active', type: 'Townhouse', subarea: fromSubareaSlug(subarea), limit: 1, noFallback: true })
    noindex = total === 0
  } catch {
    noindex = false
  }

  return {
    title,
    description,
    alternates: { canonical },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, type: 'website', url: canonical, siteName: agentName },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function TownhousesSubareaPage({ params, searchParams }: Props) {
  const { slug, subarea } = await params
  const isKnown = SUBAREA_MAP.some(e => e.slug === subarea)
  if (!isKnown) notFound()

  const sp = await searchParams
  return (
    <ListingsCore
      slug={slug}
      sp={{ ...sp, subarea }}
      lockedType="Townhouse"
      pathSubarea={subarea}
    />
  )
}
