import type {
  AgentProfile,
  AgentTerritory,
  AgentListing,
  MarketStats,
  AgentTestimonial,
  AgentAward,
  AgentFaq,
  NeighbourhoodSummary,
  LandingPage,
  AgentPage,
  AreaComparison,
  BestOfList,
  OpenHouseItem,
  SchoolCatchmentSummary,
  NewsPost,
} from './types'
import { getHeroCredentials, resolveSiteConfig } from './types'
import { normalizeCity } from './market'
import { buildSpecializationLine, listToSoldRatio, priceRange, topNeighbourhoods } from './agent-profile'

export interface LlmsTxtExtras {
  stats?: MarketStats
  news?: NewsPost[]
  testimonials?: AgentTestimonial[]
  awards?: AgentAward[]
  faqs?: AgentFaq[]
  neighbourhoods?: NeighbourhoodSummary[]
  landingPages?: LandingPage[]
  pages?: AgentPage[]
  areaComparisons?: AreaComparison[]
  bestOfLists?: BestOfList[]
  openHouses?: OpenHouseItem[]
  schools?: SchoolCatchmentSummary[]
  solds?: AgentListing[]
}

function fmtPrice(p: number | null | undefined): string {
  if (!p) return ''
  if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
  return `$${(p / 1000).toFixed(0)}K`
}

/**
 * Builds the plain-text llms.txt body for a single agent site. Mirrors the
 * same `hero_stats` data already surfaced on the homepage (trust chips,
 * highlights) and in the RealEstateAgent JSON-LD `award` field, so AI
 * crawlers get a concise, curated summary consistent with the rendered page.
 */
