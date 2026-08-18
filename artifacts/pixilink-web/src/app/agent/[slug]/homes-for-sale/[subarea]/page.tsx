import { getAgent, agentCanonicalBase, getListings, getLandingPages, matchTopRealtorUrl, resolveAgentPrefix, getAgentTerritories, agentAreaDisplay } from '@/lib/api'
import { ListingsCore } from '../ListingsCore'
import { subareaDisplayName, fromSubareaSlug, SUBAREA_MAP } from '../subareaUtils'
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

  const [agent, territories] = await Promise.all([
    getAgent(slug),
    getAgentTerritories(slug).catch(() => []),
  ])
  const agentName = agent?.name || 'Your Local Realtor'
  const shortArea = agentAreaDisplay(territories)
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/homes-for-sale/${subarea}`
  const area = subareaDisplayName(subarea)

  const title = `Homes for Sale in ${area} | ${shortArea} | ${agentName}`
  const description = `Browse all homes for sale in ${area} — condos, townhouses, and detached houses. Live MLS® listings updated every 5 minutes. Contact ${agentName.split(' ')[0]} to book a showing.`

  // See condos-for-sale/[subarea]/[beds]/page.tsx for the fail-open rationale.
  let noindex = false
  try {
    const { total } = await getListings(slug, { status: 'Active', subarea: fromSubareaSlug(subarea), limit: 1, noFallback: true })
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

export default async function HomesSubareaPage({ params, searchParams }: Props) {
  const { slug, subarea } = await params
  const isKnown = SUBAREA_MAP.some(e => e.slug === subarea)
  if (!isKnown) notFound()

  const sp = await searchParams
  const area = subareaDisplayName(subarea)
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const topRealtorPages = await getLandingPages(slug)
  const topRealtorUrl = matchTopRealtorUrl(topRealtorPages, agentPrefix, subarea, null)

  const seoFooter = (
    <div>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.8, margin: '0 0 16px' }}>
        {area} is one of the area&apos;s most sought-after neighbourhoods, offering a mix of detached homes, townhouses, and condos at a range of price points. Browse live MLS® listings above — updated every 5 minutes — or contact a local expert to book a private showing.
      </p>
      {topRealtorUrl && (
        <a href={topRealtorUrl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px 20px', textDecoration: 'none' }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>Thinking of selling in {area}?</div>
            <div style={{ fontSize: 12.5, color: '#6b7280' }}>See the top-rated REALTOR® credentials, sold results &amp; reviews</div>
          </div>
          <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}>Learn more →</span>
        </a>
      )}
    </div>
  )

  return (
    <ListingsCore
      slug={slug}
      sp={{ ...sp, subarea }}
      pathSubarea={subarea}
      seoFooter={seoFooter}
    />
  )
}
