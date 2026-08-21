import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getListings, agentCanonicalBase, resolveAgentPrefix } from '@/lib/api'
import { getCoAgents } from '@/lib/types'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ListingStrip from '@/components/ListingStrip'


export const revalidate = 300

interface Props {
  params: Promise<{ slug: string }>
}

// This page is hand-written regional content, so it only exists for the three
// agents it was written for. Gate on SLUG, never on the canonical domain: the
// check below used to allow 'southsurreywhiterock.com' and 'randydyck.com', both
// of which are Randy's LEGACY domains, so the moment his custom_domain became
// findfraservalleyhomes.com this page started 404ing — while his own nav and
// footer kept linking to it and his sitemap kept advertising it. A slug cannot
// go stale when a domain is repointed.
const BURNABY_SLUG  = 'saeed-farhani-ppqu'
const TRICITY_SLUG  = 'tricity'
const RANDY_SLUG    = 'randy'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const agent = await getAgent(slug)
  const coAgents = agent ? getCoAgents(agent) : []
  const isDual = coAgents.length > 0
  const agentName = isDual
    ? `${agent!.name.split(' ')[0]} & ${coAgents[0].name.split(' ')[0]}`
    : (agent?.name || 'Randy Dyck')
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/new-construction`
  const currentYear = new Date().getFullYear()

  if (slug === BURNABY_SLUG) {
    const title = `New Construction Homes Burnaby | New Builds & Presales | ${agentName}`
    const description = `Browse new construction homes in Burnaby built ${currentYear - 2}–${currentYear}. Metrotown, Brentwood Park, Highgate & South Slope new builds and presale condos — expert advice from ${agentName}.`
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        type: 'website',
        url: canonical,
        siteName: agentName,
        images: [{ url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&h=630&fit=crop', width: 1200, height: 630 }],
      },
      twitter: { card: 'summary_large_image', title, description },
      keywords: ['new construction homes Burnaby', 'new builds Burnaby', 'presale condos Burnaby', 'new condos Metrotown', 'Brentwood Park new construction', 'Highgate new homes', 'presale Burnaby BC'],
    }
  }

  if (slug === TRICITY_SLUG) {
    const title = `New Construction Homes Tri-Cities | New Builds & Presales | ${agentName}`
    const description = `Browse new construction homes in Coquitlam, Port Coquitlam & Port Moody built ${currentYear - 2}–${currentYear}. Burke Mountain, North Coquitlam & Port Moody Centre new builds — expert advice from ${agentName}.`
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        type: 'website',
        url: canonical,
        siteName: agentName,
        images: [{ url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=630&fit=crop', width: 1200, height: 630 }],
      },
      twitter: { card: 'summary_large_image', title, description },
      keywords: ['new construction homes Coquitlam', 'Burke Mountain new homes', 'North Coquitlam new builds', 'Port Moody new construction', 'presale condos Tri-Cities', 'new builds Port Coquitlam', 'Tri-Cities new homes BC'],
    }
  }

  const title = `New Construction Homes South Surrey | New Builds & Presales | ${agentName}`
  const description = `Browse new construction homes in South Surrey built ${currentYear - 2}–${currentYear}. Grandview Heights, Pacific Douglas & Sunnyside Park new builds. Presale opportunities and assignment listings — expert advice from ${agentName}.`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      siteName: agentName,
      images: [{ url: 'https://images.unsplash.com/photo-1560185007-5f0bb1866cab?w=1200&h=630&fit=crop', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title, description },
    keywords: ['new construction homes South Surrey', 'new builds South Surrey', 'presale condos South Surrey', 'new condos Grandview Heights', 'presale South Surrey', 'new homes Pacific Douglas', 'new construction Sunnyside Park'],
  }
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is there GST on new construction in BC?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. New homes in BC are subject to 5% GST. If the home is your primary residence and costs under $350,000, you may qualify for a GST new housing rebate of up to $6,300. For homes between $350,000 and $450,000, a partial rebate applies. Homes over $450,000 receive no rebate. Always confirm with your accountant, as assignment purchases and presales have different tax treatments.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is a PDI inspection on a new home?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'PDI stands for Pre-Delivery Inspection. It is a walk-through with the builder before you take possession, where you document any deficiencies — scratches, missing fixtures, incomplete finishes — in a PDI form. Builders are required to remedy items noted on the PDI before or shortly after possession. Bring a detailed checklist and consider hiring an independent home inspector to attend with you.',
      },
    },
    {
      '@type': 'Question',
      name: 'What are the best areas for new homes in South Surrey?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Grandview Heights leads South Surrey for new construction volume, with active condo towers, townhouse complexes, and detached homes near Morgan Crossing. Pacific Douglas is the most rapidly developing area for detached new builds, with large lots and newer street infrastructure. Sunnyside Park offers affordable new townhouses and entry-level detached homes with good school access. All three areas are within 10 minutes of Highway 99.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I buy a presale condo in South Surrey?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Several presale condo and townhouse projects have launched in Grandview Heights and Pacific Douglas in recent years. Presale units are not listed on MLS — they are sold directly by developers, often through a small network of REALTOR® connections. Randy Dyck works directly with developers to provide early access to presale opportunities before they go to the public. Contact Randy to be placed on his presale alert list.',
      },
    },
  ],
}

const breadcrumbSchema = (domain: string) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `https://${domain}/` },
    { '@type': 'ListItem', position: 2, name: 'New Construction', item: `https://${domain}/new-construction` },
  ],
})

const BURNABY_NEIGHBOURHOOD_CARDS = [
  {
    slug: 'metrotown',
    listingsSlug: 'metrotown',
    label: 'Metrotown',
    tagline: "Burnaby's high-rise new-build epicentre",
    description: 'The highest concentration of new concrete towers in Burnaby. Steps from Metropolis at Metrotown and SkyTrain — ideal for investors and owner-occupiers who want walkable urban living with strong rental demand.',
    priceRange: '$649K – $1.6M',
    types: 'Condos · Sub-penthouses',
  },
  {
    slug: 'brentwood-park',
    listingsSlug: 'brentwood-park',
    label: 'Brentwood Park',
    tagline: 'Transit-oriented master-planned community',
    description: "The Amazing Brentwood and Solo District have transformed this neighbourhood into one of Metro Vancouver's most active presale markets. New towers, retail podiums, and direct SkyTrain access at Brentwood Town Centre.",
    priceRange: '$699K – $1.8M',
    types: 'Condos · Townhouses',
  },
  {
    slug: 'highgate',
    listingsSlug: 'highgate',
    label: 'Highgate',
    tagline: "South Burnaby's growing new-build hub",
    description: 'Newer mid-rise and low-rise buildings sit alongside established single-family homes. A quieter alternative to Metrotown with strong school catchments and proximity to Edmonds SkyTrain.',
    priceRange: '$599K – $1.3M',
    types: 'Condos · Townhouses',
  },
  {
    slug: 'south-slope',
    listingsSlug: 'south-slope',
    label: 'South Slope',
    tagline: 'Views and spacious new detached homes',
    description: 'Elevated lots with mountain and city views across the south Burnaby hillside. New custom detached homes on large lots — sought-after for families wanting Burnaby addresses and top school access.',
    priceRange: '$1.4M – $3.2M',
    types: 'Detached · Townhouses',
  },
  {
    slug: 'edmonds',
    listingsSlug: 'edmonds',
    label: 'Edmonds',
    tagline: 'Emerging SkyTrain-adjacent value play',
    description: "Under-the-radar new construction near Edmonds Station on the Expo Line. Best entry prices for new builds in Burnaby — attracting first-time buyers and investors ahead of the neighbourhood's continued intensification.",
    priceRange: '$549K – $1.1M',
    types: 'Condos · Low-rise',
  },
  {
    slug: 'burnaby-lake',
    listingsSlug: 'burnaby-lake',
    label: 'Burnaby Lake',
    tagline: 'Quiet enclave with new family homes',
    description: 'Bordering Burnaby Lake Regional Park — a nature-surrounded neighbourhood where new detached homes and townhouses offer space and greenery rarely found this close to Vancouver.',
    priceRange: '$1.2M – $2.6M',
    types: 'Detached · Townhouses',
  },
]

const burnabyFaqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is there GST on new construction in BC?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. New homes in BC are subject to 5% GST on top of the purchase price. If the home is your primary residence and costs under $350,000, you may qualify for a GST new housing rebate of up to $6,300. For homes between $350,000 and $450,000, a partial rebate applies. Homes over $450,000 receive no rebate. Always confirm with your accountant, as assignment purchases and presales have different tax treatments.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is a PDI inspection on a new home?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'PDI stands for Pre-Delivery Inspection. It is a walk-through with the builder before you take possession, where you document any deficiencies — scratches, missing fixtures, incomplete finishes — in a PDI form. Builders are required to remedy items noted on the PDI before or shortly after possession. Bring a detailed checklist and consider hiring an independent home inspector to attend with you.',
      },
    },
    {
      '@type': 'Question',
      name: 'What are the best areas for new homes in Burnaby?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Brentwood Park leads Burnaby for new presale towers, driven by The Amazing Brentwood development and direct SkyTrain access. Metrotown offers the highest volume of completed new condos with exceptional walkability scores. South Slope is preferred for spacious new detached homes with panoramic views. Highgate and Edmonds offer more accessible price points for new condos and townhouses, both close to SkyTrain.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I buy a presale condo in Burnaby?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Burnaby — particularly Brentwood and Metrotown — has one of the most active presale condo markets in Metro Vancouver. Presale units are sold directly by developers through a selected group of REALTOR® representatives, often months or years before completion. Contact Saeed Farhani to be placed on the presale alert list and get early access to upcoming Burnaby launches.',
      },
    },
  ],
}

const TRICITY_NEIGHBOURHOOD_CARDS = [
  {
    slug: 'burke-mountain',
    label: 'Burke Mountain',
    tagline: "Coquitlam's most active new-build corridor",
    description: "The Tri-Cities' fastest-growing neighbourhood for detached new builds. Large lots, brand-new streets, and spectacular mountain views — drawing families priced out of Burnaby and Vancouver.",
    priceRange: '$1.1M – $2.8M',
    types: 'Detached · Townhouses',
  },
  {
    slug: 'north-coquitlam',
    label: 'North Coquitlam',
    tagline: 'SkyTrain-adjacent tower district',
    description: 'High-rise condos and mixed-use towers within walking distance of Lincoln SkyTrain Station. The Tri-Cities hub for presale launches and new concrete towers — strong investor and first-time buyer demand.',
    priceRange: '$549K – $1.3M',
    types: 'Condos · Sub-penthouses',
  },
  {
    slug: 'westwood-plateau',
    label: 'Westwood Plateau',
    tagline: 'Views and premium family homes',
    description: 'Elevated Coquitlam plateau with panoramic Fraser Valley and mountain views. New custom detached homes on generous lots — top school catchments and quiet streets in a well-established community.',
    priceRange: '$1.3M – $3.0M',
    types: 'Detached · Townhouses',
  },
  {
    slug: 'port-moody-centre',
    label: 'Port Moody Centre',
    tagline: 'Evergreen Line with boutique new builds',
    description: 'Rocky Point and the Evergreen SkyTrain extension have transformed Port Moody Centre. New mid-rise condos, boutique townhouse projects, and a vibrant arts district — one of Metro Vancouver\'s most liveable new-build areas.',
    priceRange: '$699K – $1.6M',
    types: 'Condos · Townhouses',
  },
  {
    slug: 'riverwood',
    label: 'Riverwood',
    tagline: 'Family-friendly new townhouses',
    description: 'Port Coquitlam\'s premier new townhouse neighbourhood. Quiet, tree-lined streets near the Coquitlam River — a top choice for young families seeking more space than a condo at a price below Coquitlam.',
    priceRange: '$849K – $1.4M',
    types: 'Townhouses · Detached',
  },
  {
    slug: 'central-coquitlam',
    label: 'Central Coquitlam',
    tagline: 'Established area with infill new builds',
    description: "Mature neighbourhood undergoing infill redevelopment. New duplexes, coach houses, and small townhouse complexes sit alongside older single-family homes — an accessible entry point to Coquitlam's new-build market.",
    priceRange: '$749K – $1.5M',
    types: 'Townhouses · Duplexes',
  },
]

const tricityFaqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is there GST on new construction in BC?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. New homes in BC are subject to 5% GST on top of the purchase price. If the home is your primary residence and costs under $350,000, you may qualify for a GST new housing rebate of up to $6,300. For homes between $350,000 and $450,000, a partial rebate applies. Homes over $450,000 receive no rebate. Always confirm with your accountant, as assignment purchases and presales have different tax treatments.',
      },
    },
    {
      '@type': 'Question',
      name: 'What are the best areas for new homes in the Tri-Cities?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Burke Mountain in Coquitlam leads the Tri-Cities for new detached home construction, offering large lots and mountain views at prices below comparable West Vancouver or Burnaby addresses. North Coquitlam near Lincoln SkyTrain is the top area for new condo towers and presales. Port Moody Centre offers boutique new builds with SkyTrain access on the Evergreen Line. Riverwood in Port Coquitlam is the best-value area for new townhouses.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I buy a presale condo in the Tri-Cities?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. North Coquitlam near Lincoln Station is the most active presale market in the Tri-Cities, with multiple tower launches per year. Presale units are not listed on MLS — they are sold directly by developers through a small group of REALTOR® connections. Contact your local Tri-Cities agent to be added to the presale alert list and receive early access to upcoming launches.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is a PDI inspection on a new home?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'PDI stands for Pre-Delivery Inspection. It is a walk-through with the builder before you take possession, where you document any deficiencies — scratches, missing fixtures, incomplete finishes — in a PDI form. Builders are required to remedy items noted on the PDI before or shortly after possession. Bring a detailed checklist and consider hiring an independent home inspector to attend with you.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does the SkyTrain Evergreen Line affect new construction values in the Tri-Cities?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Evergreen Extension (Coquitlam Central, Lincoln, Lafarge Lake–Douglas, Coquitlam Centre, and Port Moody Centre stations) has significantly increased demand for new condos and townhouses within walking distance of stations. Properties near Lincoln Station and Coquitlam Centre command a transit premium — buyers gain access to downtown Vancouver in under 40 minutes, making Tri-Cities new builds one of the best transit-accessible value plays in Metro Vancouver.',
      },
    },
  ],
}

