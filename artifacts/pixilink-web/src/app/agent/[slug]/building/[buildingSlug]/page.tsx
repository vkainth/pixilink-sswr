import Image from 'next/image'
import { getAgent, getBuildingDetail, getBuildings, getLandingPages, matchTopRealtorUrl, agentCanonicalBase, resolveAgentPrefix } from '@/lib/api'
import { toHomesForSaleHref } from '../../homes-for-sale/subareaUtils'
import { formatPrice, formatPriceFull, buildingDisplayName, hasBuildingName, getCoAgents } from '@/lib/types'
import type { BuildingStats } from '@/lib/types'
import PhotoGallery from '@/components/PhotoGallery.client'
import BuildingComparisonTable from '@/components/BuildingComparisonTable'
import SoldGate from '@/components/SoldGate.client'
import AgentSidebar from '@/components/AgentSidebar'
import Sparkline from '@/components/Sparkline'
import W3MortgagePreQual from '@/components/W3MortgagePreQual.client'
import NearbyWidget from '@/components/NearbyWidget.client'
import LazyMap from '@/components/LazyMap.client'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { getAiPages, matchAiPageToSubarea } from '@/lib/ai-pages-api'
import PageQuickLinks from '@/components/PageQuickLinks'
import LeadOfferCapture from '@/components/LeadOfferCapture.client'
import PropertyViewTracker from '@/components/PropertyViewTracker.client'

/**
 * The building stats aggregate, or null when it is not actually an aggregate.
 *
 * stats is computed server-side over strata_no sales in the last 12 months, so when a
 * building has exactly one sale in that window every figure derived from it — "Avg Sold
 * Price", "Highest Sold" (a MAX), "Avg $/sq ft" — is that single unit's exact sold price
 * relabelled as an average. This page is ISR-cached with no auth context, so it is served
 * identically to logged-out visitors while listing that same unit behind a "View Sold
 * Price" gate. Requiring two sales keeps the number non-identifying; below that the panel,
 * prose, FAQs, JSON-LD and meta description all fall away together.
 *
 * Used by both generateMetadata and the page component — they must agree.
 */
function aggregateStats(building: { stats?: BuildingStats | null }): BuildingStats | null {
  return (building.stats?.sold_count ?? 0) >= 2 ? (building.stats ?? null) : null
}

interface Props {
  params: Promise<{ slug: string; buildingSlug: string }>
}

export const dynamic = 'force-dynamic'

export const dynamicParams = true

export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, buildingSlug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  // getBuildingDetail throws when Laravel is unreachable (429/5xx/timeout) so
  // that the page component can answer 5xx instead of a misleading 404. Metadata
  // must not be the thing that takes the page down, so a failure here degrades
  // to a bare title and lets the component below decide the real outcome.
  let agent: Awaited<ReturnType<typeof getAgent>> = null
  let building: Awaited<ReturnType<typeof getBuildingDetail>> = null
  try {
    ;[agent, building] = await Promise.all([
      getAgent(slug),
      getBuildingDetail(slug, buildingSlug),
    ])
  } catch {
    return { title: 'Building' }
  }
  if (!building) return { title: 'Building Not Found' }
  const agentName = agent?.name || ''
  const displayName = buildingDisplayName(building)
  const hasName = hasBuildingName(building)

  // Build base sentence from evergreen facts only
  const storeyUnits: string[] = []
  if (building.levels) storeyUnits.push(`${building.levels}-storey`)
  if (building.units) storeyUnits.push(`${building.units}-suite`)
  const prefix = storeyUnits.join(', ')
  const constructionPart = building.construction ? `${building.construction} ` : ''
  const yearPart = building.year_built ? ` built in ${building.year_built}` : ''
  const descBody = `${prefix}${prefix ? ' ' : ''}${constructionPart}strata${yearPart}`
  // When there's no real name, displayName is already derived from the address —
  // avoid saying "address at address" by dropping the redundant "at {address}".
  const base = hasName
    ? `${displayName} at ${building.address} — ${descBody}.`
    : `${building.address} — ${descBody}.`

  // Build suffix from live pricing data — sold keywords always lead when available
  let suffix = ''
  const buildingStats = aggregateStats(building)
  const metaSoldCount = buildingStats?.sold_count_6m ?? building.recent_sold.length
  if (buildingStats?.avg_sold_price) {
    const avgStr = formatPrice(buildingStats.avg_sold_price)
    const sqftStr = buildingStats.avg_per_sqft
      ? ` at $${Math.round(buildingStats.avg_per_sqft).toLocaleString('en-CA')}/sq ft`
      : ''
    const soldPart = metaSoldCount > 0
      ? `${metaSoldCount} unit${metaSoldCount !== 1 ? 's' : ''} sold, avg ${avgStr}${sqftStr}.`
      : `Recent sales averaged ${avgStr}${sqftStr}.`
    if (building.active_listings.length > 0) {
      const prices = building.active_listings.map(l => l.list_price).filter(p => p > 0)
      if (prices.length > 0) {
        const lo = Math.min(...prices)
        const hi = Math.max(...prices)
        const n = building.active_listings.length
        const listingsPart = lo === hi
          ? `${n} listing${n !== 1 ? 's' : ''} at ${formatPrice(lo)}.`
          : `${n} listing${n !== 1 ? 's' : ''} from ${formatPrice(lo)}–${formatPrice(hi)}.`
        suffix = `${soldPart} ${listingsPart}`
      } else {
        suffix = soldPart
      }
    } else {
      suffix = soldPart
    }
  } else if (building.active_listings.length > 0) {
    const prices = building.active_listings.map(l => l.list_price).filter(p => p > 0)
    if (prices.length > 0) {
      const lo = Math.min(...prices)
      const hi = Math.max(...prices)
      suffix = lo === hi
        ? `Listed at ${formatPrice(lo)}.`
        : `Listings from ${formatPrice(lo)} to ${formatPrice(hi)}.`
    }
  } else {
    suffix = `Thinking of selling? Contact ${agentName || 'Randy Dyck'} for a free valuation.`
  }

  const full = `${base} ${suffix}`
  const metaDescription = full.length > 160 ? full.slice(0, 157) + '…' : full
  // Extract street portion (strip ", City" suffix if present)
  const streetAddress = building.address?.endsWith(`, ${building.city}`)
    ? building.address.slice(0, -(`, ${building.city}`.length))
    : building.address || ''
  const location = building.subarea || building.city
  const titleCore = hasName
    ? `${displayName} — ${streetAddress}, ${location}`
    : `${streetAddress}, ${location}`
  const titleWithAgent = agentName ? `${titleCore} | ${agentName}` : titleCore
  const title = titleWithAgent.length <= 70 ? titleWithAgent : titleCore
  const domain = agentCanonicalBase(agent)
  const ogImage = building.photos[0] || building.photo_url || `https://${domain}/opengraph.jpg`
  return {
    title,
    description: metaDescription,
    alternates: { canonical: `https://${domain}/building/${buildingSlug}` },
    openGraph: {
      title,
      description: metaDescription,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: metaDescription,
    },
  }
}

