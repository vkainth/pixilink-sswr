import { getAgent, getMarketReport, getListings, getLandingPages, matchTopRealtorUrl, resolveAgentPrefix, getAgentTerritories, agentAreaDisplay } from '@/lib/api'
import { ListingsCore, shortPrice } from '../../homes-for-sale/ListingsCore'
import { subareaDisplayName, fromSubareaSlug, SUBAREA_MAP } from '../../homes-for-sale/subareaUtils'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
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
  const canonical  = `https://${domain}/condos-for-sale/${subarea}`
  const area       = subareaDisplayName(subarea)

  const stats = mr?.by_type.find(r => r.type === 'Apartment') ?? mr?.overall ?? null

  const title = `Condos for Sale in ${area} | ${shortArea} | ${agentName}`
  const description = stats && stats.active > 0
    ? `${stats.active} condo${stats.active !== 1 ? 's' : ''} for sale in ${area}${stats.avg_sold_price > 0 ? ` — avg recent sale ${shortPrice(stats.avg_sold_price)}` : ''}. Live MLS® listings updated every 5 minutes. Contact ${firstName} to book a private showing.`
    : `Browse condos for sale in ${area}. Live MLS® listings updated every 5 minutes — studio to penthouse. Contact ${firstName} to book a private showing.`

  // See condos-for-sale/[subarea]/[beds]/page.tsx for the fail-open rationale.
  let noindex = false
  try {
    const { total } = await getListings(slug, { status: 'Active', type: 'Apartment', subarea: fromSubareaSlug(subarea), limit: 1, noFallback: true })
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

export default async function CondosSubareaPage({ params, searchParams }: Props) {
  const { slug, subarea } = await params
  const isKnown = SUBAREA_MAP.some(e => e.slug === subarea)
  if (!isKnown) notFound()

  const sp = await searchParams
  const area = subareaDisplayName(subarea)
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const topRealtorPages = await getLandingPages(slug)
  const topRealtorUrl = matchTopRealtorUrl(topRealtorPages, agentPrefix, subarea, null)

  const seoFooter = topRealtorUrl ? (
    <a href={topRealtorUrl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px 20px', textDecoration: 'none' }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#14213d', marginBottom: 3 }}>Thinking of selling in {area}?</div>
        <div style={{ fontSize: 12.5, color: '#6b7280' }}>See the top-rated REALTOR® credentials, sold results &amp; reviews</div>
      </div>
      <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}>Learn more →</span>
    </a>
  ) : null

  return (
    <ListingsCore
      slug={slug}
      sp={{ ...sp, subarea }}
      lockedType="Apartment"
      pathSubarea={subarea}
      seoFooter={seoFooter}
    />
  )
}
