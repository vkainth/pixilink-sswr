import { getAgent, agentCanonicalBase } from '@/lib/api'
import { ListingsCore } from '../../ListingsCore'
import { subareaDisplayName, SUBAREA_MAP } from '../../subareaUtils'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string; subarea: string }>
  searchParams: Promise<Record<string, string>>
}

export const revalidate = 300

function cityFromCanonicalBase(base: string): string {
  if (base.includes('residencity.ca/burnaby')) return 'Burnaby'
  if (base.includes('residencity.ca/tricity')) return 'Metro Vancouver'
  if (base.includes('southsurreywhiterock') || base.includes('randydyck')) return 'South Surrey & White Rock'
  if (base.includes('residencity.ca')) return 'Metro Vancouver'
  return 'Metro Vancouver'
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, subarea } = await params
  const isKnown = SUBAREA_MAP.some(e => e.slug === subarea)
  if (!isKnown) return {}

  const agent = await getAgent(slug)
  const agentName = agent?.name || 'Your Local Realtor'
  const domain = agentCanonicalBase(agent)
  const city = cityFromCanonicalBase(domain)
  const area = subareaDisplayName(subarea)
  const canonical = `https://${domain}/homes-for-sale/${subarea}/price-reduced`

  const title = `Price Reduced Homes for Sale in ${area}, ${city} | Best Deals | ${agentName}`
  const description = `Find price-reduced homes for sale in ${area}, ${city}. Condos, townhouses, and detached houses with recent price drops and motivated sellers. Live MLS® deals updated daily — ${agentName}.`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: 'website', url: canonical, siteName: agentName },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function HomesSubareaPriceReducedPage({ params, searchParams }: Props) {
  const { slug, subarea } = await params
  const isKnown = SUBAREA_MAP.some(e => e.slug === subarea)
  if (!isKnown) notFound()

  const sp = await searchParams
  const area = subareaDisplayName(subarea)

  const agent = await getAgent(slug)
  const domain = agentCanonicalBase(agent)
  const city = cityFromCanonicalBase(domain)

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Why do sellers reduce their price in ${area}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Sellers in ${area}, ${city} reduce their asking price when a home has been on the market longer than expected, when comparable sales have shifted the market, or when the seller has an urgent need to close. A price reduction signals that the seller is motivated and may be open to negotiation — making these listings attractive to buyers seeking value.`,
        },
      },
      {
        '@type': 'Question',
        name: `How quickly do price-reduced homes sell in ${city}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Price-reduced homes in ${city} often sell faster after the reduction than before, as the new price draws renewed buyer interest and more showings. In active markets like ${area}, a well-priced reduction can attract multiple offers within days. Buyers who act promptly after a price drop are often in a stronger negotiating position.`,
        },
      },
    ],
  }

  const seoFooter = (
    <>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 28 }}>
        Price-reduced homes in {area}, {city} have had their asking price lowered since first listing — indicating motivated sellers and potential negotiating room. Whether the market has shifted or the seller needs to move quickly, these listings represent real opportunities for buyers. Browse the current selection above and contact a local expert to arrange a private showing before these deals are gone.
      </p>
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '24px 28px' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', fontWeight: 600, marginBottom: 18 }}>
          Common Questions
        </div>
        {[
          {
            q: `Why are these homes price reduced?`,
            a: `Sellers in ${area}, ${city} reduce their asking price when a home has been on the market longer than expected, when comparable sales have shifted the market, or when the seller needs to close quickly. A price reduction is a strong signal of a motivated seller — and potential room to negotiate.`,
          },
          {
            q: `How do I buy a price-reduced home in ${city}?`,
            a: `Start by browsing the listings above to find properties that match your criteria. Because price-reduced homes often attract renewed interest quickly, it pays to move fast. Connect with a local agent who knows ${area} to arrange showings, review comparable sales, and craft a competitive offer before the opportunity closes.`,
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
      sp={{ ...sp, price_reduced: '1', subarea }}
      pathSubarea={subarea}
      priceReducedPath
      seoFooter={seoFooter}
    />
  )
}