const NEIGHBOURHOOD_CARDS = [
  {
    slug: 'grandview-heights',
    listingsSlug: 'grandview-heights',
    label: 'Grandview Heights',
    tagline: "South Surrey's most active new-build hub",
    description: 'Concrete towers and townhouse complexes rising near Morgan Crossing. Top schools, Hwy 99 access, and 167+ acres of greenspace make Grandview the go-to for new condo and townhouse buyers.',
    priceRange: '$699K – $1.8M',
    types: 'Condos · Townhouses · Detached',
  },
  {
    slug: 'pacific-douglas',
    listingsSlug: 'pacific-douglas',
    label: 'Pacific Douglas',
    tagline: 'Fast-growing family neighbourhood',
    description: "Bordering Peace Arch park — the fastest-growing part of South Surrey for detached new builds. New streets, new schools, and 4,000–7,000 sq ft lots drawing families priced out of Grandview.",
    priceRange: '$1.1M – $2.4M',
    types: 'Detached · Townhouses',
  },
  {
    slug: 'sunnyside-park',
    listingsSlug: 'sunnyside-park',
    label: 'Sunnyside Park',
    tagline: 'Best-value new builds in South Surrey',
    description: "Entry price for new construction in South Surrey. Townhouse complexes from under $900K and new detached homes from the mid-$1Ms — ideal for first-time new-build buyers.",
    priceRange: '$849K – $1.7M',
    types: 'Townhouses · Detached',
  },
  {
    slug: 'morgan-creek',
    listingsSlug: 'morgan-creek',
    label: 'Morgan Creek',
    tagline: 'Golf course community with new builds',
    description: 'One of South Surrey\'s most prestigious addresses. New detached homes on generous lots alongside the Morgan Creek Golf Course — privacy, mature tree canopy, and top school catchments.',
    priceRange: '$1.4M – $3.2M',
    types: 'Detached',
  },
  {
    slug: 'rosemary-heights',
    listingsSlug: 'rosemary-heights',
    label: 'Rosemary Heights',
    tagline: 'Master-planned with new townhouses',
    description: 'A walkable, master-planned community in central South Surrey. New townhouse projects continue to launch here, minutes from Grandview Corners shopping and Rosemary Heights Elementary.',
    priceRange: '$950K – $1.6M',
    types: 'Townhouses · Detached',
  },
  {
    slug: 'elgin-chantrell',
    listingsSlug: 'elgin-chantrell',
    label: 'Elgin Chantrell',
    tagline: 'Luxury new builds near the inlet',
    description: "South Surrey's most exclusive enclave for luxury new construction. Large estate lots, custom builder homes, and proximity to Crescent Beach make Elgin Chantrell a premium new-build market.",
    priceRange: '$2.2M – $5M+',
    types: 'Detached (luxury)',
  },
]

