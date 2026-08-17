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
    ? `https://${domain}/townhouses-for-sale/${sp.subarea}`
    : `https://${domain}/townhouses-for-sale`

  const shortArea = agentAreaDisplay(territories)

  const thStats    = mr?.by_type.find(r => r.type === 'Townhouse') ?? null
  const hasFilters = sp.beds || sp.min_price || sp.max_price || sp.status === 'sold'

  const filterTitle = buildListingsTitle({ ...sp, type: 'townhouse' }, shortArea, agentName)
  const canonicalTitle = `${shortArea} Townhouses for Sale | ${agentName}`

  const ogTitle = !hasFilters && thStats && thStats.active > 0
    ? `${thStats.active.toLocaleString()} Townhouses for Sale in ${shortArea} | ${agentName}`
    : filterTitle

  const description = hasFilters
    ? buildListingsDesc({ ...sp, type: 'townhouse' }, shortArea, agentName)
    : thStats && thStats.avg_sold_price > 0
    ? `${thStats.active > 0 ? `${thStats.active} townhouses` : 'Townhouses'} for sale in ${shortArea}. Avg recent sale: ${shortPrice(thStats.avg_sold_price)} — ${thStats.sold_30d} sold last 30 days${thStats.avg_dom > 0 ? `, avg ${Math.round(thStats.avg_dom)} days on market` : ''}. Live MLS® listings with ${firstName}.`
    : `Browse townhouses for sale in ${shortArea}. Spacious family layouts, private yards, and attached garages. Live MLS® listings updated daily with ${agentName}.`

  // Belt-and-suspenders noindex for decorative-only param pages (sort/view/page).
  const DECORATIVE_KEYS = new Set(['sort', 'view', 'page'])
  const MEANINGFUL_KEYS = new Set(['beds', 'min_price', 'max_price', 'subarea', 'price_reduced'])
  const spKeys = Object.keys(sp)
  const hasDecorativeOnly = spKeys.length > 0
    && !spKeys.some(k => MEANINGFUL_KEYS.has(k))
    && spKeys.every(k => DECORATIVE_KEYS.has(k))

  return {
    title: hasFilters ? filterTitle : { absolute: canonicalTitle },
    description,
    alternates:  { canonical },
    ...(hasDecorativeOnly ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: ogTitle, description, type: 'website', url: canonical, siteName: agentName },
    twitter:   { card: 'summary_large_image', title: ogTitle, description },
  }
}

type ThStats = { avg_sold_price: number; sold_30d: number; avg_dom: number; active: number } | null

function buildFaqSchema(thStats: ThStats) {
  const avgLine = thStats?.avg_sold_price
    ? ` The current average sold price is ${shortPrice(thStats.avg_sold_price)}${thStats.sold_30d ? `, with ${thStats.sold_30d} sales recorded in the past 30 days` : ''}.`
    : ''

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the average price of a townhouse in South Surrey?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Townhouse prices in South Surrey & White Rock typically range from around $699,000 for entry-level 2-bedroom units in Cloverdale to over $1.3 million for larger executive townhomes in Morgan Creek and Ocean Park.${avgLine} The overall market has averaged between $850,000 and $1,050,000 over the past 12 months.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Which neighbourhoods have the most townhouses in South Surrey?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Grandview Heights and Cloverdale have the highest concentration of townhouse developments in the South Surrey area, followed by Morgan Creek and Sunnyside Park. White Rock and Ocean Park offer a smaller but premium supply of larger townhomes, often with ocean or mountain views.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is now a good time to buy a townhouse in South Surrey?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `South Surrey townhouses remain in strong demand due to their family-friendly layouts and more accessible price point compared to detached homes.${thStats?.avg_dom ? ` The current average days on market is ${Math.round(thStats.avg_dom)} days.` : ''} Inventory levels fluctuate seasonally — speaking with a local specialist can help you identify the right moment based on current active listings and days-on-market data.`,
        },
      },
      {
        '@type': 'Question',
        name: 'What strata fees do South Surrey townhouses typically have?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Monthly strata fees for South Surrey townhouses generally range from $200 to $450, depending on the complex age, amenities, and included services. Newer buildings with shared facilities like a clubhouse or gym tend toward the higher end, while smaller bare-land strata communities can be much lower.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are South Surrey townhouses pet-friendly?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Many townhouse complexes in South Surrey allow pets, though bylaws vary — some restrict size or breed. It is important to review the strata bylaws before purchasing. An experienced local agent can help identify pet-friendly buildings that match your needs.',
        },
      },
    ],
  }
}

const seoFooterRandy = (
  <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '28px 32px' }}>
    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 14px' }}>
      Townhouses for Sale in South Surrey — Market Overview
    </h2>
    <p style={{ color: '#555', lineHeight: 1.85, fontSize: 14.5, margin: '0 0 14px' }}>
      South Surrey and White Rock offer one of the most diverse townhouse markets in Metro Vancouver. From starter townhomes in Cloverdale and Clayton priced in the $699,000–$800,000 range, to premium 4-bedroom executive units in Morgan Creek and Ocean Park pushing past $1.3 million, there is a townhouse for nearly every family budget. Most complexes were built between 2010 and 2023, so buyers benefit from modern construction standards, energy-efficient windows, and low-maintenance exteriors — a sharp contrast to the maintenance burden of a detached house.
    </p>
    <p style={{ color: '#555', lineHeight: 1.85, fontSize: 14.5, margin: 0 }}>
      Townhouses are the property type of choice for growing families who want more square footage and a private yard or garage, but prefer the convenience of strata-managed exterior upkeep. South Surrey townhomes sit within catchment areas for several of BC&apos;s top-ranked elementary and secondary schools, making neighbourhoods like Grandview Heights and Sunnyside Park especially competitive. Strata fees typically cover landscaping, building insurance, and common-area maintenance, keeping day-to-day ownership costs predictable.
    </p>
  </section>
)

export default async function TownhousesForSalePage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const isRandy = slug === 'randy'

  const mr = isRandy ? await getMarketReport(slug).catch(() => null) : null
  const thStats: ThStats = mr?.by_type.find((r: { type: string }) => r.type === 'Townhouse') ?? null
  const faqSchema = isRandy ? buildFaqSchema(thStats) : null

  return (
    <>
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <ListingsCore slug={slug} sp={sp} lockedType="Townhouse" seoFooter={isRandy ? seoFooterRandy : undefined} />
    </>
  )
}