export default async function BuildingDetailPage({ params }: Props) {
  const { slug, buildingSlug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const [agent, building, allBuildings, topRealtorPages] = await Promise.all([
    getAgent(slug),
    getBuildingDetail(slug, buildingSlug),
    getBuildings(slug, 2000),
    getLandingPages(slug),
  ])
  if (!agent || !building) notFound()
  requireNotShowcase(agent)

  const topRealtorUrl = matchTopRealtorUrl(topRealtorPages, agentPrefix, building.subarea, building.city)

  // Fallback display name for buildings with no name in the DB — derived from
  // the street address so the H1/title/JSON-LD/FAQ copy never embeds a blank name.
  const displayName = buildingDisplayName(building)
  const hasName = hasBuildingName(building)

  const features = agent.features ?? {}
  const aiAmenityPage = features.amenities_widget
    ? await getAiPages(slug, 'amenities').then(pages =>
        matchAiPageToSubarea(pages, (building.subarea || building.city || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'))
      )
    : null

  const firstName = agent.name.split(' ')[0]

  const photos = (building.photos.length > 0 ? building.photos : building.photo_url ? [building.photo_url] : []).filter((p: string) => p.trim() !== '')
  const stats = aggregateStats(building)
  const hasStats = !!stats && (stats.avg_sold_price != null || stats.avg_dom != null || stats.avg_per_sqft != null || stats.expensive_sold != null)

  // Pet policy text
  const petText = building.no_pets
    ? 'No pets permitted'
    : [building.dogs_allowed && 'Dogs allowed', building.cats_allowed && 'Cats allowed'].filter(Boolean).join(' · ') || null

  // Bylaw restrictions — derive rental status from raw text
  const bylawRaw = (building.bylaw_restrictions || '').toLowerCase()
  const rentalsRestricted = bylawRaw.includes('rental restricted') || bylawRaw.includes('rental prohibited') || bylawRaw.includes('no rental') || bylawRaw.includes('rentals not allowed')
  const strRestrictedKeywords = ['no short term', 'no short-term', 'airbnb', 'vrbo', 'short term rental prohibited', 'short-term rental']
  const strRestricted = strRestrictedKeywords.some(k => bylawRaw.includes(k))
  const hasBylawData = petText || building.bylaw_restrictions || rentalsRestricted || strRestricted

  // Key-fact pills
  const pills = [
    building.units ? `${building.units} Units` : null,
    building.levels ? `${building.levels} Storeys` : null,
    building.units_in_strata && building.units_in_strata !== building.units ? `${building.units_in_strata} in Strata` : null,
    building.year_built ? `Built ${building.year_built}` : null,
    building.construction || null,
    building.active_listings.length > 0 ? `${building.active_listings.length} Active` : null,
  ].filter(Boolean) as string[]

  // Building info rows
  const infoRows: { label: string; value: string }[] = [
    building.address ? { label: 'Address', value: building.address } : null,
    building.units ? { label: 'Total Units', value: String(building.units) } : null,
    building.units_in_strata ? { label: 'Units in Strata', value: String(building.units_in_strata) } : null,
    building.levels ? { label: 'Storeys', value: String(building.levels) } : null,
    building.year_built ? { label: 'Year Built', value: String(building.year_built) } : null,
    building.construction ? { label: 'Construction', value: building.construction } : null,
    building.strata_no ? { label: 'Strata Plan', value: building.strata_no } : null,
    building.mgmt_name ? { label: 'Property Mgmt', value: building.mgmt_name } : null,
    petText ? { label: 'Pet Policy', value: petText } : null,
    building.developer ? { label: 'Developer', value: building.developer } : null,
    building.suite_sizes ? { label: 'Suite Sizes', value: building.suite_sizes } : null,
  ].filter(Boolean) as { label: string; value: string }[]

  // Street address without city suffix — used in body copy for address-based SEO
  const streetOnly = building.address?.endsWith(`, ${building.city}`)
    ? building.address.slice(0, -(`, ${building.city}`.length))
    : building.address || ''

  // Sale-to-list ratio: avg(sold_price / list_price * 100) across recent sold units
  // Must be computed before quickAnswers so the DOM FAQ can reference it
  const saleToListRatio = (() => {
    const valid = building.recent_sold.filter(
      l => l.sold_price != null && l.sold_price > 0 && l.list_price > 0,
    )
    if (valid.length === 0) return null
    const avg = valid.reduce((sum, l) => sum + (l.sold_price! / l.list_price * 100), 0) / valid.length
    return Math.round(avg * 10) / 10
  })()

  // Sold-price trend for this specific building, oldest → newest.
  //
  // Uses recent_sold, which the endpoint already returns, so this costs no extra
  // query. Rendered as a server-side inline SVG sparkline plus text labels, so
  // the figures are in the HTML for crawlers and AI answer engines rather than
  // locked behind client JS. Needs at least three sales to say anything about a
  // direction; below that the stat tiles above already tell the story.
  const soldTrend = (() => {
    const points = building.recent_sold
      .filter(l => l.sold_price != null && l.sold_price > 0 && !!l.sold_date)
      .map(l => ({ price: l.sold_price as number, date: l.sold_date as string }))
      .sort((a, b) => a.date.localeCompare(b.date))

    if (points.length < 3) return null

    const first = points[0]
    const last = points[points.length - 1]
    const changePct = Math.round(((last.price - first.price) / first.price) * 1000) / 10

    return {
      values: points.map(p => p.price),
      firstPrice: first.price,
      lastPrice: last.price,
      firstDate: first.date.slice(0, 7),
      lastDate: last.date.slice(0, 7),
      changePct,
      count: points.length,
    }
  })()

  // Quick Answers — derived strictly from real building data
  const quickAnswers: { q: string; a: string }[] = []
  // Address-first FAQ — helps people who search by street address find the building
  if (streetOnly) {
    quickAnswers.push({
      q: `What building is at ${streetOnly}?`,
      a: hasName
        ? `${displayName} is the strata complex located at ${streetOnly}, ${building.subarea || building.city}, BC.${building.year_built ? ` Built in ${building.year_built}.` : ''}${building.units ? ` It has ${building.units} residential units.` : ''}`
        : `${streetOnly} is a strata complex in ${building.subarea || building.city}, BC.${building.year_built ? ` Built in ${building.year_built}.` : ''}${building.units ? ` It has ${building.units} residential units.` : ''}`,
    })
  }
  if (petText) {
    quickAnswers.push({
      q: `Are pets allowed at ${displayName}?`,
      a: petText === 'No pets permitted'
        ? `No. The strata bylaws at ${displayName} do not permit pets.`
        : `Yes. ${petText} at ${displayName}.`,
    })
  }
  if (building.units) {
    quickAnswers.push({
      q: `How many units are in ${displayName}?`,
      a: `${displayName}${hasName && streetOnly ? ` (${streetOnly})` : ''} has ${building.units} residential unit${building.units !== 1 ? 's' : ''}${building.year_built ? ` built in ${building.year_built}` : ''}.${building.strata_no ? ` Strata Plan ${building.strata_no}.` : ''}`,
    })
  }
  if (building.year_built) {
    quickAnswers.push({
      q: `When was ${displayName} built?`,
      a: hasName
        ? `${displayName} at ${streetOnly || building.address} was built in ${building.year_built}.${building.construction ? ` It is a ${building.construction.toLowerCase()} construction building.` : ''}`
        : `${displayName} was built in ${building.year_built}.${building.construction ? ` It is a ${building.construction.toLowerCase()} construction building.` : ''}`,
    })
  }
  if (building.mgmt_name) {
    quickAnswers.push({
      q: `Who manages ${displayName}?`,
      a: `${building.mgmt_name} manages the strata corporation at ${displayName}.`,
    })
  }
  if (building.amenities.length > 0) {
    quickAnswers.push({
      q: `What amenities does ${displayName} have?`,
      a: `${displayName} amenities include: ${building.amenities.join(', ')}.`,
    })
  }
  if (stats?.avg_sold_price) {
    const faqSoldCount = stats.sold_count_6m ?? building.recent_sold.length
    const faqAddress = streetOnly || building.address
    if (faqSoldCount > 0) {
      quickAnswers.push({
        q: `What has sold at ${faqAddress} recently?`,
        a: `In the past 6 months, ${faqSoldCount} unit${faqSoldCount !== 1 ? 's have' : ' has'} sold at ${displayName}, with an average sale price of ${formatPriceFull(stats.avg_sold_price)}.`,
      })
    }
    quickAnswers.push({
      q: `What is the average sold price at ${displayName}?`,
      a: `Recent units at ${displayName} have sold for an average of ${formatPriceFull(stats.avg_sold_price)}${stats.avg_dom != null ? `, typically in ${stats.avg_dom} days on market` : ''}.`,
    })
  }

  // Seller-intent FAQs
  const agentSoldCount = building.agent_sold_count ?? 0
  if (agentSoldCount > 0) {
    quickAnswers.push({
      q: `Who is the best realtor to sell my unit at ${displayName}?`,
      a: `${agent.name} has represented ${agentSoldCount} seller${agentSoldCount !== 1 ? 's' : ''} at ${displayName}${stats?.avg_sold_price ? ` — units have sold for an average of ${formatPriceFull(stats.avg_sold_price)}${stats.avg_dom != null ? ` in about ${stats.avg_dom} days` : ''}` : ''}. Contact ${firstName} for a free, no-obligation valuation.`,
    })
  } else if (stats?.avg_sold_price) {
    quickAnswers.push({
      q: `Who is the best realtor to sell my unit at ${displayName}?`,
      a: `${displayName} units have recently sold for an average of ${formatPriceFull(stats.avg_sold_price)}${stats.avg_dom != null ? ` in about ${stats.avg_dom} days` : ''}. ${agent.name} is a ${building.subarea || building.city} specialist at ${agent.brokerage} — contact ${firstName} for a free building valuation.`,
    })
  } else {
    quickAnswers.push({
      q: `Who is the best realtor to sell my unit at ${displayName}?`,
      a: `${agent.name} specializes in ${building.subarea || building.city} real estate and can provide a free, no-obligation valuation of your unit at ${displayName}.`,
    })
  }
  if (stats?.avg_dom != null) {
    quickAnswers.push({
      q: `How long does it take to sell a unit at ${displayName}?`,
      a: `Recent units at ${displayName} have sold in an average of ${stats.avg_dom} days on market${saleToListRatio != null ? `, with units typically selling at ${saleToListRatio}% of asking price` : ''}.`,
    })
  }

  // Market summary paragraph — first sentence anchors both name + address for SEO
  const summaryParts: string[] = []
  // Avoid "address at address" when displayName is itself derived from the street address
  const nameWithAddress = hasName && streetOnly ? `${displayName} at ${streetOnly}` : displayName
  if (building.active_listings.length > 0) {
    const prices = building.active_listings.map(l => l.list_price).filter((p): p is number => !!p)
    if (prices.length) {
      const lo = Math.min(...prices), hi = Math.max(...prices)
      summaryParts.push(
        `There ${building.active_listings.length === 1 ? 'is' : 'are'} currently ${building.active_listings.length} active home${building.active_listings.length !== 1 ? 's' : ''} for sale at ${nameWithAddress}` +
        (lo === hi ? `, priced at ${formatPrice(lo)}.` : `, ranging from ${formatPrice(lo)} to ${formatPrice(hi)}.`),
      )
    }
  } else {
    summaryParts.push(`There are no active listings at ${nameWithAddress} right now — contact ${firstName} to be notified the moment a unit comes to market.`)
  }
  if (stats?.avg_sold_price) {
    summaryParts.push(`Recent sold units have averaged ${formatPrice(stats.avg_sold_price)}${stats.avg_dom != null ? `, selling in about ${stats.avg_dom} days on average` : ''}${stats.avg_per_sqft ? ` (≈$${Math.round(stats.avg_per_sqft).toLocaleString('en-CA')}/sq ft)` : ''}.`)
  }
  if (building.year_built || building.units) {
    summaryParts.push(
      `${displayName} is a ${building.construction ? `${building.construction.toLowerCase()} ` : ''}building` +
      (building.units ? ` of ${building.units} units` : '') +
      (building.year_built ? ` built in ${building.year_built}` : '') +
      ` located in ${building.subarea || building.city}.`,
    )
  }
  const marketSummary = summaryParts.join(' ')

  // Average asking price from active listings
  const activePrices = building.active_listings.map(l => l.list_price).filter((p): p is number => !!p)
  const avgAskingPrice = activePrices.length > 0
    ? Math.round(activePrices.reduce((a, b) => a + b, 0) / activePrices.length)
    : null

  // Neighbourhood subarea slug for links
  const subareaLabel = building.subarea || building.city
  const subareaSlug = subareaLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  // "More buildings in [area]" — same subarea, excluding current building, sorted by active listings
  const areaSlug = subareaSlug
  const nearbyAreaBuildings = allBuildings
    .filter(b => {
      const bArea = (b.subarea || b.city || '').trim()
      const bSlug = bArea.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      return bSlug === areaSlug && b.slug !== buildingSlug
    })
    .sort((a, b) => (b.active_listings || 0) - (a.active_listings || 0))
    .slice(0, 6)

  // Map embed URL
  const mapEmbedUrl = building.latitude && building.longitude
    ? `https://maps.google.com/maps?q=${building.latitude},${building.longitude}&z=16&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(building.address + ', BC, Canada')}&z=16&output=embed`
  const mapsHref = `https://maps.google.com/maps?q=${building.latitude && building.longitude ? `${building.latitude},${building.longitude}` : encodeURIComponent(building.address + ', BC, Canada')}`

  // Absolute base URL for schema.org BreadcrumbList
  const baseUrl = `https://${agentCanonicalBase(agent)}`

  // JSON-LD
  const schemaDescription = building.description || building.meta_description || marketSummary || null
  const buildingLd = {
    '@context': 'https://schema.org',
    '@type': ['ApartmentComplex', 'Residence', 'Place'],
    name: displayName,
    ...(schemaDescription ? { description: schemaDescription } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: building.address?.endsWith(`, ${building.city}`)
        ? building.address.slice(0, -(`, ${building.city}`.length))
        : building.address,
      addressLocality: building.city,
      addressRegion: 'BC',
      addressCountry: 'CA',
    },
    ...(building.year_built ? { yearBuilt: building.year_built } : {}),
    ...(building.units ? { numberOfAccommodationUnits: building.units, numberOfRooms: building.units } : {}),
    petsAllowed: !building.no_pets,
    ...(photos.length ? { image: photos.slice(0, 6) } : {}),
    ...(() => {
      const feats = [
        ...building.amenities.map(a => ({ '@type': 'LocationFeatureSpecification', name: a, value: true })),
        ...(building.walk_score != null ? [{ '@type': 'LocationFeatureSpecification', name: 'Walk Score', value: building.walk_score }] : []),
        ...(building.transit_score != null ? [{ '@type': 'LocationFeatureSpecification', name: 'Transit Score', value: building.transit_score }] : []),
        ...(building.bike_score != null ? [{ '@type': 'LocationFeatureSpecification', name: 'Bike Score', value: building.bike_score }] : []),
      ]
      return feats.length ? { amenityFeature: feats } : {}
    })(),
    ...(building.latitude && building.longitude ? { geo: { '@type': 'GeoCoordinates', latitude: building.latitude, longitude: building.longitude } } : {}),
    ...(building.active_listings.length > 0 ? {
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: `For Sale in ${displayName}`,
        itemListElement: building.active_listings.map(l => ({
          '@type': 'Offer',
          price: l.list_price,
          priceCurrency: 'CAD',
          itemOffered: { '@type': 'Apartment', name: l.address },
        })),
      },
    } : {}),
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Buildings', item: `${baseUrl}/buildings` },
      {
        '@type': 'ListItem',
        position: 3,
        name: building.subarea || building.city,
        item: `${baseUrl}/buildings?area=${encodeURIComponent(building.subarea || building.city)}`,
      },
      { '@type': 'ListItem', position: 4, name: displayName, item: `${baseUrl}/building/${buildingSlug}` },
    ],
  }
  // Parse faq_json when present; fall back to hardcoded faqs
  const parsedFaqJson: Array<{ question: string; answer: string }> = (() => {
    if (!building.faq_json) return []
    try { return JSON.parse(building.faq_json) } catch { return [] }
  })()
  const aiFaqs: Array<{ q: string; a: string }> = parsedFaqJson.map(f => ({ q: f.question, a: f.answer }))
  const displayFaqs = aiFaqs.length > 0 ? aiFaqs : building.faqs

  // quickAnswers (address FAQ first) + displayFaqs — both appear in schema
  const allSchemaFaqs = [...quickAnswers, ...displayFaqs]
  const faqLd = allSchemaFaqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allSchemaFaqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  } : null

  // WebPage schema with speakable pointing at the sold summary paragraph
  const webPageLd = stats?.avg_sold_price ? {
    '@context': 'https://schema.org',
    '@type': 'ItemPage',
    name: displayName,
    url: `${baseUrl}/building/${buildingSlug}`,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.building-sold-summary'],
    },
  } : null

  const sectionTitle: React.CSSProperties = { fontSize: 20, fontWeight: 700, color: 'var(--primary-bg)', margin: '0 0 16px', fontFamily: "var(--font-display),Georgia,serif" }
  const card: React.CSSProperties = { background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 24px' }
  const subCard: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#fff', color: '#1c1c1c' }
  const subCardHead: React.CSSProperties = { background: 'var(--off-white)', padding: '12px 16px', borderBottom: '1px solid var(--border)' }
  const subCardTitle: React.CSSProperties = { fontFamily: "var(--font-display),Georgia,serif", fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--primary-bg)' }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildingLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {webPageLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />}
      {/* Fire-and-forget building view tracker — 401 silently ignored when not logged in */}
      <PropertyViewTracker buildingSlug={buildingSlug} addressLabel={`${displayName}${streetOnly && streetOnly !== displayName ? `, ${streetOnly}` : ''}, ${building.city}`} />

      {/* Photos */}
      {photos.length > 0 && (
        <div style={{ maxWidth: '1400px', margin: '0 auto', overflow: 'hidden' }}>
          <PhotoGallery photos={photos} address={displayName} agentPrefix={agentPrefix} />
        </div>
      )}

      <div className="container" style={{ padding: '24px var(--container-padding) 0' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          <a href={ap('/buildings')} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Buildings</a>
          <span style={{ margin: '0 8px' }}>›</span>
          <a href={ap(`/buildings?area=${encodeURIComponent(building.subarea || building.city)}`)} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{building.subarea || building.city}</a>
          <span style={{ margin: '0 8px' }}>›</span>
          <span style={{ color: 'var(--text)' }}>{displayName}</span>
        </div>

        {/* Key-fact pills */}
        {pills.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {pills.map(p => (
              <span key={p} style={{ background: '#fff', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: 12, fontSize: 12, color: 'var(--text-muted)' }}>{p}</span>
            ))}
          </div>
        )}

        {/* H1: name + address, always equal size/weight — some visitors search by name, others by address */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 'clamp(20px,2.5vw,30px)', fontWeight: 800, margin: '0 0 4px', color: 'var(--text)', letterSpacing: '-0.01em', fontFamily: "var(--font-display),Georgia,serif", lineHeight: 1.35 }}>
            {(() => {
              const subareaEndsWithCity = building.subarea && building.city &&
                building.subarea.toLowerCase().endsWith(building.city.toLowerCase())
              const addressSuffix = building.subarea && building.subarea !== building.city
                ? (subareaEndsWithCity ? `${building.subarea}, BC` : `${building.subarea}, ${building.city}, BC`)
                : `${building.city}, BC`
              if (hasName) {
                return streetOnly ? `${displayName} — ${streetOnly}, ${addressSuffix}` : `${displayName} — ${addressSuffix}`
              }
              // No real name: displayName is already the street address, so lead with it
              // directly instead of repeating it (e.g. "2925 King George Boulevard — Elgin Chantrell, Surrey, BC")
              return streetOnly ? `${streetOnly} — ${addressSuffix}` : addressSuffix
            })()}
          </h1>
          {building.tagline && (
            <div style={{ fontSize: 15, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
              {building.tagline}
            </div>
          )}
        </div>

        {/* Stats grid */}
        {hasStats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 24 }}>
            {[
              stats!.avg_sold_price != null ? { label: 'Avg Sold Price', value: formatPrice(stats!.avg_sold_price) } : null,
              stats!.avg_per_sqft != null ? { label: 'Avg $/sq ft', value: `$${Math.round(stats!.avg_per_sqft).toLocaleString('en-CA')}` } : null,
              stats!.avg_dom != null ? { label: 'Avg Days on Market', value: `${stats!.avg_dom}d` } : null,
              stats!.expensive_sold != null ? { label: 'Highest Sold', value: formatPriceFull(stats!.expensive_sold) } : null,
            ].filter(Boolean).map((s) => {
              const stat = s as { label: string; value: string }
              return (
                <div key={stat.label} style={{ background: '#fff', border: '1px solid var(--border)', borderLeft: `3px solid ${'var(--accent)'}`, borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>{stat.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{stat.value}</div>
                </div>
              )
            })}
          </div>
        )}

        {soldTrend && (
          <section
            aria-label={`Sold price trend at ${displayName}`}
            style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px', marginBottom: 24 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>
                  Sold Price Trend
                </div>
                {/* Stated in text as well as drawn, so the figures survive for crawlers and answer engines. */}
                <div style={{ fontSize: 14, color: 'var(--text)' }}>
                  {soldTrend.count} recorded sales, {formatPrice(soldTrend.firstPrice)} ({soldTrend.firstDate}) → {formatPrice(soldTrend.lastPrice)} ({soldTrend.lastDate}){' '}
                  <strong style={{ color: soldTrend.changePct >= 0 ? '#15803d' : '#b91c1c' }}>
                    {soldTrend.changePct >= 0 ? '+' : ''}{soldTrend.changePct}%
                  </strong>
                </div>
              </div>
              <Sparkline
                values={soldTrend.values}
                color={soldTrend.changePct >= 0 ? '#15803d' : '#b91c1c'}
                width={160}
                height={44}
              />
            </div>
          </section>
        )}

      </div>


      {/* Full-width comparison tables — moved out of the two-column grid so each row fits one line */}
      {(building.active_listings.length > 0 || building.recent_sold.length > 0 || !!stats?.avg_sold_price) && (
        <div className="container" style={{ padding: '12px var(--container-padding) 0' }}>

          {/* Active listings */}
          {building.active_listings.length > 0 && (
            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionTitle}>Homes For Sale ({building.active_listings.length})</h2>
              <BuildingComparisonTable rows={building.active_listings} slug={slug} agentPrefix={agentPrefix} />
            </section>
          )}

          {/* Sold history — static summary always visible; gated client-side for individual prices */}
          {(building.recent_sold.length > 0 || stats?.avg_sold_price) && (
            <section id="sold-history" style={{ marginBottom: 36 }}>
              <h2 style={sectionTitle}>Sold History at {displayName}</h2>
              {stats?.avg_sold_price && (() => {
                const summarySoldCount = stats.sold_count_6m ?? building.recent_sold.length
                const avgFmt = formatPriceFull(stats.avg_sold_price)
                const summaryText = summarySoldCount > 0
                  ? `${summarySoldCount} unit${summarySoldCount !== 1 ? 's' : ''} ${summarySoldCount !== 1 ? 'have' : 'has'} sold at ${displayName} in the past 6 months, with an average sale price of ${avgFmt}${stats.avg_per_sqft ? ` ($${Math.round(stats.avg_per_sqft).toLocaleString('en-CA')}/sq ft)` : ''}.`
                  : `Units at ${displayName} have recently sold for an average of ${avgFmt}${stats.avg_per_sqft ? ` ($${Math.round(stats.avg_per_sqft).toLocaleString('en-CA')}/sq ft)` : ''}.`
                return (
                  <p className="building-sold-summary" style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, margin: '0 0 12px' }}>
                    {summaryText}
                  </p>
                )
              })()}
              <SoldGate
                rows={building.recent_sold}
                accentColor={'var(--accent)'}
                primaryBg={'var(--primary-bg)'}
                totalCount={building.recent_sold.length}
                slug={slug}
                agentPrefix={agentPrefix}
              />
            </section>
          )}

          {/* ── Owner valuation offer ─ one CTA, distinct from the sold-price gate ─── */}
          {building.recent_sold.length > 0 && (() => {
            const vCount = stats?.sold_count_6m ?? building.recent_sold.length
            const vAvg = stats?.avg_sold_price ? formatPriceFull(stats.avg_sold_price) : null
            const vDom = stats?.avg_dom ? Math.round(stats.avg_dom) : null
            const proof = vAvg
              ? `${vCount} unit${vCount !== 1 ? 's' : ''} sold here in the past 6 months, averaging ${vAvg}${vDom ? ` in ${vDom} days` : ''}. `
              : ''
            return (
              <div style={{ marginBottom: 36 }}>
                <LeadOfferCapture
                  slug={slug}
                  offerType="building_valuation"
                  offerContext={displayName}
                  accent
                  title={`What's your unit at ${displayName} worth?`}
                  subtitle={`${proof}Get a free, no-obligation valuation based on what's actually selling in this building.`}
                  buttonLabel="Get My Valuation"
                  successMessage={`Thanks — we'll send your ${displayName} valuation shortly.`}
                />
              </div>
            )
          })()}
        </div>
      )}

      {/* Two-column layout */}
      <div className="container" style={{ padding: '12px var(--container-padding) 64px' }}>
        <div className="bldg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 40, alignItems: 'start' }}>
          <div style={{ minWidth: 0 }}>

            {/* Market Summary — highlighted box */}
            {marketSummary && (
              <section style={{ marginBottom: 36 }}>
                <div style={{ background: `color-mix(in srgb, ${'var(--accent)'} 10%, #fff)`, borderLeft: `4px solid ${'var(--accent)'}`, padding: '20px 24px', borderRadius: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: 'var(--primary-bg)' }}>Market Summary</div>
                  <p style={{ margin: 0, color: 'var(--text)', lineHeight: 1.8, fontSize: 14 }}>{marketSummary}</p>
                </div>
              </section>
            )}

            {/* Building details */}
            {infoRows.length > 0 && (
              <section style={{ marginBottom: 36 }}>
                <h2 style={sectionTitle}>Building Details</h2>
                <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {infoRows.map((r, i) => (
                        <tr key={r.label} style={{ borderBottom: i < infoRows.length - 1 ? '1px solid var(--border)' : undefined }}>
                          <td style={{ padding: '12px 18px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', width: '38%', verticalAlign: 'top' }}>{r.label}</td>
                          <td style={{ padding: '12px 18px', fontSize: 14, color: 'var(--text)' }}>{r.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Location Scores — walk/transit/bike from BCN cache */}
            {(building.walk_score != null || building.transit_score != null || building.bike_score != null) && (
              <section style={{ marginBottom: 36 }}>
                <h2 style={sectionTitle}>Location Scores</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12 }}>
                  {([
                    building.walk_score != null ? { label: 'Walkability', score: building.walk_score } : null,
                    building.transit_score != null ? { label: 'Transit', score: building.transit_score } : null,
                    building.bike_score != null ? { label: 'Cycling', score: building.bike_score } : null,
                  ] as ({ label: string; score: number } | null)[]).filter(Boolean).map((s) => {
                    const item = s as { label: string; score: number }
                    const pct = item.score
                    const color = pct >= 70 ? '#15803d' : pct >= 50 ? '#b45309' : '#6b7280'
                    return (
                      <div key={item.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>
                          {item.score}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>/100</span>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginTop: 6 }}>{item.label}</div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* About This Building — description */}
            {building.description && (
              <section style={{ marginBottom: 36 }}>
                <h2 style={sectionTitle}>About This Building</h2>
                <div
                  style={{ color: 'var(--text-muted)', lineHeight: 1.9, fontSize: 15 }}
                  dangerouslySetInnerHTML={{ __html: building.description }}
                />
              </section>
            )}

            {/* Location & Neighbourhood — AI generated context */}
            {building.neighbourhood_context && (
              <section style={{ marginBottom: 36 }}>
                <h2 style={sectionTitle}>Location &amp; Neighbourhood</h2>
                <div style={{ color: 'var(--text-muted)', lineHeight: 1.9, fontSize: 15 }}>
                  {building.neighbourhood_context}
                </div>
              </section>
            )}

            {/* Agent's Take — hand-authored commentary, only renders when at least one field is filled */}
            {building.agent_take && (
              <section style={{ marginBottom: 36 }}>
                <h2 style={sectionTitle}>Agent&apos;s Take</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, background: 'var(--surface, #fff)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
                  {[
                    { key: 'desirability', label: 'Desirability' },
                    { key: 'buyer_profile', label: 'Who This Building Suits' },
                    { key: 'best_floorplans', label: 'Best Floorplans' },
                    { key: 'view_preference', label: 'View & Side Preference' },
                    { key: 'noise_notes', label: 'Noise Notes' },
                    { key: 'rental_pet_appeal', label: 'Rental & Pet Appeal' },
                    { key: 'value_take', label: 'Value Take' },
                    { key: 'common_problems', label: 'Things to Watch For' },
                  ].map(({ key, label }) => {
                    const value = building.agent_take?.[key as keyof typeof building.agent_take]
                    if (!value) return null
                    return (
                      <div key={key}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
                        <div style={{ color: 'var(--text-muted)', lineHeight: 1.8, fontSize: 15 }}>{value}</div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Building Market Stats — StatCards row */}
            {(hasStats || avgAskingPrice != null) && (
              <section style={{ marginBottom: 36 }}>
                <h2 style={sectionTitle}>Building Market Stats</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12 }}>
                  {[
                    avgAskingPrice != null ? { label: 'Avg Asking Price', value: formatPrice(avgAskingPrice) } : null,
                    stats?.sold_count_6m != null ? { label: 'Sold in 6 Months', value: `${stats.sold_count_6m} units` } : null,
                    stats?.avg_sold_price != null ? { label: 'Avg Sold Price', value: formatPrice(stats.avg_sold_price) } : null,
                    stats?.avg_per_sqft != null ? { label: 'Avg $/SqFt', value: `$${Math.round(stats.avg_per_sqft).toLocaleString('en-CA')}` } : null,
                    stats?.avg_dom != null ? { label: 'Avg DOM', value: `${stats.avg_dom} days` } : null,
                    saleToListRatio != null ? { label: 'Sale-to-List', value: `${saleToListRatio}%` } : null,
                  ].filter(Boolean).map((s) => {
                    const stat = s as { label: string; value: string }
                    return (
                      <div key={stat.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '16px' }}>
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>{stat.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{stat.value}</div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Amenities + Bylaw Restrictions + Strata Fee Includes */}
            {(building.amenities.length > 0 || !!building.features_data || hasBylawData || building.maintenance_fee_includes.length > 0) && (
              <section style={{ marginBottom: 36 }}>
                <h2 style={sectionTitle}>Amenities &amp; Bylaws</h2>

                {/* Top row: Bylaw Restrictions + Amenities */}
                {(hasBylawData || building.amenities.length > 0) && (
                  <div style={{ display: 'grid', gridTemplateColumns: hasBylawData && building.amenities.length > 0 ? '1fr 1fr' : '1fr', gap: 20, marginBottom: building.maintenance_fee_includes.length > 0 ? 20 : 0 }}>

                    {hasBylawData && (
                      <div style={subCard}>
                        <div style={subCardHead}>
                          <h3 style={subCardTitle}>Bylaw Restrictions</h3>
                        </div>
                        {/* Pets row */}
                        {petText && (() => {
                          const allowed = !building.no_pets
                          const badge = allowed
                            ? { bg: '#dcfce7', color: '#15803d', label: 'Allowed' }
                            : { bg: '#fee2e2', color: '#b91c1c', label: 'Not Permitted' }
                          return (
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>Pets</span>
                                <span style={{ background: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{badge.label}</span>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{petText}</div>
                            </div>
                          )
                        })()}
                        {/* Rentals row */}
                        {(() => {
                          const badge = rentalsRestricted
                            ? { bg: '#fef9c3', color: '#92400e', label: 'Restricted' }
                            : { bg: '#dcfce7', color: '#15803d', label: 'Allowed' }
                          const detail = building.bylaw_restrictions
                            ? building.bylaw_restrictions.length > 80 ? building.bylaw_restrictions.slice(0, 80) + '…' : building.bylaw_restrictions
                            : rentalsRestricted ? 'Rental restrictions apply — see strata bylaws.' : 'Rentals permitted per strata bylaws.'
                          return (
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>Rentals</span>
                                <span style={{ background: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{badge.label}</span>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{detail}</div>
                            </div>
                          )
                        })()}
                        {/* Short-Term Rentals row */}
                        {(() => {
                          const badge = strRestricted
                            ? { bg: '#fee2e2', color: '#b91c1c', label: 'Not Permitted' }
                            : { bg: '#fef9c3', color: '#92400e', label: 'Check Bylaws' }
                          return (
                            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>Short-Term Rentals</span>
                                <span style={{ background: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{badge.label}</span>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                {strRestricted ? 'Short-term rentals (Airbnb/VRBO) not permitted.' : 'Confirm with strata before listing short-term.'}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}

                    {building.amenities.length > 0 && (
                      <div style={subCard}>
                        <div style={subCardHead}>
                          <h3 style={subCardTitle}>Amenities</h3>
                        </div>
                        <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8 }}>
                          {building.amenities.map(a => (
                            <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--off-white)', border: '1px solid var(--border)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}>
                              <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>
                              <span>{a}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Features — full-width below top row */}
                {building.features_data && (
                  <div style={{ ...subCard, marginBottom: building.maintenance_fee_includes.length > 0 ? 20 : 0 }}>
                    <div style={subCardHead}>
                      <h3 style={subCardTitle}>Features</h3>
                    </div>
                    {building.features_data.type === 'tags' && Array.isArray(building.features_data.items) && (
                      <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8 }}>
                        {building.features_data.items.map(f => (
                          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--off-white)', border: '1px solid var(--border)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}>
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>&#10003;</span>
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {Array.isArray(building.features_data.sections) && building.features_data.sections.length > 0 && (
                      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {building.features_data.sections.map(section => (
                          <div key={section.title}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{section.title}</div>
                            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {section.items.map(item => (
                                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, lineHeight: 1.4 }}>
                                  <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>&#10003;</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Strata Fee Includes — full-width below */}
                {building.maintenance_fee_includes.length > 0 && (
                  <div style={subCard}>
                    <div style={subCardHead}>
                      <h3 style={subCardTitle}>Strata Fee Includes</h3>
                    </div>
                    <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 8 }}>
                      {building.maintenance_fee_includes.map(item => (
                        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--off-white)', border: '1px solid var(--border)', padding: '8px 10px', borderRadius: 6, fontSize: 12 }}>
                          <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Strata Information */}
            {(building.strata_no || building.mgmt_name) && (
              <section style={{ marginBottom: 36 }}>
                <h2 style={sectionTitle}>Strata Information</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 12 }} className="strata-grid">
                  {/* Financial Health card */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
                    <h3 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: 'var(--primary-bg)' }}>Financial Health</h3>
                    {([
                      building.strata_no ? ['Strata Plan No.', building.strata_no] : null,
                      ['Contingency Reserve Fund', 'Contact agent for details'],
                      ['CRF Per Unit', 'Contact agent for details'],
                      ['Special Levies', 'Inquire with strata'],
                      ['Depreciation Report', 'Available on request'],
                    ] as (string[] | null)[]).filter((x): x is string[] => x !== null).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text)', textAlign: 'right', maxWidth: 160 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  {/* Management & Meetings card */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
                    <h3 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: 'var(--primary-bg)' }}>Management &amp; Meetings</h3>
                    {([
                      building.mgmt_name ? ['Strata Management Co.', building.mgmt_name] : null,
                      ['AGM Schedule', 'Annual — contact strata'],
                      ['Council Members', 'Elected owners'],
                      ['Insurance Coverage', 'Full building replacement'],
                      ['Bylaw Last Updated', 'Contact strata for date'],
                    ] as (string[] | null)[]).filter((x): x is string[] => x !== null).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text)', textAlign: 'right', maxWidth: 160 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Strata docs callout */}
                <div style={{ background: `color-mix(in srgb, ${'var(--accent)'} 10%, #fff)`, border: `1px solid color-mix(in srgb, ${'var(--accent)'} 30%, #fff)`, borderRadius: 8, padding: '12px 18px', fontSize: 13 }}>
                  <strong>Note:</strong> Strata documents including full meeting minutes, the depreciation report, and bylaws are available to serious buyers upon request. {firstName} can obtain and review these as part of your due diligence.
                </div>
              </section>
            )}

            {/* Quick Answers — AEO style, always visible */}
            {quickAnswers.length > 0 && (
              <section style={{ marginBottom: 36 }}>
                <h2 style={sectionTitle}>Quick Answers</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
                  {quickAnswers.map((qa, i) => (
                    <div key={i} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 6 }}>{qa.q}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65 }}>{qa.a}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* FAQ accordion — AI-generated when available, hardcoded fallback */}
            {displayFaqs.length > 0 && (
              <section style={{ marginBottom: 36 }}>
                <h2 style={sectionTitle}>Frequently Asked Questions</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {displayFaqs.map((f, i) => (
                    <details key={i} style={{ ...card, padding: 0, overflow: 'hidden' }}>
                      <summary style={{ padding: '16px 20px', fontSize: 14, fontWeight: 700, color: 'var(--text)', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{f.q}</span>
                        <span style={{ color: 'var(--accent)', fontSize: 18, flexShrink: 0, marginLeft: 12 }}>+</span>
                      </summary>
                      <div style={{ padding: '0 20px 18px', fontSize: 14, lineHeight: 1.75, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>{f.a}</div>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* Other Buildings in This Complex */}
            {building.sibling_buildings.length > 0 && (
              <section style={{ marginBottom: 36 }}>
                <h2 style={{ ...sectionTitle, marginBottom: 4 }}>Other Buildings in This Complex</h2>
                {building.complex_name && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                    Part of the {building.complex_name} complex — buildings share common neighbourhood amenities.
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
                  {building.sibling_buildings.map(b => (
                    <div key={b.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px' }}>
                      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4, color: 'var(--text)' }}>{buildingDisplayName(b)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{b.address}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12, marginBottom: 12 }}>
                        {b.year_built && <><div style={{ color: 'var(--text-muted)' }}>Built</div><div style={{ fontWeight: 600 }}>{b.year_built}</div></>}
                        {b.units && <><div style={{ color: 'var(--text-muted)' }}>Units</div><div style={{ fontWeight: 600 }}>{b.units}</div></>}
                        <div style={{ color: 'var(--text-muted)' }}>Active Now</div>
                        <div style={{ fontWeight: 600, color: b.active_listings_count > 0 ? '#16a34a' : 'var(--text-muted)' }}>
                          {b.active_listings_count > 0 ? `${b.active_listings_count} home${b.active_listings_count !== 1 ? 's' : ''}` : 'None'}
                        </div>
                      </div>
                      <a href={ap(`/building/${b.slug}`)}
                        style={{ display: 'block', background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', textAlign: 'center', padding: '8px 0', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                        View Building
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Mortgage Pre-Qualification */}
            <section style={{ marginBottom: 36 }}>
              <h2 style={{ ...sectionTitle, marginBottom: 4 }}>Mortgage Pre-Qualification</h2>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
                Buying in this building? Get pre-qualified in 4 quick steps.
              </div>
              <W3MortgagePreQual agent={agent} />
            </section>

            {/* Location / Map */}
            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionTitle}>Location</h2>
              <LazyMap
                src={mapEmbedUrl}
                title={`Map of ${displayName}`}
                address={building.address}
                city={building.city}
                subarea={building.subarea}
                mapsHref={mapsHref}
              />
            </section>

            {/* What's Nearby */}
            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionTitle}>What's Nearby</h2>
              <NearbyWidget subarea={building.subarea} city={building.city} accent={'var(--accent)'} />
            </section>

            {/* AI Amenities Widget — shown when amenities_widget feature is enabled */}
            {features.amenities_widget && aiAmenityPage && (
              <section style={{ marginBottom: 36 }}>
                <h2 style={{ ...sectionTitle, marginBottom: 4 }}>Walkability &amp; Amenities</h2>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  {building.subarea || building.city} neighbourhood lifestyle at a glance.
                </div>
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px' }}>
                  {(aiAmenityPage.content || '').split(/\n+/).filter(Boolean).map((p, i, arr) => (
                    <p key={i} style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.85, margin: i < arr.length - 1 ? '0 0 14px' : 0 }}>
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {/* Nearby Buildings */}
            {building.nearby_buildings.length > 0 && (
              <section style={{ marginBottom: 36 }}>
                <h2 style={sectionTitle}>Nearby Buildings</h2>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', fontSize: 14 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--off-white)' }}>
                        {['Building Name', 'Address', 'Storeys', 'Built', 'Active'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {building.nearby_buildings.map((nb, i) => (
                        <tr key={nb.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'var(--off-white)' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <a href={ap(`/building/${nb.slug}`)} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{buildingDisplayName(nb)}</a>
                          </td>
                          <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 13 }}>{nb.address}</td>
                          <td style={{ padding: '12px 14px' }}>{nb.levels ?? '—'}</td>
                          <td style={{ padding: '12px 14px' }}>{nb.year_built ?? '—'}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: nb.active_listings_count > 0 ? '#16a34a' : 'var(--text-muted)' }}>
                            {nb.active_listings_count > 0 ? `${nb.active_listings_count} home${nb.active_listings_count !== 1 ? 's' : ''}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* More Buildings in This Area */}
            {nearbyAreaBuildings.length > 0 && (
              <section style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                  <h2 style={sectionTitle}>More Buildings in {subareaLabel}</h2>
                  <a href={ap(`/buildings/${areaSlug}`)} style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    See all {subareaLabel} buildings →
                  </a>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
                  {nearbyAreaBuildings.map(b => (
                    <a key={b.id} href={ap(`/building/${b.slug}`)} style={{ display: 'block', background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px', textDecoration: 'none', color: 'inherit' }}>
                      {b.photo_url && (
                        <div style={{ height: 110, borderRadius: 6, overflow: 'hidden', marginBottom: 12, background: 'var(--off-white)' }}>
                          <img src={b.photo_url} alt={buildingDisplayName(b)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                        </div>
                      )}
                      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4, color: 'var(--text)', lineHeight: 1.3 }}>{buildingDisplayName(b)}</div>
                      {b.address && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{b.address}</div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                        {b.year_built && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--off-white)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 10 }}>Built {b.year_built}</span>
                        )}
                        {b.units && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--off-white)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 10 }}>{b.units} units</span>
                        )}
                        {b.active_listings > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', background: '#dcfce7', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: 10 }}>{b.active_listings} active</span>
                        )}
                      </div>
                      <div style={{ display: 'block', background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--accent)', textAlign: 'center', padding: '7px 0', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                        View Building
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            <div style={{ marginTop: 32 }}>
              <a href={ap('/buildings')} style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>← Back to all buildings</a>
            </div>
          </div>

          {/* Sidebar — sticky */}
          <div className="bldg-sidebar" id="ask-about-building" style={{ position: 'sticky', top: 'calc(var(--nav-height, 58px) + 16px)', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/*
              Buyer intent, not seller intent. This sidebar ran in "eval" mode —
              a "what's your home worth?" form — on every building page. Someone
              reading about a specific building is researching it as a buyer, and
              across the platform's entire history that form produced zero leads,
              while the contact form it shares code with produced 15 (13 with a
              phone number). Sellers already have a dedicated /home-evaluation
              page linked from the nav, the footer and ~40 other places, so
              nothing is lost by asking buyers a buyer's question here.

              Contact mode still forwards listing_address and source_url, so the
              agent sees which building the enquiry came from, and its submit
              button requires name + phone before it will send.
            */}
            <AgentSidebar agent={agent} mode="contact" contextLabel={displayName} listingAddress={streetOnly} listingCity={building.city} coAgents={getCoAgents(agent)} />

            {topRealtorUrl && (
              <a href={topRealtorUrl} style={{ display: 'block', background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', textDecoration: 'none' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 6 }}>Thinking of selling?</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 6, lineHeight: 1.3 }}>
                  {firstName} is the top-rated REALTOR® in {subareaLabel}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
                  Medallion Club · 5-star reviews · local expertise
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)' }}>See results &amp; reviews →</span>
              </a>
            )}
          </div>
        </div>
      </div>

      <style>{`
        details > summary::-webkit-details-marker { display: none; }
        @media (max-width: 900px) {
          .bldg-grid { grid-template-columns: 1fr !important; }
          .bldg-sidebar { position: static !important; }
          .strata-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <PageQuickLinks slug={slug} context="buildings" exclude="/building" />

      {/* Invisible next/image preload for hero (no layout shift) */}
      {photos[0] && (
        <div style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
          <Image src={photos[0]} alt="" width={1} height={1} priority unoptimized />
        </div>
      )}
    </div>
  )
}