export default async function NewConstructionPage({ params }: Props) {
  const { slug } = await params
  const agent = await getAgent(slug)
  if (!agent) notFound()
  requireNotShowcase(agent)

  const domain = agentCanonicalBase(agent)

  const isBurnaby  = slug === BURNABY_SLUG
  const isTriCity  = slug === TRICITY_SLUG
  const isRandy    = slug === RANDY_SLUG
  if (!isBurnaby && !isTriCity && !isRandy) {
    notFound()
  }

  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1  // 1–12
  // Show current-year builds; if Jan or Feb, also include previous year
  const newBuildYear = currentMonth <= 2 ? currentYear - 1 : currentYear
  const minYear = newBuildYear

  const { listings, total: newBuildTotal } = await getListings(slug, {
    status: 'Active',
    min_year: minYear,
    sort: 'newest',
    limit: 9,
  })

  if (isBurnaby) {
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(burnabyFaqSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(domain)) }} />

        <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>

          {/* ── Hero ──────────────────────────────────────────────────────────── */}
          <div style={{ position: 'relative', overflow: 'hidden', background: '#0a1628', minHeight: 420 }}>
            <img
              src="https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1600&h=700&fit=crop&q=80"
              alt="New construction condos in Burnaby"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 60%', opacity: 0.4 }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,22,40,0.3) 0%, rgba(10,22,40,0.85) 100%)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="container" style={{ padding: '56px var(--container-padding) 52px' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 12, fontWeight: 500 }}>
                  New Construction
                </div>
                <h1 className={playfair.className} style={{ fontSize: 'clamp(32px,5vw,58px)', fontWeight: 500, lineHeight: 1.08, color: '#fff', margin: '0 0 16px', maxWidth: 700 }}>
                  New Construction Homes<br />in Burnaby
                </h1>
                <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, maxWidth: 600, margin: '0 0 28px' }}>
                  Metrotown, Brentwood Park, and South Slope are driving Burnaby&apos;s new-build boom — concrete towers, transit-oriented townhouses, and custom detached homes built {minYear}–{currentYear}.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <a href={ap('/homes-for-sale')} className="btn-primary" style={{ borderRadius: 6 }}>
                    Browse New Builds →
                  </a>
                  <a href={ap('/contact')} style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', padding: '12px 24px', borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.25)' }}>
                    Ask About Presales
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* ── Quick-fact strip ──────────────────────────────────────────────── */}
          <div style={{ background: 'var(--primary-bg)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="container" style={{ padding: '0 var(--container-padding)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, overflowX: 'auto' }}>
                {[
                  { icon: '🏗️', label: `Built ${minYear}–${currentYear}`, sub: 'Active MLS® filter' },
                  { icon: '💰', label: '5% GST', sub: 'Applies to all new homes' },
                  { icon: '🚇', label: 'SkyTrain access', sub: 'Expo & Millennium lines' },
                  { icon: '📋', label: 'PDI walk-through', sub: 'Before possession' },
                  { icon: '🛡️', label: '2-5-10 Warranty', sub: 'BC Housing required' },
                ].map(f => (
                  <div key={f.label} style={{ padding: '18px 28px', borderRight: '1px solid rgba(255,255,255,0.1)', minWidth: 140, flexShrink: 0 }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{f.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{f.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Main layout ───────────────────────────────────────────────────── */}
          <div className="container" style={{ padding: '48px var(--container-padding) 80px' }}>
            <div id="nc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr min(320px,100%)', gap: '48px 56px', alignItems: 'start' }}>

              {/* ── Main column ───────────────────────────────────────────────── */}
              <div>

                {/* Burnaby New-Build Landscape */}
                <section style={{ marginBottom: 52 }}>
                  <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: 'var(--primary-bg)', margin: '0 0 20px', lineHeight: 1.2 }}>
                    Burnaby&apos;s New-Build Landscape
                  </h2>
                  <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.85 }}>
                    <p style={{ marginTop: 0 }}>
                      Burnaby sits at the centre of Metro Vancouver&apos;s most ambitious transit-oriented development push. The Expo and Millennium SkyTrain lines run through the city&apos;s core, anchoring master-planned communities like The Amazing Brentwood and the ongoing Metrotown redevelopment — producing hundreds of new presale and completed condos every year.
                    </p>
                    <p>
                      Beyond the towers, South Slope and Burnaby Lake offer new custom detached homes on generous lots — a rare combination of single-family space and urban proximity within the city.
                    </p>
                  </div>
                </section>

                {/* Neighbourhood cards */}
                <section style={{ marginBottom: 52 }}>
                  <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: 'var(--primary-bg)', margin: '0 0 20px', lineHeight: 1.2 }}>
                    New Construction by Neighbourhood
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                    {BURNABY_NEIGHBOURHOOD_CARDS.map(n => (
                      <div key={n.slug} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 6 }}>{n.tagline}</div>
                        <div className={playfair.className} style={{ fontSize: 20, fontWeight: 500, color: 'var(--primary-bg)', marginBottom: 10, lineHeight: 1.2 }}>{n.label}</div>
                        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.75, margin: '0 0 16px', flex: 1 }}>{n.description}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                          <div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{n.types}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-bg)' }}>{n.priceRange}</div>
                          </div>
                          <a href={ap(`/homes-for-sale/${n.listingsSlug}/built-${newBuildYear}`)} style={{ background: 'var(--primary-bg)', color: '#fff', padding: '9px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            New builds →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Live listing strip */}
                <section style={{ marginBottom: 52 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 6 }}>Active MLS®</div>
                      <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: 'var(--primary-bg)', margin: 0, lineHeight: 1.2 }}>
                        {newBuildTotal > 0
                          ? `${newBuildTotal} New Home${newBuildTotal === 1 ? '' : 's'} for Sale`
                          : 'New Homes for Sale'}
                      </h2>
                    </div>
                    <a href={ap('/homes-for-sale')} style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                      See all new builds →
                    </a>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 24px' }}>
                    Homes built {minYear} or later, currently active on MLS®.
                  </p>
                  {listings.length > 0 ? (
                    <ListingStrip listings={listings} />
                  ) : (
                    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '32px', textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
                        No new builds from {minYear}+ currently on MLS® — <a href={ap('/homes-for-sale')} style={{ color: 'var(--brand-accent)', textDecoration: 'none', fontWeight: 600 }}>browse all active homes</a> or <a href={ap('/contact')} style={{ color: 'var(--brand-accent)', textDecoration: 'none', fontWeight: 600 }}>ask about presales</a>.
                      </p>
                    </div>
                  )}
                </section>

                {/* What to know about buying new */}
                <section style={{ background: 'var(--primary-bg)', borderRadius: 8, padding: '36px', marginBottom: 52, color: '#fff' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 10 }}>Buyer&apos;s Guide</div>
                  <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: '#fff', margin: '0 0 24px', lineHeight: 1.2 }}>
                    What to Know Before Buying New in Burnaby
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                    {[
                      {
                        heading: 'GST — Budget for 5%',
                        body: 'All new homes in BC attract 5% GST on top of the purchase price. For primary residences under $350K, a partial or full rebate applies. Talk to your accountant before writing the offer.',
                      },
                      {
                        heading: 'PDI Before Possession',
                        body: 'Your Pre-Delivery Inspection is your chance to document every scratch, missing fixture, and incomplete finish before you take keys. Bring a detailed checklist — builders must remedy PDI items.',
                      },
                      {
                        heading: 'Assignments & Presales',
                        body: 'Burnaby — especially Brentwood and Metrotown — has one of the most active presale and assignment markets in Metro Vancouver. Locking in early-launch pricing in a rising tower is a proven strategy here.',
                      },
                      {
                        heading: 'New Home Warranty',
                        body: 'BC\'s Homeowner Protection Act requires 2-5-10 warranty coverage: 2 years on labour/materials, 5 years on building envelope, 10 years on structural. Confirm your builder is licensed with BC Housing.',
                      },
                    ].map(item => (
                      <div key={item.heading} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--brand-accent)', marginBottom: 8 }}>{item.heading}</div>
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.75, margin: 0 }}>{item.body}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Pre-sales & Assignments */}
                <section style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '36px', marginBottom: 52, background: '#fff' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 10 }}>Off-Market</div>
                  <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: 'var(--primary-bg)', margin: '0 0 16px', lineHeight: 1.2 }}>
                    Presales &amp; Assignments in Burnaby
                  </h2>
                  <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.85 }}>
                    <p style={{ marginTop: 0 }}>
                      Presale properties are not listed on MLS® — developers sell them directly through a selected group of REALTOR® representatives. Once a project sells out or launches publicly, the best units and pricing are already gone.
                    </p>
                    <p>
                      Saeed Farhani maintains direct relationships with developers active in Brentwood Park, Metrotown, and Highgate. Contact Saeed to be placed on his presale alert list and receive early access to upcoming Burnaby launches.
                    </p>
                  </div>
                  <a href={ap('/contact')} className="btn-primary" style={{ borderRadius: 6 }}>
                    Get Presale Access
                  </a>
                </section>

                {/* FAQ */}
                <section style={{ marginBottom: 52 }}>
                  <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: 'var(--primary-bg)', margin: '0 0 20px', lineHeight: 1.2 }}>
                    Frequently Asked Questions
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    {burnabyFaqSchema.mainEntity.map((faq, i) => (
                      <details key={faq.name} style={{ background: '#fff', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                        <summary style={{ padding: '18px 22px', fontWeight: 600, fontSize: 15, color: 'var(--primary-bg)', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                          {faq.name}
                          <span style={{ color: 'var(--brand-accent)', fontSize: 20, flexShrink: 0, lineHeight: 1 }}>+</span>
                        </summary>
                        <div style={{ padding: '0 22px 18px', color: 'var(--text)', fontSize: 14, lineHeight: 1.85 }}>
                          {faq.acceptedAnswer.text}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>

                {/* Internal links */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '22px 24px', background: '#fff' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-bg)', marginBottom: 14 }}>Keep Exploring</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {[
                      { label: 'All Homes For Sale', href: ap('/homes-for-sale') },
                      { label: 'Metrotown Homes', href: ap('/homes-for-sale/metrotown') },
                      { label: 'Brentwood Park Homes', href: ap('/homes-for-sale/brentwood-park') },
                      { label: 'South Slope Homes', href: ap('/homes-for-sale/south-slope') },
                      { label: 'Neighbourhood Guide', href: ap('/neighbourhoods') },
                      { label: 'Market Reports', href: ap('/market') },
                      { label: 'Free Home Evaluation', href: ap('/home-evaluation') },
                    ].map(l => (
                      <a key={l.href} href={l.href}
                        style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}>
                        {l.label}
                      </a>
                    ))}
                  </div>
                </div>

              </div>

              {/* ── Sidebar ────────────────────────────────────────────────────── */}
              <div style={{ position: 'sticky', top: 24 }}>

                <div style={{ background: 'var(--primary-bg)', borderRadius: 8, padding: '24px 22px', marginBottom: 20, color: '#fff' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 8 }}>Burnaby New Construction Expert</div>
                  <div className={playfair.className} style={{ fontSize: 20, fontWeight: 500, marginBottom: 10 }}>{agent.name}</div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: '0 0 18px' }}>
                    Specialising in Burnaby new construction, presales, and assignments. Direct developer relationships in Brentwood Park, Metrotown, and Highgate.
                  </p>
                  <a href={ap('/contact')} className="btn-primary" style={{ display: 'block', borderRadius: 6, textAlign: 'center', marginBottom: 10 }}>
                    Get in Touch
                  </a>
                  <a href={ap('/homes-for-sale')} style={{ display: 'block', background: 'rgba(255,255,255,0.10)', color: '#fff', padding: '11px 0', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                    Browse New Builds
                  </a>
                </div>

                {/* Quick area links */}
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 22px', marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-bg)', marginBottom: 12 }}>Jump to Neighbourhood</div>
                  {BURNABY_NEIGHBOURHOOD_CARDS.map((n, i) => (
                    <a key={n.slug} href={ap(`/homes-for-sale/${n.slug}/built-${newBuildYear}`)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < BURNABY_NEIGHBOURHOOD_CARDS.length - 1 ? '1px solid var(--border)' : 'none', textDecoration: 'none' }}>
                      <span style={{ fontSize: 13.5, color: 'var(--text)' }}>{n.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--brand-accent)', fontWeight: 600 }}>→</span>
                    </a>
                  ))}
                  <a href={ap('/neighbourhoods')} style={{ display: 'block', fontSize: 12, color: '#888', paddingTop: 12, textDecoration: 'none', textAlign: 'center' }}>
                    All Neighbourhoods →
                  </a>
                </div>

                {/* Home evaluation CTA */}
                <div style={{ background: 'var(--off-white)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 22px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-bg)', marginBottom: 8 }}>What&apos;s Your Home Worth?</div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 14px' }}>
                    Burnaby new builds have seen strong appreciation. Get a current market valuation.
                  </p>
                  <a href={ap('/home-evaluation')} style={{ display: 'block', background: 'var(--primary-bg)', color: '#fff', padding: '10px 0', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none', textAlign: 'center' }}>
                    Free Home Evaluation
                  </a>
                </div>

              </div>

            </div>
          </div>

        </div>

        <style>{`
          @media (max-width: 860px) {
            #nc-grid { grid-template-columns: 1fr !important; }
          }
          details summary::-webkit-details-marker { display: none; }
        `}</style>
      </>
    )
  }

  if (isTriCity) {
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tricityFaqSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(domain)) }} />

        <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>

          {/* Hero */}
          <div style={{ position: 'relative', overflow: 'hidden', background: '#0a1628', minHeight: 420 }}>
            <img
              src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&h=700&fit=crop&q=80"
              alt="New construction homes in the Tri-Cities"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 60%', opacity: 0.4 }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,22,40,0.3) 0%, rgba(10,22,40,0.85) 100%)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="container" style={{ padding: '56px var(--container-padding) 52px' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 12, fontWeight: 500 }}>New Construction</div>
                <h1 className={playfair.className} style={{ fontSize: 'clamp(32px,5vw,58px)', fontWeight: 500, lineHeight: 1.08, color: '#fff', margin: '0 0 16px', maxWidth: 700 }}>
                  New Construction Homes<br />in the Tri-Cities
                </h1>
                <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, maxWidth: 600, margin: '0 0 28px' }}>
                  Burke Mountain, North Coquitlam, and Port Moody Centre are driving the Tri-Cities&apos; new-build boom — detached homes, SkyTrain-adjacent towers, and family townhouses built {minYear}–{currentYear}.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <a href={ap('/homes-for-sale')} className="btn-primary" style={{ borderRadius: 6 }}>Browse New Builds →</a>
                  <a href={ap('/contact')} style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', padding: '12px 24px', borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.25)' }}>Ask About Presales</a>
                </div>
              </div>
            </div>
          </div>

          {/* Quick-fact strip */}
          <div style={{ background: 'var(--primary-bg)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="container" style={{ padding: '0 var(--container-padding)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, overflowX: 'auto' }}>
                {[
                  { icon: '🏗️', label: `Built ${minYear}–${currentYear}`, sub: 'Active MLS® filter' },
                  { icon: '💰', label: '5% GST', sub: 'Applies to all new homes' },
                  { icon: '🚇', label: 'Evergreen SkyTrain', sub: 'Expo + Millennium lines' },
                  { icon: '📋', label: 'PDI walk-through', sub: 'Before possession' },
                  { icon: '🛡️', label: '2-5-10 Warranty', sub: 'BC Housing required' },
                ].map(f => (
                  <div key={f.label} style={{ padding: '18px 28px', borderRight: '1px solid rgba(255,255,255,0.1)', minWidth: 140, flexShrink: 0 }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{f.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{f.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main layout */}
          <div className="container" style={{ padding: '48px var(--container-padding) 80px' }}>
            <div id="nc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr min(320px,100%)', gap: '48px 56px', alignItems: 'start' }}>

              <div>
                <section style={{ marginBottom: 52 }}>
                  <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: 'var(--primary-bg)', margin: '0 0 20px', lineHeight: 1.2 }}>
                    The Tri-Cities New-Build Landscape
                  </h2>
                  <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.85 }}>
                    <p style={{ marginTop: 0 }}>Coquitlam, Port Coquitlam, and Port Moody together form one of the most active new-construction markets in Metro Vancouver. Burke Mountain alone has produced thousands of new detached homes and townhouses over the past decade, while North Coquitlam near Lincoln SkyTrain Station continues to attract major condo tower launches.</p>
                    <p>The Evergreen Extension — connecting the Tri-Cities directly to Vancouver via the Millennium Line — has made the area a top destination for buyers seeking transit access, family-friendly neighbourhoods, and new-build quality at prices well below Burnaby and Vancouver.</p>
                  </div>
                </section>

                <section style={{ marginBottom: 52 }}>
                  <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: 'var(--primary-bg)', margin: '0 0 20px', lineHeight: 1.2 }}>New Construction by Neighbourhood</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                    {TRICITY_NEIGHBOURHOOD_CARDS.map(n => (
                      <div key={n.slug} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 6 }}>{n.tagline}</div>
                        <div className={playfair.className} style={{ fontSize: 20, fontWeight: 500, color: 'var(--primary-bg)', marginBottom: 10, lineHeight: 1.2 }}>{n.label}</div>
                        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.75, margin: '0 0 16px', flex: 1 }}>{n.description}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                          <div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{n.types}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-bg)' }}>{n.priceRange}</div>
                          </div>
                          <a href={ap(`/homes-for-sale/${n.slug}/built-${newBuildYear}`)} style={{ background: 'var(--primary-bg)', color: '#fff', padding: '9px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>New builds →</a>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section style={{ marginBottom: 52 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 6 }}>Active MLS®</div>
                      <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: 'var(--primary-bg)', margin: 0, lineHeight: 1.2 }}>
                        {newBuildTotal > 0 ? `${newBuildTotal} New Home${newBuildTotal === 1 ? '' : 's'} for Sale` : 'New Homes for Sale'}
                      </h2>
                    </div>
                    <a href={ap('/homes-for-sale')} style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>See all new builds →</a>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 24px' }}>Homes built {minYear} or later, currently active on MLS®.</p>
                  {listings.length > 0 ? <ListingStrip listings={listings} /> : (
                    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '32px', textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
                        No new builds from {minYear}+ currently on MLS® — <a href={ap('/homes-for-sale')} style={{ color: 'var(--brand-accent)', textDecoration: 'none', fontWeight: 600 }}>browse all active homes</a> or <a href={ap('/contact')} style={{ color: 'var(--brand-accent)', textDecoration: 'none', fontWeight: 600 }}>ask about presales</a>.
                      </p>
                    </div>
                  )}
                </section>

                <section style={{ background: 'var(--primary-bg)', borderRadius: 8, padding: '36px', marginBottom: 52, color: '#fff' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 10 }}>Buyer&apos;s Guide</div>
                  <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: '#fff', margin: '0 0 24px', lineHeight: 1.2 }}>What to Know Before Buying New in the Tri-Cities</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                    {[
                      { heading: 'GST — Budget for 5%', body: 'All new homes in BC attract 5% GST on top of the purchase price. For primary residences under $350K, a partial or full rebate applies. Talk to your accountant before writing the offer.' },
                      { heading: 'PDI Before Possession', body: 'Your Pre-Delivery Inspection is your chance to document every scratch, missing fixture, and incomplete finish before you take keys. Bring a detailed checklist — builders must remedy PDI items.' },
                      { heading: 'Presales & Assignments', body: 'North Coquitlam near Lincoln SkyTrain is the Tri-Cities\' most active presale market. Locking in presale pricing in a rising tower is a proven strategy — contact your agent for developer connections.' },
                      { heading: 'New Home Warranty', body: 'BC\'s Homeowner Protection Act requires 2-5-10 warranty coverage: 2 years on labour/materials, 5 years on building envelope, 10 years on structural. Confirm your builder is licensed with BC Housing.' },
                    ].map(item => (
                      <div key={item.heading} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--brand-accent)', marginBottom: 8 }}>{item.heading}</div>
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.75, margin: 0 }}>{item.body}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '36px', marginBottom: 52, background: '#fff' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 10 }}>Off-Market</div>
                  <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: 'var(--primary-bg)', margin: '0 0 16px', lineHeight: 1.2 }}>Presales &amp; Assignments in the Tri-Cities</h2>
                  <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.85 }}>
                    <p style={{ marginTop: 0 }}>Presale properties are not listed on MLS® — developers sell them directly through a selected group of REALTOR® representatives. Once a project sells out or launches publicly, the best units and pricing are already gone.</p>
                    <p>{agent.name} maintains direct relationships with developers active in North Coquitlam, Burke Mountain, and Port Moody Centre. Contact {agent.name} to be placed on the presale alert list and receive early access to upcoming Tri-Cities launches.</p>
                  </div>
                  <a href={ap('/contact')} className="btn-primary" style={{ borderRadius: 6 }}>Get Presale Access</a>
                </section>

                <section style={{ marginBottom: 52 }}>
                  <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: 'var(--primary-bg)', margin: '0 0 20px', lineHeight: 1.2 }}>Frequently Asked Questions</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    {tricityFaqSchema.mainEntity.map((faq, i) => (
                      <details key={faq.name} style={{ background: '#fff', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                        <summary style={{ padding: '18px 22px', fontWeight: 600, fontSize: 15, color: 'var(--primary-bg)', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                          {faq.name}<span style={{ color: 'var(--brand-accent)', fontSize: 20, flexShrink: 0, lineHeight: 1 }}>+</span>
                        </summary>
                        <div style={{ padding: '0 22px 18px', color: 'var(--text)', fontSize: 14, lineHeight: 1.85 }}>{faq.acceptedAnswer.text}</div>
                      </details>
                    ))}
                  </div>
                </section>

                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '22px 24px', background: '#fff' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-bg)', marginBottom: 14 }}>Keep Exploring</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {[
                      { label: 'All Homes For Sale', href: ap('/homes-for-sale') },
                      { label: 'Burke Mountain Homes', href: ap('/homes-for-sale/burke-mountain') },
                      { label: 'North Coquitlam Homes', href: ap('/homes-for-sale/north-coquitlam') },
                      { label: 'Port Moody Centre Homes', href: ap('/homes-for-sale/port-moody-centre') },
                      { label: 'Market Stats', href: ap('/market') },
                      { label: 'Free Home Evaluation', href: ap('/home-evaluation') },
                    ].map(l => (
                      <a key={l.href} href={l.href} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}>{l.label}</a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div style={{ position: 'sticky', top: 24 }}>
                <div style={{ background: 'var(--primary-bg)', borderRadius: 8, padding: '24px 22px', marginBottom: 20, color: '#fff' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 8 }}>Tri-Cities New Construction Expert</div>
                  <div className={playfair.className} style={{ fontSize: 20, fontWeight: 500, marginBottom: 10 }}>{agent.name}</div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: '0 0 18px' }}>Specialising in Tri-Cities new construction, presales, and assignments. Direct developer relationships in North Coquitlam, Burke Mountain, and Port Moody.</p>
                  <a href={ap('/contact')} className="btn-primary" style={{ display: 'block', borderRadius: 6, textAlign: 'center', marginBottom: 10 }}>Get in Touch</a>
                  <a href={ap('/homes-for-sale')} style={{ display: 'block', background: 'rgba(255,255,255,0.10)', color: '#fff', padding: '11px 0', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>Browse New Builds</a>
                </div>
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 22px', marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-bg)', marginBottom: 12 }}>Jump to Neighbourhood</div>
                  {TRICITY_NEIGHBOURHOOD_CARDS.map((n, i) => (
                    <a key={n.slug} href={ap(`/homes-for-sale/${n.slug}/built-${newBuildYear}`)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < TRICITY_NEIGHBOURHOOD_CARDS.length - 1 ? '1px solid var(--border)' : 'none', textDecoration: 'none' }}>
                      <span style={{ fontSize: 13.5, color: 'var(--text)' }}>{n.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--brand-accent)', fontWeight: 600 }}>→</span>
                    </a>
                  ))}
                </div>
                <div style={{ background: 'var(--off-white)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 22px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-bg)', marginBottom: 8 }}>What&apos;s Your Home Worth?</div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 14px' }}>Tri-Cities new builds have seen strong appreciation. Get a current market valuation.</p>
                  <a href={ap('/home-evaluation')} style={{ display: 'block', background: 'var(--primary-bg)', color: '#fff', padding: '10px 0', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none', textAlign: 'center' }}>Free Home Evaluation</a>
                </div>
              </div>

            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 860px) {
            #nc-grid { grid-template-columns: 1fr !important; }
          }
          details summary::-webkit-details-marker { display: none; }
        `}</style>
      </>
    )
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(domain)) }} />

      <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div style={{ position: 'relative', overflow: 'hidden', background: '#0a1628', minHeight: 420 }}>
          <img
            src="https://images.unsplash.com/photo-1560185007-5f0bb1866cab?w=1600&h=700&fit=crop&q=80"
            alt="New construction homes in South Surrey"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 60%', opacity: 0.4 }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,22,40,0.3) 0%, rgba(10,22,40,0.85) 100%)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="container" style={{ padding: '56px var(--container-padding) 52px' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 12, fontWeight: 500 }}>
                New Construction
              </div>
              <h1 className={playfair.className} style={{ fontSize: 'clamp(32px,5vw,58px)', fontWeight: 500, lineHeight: 1.08, color: '#fff', margin: '0 0 16px', maxWidth: 700 }}>
                New Homes &amp; New Construction<br />in South Surrey
              </h1>
              <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, maxWidth: 600, margin: '0 0 28px' }}>
                Grandview Heights, Pacific Douglas, and Sunnyside Park are the Lower Mainland&apos;s most active new-build neighbourhoods outside Vancouver. Built in {minYear}–{currentYear} and still moving fast.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href={ap('/homes-for-sale')} className="btn-primary" style={{ borderRadius: 6 }}>
                  Browse New Builds →
                </a>
                <a href={ap('/contact')} style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', padding: '12px 24px', borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.25)' }}>
                  Ask About Presales
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick-fact strip ──────────────────────────────────────────────── */}
        <div style={{ background: 'var(--primary-bg)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="container" style={{ padding: '0 var(--container-padding)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, overflowX: 'auto' }}>
              {[
                { icon: '🏗️', label: `Built ${minYear}–${currentYear}`, sub: 'Active MLS® filter' },
                { icon: '💰', label: '5% GST', sub: 'Applies to all new homes' },
                { icon: '🔑', label: 'Presales off-MLS', sub: 'Contact Randy for access' },
                { icon: '📋', label: 'PDI walk-through', sub: 'Before possession' },
                { icon: '🛡️', label: '2-5-10 Warranty', sub: 'BC Housing required' },
              ].map(f => (
                <div key={f.label} style={{ padding: '18px 28px', borderRight: '1px solid rgba(255,255,255,0.1)', minWidth: 140, flexShrink: 0 }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{f.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{f.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main layout ───────────────────────────────────────────────────── */}
        <div className="container" style={{ padding: '48px var(--container-padding) 80px' }}>
          <div id="nc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr min(320px,100%)', gap: '48px 56px', alignItems: 'start' }}>

            {/* ── Main column ───────────────────────────────────────────────── */}
            <div>

              {/* South Surrey New-Build Landscape */}
              <section style={{ marginBottom: 52 }}>
                <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: 'var(--primary-bg)', margin: '0 0 20px', lineHeight: 1.2 }}>
                  South Surrey&apos;s New-Build Landscape
                </h2>
                <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.85 }}>
                  <p style={{ marginTop: 0 }}>
                    South Surrey is one of the Lower Mainland&apos;s last large-lot, master-planned growth corridors. While Vancouver and Burnaby are largely built out, neighbourhoods like Grandview Heights, Pacific Douglas, and Sunnyside Park still have active land parcels being developed into single-family homes, townhouse complexes, and mid-rise condo buildings.
                  </p>
                  <p>
                    The result: a range of new-construction options from purpose-built townhouses in the high $800Ks to large custom-built detached homes exceeding $3M — all within 35 minutes of Vancouver via Hwy 99.
                  </p>
                </div>
              </section>

              {/* Neighbourhood cards */}
              <section style={{ marginBottom: 52 }}>
                <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: 'var(--primary-bg)', margin: '0 0 20px', lineHeight: 1.2 }}>
                  New Construction by Neighbourhood
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                  {NEIGHBOURHOOD_CARDS.map(n => (
                    <div key={n.slug} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 6 }}>{n.tagline}</div>
                      <div className={playfair.className} style={{ fontSize: 20, fontWeight: 500, color: 'var(--primary-bg)', marginBottom: 10, lineHeight: 1.2 }}>{n.label}</div>
                      <p style={{ color: '#555', fontSize: 14, lineHeight: 1.75, margin: '0 0 16px', flex: 1 }}>{n.description}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{n.types}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-bg)' }}>{n.priceRange}</div>
                        </div>
                        <a href={ap(`/homes-for-sale/${n.listingsSlug}/built-${newBuildYear}`)} style={{ background: 'var(--primary-bg)', color: '#fff', padding: '9px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          New builds →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Live listing strip */}
              <section style={{ marginBottom: 52 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 6 }}>Active MLS®</div>
                    <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: 'var(--primary-bg)', margin: 0, lineHeight: 1.2 }}>
                      {newBuildTotal > 0
                        ? `${newBuildTotal} New Home${newBuildTotal === 1 ? '' : 's'} for Sale`
                        : 'New Homes for Sale'}
                    </h2>
                  </div>
                  <a href={ap('/homes-for-sale')} style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    See all new builds →
                  </a>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 24px' }}>
                  Homes built {minYear} or later, currently active on MLS®.
                </p>
                {listings.length > 0 ? (
                  <ListingStrip listings={listings} />
                ) : (
                  <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '32px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
                      No new builds from {minYear}+ currently on MLS® — <a href={ap('/homes-for-sale')} style={{ color: 'var(--brand-accent)', textDecoration: 'none', fontWeight: 600 }}>browse all active homes</a> or <a href={ap('/contact')} style={{ color: 'var(--brand-accent)', textDecoration: 'none', fontWeight: 600 }}>ask Randy about presales</a>.
                    </p>
                  </div>
                )}
              </section>

              {/* What to know about buying new */}
              <section style={{ background: 'var(--primary-bg)', borderRadius: 8, padding: '36px', marginBottom: 52, color: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 10 }}>Buyer&apos;s Guide</div>
                <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: '#fff', margin: '0 0 24px', lineHeight: 1.2 }}>
                  What to Know Before Buying New
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                  {[
                    {
                      heading: 'GST — Budget for 5%',
                      body: 'All new homes in BC attract 5% GST on top of the purchase price. For primary residences under $350K, a partial or full rebate applies. Talk to your accountant before writing the offer.',
                    },
                    {
                      heading: 'PDI Before Possession',
                      body: 'Your Pre-Delivery Inspection is your chance to document every scratch, missing fixture, and incomplete finish before you take keys. Bring a detailed checklist — builders must remedy PDI items.',
                    },
                    {
                      heading: 'Assignments & Presales',
                      body: 'Presale condos let you lock in today\'s price for a home delivered 1–3 years from now. Assignment sales let an original buyer transfer their contract to you mid-construction — a growing market in Grandview Heights.',
                    },
                    {
                      heading: 'New Home Warranty',
                      body: 'BC\'s Homeowner Protection Act requires 2-5-10 warranty coverage: 2 years on labour/materials, 5 years on building envelope, 10 years on structural. Confirm your builder is licensed with BC Housing.',
                    },
                  ].map(item => (
                    <div key={item.heading} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--brand-accent)', marginBottom: 8 }}>{item.heading}</div>
                      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.75, margin: 0 }}>{item.body}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Pre-sales & Assignments */}
              <section style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '36px', marginBottom: 52, background: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 10 }}>Off-Market</div>
                <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: 'var(--primary-bg)', margin: '0 0 16px', lineHeight: 1.2 }}>
                  Presales &amp; Assignments
                </h2>
                <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.85 }}>
                  <p style={{ marginTop: 0 }}>
                    Presale properties are not listed on MLS® — developers sell them directly through a selected group of REALTOR® representatives. Once a project sells out or launches publicly, the best units and pricing are already gone.
                  </p>
                  <p>
                    Randy Dyck maintains direct relationships with developers active in Grandview Heights, Pacific Douglas, and Sunnyside Park. If you want early access to upcoming presale launches or to be connected with an assignment opportunity, reach out directly.
                  </p>
                </div>
                <a href={ap('/contact')} className="btn-primary" style={{ borderRadius: 6 }}>
                  Get Presale Access
                </a>
              </section>

              {/* FAQ */}
              <section style={{ marginBottom: 52 }}>
                <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: 'var(--primary-bg)', margin: '0 0 20px', lineHeight: 1.2 }}>
                  Frequently Asked Questions
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  {faqSchema.mainEntity.map((faq, i) => (
                    <details key={faq.name} style={{ background: '#fff', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                      <summary style={{ padding: '18px 22px', fontWeight: 600, fontSize: 15, color: 'var(--primary-bg)', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        {faq.name}
                        <span style={{ color: 'var(--brand-accent)', fontSize: 20, flexShrink: 0, lineHeight: 1 }}>+</span>
                      </summary>
                      <div style={{ padding: '0 22px 18px', color: 'var(--text)', fontSize: 14, lineHeight: 1.85 }}>
                        {faq.acceptedAnswer.text}
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              {/* Internal links */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '22px 24px', background: '#fff' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-bg)', marginBottom: 14 }}>Keep Exploring</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {[
                    { label: 'All Homes For Sale', href: ap('/homes-for-sale') },
                    { label: 'Grandview Heights Homes', href: ap('/homes-for-sale/grandview-heights') },
                    { label: 'Pacific Douglas Homes', href: ap('/homes-for-sale/pacific-douglas') },
                    { label: 'Sunnyside Park Homes', href: ap('/homes-for-sale/sunnyside-park') },
                    { label: 'Grandview Heights Condos', href: ap('/grandview-heights-condos-for-sale') },
                    { label: 'Grandview Heights Townhouses', href: ap('/grandview-heights-townhouses-for-sale') },
                    { label: 'Market Stats', href: ap('/market') },
                    { label: 'Free Home Evaluation', href: ap('/home-evaluation') },
                  ].map(l => (
                    <a key={l.href} href={l.href}
                      style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}>
                      {l.label}
                    </a>
                  ))}
                </div>
              </div>

            </div>

            {/* ── Sidebar ────────────────────────────────────────────────────── */}
            <div style={{ position: 'sticky', top: 24 }}>

              <div style={{ background: 'var(--primary-bg)', borderRadius: 8, padding: '24px 22px', marginBottom: 20, color: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 8 }}>New Construction Expert</div>
                <div className={playfair.className} style={{ fontSize: 20, fontWeight: 500, marginBottom: 10 }}>{agent.name}</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: '0 0 18px' }}>
                  Specialising in South Surrey new construction, presales, and assignments since 2009. Direct developer relationships in Grandview Heights and Pacific Douglas.
                </p>
                <a href={ap('/contact')} className="btn-primary" style={{ display: 'block', borderRadius: 6, textAlign: 'center', marginBottom: 10 }}>
                  Get in Touch
                </a>
                <a href={ap('/homes-for-sale')} style={{ display: 'block', background: 'rgba(255,255,255,0.10)', color: '#fff', padding: '11px 0', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                  Browse New Builds
                </a>
              </div>

              {/* Quick area links */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 22px', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-bg)', marginBottom: 12 }}>Jump to Neighbourhood</div>
                {NEIGHBOURHOOD_CARDS.map((n, i) => (
                  <a key={n.slug} href={ap(`/homes-for-sale/${n.slug}/built-${newBuildYear}`)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < NEIGHBOURHOOD_CARDS.length - 1 ? '1px solid var(--border)' : 'none', textDecoration: 'none' }}>
                    <span style={{ fontSize: 13.5, color: 'var(--text)' }}>{n.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--brand-accent)', fontWeight: 600 }}>→</span>
                  </a>
                ))}
                <a href={ap('/neighbourhoods')} style={{ display: 'block', fontSize: 12, color: '#888', paddingTop: 12, textDecoration: 'none', textAlign: 'center' }}>
                  All Neighbourhoods →
                </a>
              </div>

              {/* Home evaluation CTA */}
              <div style={{ background: 'var(--off-white)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 22px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-bg)', marginBottom: 8 }}>What&apos;s Your Home Worth?</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 14px' }}>
                  South Surrey new builds have seen strong appreciation. Get a current market valuation.
                </p>
                <a href={ap('/home-evaluation')} style={{ display: 'block', background: 'var(--primary-bg)', color: '#fff', padding: '10px 0', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none', textAlign: 'center' }}>
                  Free Home Evaluation
                </a>
              </div>

            </div>

          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 860px) {
          #nc-grid { grid-template-columns: 1fr !important; }
        }
        details summary::-webkit-details-marker { display: none; }
      `}</style>
    </>
  )
}
