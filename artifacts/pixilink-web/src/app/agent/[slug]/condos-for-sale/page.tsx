import { getAgent, getAgentTerritories, getMarketReport, agentCanonicalBase, agentAreaDisplay } from '@/lib/api'
import { buildListingsTitle, buildListingsDesc, ListingsCore, shortPrice } from '../homes-for-sale/ListingsCore'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string>>
}

export const revalidate = 300

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const [agent, territories, mr] = await Promise.all([
    getAgent(slug),
    getAgentTerritories(slug),
    getMarketReport(slug).catch(() => null),
  ])
  const agentName  = agent?.name || 'Your Local Realtor'
  const firstName  = agentName.split(' ')[0]
  const domain     = agentCanonicalBase(agent)
  const canonical  = sp.subarea
    ? `https://${domain}/condos-for-sale/${sp.subarea}`
    : `https://${domain}/condos-for-sale`

  const shortArea = agentAreaDisplay(territories)

  const condoStats = mr?.by_type.find(r => r.type === 'Apartment') ?? null
  const hasFilters = sp.beds || sp.min_price || sp.max_price || sp.status === 'sold'

  const title = hasFilters
    ? buildListingsTitle({ ...sp, type: 'apartment' }, shortArea, agentName)
    : `${shortArea} Condos for Sale | ${agentName}`

  const ogTitle = !hasFilters && condoStats && condoStats.active > 0
    ? `${condoStats.active.toLocaleString()} Condos for Sale in ${shortArea} | ${agentName}`
    : title

  const description = hasFilters
    ? buildListingsDesc({ ...sp, type: 'apartment' }, shortArea, agentName)
    : condoStats && condoStats.avg_sold_price > 0
    ? `${condoStats.active > 0 ? `${condoStats.active} condos` : 'Condos'} for sale in ${shortArea}. Avg recent sale: ${shortPrice(condoStats.avg_sold_price)} — ${condoStats.sold_30d} sold last 30 days${condoStats.avg_dom > 0 ? `, avg ${Math.round(condoStats.avg_dom)} days on market` : ''}. Live MLS® listings with ${firstName}.`
    : `Browse condos for sale in ${shortArea}. Studio to penthouse — live MLS® listings updated daily with ${agentName}.`

  // Belt-and-suspenders noindex for decorative-only param pages (sort/view/page).
  const DECORATIVE_KEYS = new Set(['sort', 'view', 'page'])
  const MEANINGFUL_KEYS = new Set(['beds', 'min_price', 'max_price', 'subarea', 'price_reduced'])
  const spKeys = Object.keys(sp)
  const hasDecorativeOnly = spKeys.length > 0
    && !spKeys.some(k => MEANINGFUL_KEYS.has(k))
    && spKeys.every(k => DECORATIVE_KEYS.has(k))

  return {
    title,
    description,
    alternates:  { canonical },
    ...(hasDecorativeOnly ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: ogTitle, description, type: 'website', url: canonical, siteName: agentName },
    twitter:   { card: 'summary_large_image', title: ogTitle, description },
  }
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the average price of a condo in South Surrey & White Rock?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Condo prices in South Surrey and White Rock typically range from around $400,000 for a studio or 1-bedroom unit to over $1 million for a 3-bedroom or oceanview penthouse in White Rock. The most active price bracket is $550,000–$850,000 for 2-bedroom apartments in newer buildings throughout Grandview Heights and Morgan Creek.',
      },
    },
    {
      '@type': 'Question',
      name: 'Who buys condos in White Rock and South Surrey?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The condo market attracts a wide mix of buyers including first-time homeowners looking for an entry point into the market, retirees and empty-nesters downsizing from a detached home, and investors seeking rental-friendly buildings near White Rock Beach and the South Surrey retail corridor.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which South Surrey neighbourhoods have the most condos for sale?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Grandview Heights has seen the most new condo construction in recent years, with dozens of high-rise and mid-rise towers. White Rock (particularly along the Marine Drive corridor) offers a premium supply of ocean-view condos, while Morgan Creek and Rosemary Heights provide boutique low-rise options.',
      },
    },
    {
      '@type': 'Question',
      name: 'What are typical strata fees for condos in South Surrey?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Monthly strata fees for condos in South Surrey and White Rock generally range from $300 to $700, depending on building age, size, and amenities. High-rises with concierge, gym, and guest suite tend toward the higher end. Fees typically cover building insurance, hot water, common-area maintenance, and reserve fund contributions.',
      },
    },
    {
      '@type': 'Question',
      name: 'Are condos in South Surrey a good investment?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'South Surrey condos have historically shown steady appreciation, supported by limited land supply, strong rental demand, and proximity to the US border and White Rock Beach. However, investment performance depends on the specific building, suite size, and current market conditions — consulting a local specialist is strongly recommended.',
      },
    },
  ],
}

const seoFooterRandy = (
  <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '28px 32px' }}>
    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 14px' }}>
      Condos for Sale in South Surrey &amp; White Rock — Market Overview
    </h2>
    <p style={{ color: '#555', lineHeight: 1.85, fontSize: 14.5, margin: '0 0 14px' }}>
      South Surrey and White Rock have emerged as a premier destination for condo buyers in Metro Vancouver. The market spans a wide range — from practical 1-bedroom units in Grandview Heights priced around $499,000, to oceanfront penthouses along the White Rock waterfront listed well above $1.2 million. Newer concrete towers and boutique wood-frame buildings share the market, giving buyers a choice between resort-style amenities and a quieter, community-oriented lifestyle. Most buildings were built after 2005, meaning buyers benefit from modern building envelopes and updated plumbing.
    </p>
    <p style={{ color: '#555', lineHeight: 1.85, fontSize: 14.5, margin: 0 }}>
      Condos appeal to a broad buyer profile in this area: downsizers from the surrounding detached market, first-time buyers seeking affordability relative to Metro Vancouver&apos;s westside, and investors drawn to consistently strong rental demand. White Rock&apos;s walkable Marine Drive strip, the Peace Arch Hospital, and easy freeway access to Vancouver and the US border all contribute to the area&apos;s long-term desirability. Strata fees typically cover building insurance, common utilities, and reserve fund contributions, keeping ownership costs predictable.
    </p>
  </section>
)

export default async function CondosForSalePage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const isRandy = slug === 'randy'
  return (
    <>
      {isRandy && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <ListingsCore slug={slug} sp={sp} lockedType="Apartment" seoFooter={isRandy ? seoFooterRandy : undefined} />
    </>
  )
}
