import { getAgent, agentCanonicalBase, getListings, getAgentTerritories, agentAreaDisplay } from '@/lib/api'
import { ListingsCore } from '../../../homes-for-sale/ListingsCore'
import { subareaDisplayName, fromSubareaSlug, SUBAREA_MAP } from '../../../homes-for-sale/subareaUtils'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string; subarea: string; beds: string }>
  searchParams: Promise<Record<string, string>>
}

export const revalidate = 300

function parseBeds(bedsParam: string): number | null {
  const n = parseInt(bedsParam)
  return n >= 1 && n <= 9 ? n : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, subarea, beds } = await params
  const isKnown = SUBAREA_MAP.some(e => e.slug === subarea)
  const bedsNum = parseBeds(beds)
  if (!isKnown || bedsNum === null) return {}

  const [agent, territories] = await Promise.all([
    getAgent(slug),
    getAgentTerritories(slug).catch(() => []),
  ])
  const agentName = agent?.name || 'Your Local Realtor'
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/houses-for-sale/${subarea}/${bedsNum}-bedrooms`
  const area = subareaDisplayName(subarea)
  const shortArea = agentAreaDisplay(territories)

  const title = `${bedsNum} Bedroom Houses for Sale in ${area} | ${shortArea} | ${agentName}`
  const description = `Browse ${bedsNum}-bedroom houses for sale in ${area}, ${shortArea}. Live MLS® listings updated every 5 minutes. Contact ${agentName.split(' ')[0]} to book a private showing.`

  // See condos-for-sale/[subarea]/[beds]/page.tsx for the noindex rationale.
  let noindex = false
  try {
    const { total } = await getListings(slug, { status: 'Active', type: 'House', subarea: fromSubareaSlug(subarea), beds: bedsNum, limit: 1, noFallback: true })
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

export default async function HousesSubareaBedsPage({ params, searchParams }: Props) {
  const { slug, subarea, beds } = await params
  const isKnown = SUBAREA_MAP.some(e => e.slug === subarea)
  const bedsNum = parseBeds(beds)
  if (!isKnown || bedsNum === null) notFound()

  const sp = await searchParams
  return (
    <ListingsCore
      slug={slug}
      sp={{ ...sp, subarea, beds: String(bedsNum) }}
      lockedType="House"
      pathSubarea={subarea}
      pathBeds={String(bedsNum)}
    />
  )
}
