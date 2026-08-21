import { playfair } from '@/lib/fonts'
import type { AgentProfile, AgentSoldStats, LandingPage, NeighbourhoodWidget } from '@/lib/types'
import { formatPriceFull, imgUrl, avatarUrl, getCoAgents } from '@/lib/types'
import { marketBadge } from '@/lib/market'
import ConversionWidget from './ConversionWidget'
import HomeEvalForm from './HomeEvalForm'
import PropIcon from '@/components/PropIcon'
import { regionSlugForAgent } from '@/lib/api'
import { getAgentAchievements, getCoAgentAchievements } from '@/lib/agent-achievements'


const AGENT_ACHIEVEMENTS: Record<string, string[]> = {
  nav: [
    'MLS Medallion Club — Top 10% of Realtors in Greater Vancouver',
    'Top 50 RE/MAX Western Canada',
    'Top Coquitlam Realtor 2021–2025 (Rank My Agent & Rate My Agent)',
    'Over $60 Million in Transaction Volume in 2025',
    '95+ Five-Star Google Reviews',
    'Local Tri-Cities expert for 22+ years',
    'Speaks English & Farsi',
    'Certified Negotiation Expert',
  ],
  reza: [
    'MLS Medallion Club — Top 10% of Realtors in Greater Vancouver',
    "RE/MAX Chairman's Club",
    'Top 100 RE/MAX Agents in Western Canada',
    'Best of Coquitlam 2022–2025 (Rank My Agent & Rate My Agent)',
    'Best of Port Moody 2022–2025 (Rank My Agent & Rate My Agent)',
    'Top Canadian Real Estate Agent (Rank My Agent & Rate My Agent)',
    'Certified Negotiation Expert',
  ],
}

interface Props {
  agent: AgentProfile
  page: LandingPage
  widget: NeighbourhoodWidget | null
  agentSlug: string
  buyers: number
  allPages?: LandingPage[]
  /** Property-type override: condos | townhouses | houses — set by [propertyType] route */
  propertyType?: string | null
  /** Live MLS sold stats for this agent (5-year window) */
  soldStats?: AgentSoldStats | null
}

const PROPERTY_TYPE_META: Record<string, { singular: string; plural: string; listingHref: string; emoji: string; copy: string }> = {
  condos: {
    singular: 'Condo',
    plural: 'Condos',
    listingHref: '/condos-for-sale',
    emoji: '🏢',
    copy: 'Expert guidance for condo buyers and sellers — from studio apartments to penthouse suites. Deep knowledge of strata rules, depreciation reports, and building-by-building value differences.',
  },
  townhouses: {
    singular: 'Townhouse',
    plural: 'Townhouses',
    listingHref: '/townhouses-for-sale',
    emoji: '🏘️',
    copy: 'Townhouse specialists — strata townhomes, duplexes, and rowhomes. Extensive experience navigating complex pricing, strata rules, and neighbourhood-by-neighbourhood demand.',
  },
  houses: {
    singular: 'House',
    plural: 'Houses',
    listingHref: '/houses-for-sale',
    emoji: '🏡',
    copy: 'Detached home specialists — from starter homes to custom-built estates on large lots. Expertise in pricing strategy, lot value, and the nuances of the detached market.',
  },
}

