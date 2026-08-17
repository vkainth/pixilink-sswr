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
    ? `https://${domain}/houses-for-sale/${sp.subarea}`
    : `https://${domain}/houses-for-sale`

  const shortArea = agentAreaDisplay(territories)

  const houseStats = mr?.by_type.find(r => r.type === 'House') ?? null
  const hasFilters = sp.beds || sp.min_price || sp.max_price || sp.status === 'sold'

  const title = hasFilters
    ? buildListingsTitle({ ...sp, type: 'house' }, shortArea, agentName)
    : `${shortArea} Houses for Sale — Detached Homes | ${agentName}`

  const ogTitle = !hasFilters && houseStats && houseStats.active > 0
    ? `${houseStats.active.toLocaleString()} Houses for Sale in ${shortArea} | ${agentName}`
    : title

  const description = hasFilters
    ? buildListingsDesc({ ...sp, type: 'house' }, shortArea, agentName)
    : houseStats && houseStats.avg_sold_price > 0
    ? `${houseStats.active > 0 ? `${houseStats.active} detached houses` : 'Detached houses'} for sale in ${shortArea}. Avg recent sale: ${shortPrice(houseStats.avg_sold_price)} — ${houseStats.sold_30d} sold last 30 days${houseStats.avg_dom > 0 ? `, avg ${Math.round(houseStats.avg_dom)} days on market` : ''}. Live MLS® listings with ${firstName}.`
    : `Browse detached houses for sale in ${shortArea}. Single-family homes with large lots, top-rated schools, and room to grow. Live MLS® listings updated daily with ${agentName}.`

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
      name: 'What is the average price of a house in South Surrey?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Detached house prices in South Surrey range considerably by neighbourhood and lot size. Entry-level homes in South Surrey start around $1.2 million, while premium properties in Elgin Chantrell, Ocean Park, and Crescent Beach regularly trade between $2.5 million and $5 million. The overall average sold price for detached homes has historically tracked around $1.7 million to $2.2 million.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which South Surrey neighbourhoods have the best detached houses?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Elgin Chantrell and Ocean Park are widely regarded as South Surrey\'s most prestigious neighbourhoods for detached homes, offering large estate lots, proximity to Crescent Beach, and a quiet acreage feel. Morgan Creek and Sunnyside Park are popular with families for their newer construction, top-rated schools, and golf course surroundings.',
      },
    },
    {
      '@type': 'Question',
      name: 'Are South Surrey houses a good long-term investment?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'South Surrey detached homes have delivered strong long-term appreciation, driven by land scarcity, consistent demand from families relocating from Vancouver\'s westside, and the area\'s desirability near the US border and ocean. However, every property is unique — a local specialist can assess value, potential, and current market timing.',
      },
    },
    {
      '@type': 'Question',
      name: 'What school catchments do South Surrey houses fall into?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'South Surrey is home to several of BC\'s top-ranked public schools. Elgin Park Secondary and Southridge School serve much of the area, with feeder elementaries including Bayridge, Crescent Park, and Pacific Heights. School catchment boundaries should be confirmed with Surrey Schools before purchasing.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long do houses typically sit on the market in South Surrey?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Days on market for detached homes in South Surrey varies with price and season. In active markets, well-priced homes in the $1.3M–$2M range can sell within 2–3 weeks. Luxury properties above $3 million typically take longer — often 45 to 90 days — as the buyer pool is more selective. Current live data is available on each listing page.',
      },
    },
  ],
}

const seoFooterRandy = (
  <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '28px 32px' }}>
    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 14px' }}>
      Houses for Sale in South Surrey — Market Overview
    </h2>
    <p style={{ color: '#555', lineHeight: 1.85, fontSize: 14.5, margin: '0 0 14px' }}>
      South Surrey&apos;s detached home market is one of the most sought-after in the Lower Mainland, offering a rare combination of ocean proximity, top-tier schools, and relatively larger lot sizes compared to Vancouver and Burnaby. Entry-level detached homes start around $1.2 million in areas like Grandview Surrey and Cloverdale, while prestigious neighbourhoods like Elgin Chantrell, Ocean Park, and Morgan Creek see pricing routinely above $2.5 million. Most single-family homes were built after 1990, with a significant number of newer custom builds from 2010 onward, featuring open-concept layouts, triple-car garages, and professionally landscaped yards.
    </p>
    <p style={{ color: '#555', lineHeight: 1.85, fontSize: 14.5, margin: 0 }}>
      The typical detached home buyer in South Surrey is a family relocating from Vancouver or Burnaby seeking more space, lower density, and access to BC&apos;s highest-ranked school catchments. The area also attracts move-up buyers transitioning from townhouses, and estate buyers seeking coastal acreage along Crescent Beach and White Rock&apos;s oceanfront. South Surrey&apos;s proximity to the US border at Peace Arch, Highway 99, and the future SkyTrain expansion adds long-term infrastructure value to the area. With limited land for new single-family development, supply constraints support ongoing price appreciation over time.
    </p>
  </section>
)

export default async function HousesForSalePage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const isRandy = slug === 'randy'
  return (
    <>
      {isRandy && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <ListingsCore slug={slug} sp={sp} lockedType="House" seoFooter={isRandy ? seoFooterRandy : undefined} />
    </>
  )
}
