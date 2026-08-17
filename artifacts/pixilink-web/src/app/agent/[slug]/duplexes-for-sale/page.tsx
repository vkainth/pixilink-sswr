import { getAgent, getAgentTerritories, agentCanonicalBase, agentAreaDisplay } from '@/lib/api'
import { buildListingsTitle, buildListingsDesc, ListingsCore } from '../homes-for-sale/ListingsCore'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string>>
}

export const revalidate = 300

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const [agent, territories] = await Promise.all([
    getAgent(slug),
    getAgentTerritories(slug),
  ])
  const agentName = agent?.name || 'Your Local Realtor'
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/duplexes-for-sale`

  const shortArea = agentAreaDisplay(territories)

  const hasFilters = sp.beds || sp.min_price || sp.max_price || sp.status === 'sold'
  const title = hasFilters
    ? buildListingsTitle({ ...sp, type: 'duplex' }, shortArea, agentName)
    : `${shortArea} Duplexes for Sale | ${agentName}`
  const description = hasFilters
    ? buildListingsDesc({ ...sp, type: 'duplex' }, shortArea, agentName)
    : `Browse duplexes and half-duplexes for sale in ${shortArea}. Live MLS® listings updated daily — ideal for multi-generational living or investment. Contact ${agentName.split(' ')[0]} to book a showing.`

  return {
    title,
    description,
    alternates:  { canonical },
    openGraph: { title, description, type: 'website', url: canonical, siteName: agentName },
    twitter:   { card: 'summary_large_image', title, description },
  }
}

export default async function DuplexesForSalePage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  return <ListingsCore slug={slug} sp={sp} lockedType="Duplex" />
}