export default function TopRealtorPage({ agent, page, widget, agentSlug, buyers, allPages = [], propertyType = null, soldStats = null }: Props) {
  const regionSlug = agentSlug ? regionSlugForAgent(agentSlug) : null
  const agentPrefix = regionSlug ? `/${regionSlug}` : `/agent/${agentSlug}`
  const ap = (p: string) => agentSlug ? `${agentPrefix}${p}` : p
  const locationName = page.area_display_name || page.city_display_name
  const placeLabel = page.area_display_name
    ? `${page.area_display_name}, ${page.city_display_name}`
    : `${page.city_display_name}, ${page.province}`
  const badge = widget ? marketBadge(widget.market_type) : null

  const coAgents = getCoAgents(agent)
  const isDual = coAgents.length > 0
  const displayNames = isDual
    ? `${agent.name} & ${coAgents.map(c => c.name).join(' & ')}`
    : agent.name
  const firstName = isDual ? displayNames : agent.name.split(' ')[0]

  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 400) : null

  const ptMeta = propertyType ? PROPERTY_TYPE_META[propertyType] ?? null : null

  // Trust stat bar — prefer live MLS sold stats when available, fall back to page fields.
  // For the tricity agent the sold count and volume are intentionally overridden to reflect
  // the full career track record rather than the MLS-reported 5-year window.
  const hasLiveStats = soldStats != null && soldStats.sold_count > 0
  const isTriCity = agent.slug === 'tricity'
  const stats: { value: string; label: string }[] = hasLiveStats
    ? [
        { value: isTriCity ? '100+' : String(soldStats!.sold_count), label: `Tri-Cities Homes Sold (${soldStats!.years}yr)` },
        { value: isTriCity ? '$122M+' : `$${(soldStats!.total_volume / 1_000_000).toFixed(1)}M`, label: 'Total Sales Volume' },
        { value: `${soldStats!.avg_sale_to_list}%`, label: 'Avg Sale-to-List Ratio' },
        { value: `${soldStats!.best_sale_to_list}%`, label: 'Best Price Achieved' },
      ]
    : [
        page.stat_years_exp != null ? { value: `${page.stat_years_exp}+`, label: 'Years Experience' } : null,
        page.stat_sold_volume ? { value: page.stat_sold_volume, label: 'Career Sales' } : null,
        page.stat_team_size != null ? { value: String(page.stat_team_size), label: 'Dedicated Agents' } : null,
        page.stat_award_label ? { value: '#1', label: page.stat_award_label } : null,
      ].filter((x): x is { value: string; label: string } => x !== null)

  // Sibling landing pages for SEO interlinking
  const siblingPages = allPages.filter(
    p => !(p.city_slug === page.city_slug && (p.area_slug ?? null) === (page.area_slug ?? null)),
  )

  // ── Canonical page URL ─────────────────────────────────────────────────────
  const baseUrl = agent.settings?.custom_domain
    ? `https://${agent.settings.custom_domain}`
    : `https://website.pixilink.com/agent/${agentSlug}`
  const cityUrl = `${baseUrl}/top-realtor/${page.city_slug}`
  const areaUrl = page.area_slug ? `${cityUrl}/${page.area_slug}` : cityUrl
  const pageUrl = ptMeta ? `${areaUrl}/${propertyType}` : areaUrl

  // ── Agent achievements ──────────────────────────────────────────────────────
  const agentAchievements = getAgentAchievements(agentSlug)
  const primaryCredentials = agentAchievements.length > 0
    ? agentAchievements
    : [
        ...(page.stat_years_exp != null ? [{ label: `${page.stat_years_exp}+ Years Local Experience` }] : []),
        ...(page.stat_sold_volume ? [{ label: `${page.stat_sold_volume} in Career Sales` }] : []),
        ...page.award_badges.map(b => ({ label: b })),
        ...(agent.brokerage ? [{ label: `${agent.brokerage} — Licensed in BC` }] : []),
        { label: `Responds ${page.respond_time_label}` },
      ]

  // ── H1 override for property-type pages ────────────────────────────────────
  const h1 = ptMeta
    ? `Best Realtor to Sell a ${ptMeta.singular} in ${locationName}${isDual ? ` — ${displayNames}` : ` — ${agent.name}`}`
    : `Top Realtor in ${placeLabel}`

  // ── FAQ questions ─────────────────────────────────────────────────────────
  // Property-type pages and dual-agent pages each get tailored FAQ sets.
  // Single-agent (no propertyType) preserves the original verbatim FAQ corpus.
  const faqs = ptMeta
    ? [
        {
          q: `Who is the best realtor to sell a ${ptMeta.singular.toLowerCase()} in ${locationName}?`,
          a: `${displayNames} ${isDual ? 'are' : 'is'} widely regarded as ${isDual ? 'the top realtor team' : 'the top realtor'} for ${ptMeta.plural.toLowerCase()} in ${locationName}${page.stat_sold_volume ? ` with ${page.stat_sold_volume} in career sales volume` : ''}. ${isDual ? 'They specialize' : `${firstName} specializes`} in accurate pricing, targeted marketing, and fast closings for ${ptMeta.singular.toLowerCase()} sellers in ${placeLabel}.`,
        },
        {
          q: `How much does it cost to sell a ${ptMeta.singular.toLowerCase()} in ${locationName}?`,
          a: `A free home evaluation with ${firstName} costs nothing. Standard commission rates apply on completed transactions. ${isDual ? 'Their' : `${firstName}'s`} pricing expertise in the ${ptMeta.singular.toLowerCase()} market consistently results in higher net proceeds — most sellers find the right agent pays for itself many times over.`,
        },
        {
          q: `What is the current ${ptMeta.singular.toLowerCase()} market like in ${locationName}?`,
          a: widget && badge
            ? `The ${locationName} ${ptMeta.singular.toLowerCase()} market is currently a ${badge.label}. The average sold price over the last 30 days is ${formatPriceFull(widget.avg_sold_price)}, with ${widget.active.toLocaleString()} active listings and ${widget.sold_30d} homes sold in the past month. Contact ${firstName} for a ${ptMeta.singular.toLowerCase()}-specific market analysis.`
            : `The ${locationName} ${ptMeta.singular.toLowerCase()} market is active year-round. ${displayNames} monitor${isDual ? '' : 's'} every listing and sale in ${placeLabel} daily. Contact ${firstName} for a free, personalized analysis tailored to your property.`,
        },
        {
          q: `How long does it take to sell a ${ptMeta.singular.toLowerCase()} in ${locationName}?`,
          a: widget && widget.avg_dom > 0
            ? `${ptMeta.plural} in ${locationName} are currently selling in an average of ${widget.avg_dom} days on market. A well-prepared ${ptMeta.singular.toLowerCase()} priced correctly from day one will always outperform one that chases the market down. ${firstName} uses real-time MLS® data to position every listing for a fast sale.`
            : `The time to sell a ${ptMeta.singular.toLowerCase()} in ${locationName} depends on pricing strategy, condition, and market conditions. ${displayNames} use${isDual ? '' : 's'} live MLS® data to position every listing optimally. Contact ${firstName} for a realistic timeline specific to your property.`,
        },
        {
          q: `Should I buy or sell a ${ptMeta.singular.toLowerCase()} first in ${locationName}?`,
          a: `Whether to buy or sell first depends on your financial position and current market conditions. ${displayNames} ${isDual ? 'have' : 'has'} navigated hundreds of these transitions for ${placeLabel} clients and can map out the exact pros, cons, and costs for your ${ptMeta.singular.toLowerCase()} situation at no charge.`,
        },
        {
          q: `What makes ${locationName} ${ptMeta.plural.toLowerCase()} a good investment?`,
          a: `${locationName} ${ptMeta.plural.toLowerCase()} offer strong long-term value driven by constrained land supply, solid rental demand, and ongoing buyer interest. ${widget && widget.avg_sold_price > 0 ? `The current average sold price of ${formatPriceFull(widget.avg_sold_price)} reflects genuine buyer demand. ` : ''}${firstName} can advise on which ${ptMeta.singular.toLowerCase()} sub-markets and price ranges are positioned for the best returns.`,
        },
      ]
    : isDual
      ? [
          ...(hasLiveStats ? [{
            q: `How many homes have ${displayNames} sold in the Tri-Cities?`,
            a: isTriCity
              ? `${displayNames} have sold 100+ homes across Port Coquitlam, Coquitlam, and Port Moody, with over $122M in total sales volume. Their average sale-to-list ratio across the Tri-Cities is ${soldStats!.avg_sale_to_list}%${soldStats!.best_sale_to_list > 100 ? `, with the top result reaching ${soldStats!.best_sale_to_list}% of asking price` : ''}. This track record spans houses, townhouses, condos, and duplexes across all three cities.`
              : `Over the past ${soldStats!.years} years, ${displayNames} have sold ${soldStats!.sold_count} homes across Port Coquitlam, Coquitlam, and Port Moody, with $${(soldStats!.total_volume / 1_000_000).toFixed(1)}M in total sales volume. Their average sale-to-list ratio across the Tri-Cities is ${soldStats!.avg_sale_to_list}%${soldStats!.best_sale_to_list > 100 ? `, with the top result reaching ${soldStats!.best_sale_to_list}% of asking price` : ''}. This track record spans houses, townhouses, condos, and duplexes across all three cities.`,
          }] : []),
          {
            q: `Who are the top realtors in ${locationName}?`,
            a: `${displayNames} are widely regarded as the top realtor team in ${locationName}${page.stat_years_exp ? `, BC, with over ${page.stat_years_exp} years of combined local real estate experience` : ', BC'}${isTriCity ? ` and $122M+ in Tri-Cities sales volume` : hasLiveStats ? ` and $${(soldStats!.total_volume / 1_000_000).toFixed(1)}M in Tri-Cities sales volume over the past ${soldStats!.years} years` : page.stat_sold_volume ? ` and ${page.stat_sold_volume} in career sales volume` : ''}. As ${agent.brokerage} agents, they provide full-service representation for buyers and sellers across ${placeLabel}. ${page.award_badges.length ? `Their awards include: ${page.award_badges.join(', ')}.` : 'They are known for delivering above-market results with a straightforward, data-driven approach.'}`,
          },
          {
            q: `How much does it cost to hire a top realtor in ${locationName}?`,
            a: `A free home evaluation with ${displayNames} costs nothing and comes with no obligation. Standard commission rates apply on completed transactions, but their pricing expertise and negotiation track record consistently result in higher net proceeds for sellers and better purchase pricing for buyers in ${locationName}. Most clients find that working with a top-tier local team pays for itself many times over in the final sale or purchase price.`,
          },
          {
            q: `What is the current real estate market like in ${locationName}?`,
            a: widget && badge
              ? `The ${locationName} real estate market is currently a ${badge.label}. The average sold price over the last 30 days is ${formatPriceFull(widget.avg_sold_price)}, with ${widget.active.toLocaleString()} active listings and ${widget.sold_30d} homes sold in the past month${widget.avg_dom > 0 ? `, and an average of ${widget.avg_dom} days on market` : ''}. Contact ${displayNames} for a personalized market analysis specific to your property type and price range.`
              : `The ${locationName} real estate market is active year-round, with strong demand driven by the area's proximity, quality schools, and lifestyle appeal. ${displayNames} monitor every listing and sale in ${placeLabel} daily. Contact the team for a free, personalized market analysis.`,
          },
          {
            q: `How long does it take to sell a home in ${locationName}?`,
            a: widget && widget.avg_dom > 0
              ? `Homes in ${locationName} are currently selling in an average of ${widget.avg_dom} days on market. However, this varies significantly by price range, property type, and how the home is priced and presented. ${displayNames} use real-time MLS® data to price listings precisely, which is why their sellers consistently achieve faster sales than the market average. A well-prepared home priced correctly from day one will always outperform one that chases the market down.`
              : `The time to sell a home in ${locationName} depends on price point, property type, and market conditions — but preparation and pricing strategy make the biggest difference. ${displayNames} use live MLS® data to position every listing for a fast, above-market sale. Homes priced correctly in ${locationName} typically attract serious buyers within the first two weeks.`,
          },
          {
            q: `Should I buy or sell first in ${locationName}?`,
            a: `Whether to buy or sell first depends on your financial position, current market conditions, and your personal risk tolerance — and the answer varies for every client. In a ${badge ? badge.label : 'balanced'} market like ${locationName} is seeing right now, the team typically reviews bridge financing options, subject-to-sale strategies, and timing windows to find the approach that protects you best. ${displayNames} have navigated hundreds of these transitions for ${placeLabel} clients and can map out the exact pros, cons, and costs for your situation at no charge.`,
          },
          {
            q: `What makes ${locationName} a great place to buy real estate?`,
            a: `${locationName} offers a combination of proximity to amenities, highly-rated schools, and one of the most stable real estate markets in the Lower Mainland. ${displayNames} have lived and worked in this community for over ${page.stat_years_exp ?? 'two'} years and can speak firsthand to the micro-neighbourhoods, hidden gems, and areas to avoid — knowledge that no algorithm or out-of-town agent can replicate.`,
          },
          {
            q: `Is ${locationName} real estate a good investment right now?`,
            a: `${locationName} has consistently shown strong long-term value, driven by constrained land supply, strong migration, and ongoing demand for the lifestyle the area offers. ${widget && widget.avg_sold_price > 0 ? `The current average sold price of ${formatPriceFull(widget.avg_sold_price)} reflects an active market with genuine buyer demand. ` : ''}${displayNames} advise on investment strategy and can identify which property types and sub-neighbourhoods are positioned for the best returns.`,
          },
          {
            q: `What types of homes are available in ${locationName}?`,
            a: `${locationName} offers the full spectrum of housing: detached single-family houses, strata townhouses, condominiums and apartments, and a range of luxury properties. ${displayNames} specialize across all property types — houses, townhouses, condos, and luxury homes — and can match you to the right fit for your budget and lifestyle.`,
          },
        ]
      : /* Original single-agent verbatim FAQ */ [
          {
            q: `Who is the top realtor in ${locationName}?`,
            a: `${agent.name} is widely regarded as one of the top realtors in ${locationName}${page.stat_years_exp ? `, BC, with over ${page.stat_years_exp} years of local real estate experience` : ', BC'}${page.stat_sold_volume ? ` and ${page.stat_sold_volume} in career sales volume` : ''}. ${agent.brokerage ? `As a ${agent.brokerage} agent, ${firstName}` : firstName} provides full-service representation for buyers and sellers across ${placeLabel}. ${page.award_badges.length ? `${firstName}'s awards include: ${page.award_badges.join(', ')}.` : `${firstName} is known for delivering above-market results with a straightforward, data-driven approach.`}`,
          },
          {
            q: `How much does it cost to hire a top realtor in ${locationName}?`,
            a: `A free home evaluation with ${firstName} costs nothing and comes with no obligation. Standard commission rates apply on completed transactions, but ${firstName}'s pricing expertise and negotiation track record consistently result in higher net proceeds for sellers and better purchase pricing for buyers in ${locationName}. Most clients find that working with a top-tier local agent pays for itself many times over in the final sale or purchase price.`,
          },
          {
            q: `What is the current real estate market like in ${locationName}?`,
            a: widget && badge
              ? `The ${locationName} real estate market is currently a ${badge.label}. The average sold price over the last 30 days is ${formatPriceFull(widget.avg_sold_price)}, with ${widget.active.toLocaleString()} active listings and ${widget.sold_30d} homes sold in the past month${widget.avg_dom > 0 ? `, and an average of ${widget.avg_dom} days on market` : ''}. Contact ${firstName} for a personalized market analysis specific to your property type and price range.`
              : `The ${locationName} real estate market is active year-round, with strong demand driven by the area's ocean proximity, quality schools, and lifestyle appeal. ${agent.name} monitors every listing and sale in ${placeLabel} daily, so you always have the most current picture. Contact ${firstName} for a free, personalized market analysis tailored to your situation.`,
          },
          {
            q: `How long does it take to sell a home in ${locationName}?`,
            a: widget && widget.avg_dom > 0
              ? `Homes in ${locationName} are currently selling in an average of ${widget.avg_dom} days on market. However, this varies significantly by price range, property type, and how the home is priced and presented. ${firstName} uses real-time MLS® data to price listings precisely, which is why his sellers consistently achieve faster sales than the market average. A well-prepared home priced correctly from day one will always outperform one that chases the market down.`
              : `The time to sell a home in ${locationName} depends on price point, property type, and market conditions — but preparation and pricing strategy make the biggest difference. ${agent.name} uses live MLS® data to position every listing for a fast, above-market sale. Homes priced correctly in ${locationName} typically attract serious buyers within the first two weeks. ${firstName} will walk you through realistic timelines based on your specific property before you ever sign a listing agreement.`,
          },
          {
            q: `Should I buy or sell first in ${locationName}?`,
            a: `Whether to buy or sell first depends on your financial position, current market conditions, and your personal risk tolerance — and the answer varies for every client. In a ${badge ? badge.label : 'balanced'} market like ${locationName} is seeing right now, ${firstName} typically reviews bridge financing options, subject-to-sale strategies, and timing windows to find the approach that protects you best. ${agent.name} has navigated hundreds of these transitions for ${placeLabel} clients and can map out the exact pros, cons, and costs for your situation at no charge.`,
          },
          {
            q: `What makes ${locationName} a great place to buy real estate?`,
            a: `${locationName} offers a rare combination of ocean and mountain proximity, highly-rated schools, walkable village areas, and one of the most stable real estate markets in the Lower Mainland. The area attracts buyers from across Metro Vancouver seeking more space, better lifestyle, and strong long-term value. ${page.stat_years_exp ? `${firstName} has lived and worked in this community for over ${page.stat_years_exp} years` : firstName} and can speak firsthand to the micro-neighbourhoods, hidden gems, and areas to avoid — knowledge that no algorithm or out-of-town agent can replicate.`,
          },
          {
            q: `Is ${locationName} real estate a good investment right now?`,
            a: `${locationName} and the broader South Surrey/White Rock corridor have consistently outperformed Metro Vancouver averages over the long term, driven by constrained land supply, strong migration from the Lower Mainland, and ongoing demand for the lifestyle the area offers. ${widget && widget.avg_sold_price > 0 ? `The current average sold price of ${formatPriceFull(widget.avg_sold_price)} reflects an active market with genuine buyer demand. ` : ''}Savvy investors focus on areas with limited new supply and strong rental demand — both of which describe much of ${placeLabel}. ${firstName} advises on investment strategy and can identify which property types and sub-neighbourhoods are positioned for the best returns.`,
          },
          {
            q: `What types of homes are available in ${locationName}?`,
            a: `${locationName} offers the full spectrum of housing: detached single-family houses, strata townhouses, condominiums and apartments, oceanfront and ocean-view properties, and luxury estates above $2 million. South Surrey neighbourhoods like Morgan Creek, Elgin Chantrell, and Grandview Heights are known for upscale detached homes and gated communities. White Rock's Marine Drive corridor is home to some of the only genuine oceanfront real estate in the region. ${firstName} specializes across all property types — houses, townhouses, condos, and luxury homes — and can match you to the right fit for your budget and lifestyle.`,
          },
          {
            q: `Are there oceanfront homes for sale in White Rock?`,
            a: `Yes — White Rock has a genuine oceanfront market along Marine Drive and the beachside streets above East Beach. Properties range from heritage cottages to custom-built ocean-view homes and luxury waterfront estates, with some of the most coveted addresses in Metro Vancouver. Inventory is very limited; available oceanfront and ocean-view homes in White Rock rarely exceed 5–10 active listings at any time. ${firstName} maintains a private watchlist for buyers who want early access to oceanfront properties before they're publicly advertised. Contact ${firstName} directly to be added to the list.`,
          },
          {
            q: `What is the price range for luxury homes in South Surrey and White Rock?`,
            a: `Luxury homes in South Surrey and White Rock typically start around $2 million for a quality detached home in prestigious neighbourhoods like Morgan Creek, Elgin Chantrell, or Crescent Beach. True estate properties — custom builds on large lots, gated community homes, and genuine oceanfront residences — range from $3 million to well above $10 million. ${firstName}'s track record in the luxury segment includes off-market sales and private negotiations for clients who value discretion. Reach out directly to discuss your luxury home goals in South Surrey or White Rock.`,
          },
        ]

  // ── BreadcrumbList ─────────────────────────────────────────────────────────
  const breadcrumbItems: { name: string; item: string }[] = [
    { name: 'Home', item: `${baseUrl}/` },
    { name: `Top Realtor ${page.city_display_name}`, item: cityUrl },
  ]
  if (page.area_slug) {
    breadcrumbItems.push({ name: page.area_display_name || locationName, item: areaUrl })
  }
  if (ptMeta) {
    breadcrumbItems.push({ name: `Best ${ptMeta.singular} Realtor ${locationName}`, item: pageUrl })
  }

  // ── JSON-LD @graph ─────────────────────────────────────────────────────────
  const agentDesc =
    page.meta_description ||
    `${displayNames}${agent.brokerage ? ` — ${agent.brokerage}` : ''} ${isDual ? 'are' : 'is'} top-rated realtor${isDual ? 's' : ''} in ${placeLabel}.${page.stat_years_exp ? ` ${page.stat_years_exp}+ years of local expertise.` : ''}${page.stat_sold_volume ? ` ${page.stat_sold_volume} in sales.` : ''}`

  const personNodes = [
    {
      '@type': 'Person',
      name: agent.name,
      jobTitle: agent.brokerage ? `Realtor — ${agent.brokerage}` : 'Realtor',
      url: pageUrl,
      ...(agent.photo_path ? { image: imgUrl(agent.photo_path, 900) } : {}),
      ...(agent.phone ? { telephone: agent.phone } : {}),
      ...(agent.email ? { email: agent.email } : {}),
      ...(page.award_badges.length ? { award: page.award_badges.join(', ') } : {}),
      ...(agent.brokerage ? { worksFor: { '@type': 'Organization', name: agent.brokerage } } : {}),
      knowsAbout: [
        `${locationName} Real Estate`,
        `${page.city_display_name} Housing Market`,
        `South Surrey Houses for Sale`,
        `White Rock Condos and Apartments`,
        `South Surrey Townhouses`,
        `White Rock Oceanfront Homes`,
        `South Surrey Luxury Homes and Estates`,
        `Morgan Creek Real Estate`,
        `Elgin Chantrell Luxury Estates`,
        'BC Real Estate Market',
        ...(page.award_badges.length ? page.award_badges.slice(0, 2) : []),
      ],
      areaServed: { '@type': 'Place', name: `${placeLabel}, Canada` },
    },
    ...coAgents.map(ca => ({
      '@type': 'Person',
      name: ca.name,
      jobTitle: `Realtor — ${ca.title || agent.brokerage}`,
      url: pageUrl,
      ...(ca.photo ? { image: imgUrl(ca.photo, 400) } : {}),  // JSON-LD image stays absolute: the resizer URL is relative and cache-scoped, which is wrong for structured data
      ...(ca.phone ? { telephone: ca.phone } : {}),
      ...(ca.email ? { email: ca.email } : {}),
      worksFor: { '@type': 'Organization', name: ca.title || agent.brokerage },
      knowsAbout: [`${locationName} Real Estate`, `${page.city_display_name} Housing Market`, 'BC Real Estate Market'],
      areaServed: { '@type': 'Place', name: `${placeLabel}, Canada` },
    })),
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: item.item,
        })),
      },
      ...personNodes,
      {
        '@type': 'RealEstateAgent',
        name: `${displayNames}${agent.brokerage ? ` — ${agent.brokerage}` : ''}`,
        url: baseUrl,
        ...(agent.phone ? { telephone: agent.phone } : {}),
        ...(agent.photo_path ? { image: imgUrl(agent.photo_path, 900) } : {}),
        description: agentDesc,
        ...(page.award_badges.length ? { award: page.award_badges[0] } : {}),
        ...(agent.brokerage ? { memberOf: { '@type': 'Organization', name: agent.brokerage } } : {}),
        areaServed: { '@type': 'Place', name: `${placeLabel}, Canada` },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: `Real Estate Services in ${placeLabel}`,
          itemListElement: [
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: `Home Selling — ${locationName}` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: `Home Buying — ${locationName}` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Free Home Evaluation' } },
            ...(ptMeta ? [{ '@type': 'Offer', itemOffered: { '@type': 'Service', name: `${ptMeta.singular} Sales — ${locationName}` } }] : []),
          ],
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--brand-bg)', padding: '60px 0 50px' }}>
        <div className="container">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: 16 }}>
            <ol style={{ display: 'flex', flexWrap: 'wrap', gap: 6, listStyle: 'none', padding: 0, margin: 0, fontSize: 13 }}>
              <li>
                <a href={ap('/')} style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Home</a>
                <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>/</span>
              </li>
              {page.area_slug && (
                <li>
                  <a href={`${ap('/top-realtor')}/${page.city_slug}`} style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
                    Top Realtor {page.city_display_name}
                  </a>
                  <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>/</span>
                </li>
              )}
              {ptMeta && page.area_slug && (
                <li>
                  <a href={`${ap('/top-realtor')}/${page.city_slug}/${page.area_slug}`} style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
                    {page.area_display_name || locationName}
                  </a>
                  <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>/</span>
                </li>
              )}
              <li style={{ color: '#fff' }}>
                {ptMeta
                  ? `Best ${ptMeta.singular} Realtor`
                  : page.area_slug ? page.area_display_name : `Top Realtor ${page.city_display_name}`}
              </li>
            </ol>
          </nav>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, alignItems: 'center' }} className="tr-hero-grid">
            <div>
              {/* Award badge pills */}
              {page.award_badges.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  {page.award_badges.map((b, i) => (
                    <span key={i} style={{
                      display: 'inline-block',
                      background: i === 0 ? '#cc0000' : 'rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontSize: 11, fontWeight: 800,
                      padding: '4px 12px', borderRadius: 3,
                      textTransform: 'uppercase', letterSpacing: '0.8px',
                    }}>
                      {b}
                    </span>
                  ))}
                </div>
              )}

              {ptMeta && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{
                    display: 'inline-block',
                    background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)',
                    fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 3,
                    textTransform: 'uppercase', letterSpacing: '0.8px',
                  }}>
                    {ptMeta.singular} Specialist
                  </span>
                </div>
              )}

              <h1 className={playfair.className} style={{ fontSize: 'clamp(1.8rem,4vw,2.25rem)', fontWeight: 800, color: '#fff', margin: '0 0 14px', lineHeight: 1.2 }}>
                {h1}
              </h1>

              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.9)', margin: '0 0 8px', lineHeight: 1.6 }}>
                Work directly with <strong style={{ color: '#fff' }}>{displayNames}</strong>
                {agent.brokerage ? ` — ${agent.brokerage}` : ''}
                {page.stat_years_exp ? ` — ${page.stat_years_exp}+ years of local expertise` : ''}.
                {ptMeta
                  ? ` ${ptMeta.copy}`
                  : isDual
                    ? ` Specializing in ${placeLabel} houses, townhouses, condos, and investment properties.`
                    : ` Specializing in South Surrey and White Rock houses, townhouses, condos, oceanfront homes, and luxury estates.`}
                {isTriCity
                  ? ` 100+ homes sold across the Tri-Cities — $122M+ in total sales volume.`
                  : hasLiveStats
                  ? ` ${soldStats!.sold_count} homes sold across the Tri-Cities — $${(soldStats!.total_volume / 1_000_000).toFixed(1)}M in total sales volume.`
                  : page.stat_sold_volume ? ` ${page.stat_sold_volume} in career sales.` : ''}
              </p>

              {page.award_badges.length > 0 && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: '0 0 22px' }}>
                  {page.award_badges.join(' · ')}
                </p>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <a
                  href={ap('/contact')}
                  style={{
                    background: 'var(--cta-primary)', color: 'var(--cta-primary-text)',
                    border: 'none', borderRadius: 5,
                    padding: '13px 24px', fontSize: 15, fontWeight: 700,
                    textDecoration: 'none', cursor: 'pointer',
                  }}
                >
                  {isDual ? 'Talk to Us Now' : `Talk to ${firstName} Now`}
                </a>
                {agent.phone && (
                  <a
                    href={`tel:${agent.phone}`}
                    style={{
                      background: 'transparent', color: '#fff',
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderRadius: 5, padding: '13px 24px',
                      fontSize: 15, fontWeight: 600, textDecoration: 'none',
                    }}
                  >
                    Call {agent.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Headshot — side-by-side overlapping circles for dual-agent, single circle for solo */}
            {isDual ? (
              <div style={{ display: 'flex', flexShrink: 0 }} className="tr-headshot">
                {coAgents.map((ca, i) => (
                  <div key={i} style={{ textAlign: 'center', marginLeft: i > 0 ? -16 : 0, zIndex: coAgents.length - i }}>
                    {ca.photo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={avatarUrl(ca.photo, 400)}
                        alt={`${ca.name} — Top Realtor ${locationName}`}
                        style={{
                          width: 140, height: 140, objectFit: 'cover',
                          objectPosition: 'center 15%', borderRadius: '50%',
                          border: '3px solid #000',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
                          display: 'block', margin: '0 auto',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 140, height: 140, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)', border: '3px solid #000',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46,
                        color: 'rgba(255,255,255,0.3)',
                      }}>👤</div>
                    )}
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, marginTop: 8 }}>{ca.name.split(' ')[0]}</div>
                  </div>
                ))}
                {photoSrc && (
                  <div style={{ textAlign: 'center', marginLeft: -16, zIndex: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoSrc}
                      alt={`${agent.name} — Top Realtor ${locationName}`}
                      style={{
                        width: 140, height: 140, objectFit: 'cover',
                        objectPosition: 'center 15%', borderRadius: '50%',
                        border: '3px solid #000',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
                        display: 'block', margin: '0 auto',
                      }}
                    />
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, marginTop: 8 }}>{agent.name.split(' ')[0]}</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', flexShrink: 0 }} className="tr-headshot">
                {photoSrc ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={photoSrc}
                    alt={`${agent.name} — Top Realtor ${locationName}`}
                    style={{
                      width: 160, height: 160, objectFit: 'cover',
                      objectPosition: 'center 15%', borderRadius: '50%',
                      border: '4px solid #000',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
                      display: 'block', margin: '0 auto',
                    }}
                  />
                ) : (
                  <div style={{
                    width: 160, height: 160, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    border: '4px solid #000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto', fontSize: 52, color: 'rgba(255,255,255,0.3)',
                  }}>
                    👤
                  </div>
                )}
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginTop: 12 }}>{agent.name}</div>
                <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, marginTop: 3 }}>Top Realtor · {locationName}</div>
                {agent.brokerage && (
                  <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 }}>{agent.brokerage}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. TRUST STATS BAR ────────────────────────────────────────────────── */}
      {stats.length > 0 && (
        <div style={{ background: 'var(--brand-bg)', padding: '18px 0' }}>
          <div className="container">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', gap: '8px 0' }}>
              {stats.map((s, i) => (
                <div key={i} style={{ padding: '8px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1, textShadow: '0 1px 4px rgba(0,0,0,0.35)' }}>{s.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.92)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="container" style={{ paddingTop: 40, paddingBottom: 20 }}>

        {/* ── 3. MARKET SNAPSHOT CARD ──────────────────────────────────────── */}
        {widget && badge && (
          <div style={{
            background: 'var(--surface-alt)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '22px 24px', marginBottom: 32,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>
              {placeLabel} Market Right Now
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, alignItems: 'center' }} className="tr-market-grid">
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{badge.label}</div>
                {widget.absorption_rate != null && widget.absorption_rate > 0 && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                    Absorption rate: {widget.absorption_rate.toFixed(1)}%
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)' }}>{widget.active.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Homes For Sale</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)' }}>{widget.sold_30d.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sold (30d)</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
                    {widget.avg_sold_price > 0 ? formatPriceFull(widget.avg_sold_price) : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Avg Price (30d)</div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
              <a href={ap('/market')} style={{ color: 'var(--text-muted)' }}>Full {locationName} market stats ›</a>
            </div>
          </div>
        )}

        {/* ── 4. CONVERSION WIDGET ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 36 }}>
          <ConversionWidget
            agent={agent}
            coAgents={coAgents}
            cityName={locationName}
            respondTimeLabel={page.respond_time_label}
            widget={widget}
            buyers={buyers}
            agentSlug={agentSlug}
          />
        </div>

        {/* ── 5. WHY CHOOSE [AGENT] ─────────────────────────────────────────── */}
        {page.value_prop_cards.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 className={playfair.className} style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              Why {displayNames} {isDual ? 'Are' : 'Is'} {placeLabel}&apos;s Top Realtor{isDual ? ' Team' : ''}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              What sets a top {locationName} realtor{isDual ? ' team' : ''} apart from the rest.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 20 }}>
              {page.value_prop_cards.map((card, i) => (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, padding: 20 }}>
                  <div style={{ marginBottom: 10, color: 'var(--text-muted)' }}>
                    <PropIcon emoji={card.emoji} size={30} color="var(--text-muted)" />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>{card.heading}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{card.copy}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 5b. ABOUT THE AGENT(S) ────────────────────────────────────────── */}
        {isDual ? (
          /* Dual-agent: per-agent credential panels side by side */
          (agent.bio || coAgents.some(ca => ca.bio)) && (
            <div style={{ marginBottom: 40 }}>
              <h2 className={playfair.className} style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Meet {displayNames}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                Your trusted {locationName} real estate team — serving {placeLabel}{page.stat_years_exp ? ` for over ${page.stat_years_exp} years` : ' for over two decades'}.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                {/* Primary agent credential panel */}
                <div style={{ background: 'var(--brand-bg)', borderRadius: 10, padding: '24px 22px', color: '#fff' }}>
                  {agent.bio && (
                    <div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 16, color: 'rgba(255,255,255,0.9)' }}>
                      {agent.bio.split('\n\n')[0]}
                    </div>
                  )}
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12 }}>
                    {agent.name.split(' ')[0]}&apos;s Credentials
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {primaryCredentials.map((ach, i) => (
                      <li key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < primaryCredentials.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none', fontSize: 12 }}>
                        <span style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>✓</span>
                        <span>{ach.label}</span>
                      </li>
                    ))}
                  </ul>
                  {agent.phone && (
                    <a href={`tel:${agent.phone}`} style={{ display: 'block', marginTop: 16, textAlign: 'center', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 5, padding: '10px 14px', fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.35)' }}>
                      Call {agent.name.split(' ')[0]}
                    </a>
                  )}
                </div>
                {/* Co-agent credential panels */}
                {coAgents.map((ca, i) => {
                  const caAch = getCoAgentAchievements(ca.name)
                  const fallback = [{ label: `${ca.title || agent.brokerage} — Licensed in BC` }]
                  const creds = caAch.length > 0 ? caAch : fallback
                  return (
                    <div key={i} style={{ background: 'var(--brand-bg)', borderRadius: 10, padding: '24px 22px', color: '#fff' }}>
                      {ca.bio && (
                        <div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 16, color: 'rgba(255,255,255,0.9)' }}>
                          {ca.bio.split('\n\n')[0]}
                        </div>
                      )}
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12 }}>
                        {ca.name.split(' ')[0]}&apos;s Credentials
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {creds.map((ach, j) => (
                          <li key={j} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: j < creds.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none', fontSize: 12 }}>
                            <span style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>✓</span>
                            <span>{ach.label}</span>
                          </li>
                        ))}
                      </ul>
                      {ca.phone && (
                        <a href={`tel:${ca.phone}`} style={{ display: 'block', marginTop: 16, textAlign: 'center', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 5, padding: '10px 14px', fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.35)' }}>
                          Call {ca.name.split(' ')[0]}
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
              <a
                href={ap('/contact')}
                style={{
                  display: 'inline-block', marginTop: 20,
                  background: 'var(--cta-primary)', color: 'var(--cta-primary-text)',
                  borderRadius: 5, padding: '11px 22px',
                  fontSize: 14, fontWeight: 700, textDecoration: 'none',
                }}
              >
                Book a Free Consultation with {displayNames}
              </a>
            </div>
          )
        ) : agent.bio && (
          /* Single-agent: original layout verbatim */
          <div style={{ marginBottom: 40 }}>
            <h2 className={playfair.className} style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              About {agent.name}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Your trusted {locationName} real estate expert{isDual ? 's' : ''} — serving {placeLabel} for{page.stat_years_exp ? ` over ${page.stat_years_exp} years` : ' over two decades'}.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 28, alignItems: 'start' }} className="tr-bio-grid">
              <div>
                {agent.bio.split('\n\n').map((para, i) => (
                  <p key={i} style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.85, margin: '0 0 18px' }}>
                    {para}
                  </p>
                ))}
                <a
                  href={ap('/contact')}
                  style={{
                    display: 'inline-block', marginTop: 6,
                    background: 'var(--cta-primary)', color: 'var(--cta-primary-text)',
                    borderRadius: 5, padding: '11px 22px',
                    fontSize: 14, fontWeight: 700, textDecoration: 'none',
                  }}
                >
                  Book a Free Consultation with {firstName}
                </a>
              </div>
              <div style={{ background: 'var(--brand-bg)', borderRadius: 10, padding: '24px 22px', color: '#fff' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 16 }}>
                  {firstName}&apos;s Credentials
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {page.stat_years_exp != null && (
                    <li style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 13 }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>✓</span>
                      <span>{page.stat_years_exp}+ Years Local Experience</span>
                    </li>
                  )}
                  {page.stat_sold_volume && (
                    <li style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 13 }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>✓</span>
                      <span>{page.stat_sold_volume} in Career Sales</span>
                    </li>
                  )}
                  {page.award_badges.map((b, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 13 }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                  {agent.brokerage && (
                    <li style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 13 }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>✓</span>
                      <span>{agent.brokerage} — Licensed in BC</span>
                    </li>
                  )}
                  <li style={{ display: 'flex', gap: 10, padding: '9px 0', fontSize: 13 }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>✓</span>
                    <span>Responds {page.respond_time_label}</span>
                  </li>
                </ul>
                {agent.phone && (
                  <a
                    href={`tel:${agent.phone}`}
                    style={{
                      display: 'block', marginTop: 18, textAlign: 'center',
                      background: 'rgba(255,255,255,0.15)', color: '#fff',
                      borderRadius: 5, padding: '11px 14px',
                      fontSize: 14, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.35)',
                    }}
                  >
                    Call {agent.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 5c. PROPERTY TYPES ───────────────────────────────────────────── */}
        {!propertyType && (
          <div style={{ marginBottom: 40 }}>
            {isDual ? (
              <>
                <h2 className={playfair.className} style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  {locationName} Real Estate by Property Type
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                  Whether you&apos;re buying a house, townhouse, condo, or investment property, {firstName} know every corner of {placeLabel}.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
                  {[
                    {
                      emoji: '🏡',
                      title: 'Houses for Sale',
                      copy: `Detached homes, character houses, and new construction across ${locationName} — from starter homes to prestige properties.`,
                      href: ap('/houses-for-sale'),
                      label: 'Browse Houses',
                    },
                    {
                      emoji: '🏘️',
                      title: 'Townhouses for Sale',
                      copy: `Strata townhomes and rowhomes in ${locationName}. Low-maintenance living without sacrificing space or location.`,
                      href: ap('/townhouses-for-sale'),
                      label: 'Browse Townhouses',
                    },
                    {
                      emoji: '🏢',
                      title: 'Condos & Apartments',
                      copy: `Modern condos and apartment suites in ${locationName}. Strong rental demand and solid long-term value.`,
                      href: ap('/condos-for-sale'),
                      label: 'Browse Condos',
                    },
                    {
                      emoji: '💎',
                      title: 'Luxury Homes & Estates',
                      copy: `$2M+ custom builds, gated estates, and prestige homes. Discreet representation for buyers and sellers of the finest properties.`,
                      href: ap('/contact?source=luxury'),
                      label: 'Luxury Inquiry',
                    },
                  ].map((card, i) => (
                    <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ marginBottom: 10 }}>
                        <PropIcon emoji={card.emoji} size={30} color="var(--text-muted)" />
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>{card.title}</h3>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.6, flex: 1 }}>{card.copy}</p>
                      <a href={card.href} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}>{card.label} →</a>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Single-agent: original verbatim SSWR property-type section */
              <>
                <h2 className={playfair.className} style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  South Surrey &amp; White Rock Real Estate by Property Type
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                  Whether you&apos;re buying a house, townhouse, condo, oceanfront property, or luxury estate, {firstName} knows every corner of {placeLabel}.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
                  {[
                    {
                      emoji: '🏡',
                      title: 'Houses for Sale',
                      copy: `Detached homes, character houses, and new construction across South Surrey and White Rock — from starter homes to prestige properties in gated estates.`,
                      href: ap('/houses-for-sale'),
                      label: 'Browse Houses',
                    },
                    {
                      emoji: '🏘️',
                      title: 'Townhouses for Sale',
                      copy: `Strata townhomes in Morgan Creek, Grandview Heights, Ocean Park, and White Rock. Low-maintenance living without sacrificing space or location.`,
                      href: ap('/townhouses-for-sale'),
                      label: 'Browse Townhouses',
                    },
                    {
                      emoji: '🏢',
                      title: 'Condos & Apartments',
                      copy: `Ocean-view suites along Marine Drive, modern South Surrey condos, and apartment investment opportunities. Strong rental demand and solid long-term value.`,
                      href: ap('/condos-for-sale'),
                      label: 'Browse Condos',
                    },
                    {
                      emoji: '🌊',
                      title: 'Oceanfront & Waterfront',
                      copy: `White Rock beachfront properties, Marine Drive ocean-view homes, and waterfront estates. Limited inventory — contact ${firstName} for early access before listings go public.`,
                      href: ap('/contact?source=oceanfront'),
                      label: 'Oceanfront Inquiry',
                    },
                    {
                      emoji: '💎',
                      title: 'Luxury Homes & Estates',
                      copy: `$2M+ custom builds, Elgin Chantrell gated estates, and South Surrey prestige homes. Discreet representation for buyers and sellers of the area's finest properties.`,
                      href: ap('/contact?source=luxury'),
                      label: 'Luxury Inquiry',
                    },
                  ].map((card, i) => (
                    <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ marginBottom: 10 }}>
                        <PropIcon emoji={card.emoji} size={30} color="var(--text-muted)" />
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>{card.title}</h3>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.6, flex: 1 }}>{card.copy}</p>
                      <a href={card.href} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}>{card.label} →</a>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Property-type variant links (only on area pages — both single and dual) */}
            {page.area_slug && (
              <div style={{ marginTop: 24, padding: '18px 20px', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                  Looking to sell a specific property type in {locationName}?
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(['condos', 'townhouses', 'houses'] as const).map(pt => (
                    <a
                      key={pt}
                      href={`${ap('/top-realtor')}/${page.city_slug}/${page.area_slug}/${pt}`}
                      style={{
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 4, padding: '6px 14px', fontSize: 13,
                        color: 'var(--text)', textDecoration: 'none', fontWeight: 600,
                      }}
                    >
                      Best {pt === 'condos' ? 'Condo' : pt === 'townhouses' ? 'Townhouse' : 'House'} Realtor →
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 5d. PROPERTY-TYPE SPECIALIST BLOCK (property-type pages only) ── */}
        {ptMeta && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '28px 24px' }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{ptMeta.emoji}</div>
              <h2 className={playfair.className} style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>
                {ptMeta.plural} in {locationName}
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.75, margin: '0 0 20px' }}>
                {ptMeta.copy} {isDual ? displayNames : firstName} ha{isDual ? 've' : 's'} deep expertise in the {locationName} {ptMeta.singular.toLowerCase()} market — helping both buyers and sellers achieve their goals with precision and speed.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <a href={ap(ptMeta.listingHref)} style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '10px 20px', borderRadius: 5, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                  Browse {ptMeta.plural} for Sale
                </a>
                <a href={ap('/contact')} style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 20px', borderRadius: 5, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  Get a Free {ptMeta.singular} Evaluation
                </a>
              </div>
            </div>
            {/* Back to area page and sibling property-type links */}
            {page.area_slug && (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                ← <a href={`${ap('/top-realtor')}/${page.city_slug}/${page.area_slug}`} style={{ color: 'var(--text-muted)' }}>
                  Back to Top Realtor in {locationName}
                </a>
                {' · '}
                Other property types:{' '}
                {(['condos', 'townhouses', 'houses'] as const)
                  .filter(pt => pt !== propertyType)
                  .map((pt, i, arr) => (
                    <span key={pt}>
                      <a href={`${ap('/top-realtor')}/${page.city_slug}/${page.area_slug}/${pt}`} style={{ color: 'var(--text-muted)' }}>
                        {pt === 'condos' ? 'Condos' : pt === 'townhouses' ? 'Townhouses' : 'Houses'}
                      </a>
                      {i < arr.length - 1 ? ' · ' : ''}
                    </span>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ── 6. TESTIMONIALS ──────────────────────────────────────────────── */}
        {page.testimonials.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 className={playfair.className} style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>
              What Our Clients Say
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 20 }}>
              {page.testimonials.map((t, i) => (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 22, height: '100%' }}>
                  <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.65, margin: '0 0 12px', fontStyle: 'italic' }}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t.name}</div>
                  {t.city && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.city}, BC</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 7. HOME EVALUATION CTA ───────────────────────────────────────── */}
        <div style={{
          background: 'var(--brand-bg)', borderRadius: 10,
          padding: '36px 28px', marginBottom: 36,
        }}>
          <h2 className={playfair.className} style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>
            {ptMeta
              ? `What Is Your ${locationName} ${ptMeta.singular} Worth?`
              : `What Is Your ${locationName} Home Worth?`}
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: '0 0 20px', lineHeight: 1.6 }}>
            Get a free, no-obligation {ptMeta ? `${ptMeta.singular.toLowerCase()} ` : ''}evaluation from {isDual ? 'our team' : firstName}. We&apos;ll analyze recent sales, current market conditions, and your property&apos;s unique features.
          </p>
          <HomeEvalForm
            agentSlug={agentSlug}
            agentName={isDual ? displayNames : firstName}
            locationName={locationName}
          />
        </div>

        {/* ── 7b. PROPERTY TYPE VARIANT LINKS ──────────────────────────────── */}
        {page.area_slug && (
          <div style={{ marginBottom: 36 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
              Top Realtor{isDual ? 's' : ''} by Property Type in {page.area_display_name}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { label: 'Condos', slug: 'condos' },
                { label: 'Townhouses', slug: 'townhouses' },
                { label: 'Houses', slug: 'houses' },
              ].map(({ label, slug }) => (
                <a
                  key={slug}
                  href={ap(`/top-realtor/${page.city_slug}/${page.area_slug}/${slug}`)}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 4, padding: '5px 14px',
                    fontSize: 13, color: 'var(--text)', textDecoration: 'none', fontWeight: 600,
                  }}
                >
                  {label} →
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── 8. SEO INTERLINKING ────────────────────────────────────────── */}
        {siblingPages.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
              Top Realtor in Other {page.city_display_name} Neighbourhoods
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {siblingPages.map((p, i) => (
                <a
                  key={i}
                  href={ap(`/top-realtor/${p.city_slug}${p.area_slug ? `/${p.area_slug}` : ''}`)}
                  style={{
                    background: 'var(--surface-alt)', border: '1px solid var(--border)',
                    borderRadius: 4, padding: '5px 12px',
                    fontSize: 13, color: 'var(--text)', textDecoration: 'none',
                  }}
                >
                  {p.area_display_name || p.city_display_name}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── 9. FAQ ACCORDION ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <h2 className={playfair.className} style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>
            Frequently Asked Questions
          </h2>
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {faqs.map((faq, i) => (
              <details key={i} style={{ borderBottom: i < faqs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <summary style={{
                  padding: '16px 20px', fontSize: 14, fontWeight: 600, color: 'var(--text)',
                  cursor: 'pointer', background: 'var(--surface)', listStyle: 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                }}>
                  <span>{faq.q}</span>
                  <span style={{ color: 'var(--text)', fontSize: 20, flexShrink: 0, lineHeight: 1 }}>+</span>
                </summary>
                <div style={{
                  padding: '12px 20px 18px',
                  background: 'var(--surface-alt)',
                  fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.75,
                }}>
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 680px) {
          .tr-hero-grid { grid-template-columns: 1fr !important; }
          .tr-headshot { display: none !important; }
          .tr-market-grid { grid-template-columns: 1fr !important; }
          .tr-eval-grid { grid-template-columns: 1fr !important; }
          .tr-bio-grid { grid-template-columns: 1fr !important; }
        }
        details summary::-webkit-details-marker { display: none; }
        details[open] > summary > span:last-child { transform: rotate(45deg); display: inline-block; }
      `}</style>
    </>
  )
}