export function buildAgentLlmsTxt(
  agent: AgentProfile,
  territories: AgentTerritory[],
  siteUrl: string,
  extras: LlmsTxtExtras = {},
): string {
  const lines: string[] = []

  lines.push(`# ${agent.name}`)
  lines.push('')

  const tagline = agent.bio?.split('\n\n')[0]?.trim()
  if (tagline) {
    lines.push(`> ${tagline}`)
    lines.push('')
  }

  if (agent.brokerage) lines.push(`Brokerage: ${agent.brokerage}`)
  if (agent.license_number) lines.push(`License: ${agent.license_number}`)
  if (agent.settings?.licensed_since) lines.push(`Licensed since: ${agent.settings.licensed_since}`)
  const langs = agent.settings?.languages?.filter(Boolean)
  if (langs && langs.length > 0) lines.push(`Languages: ${langs.join(', ')}`)

  // Contact
  if (agent.phone) lines.push(`Phone: ${agent.phone}`)
  if (agent.email) lines.push(`Email: ${agent.email}`)
  const social = agent.settings?.social_links
  if (social && typeof social === 'object') {
    const SOCIAL_LABELS: Record<string, string> = {
      facebook: 'Facebook',
      instagram: 'Instagram',
      linkedin: 'LinkedIn',
      youtube: 'YouTube',
      twitter: 'Twitter/X',
    }
    for (const [key, label] of Object.entries(SOCIAL_LABELS)) {
      const url = (social as Record<string, string>)[key]
      if (url) lines.push(`${label}: ${url}`)
    }
  }

  const cities = [...new Set(territories.map(t => normalizeCity(t.city)).filter(Boolean))]
  // Always use territory city names for the primary market — sold-derived subareas can surface
  // out-of-territory sales (e.g. a Langley sale for a Tri-Cities agent) and mislead AI crawlers.
  // This mirrors what is shown on the agent homepage.
  const primaryMarketLine = cities.slice(0, 3).join(' & ') || 'Metro Vancouver'
  // Sold listings scoped to territory cities — used for Track Record area copy only.
  // Stats (ratio, price range, count) still use the full sold set.
  const territorySolds = cities.length > 0
    ? (extras.solds ?? []).filter(l => cities.some(c => (l.city ?? '').toLowerCase() === c.toLowerCase()))
    : (extras.solds ?? [])
  if (primaryMarketLine) lines.push(`Primary market: ${primaryMarketLine}`)
  else if (cities.length) lines.push(`Service area: ${cities.join(', ')}`)

  // Credentials & Awards
  const credentials = getHeroCredentials(agent)
  const awards = extras.awards ?? []
  if (credentials.length || awards.length) {
    lines.push('')
    lines.push('## Credentials & Awards')
    for (const c of credentials) lines.push(`- ${c}`)
    for (const a of awards) {
      const parts = [a.title]
      if (a.organization) parts.push(a.organization)
      if (a.year) parts.push(a.year)
      lines.push(`- ${parts.join(' — ')}`)
    }
  }

  // FAQ
  const faqs = extras.faqs ?? []
  if (faqs.length > 0) {
    lines.push('')
    lines.push('## Frequently Asked Questions')
    for (const faq of faqs) {
      lines.push('')
      lines.push(`**Q: ${faq.question}**`)
      lines.push(`A: ${faq.answer}`)
    }
  }

  // Testimonials
  const testimonials = (extras.testimonials ?? []).slice(0, 3)
  if (testimonials.length) {
    lines.push('')
    lines.push('## Client Testimonials')
    for (const t of testimonials) {
      const firstName = t.name?.split(' ')[0] ?? t.name
      const quote = t.text?.trim()
      if (quote) lines.push(`- "${quote.length > 160 ? quote.slice(0, 157) + '…' : quote}" — ${firstName}`)
    }
  }

  // Service area & neighbourhoods
  const neighbourhoods = extras.neighbourhoods ?? []
  const subareas = [...new Set(
    territories
      .map(t => t.subarea)
      .filter((s): s is string => !!s && s.trim().length > 0)
  )]
  if (subareas.length || neighbourhoods.length) {
    lines.push('')
    lines.push('## Service Area & Neighbourhoods')
    if (subareas.length) {
      lines.push(`Subareas served: ${subareas.join(', ')}`)
    }
    for (const n of neighbourhoods) {
      const slug = n.slug
      lines.push(`- [${n.name}](${siteUrl}/neighbourhood/${slug})`)
    }
  }

  // Market snapshot
  const stats = extras.stats
  if (stats) {
    lines.push('')
    lines.push('## Active Market Snapshot')
    lines.push(`- Active listings: ${stats.active_count}`)
    if (stats.sold_last_30_days != null) lines.push(`- Sold last 30 days: ${stats.sold_last_30_days}`)
    if (stats.avg_list_price) lines.push(`- Average list price: ${fmtPrice(stats.avg_list_price)}`)
    if (stats.avg_sold_price) lines.push(`- Average sold price: ${fmtPrice(stats.avg_sold_price)}`)
    if (stats.avg_dom) lines.push(`- Average days on market: ${stats.avg_dom}`)
  }

  const isShowcase = resolveSiteConfig(agent).layout_preset === 'showcase'
  const firstName = agent.name.split(' ')[0]

  if (isShowcase) {
    // Track record from sold data (showcase only — non-showcase gets it below market snapshot)
    const solds = extras.solds ?? []
    if (solds.length >= 3) {
      lines.push('')
      lines.push('## Track Record')
      const spec = buildSpecializationLine(territorySolds)
      if (spec) lines.push(spec)
      const ratio = listToSoldRatio(solds)
      const pairsCount = solds.filter(l => l.sold_price != null && (l.list_price ?? 0) > 0).length
      if (ratio != null) lines.push(`List-to-sold ratio: ${ratio}% of asking price (${pairsCount} transactions)`)
      const range = priceRange(solds)
      if (range) lines.push(`Price range sold: ${fmtPrice(range.min)} – ${fmtPrice(range.max)}`)
      const top = topNeighbourhoods(territorySolds, 3)
      if (top.length) lines.push(`Top areas by volume: ${top.join(', ')}`)
    }

    lines.push('')
    lines.push('## Services')
    lines.push(`- [Sell With Me — home selling strategy & free CMA](${siteUrl}/sell-with-me)`)
    lines.push(`- [Free Home Evaluation](${siteUrl}/home-evaluation)`)
    lines.push(`- [My Listed Properties](${siteUrl}/featured-properties)`)
    lines.push(`- [Search All Homes for Sale](${siteUrl}/search)`)

    lines.push('')
    lines.push('## Key Pages')
    lines.push(`- [Home](${siteUrl}/)`)
    lines.push(`- [About ${firstName}](${siteUrl}/about)`)
    lines.push(`- [Sell With Me](${siteUrl}/sell-with-me)`)
    lines.push(`- [Properties for Sale](${siteUrl}/featured-properties)`)
    lines.push(`- [Free Home Evaluation](${siteUrl}/home-evaluation)`)
    lines.push(`- [Search Homes](${siteUrl}/search)`)
    lines.push(`- [Contact](${siteUrl}/contact)`)

    return `${lines.join('\n')}\n`
  }

  // Track record from sold data (non-showcase)
  const soldsNonShowcase = extras.solds ?? []
  if (soldsNonShowcase.length >= 3) {
    const spec = buildSpecializationLine(territorySolds)
    const ratio = listToSoldRatio(soldsNonShowcase)
    const pairsCount = soldsNonShowcase.filter(l => l.sold_price != null && (l.list_price ?? 0) > 0).length
    const range = priceRange(soldsNonShowcase)
    if (spec || ratio != null || range) {
      lines.push('')
      lines.push('## Agent Track Record')
      if (spec) lines.push(spec)
      if (ratio != null) lines.push(`List-to-sold ratio: ${ratio}% of asking price (${pairsCount} transactions)`)
      if (range) lines.push(`Price range sold: ${fmtPrice(range.min)} – ${fmtPrice(range.max)}`)
    }
  }

  // Browse by property type
  lines.push('')
  lines.push('## Browse by Property Type')
  const propertyTypes = [
    { label: 'All Homes for Sale', path: '/homes-for-sale' },
    { label: 'Condos for Sale', path: '/condos-for-sale' },
    { label: 'Townhouses for Sale', path: '/townhouses-for-sale' },
    { label: 'Houses for Sale', path: '/houses-for-sale' },
    { label: 'Duplexes for Sale', path: '/duplexes-for-sale' },
    { label: 'Luxury Homes', path: '/luxury-homes' },
    { label: 'Ocean View Homes', path: '/ocean-view-homes' },
    { label: 'New Construction', path: '/new-construction' },
    { label: 'Price Reduced Homes', path: '/homes-for-sale/price-reduced' },
    { label: 'Price Reduced Condos', path: '/condos-for-sale/price-reduced' },
    { label: 'Price Reduced Townhouses', path: '/townhouses-for-sale/price-reduced' },
    { label: 'Price Reduced Houses', path: '/houses-for-sale/price-reduced' },
  ]
  for (const t of propertyTypes) lines.push(`- [${t.label}](${siteUrl}${t.path})`)

  // Open houses
  const openHouses = extras.openHouses ?? []
  if (openHouses.length) {
    lines.push('')
    lines.push('## Open Houses')
    lines.push(`- [${openHouses.length} upcoming open house${openHouses.length === 1 ? '' : 's'}](${siteUrl}/open-houses)`)
  }

  // Market intelligence
  lines.push('')
  lines.push('## Market Intelligence')
  lines.push(`- [Market overview & trends](${siteUrl}/market)`)
  lines.push(`- [Market reports archive](${siteUrl}/market-report)`)
  lines.push(`- [Price matrix by type & bedroom](${siteUrl}/price-matrix)`)

  // Per-neighbourhood market pages (up to 20 neighbourhoods, 3 type links each)
  const marketNeighbourhoods = (extras.neighbourhoods ?? []).slice(0, 20)
  const MARKET_TYPES: { key: string; label: string }[] = [
    { key: 'condos', label: 'condos' },
    { key: 'townhouses', label: 'townhouses' },
    { key: 'houses', label: 'houses' },
  ]
  for (const n of marketNeighbourhoods) {
    const slug = n.slug
    const name = n.name
    lines.push(`- [${name} real estate market — avg sold price, days on market, and 12-month trends](${siteUrl}/market/${slug})`)
    for (const t of MARKET_TYPES) {
      lines.push(`- [${name} ${t.label} market](${siteUrl}/market/${slug}/${t.key})`)
    }
  }

  // Neighbourhood guides
  if (neighbourhoods.length) {
    lines.push('')
    lines.push('## Neighbourhood Guides')
    for (const n of neighbourhoods) {
      lines.push(`- [${n.name} guide](${siteUrl}/neighbourhood/${n.slug})`)
    }
  }

  // News & insights
  const news = (extras.news ?? []).slice(0, 5)
  if (news.length) {
    lines.push('')
    lines.push('## News & Insights')
    for (const post of news) {
      lines.push(`- [${post.title}](${siteUrl}/news/${post.slug})`)
    }
  }

  // Buyer & seller resources
  lines.push('')
  lines.push('## Buyer & Seller Resources')
  lines.push(`- [Buyers guide](${siteUrl}/buyers-guide)`)
  lines.push(`- [Sellers guide](${siteUrl}/sellers-guide)`)
  lines.push(`- [Home evaluation](${siteUrl}/home-evaluation)`)
  lines.push(`- [Get your home value](${siteUrl}/get-home-value)`)

  // Schools
  const schools = extras.schools ?? []
  if (schools.length) {
    lines.push('')
    lines.push('## School Catchments')
    for (const s of schools) lines.push(`- ${s.name}${s.district_name ? ` (${s.district_name})` : ''}`)
  }

  // Best-of lists
  const bestOfLists = (extras.bestOfLists ?? []).filter(b => b.status === 'published')
  if (bestOfLists.length) {
    lines.push('')
    lines.push('## Best-Of Lists')
    for (const b of bestOfLists) lines.push(`- [${b.title}](${siteUrl}/best/${b.slug})`)
  }

  // Area comparisons
  const areaComparisons = (extras.areaComparisons ?? []).filter(c => c.status === 'published')
  if (areaComparisons.length) {
    lines.push('')
    lines.push('## Area Comparisons')
    for (const c of areaComparisons) lines.push(`- [${c.title}](${siteUrl}/compare/${c.slug})`)
  }

  // Landing pages (top-realtor style)
  const landingPages = extras.landingPages ?? []
  if (landingPages.length) {
    lines.push('')
    lines.push('## Top Realtor Pages')
    for (const p of landingPages) {
      const label = p.area_display_name
        ? `${p.area_display_name}, ${p.city_display_name}`
        : p.city_display_name
      lines.push(`- [Top realtor in ${label}](${siteUrl}/top-realtor/${p.city_slug}${p.area_slug ? `/${p.area_slug}` : ''})`)
    }
  }

  // Custom CMS pages
  const pages = (extras.pages ?? []).filter(p => p.title)
  if (pages.length) {
    lines.push('')
    lines.push('## Guide Pages')
    for (const p of pages) lines.push(`- [${p.title}](${siteUrl}/guide/${p.slug})`)
  }

  // Key pages
  lines.push('')
  lines.push('## Key Pages')
  lines.push(`- [Home](${siteUrl}/)`)
  lines.push(`- [All listings](${siteUrl}/homes-for-sale)`)
  lines.push(`- [Buildings](${siteUrl}/buildings)`)
  lines.push(`- [Market](${siteUrl}/market)`)
  lines.push(`- [Contact](${siteUrl}/contact)`)

  return `${lines.join('\n')}\n`
}

