import { getAgent, getListingDetail, authMe, getLandingPages, matchTopRealtorUrl, agentCanonicalBase, resolveAgentPrefix, getAgentTerritories, agentAreaDisplay } from '@/lib/api'
import { nextStepPath } from '@/lib/next-step'
import { toHomesForSaleHref } from '../../homes-for-sale/subareaUtils'
import { getCoAgents, formatPrice, formatPriceFull, pricePerSqft, formatDate, resolveSiteConfig } from '@/lib/types'
import type { ListingDetail } from '@/lib/types'
import PhotoGallery from '@/components/PhotoGallery.client'
import MortgageCalculator from '@/components/MortgageCalculator.client'
import RequestShowingWidget from '@/components/RequestShowingWidget.client'
import SoldSignInCard from '@/components/SoldSignInCard.client'
import ListingMobileBar from '@/components/ListingMobileBar.client'
import { SoldPriceGateCard } from '@/components/SoldPriceGate'
import ListingSupplemental from '@/components/ListingSupplemental.client'
import WelcomeToast from '@/components/WelcomeToast.client'
import PropertyViewTracker from '@/components/PropertyViewTracker.client'
import PageQuickLinks from '@/components/PageQuickLinks'
import ListingDetailHeartButton from './ListingDetailHeartButton.client'
import ListingAlertButton from './ListingAlertButton.client'
import LazyMap from '@/components/LazyMap.client'
import { notFound } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import type { Metadata } from 'next'
import BuildingLastSalePopup from '@/components/BuildingLastSalePopup.client'
import ListingDataSetter from '@/components/ListingDataSetter.client'

