import { getAgent, agentCanonicalBase, getListings } from '@/lib/api'
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

function parseBuiltYear(segment: string): number | null {
  const m = segment.match(/^built-(\d{4})$/)
  if (!m) return null
  const year = parseInt(m[1])
  return year >= 2000 && year <= 2099 ? year : null
}

function cityFromCanonicalBase(base: string): string {
  if (base.includes('residencity.ca/burnaby')) return 'Burnaby'
  if (base.includes('residencity.ca/tricity')) return 'Metro Vancouver'
  if (base.includes('southsurreywhiterock') || base.includes('randydyck')) return 'South Surrey & White Rock'
  if (base.includes('suburbia.ca')) return 'Tri-Cities'
  if (base.includes('residencity.ca')) return 'Metro Vancouver'
  return 'Metro Vancouver'
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, subarea, beds } = await params
  const isKnown = SUBAREA_MAP.some(e => e.slug === subarea)
  if (!isKnown) return {}

  const builtYear = parseBuiltYear(beds)
  const bedsNum = parseBeds(beds)

  if (builtYear === null && bedsNum === null) return {}

  const agent = await getAgent(slug)
  const agentName = agent?.name || 'Your Local Realtor'
  const domain = agentCanonicalBase(agent)
  const city = cityFromCanonicalBase(domain)
  const area = subareaDisplayName(subarea)

  const firstName = agentName.split(' ')[0]

  if (builtYear !== null) {
    const canonical = `https://${domain}/homes-for-sale/${subarea}/built-${builtYear}`
    // No | AgentName suffix — the layout template appends it automatically
    const title = `New Homes Built ${builtYear}+ in ${area}, ${city} — Condos & Townhouses`
    const description = `${area}, ${city}: browse condos, townhouses, and houses built ${builtYear} or later on MLS®. Real listings with photos, floor plans, and prices — updated every 5 min. ${firstName} arranges showings and provides free comparables.`
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, type: 'website', url: canonical, siteName: agentName },
      twitter: { card: 'summary_large_image', title, description },
      keywords: [
        `new construction ${area}`,
        `new homes ${area} ${city}`,
        `${builtYear} homes ${area}`,
        `new builds ${city}`,
        `${area} condos ${builtYear}`,
        `${area} townhouses ${builtYear}`,
        `new build homes ${city} BC`,
        `presale ${area}`,
      ],
    }
  }

  const canonical = `https://${domain}/homes-for-sale/${subarea}/${bedsNum}-bedrooms`
  // No | AgentName suffix — the layout template appends it automatically
  const title = `${bedsNum}-Bedroom Homes for Sale in ${area}, ${city}`
  const description = `${bedsNum}-bedroom homes in ${area}, ${city} — condos, townhouses, and houses on MLS® with photos and prices. ${firstName} provides free comparables and books showings same-day.`

  // See condos-for-sale/[subarea]/[beds]/page.tsx for the noindex rationale.
  // No type filter here — this is the unified "all types" homes-for-sale route.
  let noindex = false
  try {
    const { total } = await getListings(slug, { status: 'Active', subarea: fromSubareaSlug(subarea), beds: bedsNum ?? undefined, limit: 1, noFallback: true })
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
    keywords: [
      `${bedsNum} bedroom homes ${area}`,
      `${bedsNum} bedroom ${city} homes for sale`,
      `${area} ${bedsNum}br condos`,
      `${area} ${bedsNum}br townhouses`,
      `${area} real estate ${city}`,
    ],
  }
}

export default async function HomesSubareaBedsPage({ params, searchParams }: Props) {
  const { slug, subarea, beds } = await params
  const isKnown = SUBAREA_MAP.some(e => e.slug === subarea)
  if (!isKnown) notFound()

  const builtYear = parseBuiltYear(beds)
  const bedsNum = parseBeds(beds)

  if (builtYear === null && bedsNum === null) notFound()

  const sp = await searchParams
  const area = subareaDisplayName(subarea)

  if (builtYear !== null) {
    const agent = await getAgent(slug)
    const domain = agentCanonicalBase(agent)
    const city = cityFromCanonicalBase(domain)

    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `What is a new construction home in ${city}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `A new construction home in ${city} is a property built and completed after a specific cutoff year — in this case ${builtYear} or later. These homes offer modern floor plans, energy-efficient systems, updated building code compliance, and warranties on structure and appliances. In ${area}, new builds are most commonly condominiums and townhouses developed by local and national builders.`,
          },
        },
        {
          '@type': 'Question',
          name: `What year counts as new construction in ${city}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `For this page, new construction means homes built in ${builtYear} or later. This filter is applied using the MLS® year-built data field. Properties built before ${builtYear} will not appear in these results, even if they have been recently renovated.`,
          },
        },
        {
          '@type': 'Question',
          name: `Are new construction homes more expensive in ${area}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `New construction homes in ${area} typically carry a premium over older resale properties due to modern finishes, energy efficiency, and developer warranties. However, buyers often benefit from lower maintenance costs, strata depreciation reports on newer buildings, and the ability to purchase pre-sale directly from the developer in some cases.`,
          },
        },
      ],
    }

    const seoFooter = (
      <>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 28 }}>
          New construction homes built {builtYear} or later in {area}, {city}. These listings represent the newest homes available on MLS® in {area} — featuring modern floor plans, energy-efficient construction, and current building code standards. Whether you&apos;re looking for a brand-new condo, townhouse, or detached home, these properties offer the latest in design and technology. Contact a local expert to arrange a private showing.
        </p>
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '24px 28px' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', fontWeight: 600, marginBottom: 18 }}>
            Common Questions
          </div>
          {[
            {
              q: `What is a new construction home in ${city}?`,
              a: `A new construction home in ${city} is a property built and completed in ${builtYear} or later. These homes offer modern floor plans, energy-efficient systems, updated building code compliance, and manufacturer warranties. In ${area}, new builds are most commonly condominiums and townhouses developed by local and national builders.`,
            },
            {
              q: `What year counts as new construction?`,
              a: `For these results, new construction means homes with a year-built of ${builtYear} or newer in the MLS® system. Properties built before ${builtYear} do not appear here, even if recently renovated. Pre-sale assignments may not always appear in MLS® until keys are issued.`,
            },
            {
              q: `Are new builds in ${area} more expensive than resale?`,
              a: `New construction in ${area} typically carries a modest premium over comparable resale homes due to modern finishes and developer warranties. Buyers often offset this with lower ongoing maintenance costs, no deferred repairs, and newer strata depreciation reports in the case of condos and townhouses.`,
            },
          ].map(({ q, a }) => (
            <details key={q} style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
              <summary style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--primary-bg)' }}>{q}</summary>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.75, marginTop: 10 }}>{a}</p>
            </details>
          ))}
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </>
    )

    return (
      <ListingsCore
        slug={slug}
        sp={{ ...sp, subarea, min_year: String(builtYear) }}
        pathSubarea={subarea}
        pathYear={String(builtYear)}
        seoFooter={seoFooter}
      />
    )
  }

  return (
    <ListingsCore
      slug={slug}
      sp={{ ...sp, subarea, beds: String(bedsNum) }}
      pathSubarea={subarea}
      pathBeds={String(bedsNum)}
    />
  )
}
