import { getAgent, getAgentTerritories, agentCanonicalBase, agentAreaDisplay, getListings } from '@/lib/api'
import { ListingsCore } from '../../homes-for-sale/ListingsCore'
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

  const [agent, territories] = await Promise.all([getAgent(slug), getAgentTerritories(slug).catch(() => [])])
  const agentName = agent?.name || 'Your Local Realtor'
  const shortArea = agentAreaDisplay(territories)
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/duplexes-for-sale/${subarea}`
  const area = subareaDisplayName(subarea)

  const title = `Duplexes for Sale in ${area} | ${shortArea} | ${agentName}`
  const description = `Browse duplexes and half-duplexes for sale in ${area}. Live MLS® listings updated every 5 minutes — ideal for multi-generational living or investment. Contact ${agentName.split(' ')[0]} to book a private showing.`

  // See condos-for-sale/[subarea]/[beds]/page.tsx for the fail-open rationale.
  let noindex = false
  try {
    const { total } = await getListings(slug, { status: 'Active', type: 'Duplex', subarea: fromSubareaSlug(subarea), limit: 1, noFallback: true })
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

export default async function DuplexesSubareaPage({ params, searchParams }: Props) {
  const { slug, subarea } = await params
  const isKnown = SUBAREA_MAP.some(e => e.slug === subarea)
  if (!isKnown) notFound()

  const sp = await searchParams
  return (
    <ListingsCore
      slug={slug}
      sp={{ ...sp, subarea }}
      lockedType="Duplex"
      pathSubarea={subarea}
    />
  )
}