interface Props {
  params: Promise<{ slug: string; mls: string }>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, mls } = await params
  // getListingDetail throws TransientBackendError on a transient backend failure.
  // Swallow it here and emit a neutral title; the page body re-invokes the same
  // (React-cached) call and will throw, so the route renders a retriable error
  // instead of a metadata crash. A genuine not-found returns null.
  let listing: Awaited<ReturnType<typeof getListingDetail>> = null
  let agent: Awaited<ReturnType<typeof getAgent>> = null
  try {
    ;[agent, listing] = await Promise.all([getAgent(slug), getListingDetail(slug, mls)])
  } catch {
    return { title: 'Loading…' }
  }
  if (!listing) return { title: 'Listing Not Found' }
  const territories = await getAgentTerritories(slug).catch(() => [])
  const shortArea = agentAreaDisplay(territories)
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/listing/${mls}`
  const priceStr = listing.status === 'Sold' && listing.sold_price ? formatPrice(listing.sold_price) : formatPrice(listing.list_price)
  const hasSuiteTitle = listing.has_suite && listing.type === 'House' && listing.status === 'Active'
  const suiteMetaSuffix = hasSuiteTitle ? ` This home includes a ${listing.suite_label ?? 'secondary suite'} — ideal as a mortgage helper.` : ''
  const desc = `${listing.beds} bed, ${listing.baths} bath ${listing.type || 'property'} at ${listing.address}, ${listing.city}. ${listing.status === 'Sold' ? `Sold for ${priceStr}.` : `Listed at ${priceStr}.`}${suiteMetaSuffix}`
  const titleBase = `${listing.address}, ${listing.city} BC`
  const titleSuite = hasSuiteTitle ? ` — ${listing.beds} Bed House with Suite` : ''
  const titleText = `${titleBase}${titleSuite} | ${shortArea} Real Estate`
  return {
    title: { absolute: titleText },
    description: desc,
    alternates: { canonical },
    openGraph: {
      title: titleText,
      description: desc,
      url: canonical,
      images: listing.photo_url ? [{ url: listing.photo_url }] : undefined,
      type: 'website',
    },
  }
}

const statusBadge: Record<string, { bg: string; label: string }> = {
  Active: { bg: 'var(--accent)', label: 'For Sale' },
  Sold: { bg: '#1f2937', label: 'Sold' },
}

function listingSchemaType(type: string | null): string {
  if (type === 'House') return 'SingleFamilyResidence'
  if (type === 'Condo' || type === 'Apartment') return 'Apartment'
  return 'Residence'
}

function jsonLd(listing: ListingDetail, url: string) {
  const price = listing.status === 'Sold' && listing.sold_price ? listing.sold_price : listing.list_price
  return {
    '@context': 'https://schema.org',
    '@type': listingSchemaType(listing.type),
    name: listing.address,
    url,
    description: (listing.has_suite && listing.type === 'House' && listing.status === 'Active')
      ? `${listing.description ? listing.description + ' ' : ''}This home includes a ${listing.suite_label ?? 'secondary suite'}${listing.legal_suite ? ' (legal suite)' : ''} — ideal as a mortgage helper or in-law suite.`
      : (listing.description || undefined),
    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.address,
      addressLocality: listing.city,
      addressRegion: 'BC',
      addressCountry: 'CA',
      ...(listing.postal_code ? { postalCode: listing.postal_code } : {}),
    },
    numberOfRooms: listing.beds || undefined,
    numberOfBedrooms: listing.beds || undefined,
    numberOfBathroomsTotal: listing.baths || undefined,
    floorSize: listing.sqft > 0 ? { '@type': 'QuantitativeValue', value: listing.sqft, unitCode: 'FTK' } : undefined,
    yearBuilt: listing.year_built || undefined,
    image: listing.photos?.length ? listing.photos.slice(0, 6) : listing.photo_url ? [listing.photo_url] : undefined,
    geo: listing.latitude && listing.longitude ? { '@type': 'GeoCoordinates', latitude: listing.latitude, longitude: listing.longitude } : undefined,
    ...(price && listing.status === 'Active'
      ? {
          offers: {
            '@type': 'Offer',
            price,
            priceCurrency: 'CAD',
            availability: 'https://schema.org/InStock',
            url,
          },
        }
      : {}),
    additionalProperty: price ? [
      {
        '@type': 'PropertyValue',
        name: listing.status === 'Sold' ? 'Sold Price' : 'List Price',
        value: price,
        unitCode: 'CAD',
      },
    ] : undefined,
  }
}

interface School {
  name: string
  level: 'Elementary' | 'Secondary' | 'Middle'
  dist: string
}

const SUBAREA_SCHOOLS: Record<string, School[]> = {
  'Morgan Creek': [
    { name: 'Morgan Elementary', level: 'Elementary', dist: '0.4 km' },
    { name: 'Earl Marriott Secondary', level: 'Secondary', dist: '1.8 km' },
    { name: 'Woodward Hill Elementary', level: 'Elementary', dist: '2.1 km' },
  ],
  'Grandview': [
    { name: 'Grandview Heights Secondary', level: 'Secondary', dist: '0.9 km' },
    { name: 'Grandview Heights Elementary', level: 'Elementary', dist: '1.2 km' },
    { name: 'Katzie Elementary', level: 'Elementary', dist: '2.4 km' },
  ],
  'Pacific Douglas': [
    { name: 'Pacific Heights Elementary', level: 'Elementary', dist: '0.8 km' },
    { name: 'Earl Marriott Secondary', level: 'Secondary', dist: '3.1 km' },
    { name: 'Elgin Park Secondary', level: 'Secondary', dist: '3.8 km' },
  ],
  'Semiahmoo': [
    { name: 'Semiahmoo Secondary', level: 'Secondary', dist: '0.5 km' },
    { name: 'Ray Shepherd Elementary', level: 'Elementary', dist: '0.9 km' },
    { name: 'White Rock Elementary', level: 'Elementary', dist: '1.4 km' },
  ],
  'White Rock': [
    { name: 'White Rock Elementary', level: 'Elementary', dist: '0.6 km' },
    { name: 'Semiahmoo Secondary', level: 'Secondary', dist: '1.2 km' },
    { name: 'Peace Arch Elementary', level: 'Elementary', dist: '1.7 km' },
  ],
  'South Surrey': [
    { name: 'Elgin Park Secondary', level: 'Secondary', dist: '1.1 km' },
    { name: 'Chantrell Creek Elementary', level: 'Elementary', dist: '1.3 km' },
    { name: 'Crescent Park Elementary', level: 'Elementary', dist: '1.9 km' },
  ],
  'Cloverdale': [
    { name: 'Cloverdale Traditional School', level: 'Elementary', dist: '0.7 km' },
    { name: 'Lord Tweedsmuir Secondary', level: 'Secondary', dist: '1.0 km' },
    { name: 'Clayton Heights Secondary', level: 'Secondary', dist: '2.2 km' },
  ],
  'Fleetwood': [
    { name: 'Frost Road Elementary', level: 'Elementary', dist: '0.8 km' },
    { name: 'Fleetwood Park Secondary', level: 'Secondary', dist: '1.3 km' },
    { name: 'Enver Creek Secondary', level: 'Secondary', dist: '2.5 km' },
  ],
  'Newton': [
    { name: 'Newton Elementary', level: 'Elementary', dist: '0.6 km' },
    { name: 'Frank Hurt Secondary', level: 'Secondary', dist: '1.1 km' },
    { name: 'Bear Creek Elementary', level: 'Elementary', dist: '1.8 km' },
  ],
  'Whalley': [
    { name: 'Erma Stephenson Elementary', level: 'Elementary', dist: '0.5 km' },
    { name: 'Johnston Heights Secondary', level: 'Secondary', dist: '1.4 km' },
    { name: 'Kwantlen Park Secondary', level: 'Secondary', dist: '2.6 km' },
  ],
  'Burnaby': [
    { name: 'Westridge Elementary', level: 'Elementary', dist: '0.7 km' },
    { name: 'Burnaby Mountain Secondary', level: 'Secondary', dist: '1.5 km' },
    { name: 'Lakeview Elementary', level: 'Elementary', dist: '1.9 km' },
  ],
  'Vancouver': [
    { name: 'Lord Byng Secondary', level: 'Secondary', dist: '0.8 km' },
    { name: 'Trafalgar Elementary', level: 'Elementary', dist: '1.1 km' },
    { name: 'Jules Quesnel Elementary', level: 'Elementary', dist: '1.6 km' },
  ],
  'Richmond': [
    { name: 'Hamilton Elementary', level: 'Elementary', dist: '0.6 km' },
    { name: 'Richmond Secondary', level: 'Secondary', dist: '1.3 km' },
    { name: 'Quilchena Elementary', level: 'Elementary', dist: '1.8 km' },
  ],
  'Langley': [
    { name: 'Topham Elementary', level: 'Elementary', dist: '0.7 km' },
    { name: 'Langley Secondary', level: 'Secondary', dist: '1.2 km' },
    { name: 'R.E. Mountain Secondary', level: 'Secondary', dist: '2.1 km' },
  ],
  'Abbotsford': [
    { name: 'Eugene Reimer Middle', level: 'Middle', dist: '0.9 km' },
    { name: 'W.A. Fraser Middle', level: 'Middle', dist: '1.4 km' },
    { name: 'Abbotsford Senior Secondary', level: 'Secondary', dist: '2.0 km' },
  ],
}

const DEFAULT_SCHOOLS: School[] = [
  { name: 'Local Elementary School', level: 'Elementary', dist: '< 1.5 km' },
  { name: 'Local Secondary School', level: 'Secondary', dist: '< 2 km' },
]

function getSchools(subarea: string | null, city: string): School[] {
  if (subarea && SUBAREA_SCHOOLS[subarea]) return SUBAREA_SCHOOLS[subarea]
  if (city && SUBAREA_SCHOOLS[city]) return SUBAREA_SCHOOLS[city]
  const key = Object.keys(SUBAREA_SCHOOLS).find(k =>
    city.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(city.toLowerCase())
  )
  return key ? SUBAREA_SCHOOLS[key] : DEFAULT_SCHOOLS
}

const levelColors: Record<string, { bg: string; color: string }> = {
  Elementary: { bg: '#eff6ff', color: '#1d4ed8' },
  Middle:     { bg: '#f0fdf4', color: '#15803d' },
  Secondary:  { bg: '#fef3c7', color: '#92400e' },
}

interface FAQItem { q: string; a: string }

function buildFAQs(listing: ListingDetail, isSold: boolean, isLoggedIn: boolean): FAQItem[] {
  const addr = listing.address
  const city = listing.subarea || listing.city
  const cityFull = listing.subarea && listing.city !== listing.subarea ? `${listing.subarea}, ${listing.city}` : listing.city
  const faqs: FAQItem[] = []

  if (listing.list_price > 0 && !isSold) {
    faqs.push({ q: `What is the listing price of ${addr}?`, a: `${addr} is listed at ${formatPriceFull(listing.list_price)}.` })
  }
  if (isSold && listing.sold_price && isLoggedIn) {
    faqs.push({ q: `What did ${addr} sell for?`, a: `${addr} sold for ${formatPriceFull(listing.sold_price)}.` })
  }
  if (listing.beds) {
    faqs.push({ q: `How many bedrooms does ${addr} have?`, a: `${addr} has ${listing.beds} bedroom${listing.beds > 1 ? 's' : ''} and ${listing.baths} bathroom${listing.baths > 1 ? 's' : ''}.` })
  }
  if (listing.sqft > 1) {
    faqs.push({ q: `What is the square footage of ${addr}?`, a: `${addr} has ${listing.sqft.toLocaleString()} sq ft of living space.` })
  }
  if (listing.year_built) {
    faqs.push({ q: `What year was this home built in?`, a: `${addr} was built in ${listing.year_built}.` })
  }
  if (listing.dom != null && !isSold) {
    faqs.push({ q: `How long has this property been listed for?`, a: `${addr} has been on the market for ${listing.dom} day${listing.dom !== 1 ? 's' : ''}.` })
  }
  if (listing.strata_fee) {
    faqs.push({ q: `What are the strata fees at ${addr}?`, a: `The monthly strata fee at ${addr} is $${Math.round(listing.strata_fee).toLocaleString()}.` })
  }
  if (listing.has_suite && (listing.type === 'House' || listing.type === 'Townhouse')) {
    const suiteLabel = listing.suite_label ?? 'secondary suite'
    const suiteCountWord = (listing.suite_count ?? 1) >= 2 ? 'two secondary suites' : `a ${suiteLabel}`
    const legalNote = listing.legal_suite
      ? ' The listing describes the suite as legal.'
      : ''
    faqs.push({
      q: `Does ${addr} have a secondary suite?`,
      a: `Yes — ${addr} has ${suiteCountWord}.${legalNote}`,
    })
    if (listing.rental_income_hint) {
      faqs.push({
        q: `What is the rental income potential for the suite at ${addr}?`,
        a: `The listing remarks indicate approximately ${listing.rental_income_hint} in monthly rental income from the suite. This can significantly offset your monthly mortgage costs.`,
      })
    } else {
      faqs.push({
        q: `What is the rental income potential for the suite at ${addr}?`,
        a: `A ${suiteLabel} in ${city} typically rents for $1,500–$2,500/month, depending on size and condition. This can significantly offset your monthly mortgage costs.`,
      })
    }
    if (listing.legal_suite) {
      faqs.push({
        q: `Is the suite at ${addr} a legal suite?`,
        a: `The listing describes the suite as legal. In BC, a legal secondary suite must meet municipal zoning, building code, and fire safety requirements.`,
      })
    } else {
      faqs.push({
        q: `Is the suite at ${addr} a legal suite?`,
        a: `The listing does not specify legal status for the suite. In BC, secondary suites must be registered with the municipality and meet building code requirements.`,
      })
    }
  } else {
    const basementVal = listing.basement?.trim().toLowerCase()
    if (basementVal && basementVal !== 'none' && basementVal !== 'n/a' && basementVal !== 'no') {
      faqs.push({ q: `Is there a basement in this home?`, a: `${addr} has a ${listing.basement} basement.` })
    }
  }
  if (listing.lot_size) {
    faqs.push({ q: `What is the lot size of ${addr}?`, a: `The lot size at ${addr} is ${listing.lot_size}.` })
  }
  if (listing.open_house) {
    faqs.push({ q: `Is there an open house scheduled?`, a: `Yes, there is an open house scheduled for ${addr}. Contact us for details.` })
  } else if (!isSold) {
    faqs.push({ q: `Is there an open house scheduled?`, a: `No open houses are currently scheduled for ${addr}. Contact the listing agent to arrange a private showing.` })
  }
  const petsFeature = listing.features?.find(f => /pet/i.test(f))
  if (petsFeature) {
    faqs.push({ q: `Are pets allowed at ${addr}?`, a: petsFeature + '.' })
  }
  faqs.push({ q: `What is the MLS® number for ${addr}?`, a: `The MLS® listing number for ${addr} is ${listing.mls_no}.` })
  faqs.push({ q: `What neighbourhood is ${addr} in?`, a: `${addr} is located in ${cityFull}, BC, Canada.` })

  void city
  return faqs
}

function buildSummary(listing: ListingDetail, isSold: boolean, isLoggedIn: boolean): string {
  const typeLabel = listing.type === 'Apartment' ? 'condo' : listing.type === 'Townhouse' ? 'townhouse' : listing.type === 'House' ? 'home' : 'property'
  const loc = [listing.subarea, listing.city].filter(Boolean).join(', ')
  const priceStr = isSold && listing.sold_price && isLoggedIn
    ? `sold for ${formatPriceFull(listing.sold_price)}`
    : !isSold && listing.list_price > 0
    ? `listed at ${formatPriceFull(listing.list_price)}`
    : null

  const parts: string[] = []

  let intro = `${listing.type || 'Property'} for sale in ${loc}`
  if (priceStr) intro += ` — ${priceStr}`
  const bedBath = [listing.beds ? `${listing.beds} bedroom` : '', listing.baths ? `${listing.baths} bathroom` : ''].filter(Boolean).join(', ')
  if (bedBath) intro += `. This ${bedBath} ${typeLabel}`
  if (listing.sqft > 1) {
    const psf = !isSold && listing.list_price > 0 ? Math.round(listing.list_price / listing.sqft) : null
    intro += ` offers ${listing.sqft.toLocaleString()} sq ft of living space${psf ? ` ($${psf.toLocaleString()}/sq ft)` : ''}`
  }
  if (listing.year_built) intro += ` and was built in ${listing.year_built}`
  intro += '.'
  parts.push(intro)

  const locDetails: string[] = []
  if (listing.subarea && listing.city) locDetails.push(`Located in ${listing.subarea}, ${listing.city}.`)
  if (listing.style) locDetails.push(`Home style: ${listing.style}.`)
  if (listing.parking) locDetails.push(`Parking: ${listing.parking}.`)
  if (locDetails.length) parts.push(locDetails.join(' '))

  if (listing.amenities?.length) {
    parts.push(`Building amenities include ${listing.amenities.slice(0, 6).join(', ')}.`)
  }
  if (listing.features?.length) {
    parts.push(`Features: ${listing.features.slice(0, 6).join(', ')}.`)
  }
  if (listing.strata_fee) {
    parts.push(`Monthly strata fees are $${Math.round(listing.strata_fee).toLocaleString()}.`)
  }
  if (listing.tax_amount) {
    const yr = (listing as ListingDetail & { tax_year?: string | number }).tax_year
    parts.push(`Annual property taxes: $${Math.round(listing.tax_amount).toLocaleString()}${yr ? ` (${yr})` : ''}.`)
  }
  if (listing.has_suite && (listing.type === 'House' || listing.type === 'Townhouse')) {
    const suiteLabel = listing.suite_label ?? 'secondary suite'
    const suiteCountPhrase = (listing.suite_count ?? 1) >= 2 ? 'two secondary suites' : `a secondary suite`
    const incomePart = listing.rental_income_hint
      ? `, currently generating approximately ${listing.rental_income_hint} per month in rental income`
      : ''
    const suiteDesc = `This home includes ${suiteCountPhrase} with separate entry${incomePart} — ideal as a mortgage helper or in-law suite.`
    void suiteLabel
    parts.push(suiteDesc)
  }

  const reoffice = (listing as ListingDetail & { reoffice?: string }).reoffice
  if (reoffice) {
    parts.push(`Listed by ${reoffice} — MLS® #${listing.mls_no}.`)
  } else {
    parts.push(`MLS® #${listing.mls_no}.`)
  }

  return parts.join(' ')
}