/**
 * Builds the plain-text llms.txt body for the Residencity hub (residencity.ca
 * apex) — a multi-zone market-intelligence portal rather than a single agent,
 * so it summarizes the zones instead of one agent's credentials.
 */
export function buildResidencityLlmsTxt(): string {
  const lines: string[] = []
  lines.push('# Residencity')
  lines.push('')
  lines.push('> Residencity is a Metro Vancouver real estate market-intelligence portal covering sold listings data, neighbourhood-level market statistics, and a live sold-price heatmap across the full Fraser Valley and Lower Mainland. It aggregates real MLS sold data to give buyers and sellers a transparent picture of what homes actually sell for — not just list prices.')
  lines.push('')
  lines.push('## What Residencity Covers')
  lines.push('- Sold-listings database spanning Fraser Valley and Greater Vancouver')
  lines.push('- Neighbourhood-level market reports: sold count, average sold price, days on market, absorption rate')
  lines.push('- Interactive sold-price heatmap for visual comparison across areas')
  lines.push('- Area search and side-by-side neighbourhood comparison')
  lines.push('- Monthly trend data for apartments, townhouses, and houses by subarea')
  lines.push('')
  lines.push('## Zones')
  lines.push('')

  lines.push('### Fraser Valley — South Surrey & White Rock')
  lines.push('Subareas: South Surrey, White Rock, Ocean Park, Morgan Creek, Grandview Heights, Elgin Chantrell, Sunnyside Park, Crescent Beach, Semiahmoo, Pacific Douglas, King George Corridor, Surrey, Cloverdale, Fleetwood Tynehead, Langley')
  lines.push(`- [Live listings & market stats](https://findfraservalleyhomes.com)`)
  lines.push(`- [Neighbourhood guides](https://findfraservalleyhomes.com/neighbourhood)`)
  lines.push(`- [Market report](https://findfraservalleyhomes.com/market)`)
  lines.push(`- [Price matrix](https://findfraservalleyhomes.com/price-matrix)`)
  lines.push('')

  lines.push('### Burnaby')
  lines.push('Subareas: Burnaby North, Burnaby South, Burnaby East, Burnaby West, Metrotown, Brentwood Park, Highgate, Sullivan Heights, Willingdon Heights, Capitol Hill, Parkcrest, Sperling-Duthie')
  lines.push(`- [Market overview](https://website.pixilink.com/burnaby)`)
  lines.push(`- [Neighbourhood guides](https://website.pixilink.com/burnaby/neighbourhood)`)
  lines.push(`- [Market report](https://website.pixilink.com/burnaby/market)`)
  lines.push('')

  lines.push('### Tri-Cities')
  lines.push('Subareas: Coquitlam, Port Coquitlam, Port Moody, Anmore, Belcarra, Burke Mountain, Westwood Plateau, New Horizons, Ranch Park, Eagle Ridge, Chineside')
  lines.push(`- [Market overview](https://website.pixilink.com/tricity)`)
  lines.push(`- [Neighbourhood guides](https://website.pixilink.com/tricity/neighbourhood)`)
  lines.push(`- [Market report](https://website.pixilink.com/tricity/market)`)
  lines.push('')

  lines.push('### Vancouver — Sharene Shuster')
  lines.push('Subareas: Vancouver West, Vancouver East, Downtown Vancouver, Kerrisdale, Kitsilano, Dunbar, Shaughnessy, Oakridge, Marpole, Point Grey')
  lines.push(`- [Market overview](https://shareneshuster.com)`)
  lines.push(`- [Neighbourhood guides](https://shareneshuster.com/neighbourhood)`)
  lines.push(`- [Market report](https://shareneshuster.com/market)`)
  lines.push('')

  lines.push('## Key Pages')
  lines.push('- [Home](https://residencity.ca/)')
  lines.push('- [Sold heatmap](https://residencity.ca/#heatmap)')
  lines.push('- [Area search & comparison](https://residencity.ca/#area-search)')
  lines.push('- [Fraser Valley neighbourhood guides](https://findfraservalleyhomes.com/neighbourhood)')
  lines.push('- [Burnaby neighbourhood guides](https://website.pixilink.com/burnaby/neighbourhood)')
  lines.push('- [Tri-Cities neighbourhood guides](https://website.pixilink.com/tricity/neighbourhood)')
  lines.push('- [Vancouver neighbourhood guides](https://shareneshuster.com/neighbourhood)')

  return `${lines.join('\n')}\n`
}
