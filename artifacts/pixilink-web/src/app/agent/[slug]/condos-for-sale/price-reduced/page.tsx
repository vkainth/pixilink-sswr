import { getAgent, getAgentTerritories, agentCanonicalBase, agentAreaDisplay } from '@/lib/api'
import { ListingsCore } from '../../homes-for-sale/ListingsCore'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string>>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [agent, territories] = await Promise.all([getAgent(slug), getAgentTerritories(slug).catch(() => [])])
  const agentName = agent?.name || 'Your Local Realtor'
  const shortArea = agentAreaDisplay(territories)
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/condos-for-sale/price-reduced`

  const title = `Price Reduced Condos for Sale ${shortArea} | Best Deals Today | ${agentName}`
  const description = `Find price-reduced condos for sale in ${shortArea}. View suites with recent price drops, motivated sellers, and listings below asking. Live MLS® deals updated daily.`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: 'website', url: canonical, siteName: agentName },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function CondosPriceReducedPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  return (
    <ListingsCore
      slug={slug}
      sp={{ ...sp, price_reduced: '1' }}
      lockedType="Apartment"
      priceReducedPath
    />
  )
}