function parseBasement(basement: string | null): string | null {
  if (!basement) return null
  const codeMap: Record<string, string | null> = {
    'fully finished': 'Fully finished',
    'full': 'Fully finished',
    'finished': 'Finished',
    'part': 'Partially finished',
    'partially finished': 'Partially finished',
    'unfinished': 'Unfinished',
    'separate entry': 'Separate entry',
    'exterior entry': 'Exterior entry (exterior door)',
    'crawl': 'Crawl space',
    'crawl space': 'Crawl space',
    'none': null,
    'n/a': null,
    'no': null,
  }
  const parts = basement.split(',').map(s => s.trim()).filter(Boolean)
  const mapped = parts.map(p => {
    const key = p.toLowerCase()
    if (key in codeMap) return codeMap[key]
    return p
  }).filter((v): v is string => v !== null)
  if (mapped.length === 0) return null
  return mapped.join(' — ')
}

export default async function ListingDetailPage({ params }: Props) {
  const { slug, mls } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const jar = await cookies()
  const sessionToken = jar.get('pxl_session')?.value
  const [agent, listing, user, topRealtorPages] = await Promise.all([
    getAgent(slug),
    getListingDetail(slug, mls),
    sessionToken ? authMe(sessionToken) : Promise.resolve(null),
    getLandingPages(slug),
  ])
  if (!agent || !listing) notFound()

  const topRealtorUrl = matchTopRealtorUrl(topRealtorPages, agentPrefix, listing.subarea, listing.city)

  const coAgents = getCoAgents(agent)

  const domain = agentCanonicalBase(agent)
  const canonicalUrl = `https://${domain}/listing/${mls}`

  const isShowcasePreset = resolveSiteConfig(agent).layout_preset === 'showcase'
  const isSold = listing.status === 'Sold'
  const isLoggedIn = user?.next_step === 'done'
  const nextStepUrl = user && user.next_step !== 'done'
    ? nextStepPath(slug, user.next_step)
    : undefined
  const baths = listing.baths % 1 === 0 ? listing.baths.toFixed(0) : listing.baths.toFixed(1)
  const displayPrice = isSold && listing.sold_price ? listing.sold_price : listing.list_price
  // A sold price is licensed data behind the sign-in gate; a list price is public.
  // Withhold anything derived from the former until the visitor is entitled to it,
  // including $/sqft — sqft is on the page, so $/sqft reconstructs the price.
  const soldFiguresVisible = !isSold || isLoggedIn
  const priceLabel = soldFiguresVisible ? formatPriceFull(displayPrice) : null
  const psf = soldFiguresVisible ? pricePerSqft(displayPrice, listing.sqft) : null
  const badge = statusBadge[listing.status] || { bg: '#6b7280', label: listing.status }

  const photos = listing.photos?.length ? listing.photos : listing.photo_url ? [listing.photo_url] : []

  const detailRows: [string, string, boolean?][] = [
    ['MLS®', listing.mls_no],
    ['Property Type', listing.type || '—'],
    ...(listing.style ? [['Style', listing.style] as [string, string]] : []),
    ...(listing.heating ? [['Heating', listing.heating] as [string, string]] : []),
    ...(listing.kitchens ? [['Kitchens', String(listing.kitchens)] as [string, string]] : []),
    ...(listing.roof ? [['Roof', listing.roof] as [string, string]] : []),
    ...(listing.year_built ? [['Year Built', String(listing.year_built)] as [string, string]] : []),
    ...(listing.reno_year ? [['Year Renovated', String(listing.reno_year)] as [string, string]] : []),
    ...(listing.sqft > 0 ? [['Floor Area', `${listing.sqft.toLocaleString()} ft²`] as [string, string]] : []),
    ...(listing.lot_size ? [['Lot Size', listing.lot_size] as [string, string]] : []),
    ...(listing.frontage ? [['Frontage', `${listing.frontage} ft`] as [string, string]] : []),
    ...(listing.depth ? [['Depth', `${listing.depth} ft`] as [string, string]] : []),
    ...(listing.garage_size ? [['Garage', listing.garage_size] as [string, string]] : []),
    ...(listing.parking ? [['Parking', listing.parking] as [string, string]] : []),
    ...(() => { const b = parseBasement(listing.basement ?? null); return b ? [['Basement', b] as [string, string]] : [] })(),
    ...(listing.strata_fee ? [['Strata Fee', `$${Math.round(listing.strata_fee).toLocaleString()}/mo`] as [string, string]] : []),
    ...(listing.strata_no ? [['Strata No', listing.strata_no] as [string, string]] : []),
    ...(listing.units_in_strata ? [['Units in Strata', String(listing.units_in_strata)] as [string, string]] : []),
    ...(listing.units_in_development ? [['Units in Development', String(listing.units_in_development)] as [string, string]] : []),
    ...(listing.tax_amount ? [['Taxes', `$${Math.round(listing.tax_amount).toLocaleString()}${listing.tax_year ? ` (${listing.tax_year})` : ''}`] as [string, string]] : []),
    ...(listing.postal_code ? [['Postal Code', listing.postal_code] as [string, string]] : []),
    ...(!listing.building && listing.complex ? [['Complex', listing.complex] as [string, string]] : []),
    ...(listing.reoffice ? [['Listed By', listing.reoffice, true] as [string, string, boolean]] : []),
  ]

  const sectionTitle: React.CSSProperties = { fontSize: 18, fontWeight: 800, margin: '0 0 14px', color: 'var(--primary-bg)' }
  const card: React.CSSProperties = { background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 24px' }
  const section: React.CSSProperties = { margin: '0 0 32px' }

  const schools = getSchools(listing.subarea, listing.city)
  const summary = buildSummary(listing, isSold, isLoggedIn)
  const faqs = buildFAQs(listing, isSold, isLoggedIn)
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  const mapSrc = listing.latitude && listing.longitude
    ? `https://maps.google.com/maps?q=${listing.latitude},${listing.longitude}&z=15&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(listing.address + ', ' + listing.city + ', BC')}&z=15&output=embed`

  const guestSoldLocked = !soldFiguresVisible   // exact negation; kept for the existing render guards

  const soldRatio = isSold && isLoggedIn && listing.sold_price && listing.list_price
    ? ((listing.sold_price / listing.list_price) * 100).toFixed(1)
    : null
  const priceDelta = isSold && isLoggedIn && listing.sold_price && listing.list_price
    ? listing.sold_price - listing.list_price
    : null

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh', paddingBottom: 24 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(listing, canonicalUrl)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      {/* Fire-and-forget property view tracker — 401 silently ignored when not logged in */}
      <PropertyViewTracker listingId={listing.mls_no} addressLabel={`${listing.address}, ${listing.city}`} />
      {/* Publish listing data to layout-level components (e.g. W4StickyFooter) via module-level store */}
      <ListingDataSetter address={listing.address} price={priceLabel ?? 'Sold listing'} mlsNum={listing.mls_no} isSold={isSold} />

      {/* Gallery */}
      <div className="container" style={{ padding: '20px var(--container-padding) 0' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          <a href={ap('/homes-for-sale')} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Homes</a>
          {' › '}<span>{listing.city}</span>
          {listing.subarea ? <>{' › '}<span>{listing.subarea}</span></> : null}
        </div>
        <PhotoGallery photos={photos} address={listing.address} virtualTour={isSold ? null : listing.virtual_tour} status={listing.status} locked={isSold && !isLoggedIn} agentPrefix={agentPrefix} />
      </div>

      <div className="container" style={{ padding: '28px var(--container-padding) 0' }}>
        <div className="listing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 40, alignItems: 'start' }}>
          {/* MAIN */}
          <div style={{ minWidth: 0 }}>
            {/* Status + price + address */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ background: badge.bg, color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{badge.label}</span>
              {listing.type && <span style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 4 }}>{listing.type}</span>}
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>MLS® {listing.mls_no}</span>
              {listing.dom != null && !isSold && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {listing.dom} days on market</span>}
              {!isSold && <ListingDetailHeartButton mlsNo={listing.mls_no} />}
              {!isSold && <ListingAlertButton mlsNo={listing.mls_no} isLoggedIn={isLoggedIn} />}
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>{listing.address}, {listing.city} BC</h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 8px' }}>{listing.city}{listing.subarea ? `, ${listing.subarea}` : ''}</p>
            {isSold && listing.sold_date && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px' }}>Sold {formatDate(listing.sold_date)}</p>
            )}

            {/* Mobile-only price strip — hidden on desktop via CSS */}
            <div className="listing-mobile-price">
              {guestSoldLocked ? (
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🔒</span>
                  <span>{nextStepUrl ? 'Complete registration to see sold price' : 'Sign in to see sold price'}</span>
                </div>
              ) : (
                <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent)' }}>{priceLabel}</div>
              )}
            </div>

            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginBottom: 28 }}>
              {[
                { v: String(listing.beds), l: listing.beds === 1 ? 'Bed' : 'Beds', icon: '🛏' },
                { v: baths, l: 'Baths', icon: '🛁' },
                { v: listing.sqft > 0 ? listing.sqft.toLocaleString() : '—', l: 'Ft²', icon: '📐' },
                ...(listing.year_built ? [{ v: String(listing.year_built), l: 'Built', icon: '🏗' }] : []),
                ...(!guestSoldLocked && psf ? [{ v: psf, l: 'Per ft²', icon: '💲' }] : []),
              ].map(s => (
                <div key={s.l} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-bg)', lineHeight: 1.1 }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Suite / Mortgage Helper callout */}
            {listing.has_suite && (listing.type === 'House' || listing.type === 'Townhouse') && !isSold && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>🏠</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: '#15803d' }}>
                        Mortgage Helper — {listing.suite_label ?? 'Secondary Suite'}
                        {(listing.suite_count ?? 1) >= 2 ? ' (2 suites)' : ''}
                      </span>
                      {listing.legal_suite && (
                        <span style={{ background: '#dcfce7', color: '#166534', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, border: '1px solid #86efac' }}>Legal Suite</span>
                      )}
                    </div>
                    {listing.rental_income_hint && (
                      <div style={{ fontSize: 13, color: '#15803d', fontWeight: 700, marginBottom: 4 }}>
                        Estimated income: ~{listing.rental_income_hint}
                      </div>
                    )}
                    <p style={{ fontSize: 12, color: '#166534', margin: 0, lineHeight: 1.6 }}>
                      This home includes a secondary suite, which can offset mortgage costs.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Neighbourhood cross-links */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28, alignItems: 'center' }}>
              <a href={ap(toHomesForSaleHref(listing.subarea || listing.city))}
                className="link-arrow">
                View all {listing.subarea || listing.city} homes →
              </a>
              <a href={ap(`/sold?subarea=${encodeURIComponent(listing.subarea || listing.city)}`)}
                className="link-arrow">
                Recent solds →
              </a>
              {listing.subarea && (
                <a href={ap(`/neighbourhood/${listing.subarea.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`)}
                  className="link-arrow">
                  Neighbourhood guide →
                </a>
              )}
              {topRealtorUrl && (
                <a href={topRealtorUrl} className="link-arrow">
                  Top realtor in {listing.subarea || listing.city} →
                </a>
              )}
              {listing.building && (
                <a href={ap(`/building/${listing.building.slug}`)}
                  className="link-arrow">
                  View building →
                </a>
              )}
            </div>

            {/* SEO description block — always visible for sold listings */}
            {isSold && (
              <div style={{ background: 'var(--off-white)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', marginBottom: 28 }}>
                <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Property Details</div>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.8, fontSize: 14, margin: 0 }}>
                  {`This ${listing.beds}-bedroom, ${baths}-bathroom ${listing.type ? listing.type.toLowerCase() : 'property'} at ${listing.address}${listing.subarea ? ` in ${listing.subarea}` : ''}, ${listing.city}${listing.sold_date ? ` sold in ${formatDate(listing.sold_date, { month: 'long', year: 'numeric' })}` : ' is now sold'}.`}
                  {listing.sqft > 0 ? ` The property offers ${listing.sqft.toLocaleString()} sq ft of living space.` : ''}
                  {listing.year_built ? ` Built in ${listing.year_built}.` : ''}
                  {` ${listing.subarea || listing.city} is one of ${listing.city}'s sought-after areas, offering a blend of lifestyle amenities and convenient access to schools, parks, and transit.`}
                </p>
              </div>
            )}


            {/* Sold price gate — centre-stage (replaces Sold Insights for guests) */}
            {isSold && listing.sold_price && (
              <section style={{ ...section }}>
                <SoldPriceGateCard
                  isLoggedIn={isLoggedIn}
                  slug={slug}
                  agentPrefix={agentPrefix}
                  soldPrice={isLoggedIn ? listing.sold_price : null}
                  listPrice={isLoggedIn ? listing.list_price : null}
                  soldDate={listing.sold_date ?? null}
                  dom={listing.dom ?? null}
                  subarea={listing.subarea ?? null}
                  city={listing.city}
                  soldRatio={soldRatio}
                  nextStepUrl={nextStepUrl}
                />
              </section>
            )}


            {/* Description */}
            {listing.description && (
              <section style={section}>
                <h2 style={sectionTitle}>About This Property</h2>
                <div style={card}>
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text)', margin: 0, whiteSpace: 'pre-line' }}>{listing.description}</p>
                </div>
              </section>
            )}

            {/* Details & features */}
            {(detailRows.length > 0 || listing.features.length > 0 || listing.amenities.length > 0) && (
              <section style={section}>
                <h2 style={sectionTitle}>Listing Details &amp; Features</h2>
                <div style={card}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px 28px', marginBottom: (listing.features.length || listing.amenities.length) ? 20 : 0 }}>
                    {detailRows.map(([k, v, muted]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                        <span style={{ color: muted ? 'var(--text-muted)' : 'var(--text)', fontWeight: muted ? 400 : 600, fontStyle: muted ? 'italic' : 'normal', textAlign: 'right' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  {listing.features.length > 0 && (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '4px 0 10px' }}>Features</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: listing.amenities.length ? 18 : 0 }}>
                        {listing.features.map(f => (
                          <span key={f} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', fontSize: 12, color: 'var(--text)' }}>{f}</span>
                        ))}
                      </div>
                    </>
                  )}
                  {listing.amenities.length > 0 && (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '4px 0 10px' }}>Building Amenities</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {listing.amenities.map(a => (
                          <span key={a} style={{ background: 'rgba(var(--accent-rgb),0.10)', border: '1px solid rgba(var(--accent-rgb),0.3)', borderRadius: 6, padding: '5px 12px', fontSize: 12, color: 'var(--text)' }}>{a}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}

            {/* Property summary — SEO paragraph */}
            <section style={{ ...section }}>
              <div style={{ ...card, background: 'var(--off-white)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13.5, lineHeight: 1.85, color: 'var(--text-muted)', margin: 0 }}>{summary}</p>
              </div>
            </section>

            {/* Floor Area Breakdown */}
            {listing.floor_area && Object.values(listing.floor_area).some(v => v != null) && (
              <section style={section}>
                <h2 style={sectionTitle}>Floor Area</h2>
                <div style={card}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px 28px' }}>
                    {([
                      ['Main Floor', listing.floor_area.main],
                      ['Above Main', listing.floor_area.above],
                      ['Below Main', listing.floor_area.below],
                      ['Basement', listing.floor_area.basement],
                      ['Unfinished', listing.floor_area.unfinished],
                      ['Total', listing.floor_area.total],
                    ] as [string, number | null | undefined][]).filter(([, v]) => v != null).map(([label, val]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                        <span style={{ color: 'var(--text)', fontWeight: label === 'Total' ? 800 : 600, textAlign: 'right' }}>{(val as number).toLocaleString()} ft²</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Room Sizes */}
            {((listing.rooms?.length ?? 0) > 0 || (listing.baths_detail?.length ?? 0) > 0) && (
              <section style={section}>
                <h2 style={sectionTitle}>Room Sizes</h2>
                <div className="room-sizes-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Rooms table */}
                  {(listing.rooms?.length ?? 0) > 0 && (
                    <div style={card}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Rooms</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr>
                            {['Floor', 'Type', 'Dimensions'].map(h => (
                              <th key={h} style={{ textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {listing.rooms!.map((r, i) => (
                            <tr key={i}>
                              <td style={{ padding: '6px 0', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingRight: 8 }}>{r.level}</td>
                              <td style={{ padding: '6px 0', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingRight: 8 }}>{r.type || '—'}</td>
                              <td style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                                {isLoggedIn
                                  ? (r.dim1 && r.dim2 ? <span style={{ color: 'var(--text)', fontWeight: 600 }}>{r.dim1} × {r.dim2} ft</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>)
                                  : nextStepUrl
                                  ? <a href={nextStepUrl} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 11 }}>Complete registration</a>
                                  : <a href={ap(`/sign-in?return=${agentPrefix}/listing/${mls}`)} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 11 }}>Sign in to view</a>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Bathrooms table */}
                  {(listing.baths_detail?.length ?? 0) > 0 && (
                    <div style={card}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Bathrooms</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr>
                            {['Floor', 'Ensuite', 'Pieces'].map(h => (
                              <th key={h} style={{ textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {listing.baths_detail!.map((b, i) => (
                            <tr key={i}>
                              <td style={{ padding: '6px 0', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingRight: 8 }}>{b.level}</td>
                              <td style={{ padding: '6px 0', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingRight: 8 }}>{b.ensuite || '—'}</td>
                              <td style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                                {isLoggedIn
                                  ? (b.pieces ? <span style={{ color: 'var(--text)', fontWeight: 600 }}>{b.pieces}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>)
                                  : nextStepUrl
                                  ? <a href={nextStepUrl} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 11 }}>Complete registration</a>
                                  : <a href={ap(`/sign-in?return=${agentPrefix}/listing/${mls}`)} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 11 }}>Sign in to view</a>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            )}


            {/* Open house */}
            {listing.open_house && (
              <section style={section}>
                <h2 style={sectionTitle}>Open House</h2>
                <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(var(--accent-rgb),0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📅</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{formatDate(listing.open_house.start, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {formatDate(listing.open_house.start, { hour: 'numeric', minute: '2-digit' })} – {formatDate(listing.open_house.finish, { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Building info */}
            {listing.building && (
              <section style={section}>
                <h2 style={sectionTitle}>About the Building</h2>
                <a href={ap(`/building/${listing.building.slug}`)} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{listing.building.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>View building details, amenities &amp; all units</div>
                  </div>
                  <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>View Building →</span>
                </a>
              </section>
            )}


            {/* Location / Map */}
            <section style={section}>
              <h2 style={sectionTitle}>Location</h2>
              <LazyMap
                src={mapSrc}
                title={`Map of ${listing.address}`}
                address={listing.address}
                city={listing.city}
                subarea={listing.subarea}
                mapsHref={`https://maps.google.com/maps?q=${listing.latitude && listing.longitude ? `${listing.latitude},${listing.longitude}` : encodeURIComponent(listing.address + ', ' + listing.city + ', BC')}`}
              />
            </section>

            {/* Nearby Schools */}
            <section style={section}>
              <h2 style={sectionTitle}>Nearby Schools</h2>
              <div style={card}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {schools.map(school => {
                    const lvl = levelColors[school.level] || { bg: '#f3f4f6', color: '#374151' }
                    return (
                      <div key={school.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: 'var(--off-white)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: lvl.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏫</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{school.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <span style={{ background: lvl.bg, color: lvl.color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.04em' }}>{school.level}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>~{school.dist}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '14px 0 0', lineHeight: 1.5 }}>
                  School distances are approximate. Visit the{' '}
                  <a href="https://www.surreyschools.ca" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                    school district website
                  </a>{' '}
                  to confirm catchment areas.
                </p>
              </div>
            </section>

            {/* FAQ section */}
            {faqs.length > 0 && (
              <section style={section}>
                <h2 style={sectionTitle}>Frequently Asked Questions About {listing.address}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                  {faqs.map(({ q, a }, i) => (
                    <details key={i} style={{ borderBottom: i < faqs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <summary style={{ padding: '16px 20px', fontSize: 14, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
                        <span>{q}</span>
                        <span style={{ fontSize: 18, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 12, transition: 'transform 0.2s' }}>›</span>
                      </summary>
                      <div style={{ padding: '0 20px 16px', fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.7 }}>{a}</div>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* Mortgage calculator */}
            {!isSold && displayPrice > 0 && (
              <section style={section}>
                <MortgageCalculator price={displayPrice} strataFee={listing.strata_fee} taxAmount={listing.tax_amount} />
              </section>
            )}

            {/* Supplemental data — lazy-loaded client-side to keep initial page fast */}
            <ListingSupplemental
              slug={slug}
              agentPrefix={agentPrefix}
              listingSlug={mls}
              mls={listing.mls_no}
              isLoggedIn={isLoggedIn}
              isSold={isSold}
              nextStepUrl={nextStepUrl}
              listing={listing}
            />

            {/* Agent CTA panel — sold pages */}
            {isSold && (
              <section style={{ ...section }}>
                <div style={{ background: 'var(--primary-bg)', borderRadius: 10, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
                      What&apos;s your {listing.subarea || listing.city} home worth?
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
                      Get a free, no-obligation valuation from {agent.name} — {listing.subarea || listing.city}&apos;s trusted REALTOR®.
                    </div>
                  </div>
                  <a
                    href={ap('/home-evaluation')}
                    style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', border: 'none', padding: '14px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-block' }}>
                    Get Free Valuation →
                  </a>
                </div>
              </section>
            )}

            {/* Top-realtor seller link */}
            {topRealtorUrl && (
              <section style={section}>
                <a href={topRealtorUrl} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, textDecoration: 'none' }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
                      Thinking of selling in {listing.subarea || listing.city}?
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                      See {agent.name.split(' ')[0]}&apos;s credentials, sold results &amp; reviews
                    </div>
                  </div>
                  <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}>Learn more →</span>
                </a>
              </section>
            )}

            {/* Internal links */}
            <section style={{ ...card }}>
              <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14, color: 'var(--text)' }}>Browse More in {listing.subarea || listing.city}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {[
                  ...(isSold && listing.subarea ? [
                    { l: `Sold in ${listing.subarea}`, h: ap(`/sold?subarea=${encodeURIComponent(listing.subarea)}`) },
                    { l: 'All Sold Homes', h: ap('/sold') },
                  ] : [
                    { l: 'Sold Homes', h: ap('/sold') },
                  ]),
                  { l: 'Condos for Sale', h: ap('/homes-for-sale?type=Apartment') },
                  { l: 'Townhouses for Sale', h: ap('/homes-for-sale?type=Townhouse') },
                  { l: 'Houses for Sale', h: ap('/homes-for-sale?type=House') },
                  { l: 'Condo Buildings', h: ap('/buildings') },
                  { l: 'Market Stats', h: ap('/market-report') },
                ].map(x => (
                  <a key={x.l} href={x.h} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>{x.l}</a>
                ))}
              </div>
            </section>
          </div>

          {/* SIDEBAR */}
          <div id="contact" className="listing-sidebar" style={{ position: 'sticky', top: 'calc(var(--nav-height, 64px) + 16px)' }}>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                {guestSoldLocked ? (
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🔒</span>
                    <span>{nextStepUrl ? 'Complete registration to see sold price' : 'Sign in to see sold price'}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent)' }}>{priceLabel}</div>
                )}
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{listing.beds} bd · {baths} ba{listing.sqft > 0 ? ` · ${listing.sqft.toLocaleString()} ft²` : ''}{listing.strata_fee ? ` · $${Math.round(listing.strata_fee)}/mo` : ''}</div>
              </div>
              <span style={{ background: badge.bg, color: '#fff', padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{badge.label}</span>
            </div>

            {isSold && !isLoggedIn ? (
              <SoldSignInCard
                agent={agent}
                slug={slug}
                agentPrefix={agentPrefix}
                subarea={listing.subarea}
                returnTo={ap(`/listing/${mls}`)}
                mls={mls}
                nextStepUrl={nextStepUrl}
              />
            ) : isSold ? (
              <RequestShowingWidget agent={agent} address={listing.address} price={priceLabel ?? 'Sold listing'} mlsNum={listing.mls_no} variant="find-similar" subarea={listing.subarea || listing.city} coAgents={coAgents} />
            ) : (
              <RequestShowingWidget agent={agent} address={listing.address} price={priceLabel ?? 'Sold listing'} mlsNum={listing.mls_no} coAgents={coAgents} />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <a href={ap('/homes-for-sale')} style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '12px', borderRadius: 10, fontWeight: 600, fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>🔔</span>
                <span><span style={{ display: 'block', fontWeight: 700 }}>Alert me of new listings</span><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Get notified when similar homes list</span></span>
              </a>
              <a href={ap('/home-evaluation')} style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '12px', borderRadius: 10, fontWeight: 600, fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>🏠</span>
                <span><span style={{ display: 'block', fontWeight: 700 }}>What&apos;s my home worth?</span><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Free market valuation from {agent.name.split(' ')[0]}</span></span>
              </a>
            </div>

            <div style={{ marginTop: 14, fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              The data relating to real estate on this website comes in part from the MLS® Reciprocity program of the Real Estate Board of Greater Vancouver and the Fraser Valley Real Estate Board. Listing courtesy of {agent.brokerage}.
            </div>
          </div>
        </div>
      </div>

      <PageQuickLinks slug={slug} exclude="/listing" context="listing" />

      <ListingMobileBar
        agent={agent}
        address={listing.address}
        price={priceLabel ?? 'Sold listing'}
        mlsNum={listing.mls_no}
        isSold={isSold}
        isLoggedIn={isLoggedIn}
        slug={slug}
        agentPrefix={agentPrefix}
        returnTo={ap(`/listing/${mls}`)}
      />

      {isLoggedIn && <WelcomeToast />}

      {/* Building last-sale popup — guests only, condo/building listings only */}
      {!isLoggedIn && listing.strata_no && (
        <BuildingLastSalePopup
          agentSlug={slug}
          mls={mls}
          isLoggedIn={isLoggedIn}
          agentPrefix={agentPrefix}
        />
      )}

      <style>{`
        .listing-mobile-price { display: none; margin-bottom: 16px; }
        @media (max-width: 900px) {
          .listing-mobile-price { display: block; }
          .listing-grid { grid-template-columns: 1fr !important; }
          .listing-sidebar { position: static !important; margin-top: 32px; }
        }
        @media (max-width: 640px) {
          .room-sizes-grid { grid-template-columns: 1fr !important; }
          /* Mobile spacing normalisation — equalise section breathing room */
          .listing-grid > div > section,
          .listing-grid > div > div[style] {
            margin-bottom: 24px !important;
          }
          /* Slightly tighter top padding on mobile */
          .listing-top-pad { padding-top: 16px !important; }
        }
      `}</style>
    </div>
  )
}
