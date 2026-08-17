import { playfair } from '@/lib/fonts'
import { getAgent, getPage, resolveAgentPrefix } from '@/lib/api'
import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'


// CANONICAL RULE: subareaDisplay is a UI label only (H1, breadcrumbs, meta title).
// NEVER pass it — or any hardcoded subarea string — to getListings() or any API call.
// The server scopes results via the agent's subarea_whitelist + city filter automatically.
// Pass only: type, beds, min_price, max_price (and other non-subarea filters).
interface FilterConfig {
  kind: 'hub' | 'seo'
  h1: string
  eyebrow: string
  description: string
  subareaDisplay: string
  type?: string
  metaTitle: string
  metaDesc: string
  seoBody?: string
  quickAnswers?: { q: string; a: string }[]
  faqs?: { q: string; a: string }[]
  relatedLinks?: { label: string; href: string }[]
  heroImg?: string
}

const FILTER_MAP: Record<string, FilterConfig> = {
  'south-surrey-condos-for-sale': {
    kind: 'hub', subareaDisplay: 'South Surrey', type: 'Apartment',
    h1: 'Condos for Sale in South Surrey',
    eyebrow: 'South Surrey Real Estate',
    description: 'Browse active MLS® condo listings across South Surrey, White Rock, Morgan Creek, Grandview Heights and Ocean Park. Filter by price and bedrooms.',
    metaTitle: 'Condos for Sale in South Surrey & White Rock | MLS® Listings',
    metaDesc: 'Search all condos for sale in South Surrey and White Rock. Active MLS® listings updated daily — filter by price, bedrooms, and building.',
    heroImg: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1440&h=400&fit=crop',
    seoBody: 'South Surrey is one of Metro Vancouver\'s most active condo markets, with buildings ranging from boutique wood-frame lowrises to concrete highrises in Grandview Heights, Ocean Park, and along the White Rock beachfront. Prices typically range from the mid-$400Ks for one-bedroom units to over $2M for oceanview penthouses.',
    relatedLinks: [
      { label: 'South Surrey Townhouses', href: '/south-surrey-townhouses-for-sale' },
      { label: 'South Surrey Houses', href: '/south-surrey-houses-for-sale' },
      { label: 'Condo Buildings', href: '/buildings' },
      { label: 'South Surrey Legal Suite Homes', href: '/south-surrey-legal-suite-homes-for-sale' },
      { label: 'Market Stats', href: '/market-report' },
    ],
  },
  'south-surrey-townhouses-for-sale': {
    kind: 'hub', subareaDisplay: 'South Surrey', type: 'Townhouse',
    h1: 'Townhouses for Sale in South Surrey',
    eyebrow: 'South Surrey Real Estate',
    description: 'Browse active MLS® townhouse listings in South Surrey, White Rock, Morgan Creek, Cloverdale and Grandview Heights. Popular with growing families.',
    metaTitle: 'Townhouses for Sale in South Surrey | MLS® Listings',
    metaDesc: 'Search townhouses for sale in South Surrey. Active MLS® listings updated daily with prices, photos and strata details.',
    heroImg: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1440&h=400&fit=crop',
    seoBody: 'South Surrey\'s townhouse market offers great value for families who want more space than a condo but prefer a lower-maintenance lifestyle than a detached home. Most townhouses include 3–4 bedrooms, a private garage, and a fenced yard. Many are in walkable proximity to top-rated schools in Morgan Creek, Grandview Heights and Ocean Park.',
    relatedLinks: [
      { label: 'South Surrey Condos', href: '/south-surrey-condos-for-sale' },
      { label: 'South Surrey Houses', href: '/south-surrey-houses-for-sale' },
      { label: 'Cloverdale Townhouses', href: '/cloverdale-townhouses-for-sale' },
      { label: 'Grandview Heights Townhouses', href: '/grandview-heights-townhouses-for-sale' },
      { label: 'Recently Sold', href: '/sold' },
    ],
  },
  'south-surrey-houses-for-sale': {
    kind: 'hub', subareaDisplay: 'South Surrey', type: 'House',
    h1: 'Houses for Sale in South Surrey',
    eyebrow: 'South Surrey Real Estate',
    description: 'Browse active MLS® detached home listings in South Surrey, White Rock, Elgin Chantrell, Ocean Park and Pacific Douglas.',
    metaTitle: 'Houses for Sale in South Surrey & White Rock | Detached Homes MLS®',
    metaDesc: 'Search detached houses for sale in South Surrey. Active MLS® listings updated daily — filter by neighbourhood, price and size.',
    heroImg: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1440&h=400&fit=crop',
    seoBody: 'Detached homes in South Surrey range from starter homes in Sunnyside Park priced in the low $1Ms to luxury waterfront estates in Elgin Chantrell and Ocean Park exceeding $5M. Grandview Heights and Pacific Douglas have the most new construction, while Crescent Beach and White Rock offer established family neighbourhoods close to the ocean.',
    relatedLinks: [
      { label: 'South Surrey Condos', href: '/south-surrey-condos-for-sale' },
      { label: 'South Surrey Townhouses', href: '/south-surrey-townhouses-for-sale' },
      { label: 'Legal Suite Homes', href: '/south-surrey-legal-suite-homes-for-sale' },
      { label: 'White Rock Houses', href: '/white-rock-houses-for-sale' },
      { label: 'Market Stats', href: '/market-report' },
    ],
  },
  'cloverdale-condos-for-sale': {
    kind: 'hub', subareaDisplay: 'Cloverdale', type: 'Apartment',
    h1: 'Condos for Sale in Cloverdale',
    eyebrow: 'Cloverdale Real Estate',
    description: 'Browse active MLS® condo listings in Cloverdale. One of Metro Vancouver\'s best-value condo markets — updated daily.',
    metaTitle: 'Condos for Sale in Cloverdale Surrey | MLS® Listings',
    metaDesc: 'Search condos for sale in Cloverdale. Active MLS® listings updated daily — great value close to schools, shopping and transit.',
    heroImg: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1440&h=400&fit=crop',
    seoBody: 'Cloverdale offers some of the best-value condos in Greater Vancouver, with one-bedroom units typically starting in the $400Ks and two-bedroom units in the $600K–$750K range. New condo projects continue to launch near 64 Avenue and Highway 10, making it popular with first-time buyers.',
    relatedLinks: [
      { label: 'Cloverdale Townhouses', href: '/cloverdale-townhouses-for-sale' },
      { label: 'South Surrey Condos', href: '/south-surrey-condos-for-sale' },
      { label: 'All Homes', href: '/homes-for-sale' },
    ],
  },
  'cloverdale-townhouses-for-sale': {
    kind: 'hub', subareaDisplay: 'Cloverdale', type: 'Townhouse',
    h1: 'Townhouses for Sale in Cloverdale',
    eyebrow: 'Cloverdale Real Estate',
    description: 'Browse active MLS® townhouse listings in Cloverdale, Surrey. Great family option close to schools and parks.',
    metaTitle: 'Townhouses for Sale in Cloverdale | MLS® Listings',
    metaDesc: 'Search townhouses for sale in Cloverdale, Surrey. Active MLS® listings updated daily.',
    heroImg: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1440&h=400&fit=crop',
    seoBody: 'Cloverdale townhouses offer excellent value for families, with three-bedroom units frequently available in the $700K–$950K range. The area has seen significant new construction, with many strata complexes built since 2015 offering modern layouts and low strata fees.',
    relatedLinks: [
      { label: 'Cloverdale Condos', href: '/cloverdale-condos-for-sale' },
      { label: 'South Surrey Townhouses', href: '/south-surrey-townhouses-for-sale' },
      { label: 'All Homes', href: '/homes-for-sale' },
    ],
  },
  'white-rock-condos-for-sale': {
    kind: 'hub', subareaDisplay: 'White Rock', type: 'Apartment',
    h1: 'Condos for Sale in White Rock',
    eyebrow: 'White Rock Real Estate',
    description: 'Browse active MLS® condo listings in White Rock, BC. Ocean views, beachfront living and walkable lifestyle.',
    metaTitle: 'Condos for Sale in White Rock BC | Ocean View MLS® Listings',
    metaDesc: 'Search condos for sale in White Rock. Beachfront, ocean view and walkable condo options — MLS® listings updated daily.',
    heroImg: 'https://images.unsplash.com/photo-1445991842772-097fea258e7b?w=1440&h=400&fit=crop',
    seoBody: 'White Rock\'s condo market is highly sought-after for its ocean views and walkable Marine Drive lifestyle. Units range from affordable one-bedrooms in inland buildings to premium oceanview suites with direct beach access. Many buildings are adult-oriented (55+), so verify age restrictions before purchasing.',
    relatedLinks: [
      { label: 'White Rock Houses', href: '/white-rock-houses-for-sale' },
      { label: 'South Surrey Condos', href: '/south-surrey-condos-for-sale' },
      { label: 'Ocean View Homes', href: '/south-surrey-ocean-view-homes-for-sale' },
    ],
  },
  'white-rock-houses-for-sale': {
    kind: 'hub', subareaDisplay: 'White Rock', type: 'House',
    h1: 'Houses for Sale in White Rock',
    eyebrow: 'White Rock Real Estate',
    description: 'Browse active MLS® detached home listings in White Rock, BC. Steps from the beach, promenade and Marine Drive.',
    metaTitle: 'Houses for Sale in White Rock BC | MLS® Listings',
    metaDesc: 'Search detached houses for sale in White Rock. Beachside and hillside homes — active MLS® listings updated daily.',
    heroImg: 'https://images.unsplash.com/photo-1445991842772-097fea258e7b?w=1440&h=400&fit=crop',
    seoBody: 'White Rock is a highly desirable beachside community with a walkable downtown, a 2-km promenade, and a mix of hillside homes with ocean views and flat-street homes near the beach. Detached homes range from approximately $1.3M to over $5M depending on location and view.',
    relatedLinks: [
      { label: 'White Rock Condos', href: '/white-rock-condos-for-sale' },
      { label: 'South Surrey Houses', href: '/south-surrey-houses-for-sale' },
      { label: 'Ocean View Homes', href: '/south-surrey-ocean-view-homes-for-sale' },
    ],
  },
  'grandview-heights-condos-for-sale': {
    kind: 'hub', subareaDisplay: 'Grandview Heights', type: 'Apartment',
    h1: 'Condos for Sale in Grandview Heights',
    eyebrow: 'Grandview Heights Real Estate',
    description: 'Browse active MLS® condo listings in Grandview Heights, Surrey. Newer concrete and wood-frame buildings close to Morgan Crossing.',
    metaTitle: 'Condos for Sale in Grandview Heights Surrey | MLS® Listings',
    metaDesc: 'Search condos for sale in Grandview Heights. Newer buildings close to Morgan Crossing — active MLS® listings updated daily.',
    heroImg: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1440&h=400&fit=crop',
    seoBody: 'Grandview Heights has emerged as one of South Surrey\'s most active new-construction condo markets, with multiple concrete and wood-frame buildings completed since 2015. Proximity to Morgan Crossing, Highway 99, and top-rated schools makes it popular with young families and investors.',
    relatedLinks: [
      { label: 'Grandview Heights Townhouses', href: '/grandview-heights-townhouses-for-sale' },
      { label: 'South Surrey Condos', href: '/south-surrey-condos-for-sale' },
      { label: 'Condo Buildings', href: '/buildings' },
    ],
  },
  'grandview-heights-townhouses-for-sale': {
    kind: 'hub', subareaDisplay: 'Grandview Heights', type: 'Townhouse',
    h1: 'Townhouses for Sale in Grandview Heights',
    eyebrow: 'Grandview Heights Real Estate',
    description: 'Browse active MLS® townhouse listings in Grandview Heights, Surrey. Modern complexes close to Morgan Crossing and top-rated schools.',
    metaTitle: 'Townhouses for Sale in Grandview Heights Surrey | MLS® Listings',
    metaDesc: 'Search townhouses for sale in Grandview Heights, Surrey. Modern strata complexes — active MLS® listings updated daily.',
    heroImg: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1440&h=400&fit=crop',
    seoBody: 'Grandview Heights townhouses are among the most sought-after in South Surrey, offering modern layouts with 3–4 bedrooms, double garages, and quick access to Morgan Crossing shopping. New complexes continue to be built in this rapidly developing neighbourhood.',
    relatedLinks: [
      { label: 'Grandview Heights Condos', href: '/grandview-heights-condos-for-sale' },
      { label: 'South Surrey Townhouses', href: '/south-surrey-townhouses-for-sale' },
      { label: 'Legal Suite Homes', href: '/south-surrey-legal-suite-homes-for-sale' },
    ],
  },

  'south-surrey-legal-suite-homes-for-sale': {
    kind: 'seo', subareaDisplay: 'South Surrey', type: 'House',
    h1: 'South Surrey Homes with Legal Suites for Sale',
    eyebrow: 'South Surrey · Legal Suite Homes',
    description: 'Browse detached homes in South Surrey with permitted legal suites. Rental income of $1,600–$2,400/month helps offset your mortgage.',
    metaTitle: 'South Surrey Legal Suite Homes for Sale | MLS® Listings',
    metaDesc: 'Search homes with legal suites in South Surrey. Grandview Heights, Sunnyside Park, Ocean Park — rental income to offset your mortgage. Updated daily.',
    heroImg: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1440&h=400&fit=crop',
    seoBody: 'South Surrey has one of the highest concentrations of legal suite homes in the Lower Mainland. Grandview Heights and Sunnyside Park feature newer builds (2010–2024) with purpose-built legal suites, while Pacific Douglas new construction typically includes suites as standard. A legal suite in South Surrey typically rents for $1,600–$2,400/month, depending on size and neighbourhood.',
    quickAnswers: [
      { q: 'What is a legal suite in BC?', a: 'A self-contained unit with its own entrance, kitchen, and bathroom that meets BC Building Code and is permitted by the municipality. Rental income from a legal suite can help offset your mortgage significantly.' },
      { q: 'How does suite income affect mortgage qualification?', a: 'Lenders allow 50–100% of verified rental income toward qualifying income. A $1,800/month suite can add $100K–$150K to your qualifying power depending on your lender.' },
      { q: 'Which South Surrey areas have the most legal suites?', a: 'Grandview Heights and Sunnyside Park have the highest concentration of purpose-built legal suites. Pacific Douglas new builds frequently include them as standard. Ocean Park and Elgin Chantrell have custom-renovated suites in larger homes.' },
      { q: 'Are all basement suites in South Surrey legal?', a: 'No — many older suites were built without permits. Always verify the suite permit from the municipality, confirm fire egress, minimum 6\'5" ceiling height, and a separate utility meter.' },
      { q: 'What rent can I expect from a legal suite?', a: 'Legal suites in South Surrey rent for $1,600–$2,400/month (2025), depending on size, finishes, and neighbourhood. Suites near transit and in Grandview Heights command premium rates.' },
      { q: 'Can I use a legal suite for short-term rentals?', a: 'Generally no. Most municipalities in South Surrey restrict short-term rentals (under 30 days). Always verify local zoning rules before purchasing with this intent.' },
    ],
    faqs: [
      {
        q: 'What exactly qualifies as a "legal suite" in BC real estate?',
        a: 'A legal suite is a self-contained secondary dwelling unit within or attached to the principal home. It must have its own entrance, kitchen, sleeping area, and bathroom; meet BC Building Code and fire egress requirements; and hold a valid suite permit from the municipality (City of Surrey or City of White Rock). When searching, ask your agent to verify the suite permit — not just that a basement suite exists.',
      },
      {
        q: 'How do lenders count rental income from a legal suite toward my mortgage?',
        a: 'Most lenders allow 50–100% of market rent toward qualifying income on an owner-occupied purchase with a legal suite. On a $1,800/month suite at 50% add-back, that\'s $900/month in extra qualifying income — which can increase your mortgage limit by roughly $120,000–$150,000 at current rates. An insured mortgage (less than 20% down) typically allows 100% suite income add-back; conventional mortgages vary by lender.',
      },
      {
        q: 'Which South Surrey neighbourhoods have the most homes with legal suites?',
        a: 'Grandview Heights and Sunnyside Park have the highest concentration, thanks to a wave of detached homes built between 2010 and 2024 where suites were designed in from the ground up. Pacific Douglas new builds routinely include suites as a standard feature. Ocean Park and Elgin Chantrell tend toward larger custom homes where suites have been added as retrofits — quality varies.',
      },
      {
        q: 'What should I check before buying a home with a basement suite?',
        a: "Ask for the suite permit from the City of Surrey or White Rock. Verify fire egress (a proper egress window in the sleeping area), minimum 6'5\" ceiling height, a smoke and CO detector system, and — ideally — a separate utility meter. Your inspector should also check that the suite electrical and plumbing meet code. Randy's team will flag compliance questions during the offer process.",
      },
      {
        q: 'Are homes with legal suites priced higher than similar homes without?',
        a: 'Yes, typically 5–10% higher, reflecting the income-generating potential. However, buyers can often justify the premium because the rental income offsets mortgage costs. In a market where a legal suite adds $1,800/month in rental income, the effective carrying cost of a home priced $150,000 higher is often neutral or positive.',
      },
    ],
    relatedLinks: [
      { label: 'South Surrey Houses', href: '/south-surrey-houses-for-sale' },
      { label: 'Grandview Heights Townhouses', href: '/grandview-heights-townhouses-for-sale' },
      { label: 'South Surrey Rancher Homes', href: '/south-surrey-rancher-homes-for-sale' },
      { label: 'South Surrey Waterfront Homes', href: '/south-surrey-waterfront-homes-for-sale' },
      { label: 'Market Stats', href: '/market-report' },
      { label: 'All Homes For Sale', href: '/homes-for-sale' },
    ],
  },

  'south-surrey-waterfront-homes-for-sale': {
    kind: 'seo', subareaDisplay: 'South Surrey & White Rock', type: 'House',
    h1: 'Waterfront & Ocean View Homes for Sale in South Surrey',
    eyebrow: 'South Surrey · Waterfront & Ocean View',
    description: 'Browse oceanfront and ocean view properties in White Rock, Ocean Park, and Crescent Beach. The most sought-after addresses on the BC South Coast.',
    metaTitle: 'Waterfront Homes for Sale in South Surrey & White Rock | MLS®',
    metaDesc: 'Search waterfront and ocean view homes in South Surrey and White Rock. Crescent Beach, Ocean Park, White Rock beachfront — MLS® updated daily.',
    heroImg: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1440&h=400&fit=crop',
    seoBody: 'White Rock and Crescent Beach offer the only true oceanfront residential real estate in the South Surrey area. The White Rock promenade is lined with condos and homes with direct ocean views, while Ocean Park offers estate-style properties on large lots. Prices for waterfront homes range from approximately $2M to well over $10M.',
    quickAnswers: [
      { q: 'Where are the best waterfront homes in South Surrey?', a: 'White Rock beachfront (Marine Drive and Nichol Road), Crescent Beach (a tidal inlet community), and upper-hillside Ocean Park properties with ocean views are the top three areas.' },
      { q: 'What is the price range for waterfront homes in White Rock?', a: 'Direct oceanfront homes on Marine Drive range from $2.5M–$8M+. Ocean view homes on the hillside start around $1.5M and go up depending on lot size and view quality.' },
      { q: 'Are there strata waterfront properties?', a: 'Yes — several White Rock beachfront condo buildings offer direct ocean views, with suites ranging from $800K for one-bedroom units to $3M+ for penthouse suites.' },
      { q: 'What should I consider when buying a waterfront home?', a: 'Key considerations include flood plain designation (check the municipality\'s flood maps), foundation type, storm surge risk, insurance availability and cost, and strata restrictions on short-term rentals.' },
    ],
    faqs: [
      {
        q: 'What areas in South Surrey have true waterfront homes?',
        a: 'White Rock\'s Marine Drive and Nichol Road are the most recognized oceanfront addresses. Crescent Beach is a tidal inlet community on the west side of South Surrey with a quieter, cottage-like character. Ocean Park has hillside properties with panoramic ocean views. Each has a distinct character and price range.',
      },
      {
        q: 'How do I assess flood risk when buying a waterfront home?',
        a: 'Ask your agent for the property\'s flood plain designation from the City of White Rock or Metro Vancouver flood risk maps. Check whether the property has a designated flood construction level (FCL) and whether any renovations required floodproofing. Your insurance broker will also require this information to quote premiums.',
      },
      {
        q: 'What are typical carrying costs for a White Rock beachfront home?',
        a: 'Beyond the mortgage, expect higher property insurance (flood/wind riders), higher property tax (White Rock has its own municipality), potential strata fees if in a condo building, and maintenance costs related to salt air exposure (roofing, siding, window seals).',
      },
    ],
    relatedLinks: [
      { label: 'White Rock Condos', href: '/white-rock-condos-for-sale' },
      { label: 'White Rock Houses', href: '/white-rock-houses-for-sale' },
      { label: 'South Surrey Houses', href: '/south-surrey-houses-for-sale' },
      { label: 'Ocean View Homes', href: '/south-surrey-ocean-view-homes-for-sale' },
      { label: 'All Homes', href: '/homes-for-sale' },
    ],
  },

  'south-surrey-ocean-view-homes-for-sale': {
    kind: 'seo', subareaDisplay: 'South Surrey & White Rock', type: 'House',
    h1: 'Ocean View Homes for Sale in South Surrey & White Rock',
    eyebrow: 'South Surrey · Ocean View Properties',
    description: 'Search homes with ocean views across White Rock, Ocean Park and the upper hillside of South Surrey.',
    metaTitle: 'Ocean View Homes for Sale South Surrey & White Rock | MLS®',
    metaDesc: 'Find ocean view homes for sale in South Surrey and White Rock. Hillside properties with Pacific Ocean views — MLS® listings updated daily.',
    heroImg: 'https://images.unsplash.com/photo-1445991842772-097fea258e7b?w=1440&h=400&fit=crop',
    seoBody: 'South Surrey and White Rock\'s hillside neighbourhoods offer some of the most spectacular Pacific Ocean views in Greater Vancouver. Ocean Park, the upper slopes of White Rock, and select streets in Elgin Chantrell deliver panoramic views from living areas and decks. These homes command a significant premium but offer irreplaceable vistas.',
    quickAnswers: [
      { q: 'What neighbourhoods have ocean view homes in South Surrey?', a: 'Upper White Rock (hilltop streets above Marine Drive), Ocean Park, Crescent Beach, and select streets in Elgin Chantrell all offer Pacific Ocean views. The best views face southwest toward Vancouver Island.' },
      { q: 'How much premium do ocean views add to a South Surrey home?', a: 'Generally 10–25% over a comparable home without views, depending on the quality and permanence of the view corridor. Protected, unobstructable views (facing water or parkland) command the highest premiums.' },
      { q: 'Can I verify a view will not be blocked?', a: 'Check the zoning and height restrictions for neighbouring lots. Your agent can pull building permits and height limit bylaws from the City of White Rock or City of Surrey to confirm what could be built on adjacent parcels.' },
    ],
    faqs: [
      {
        q: 'Which streets in White Rock have the best ocean views?',
        a: 'The upper hillside streets in White Rock — around Stayte Road, North Bluff Road, and the upper portion of Johnston Road — have the most elevated ocean views. In Ocean Park, streets running perpendicular to 128th Street provide clear southwest views. Your agent can shortlist specific streets based on your view preferences.',
      },
      {
        q: 'Are ocean view homes harder to insure?',
        a: 'Not significantly harder to insure than any other home, but proximity to the ocean (especially within 200 metres of the shoreline) can increase premiums or require additional riders for wind and moisture damage. Always get an insurance quote before making an offer.',
      },
    ],
    relatedLinks: [
      { label: 'Waterfront Homes', href: '/south-surrey-waterfront-homes-for-sale' },
      { label: 'White Rock Condos', href: '/white-rock-condos-for-sale' },
      { label: 'White Rock Houses', href: '/white-rock-houses-for-sale' },
      { label: 'South Surrey Houses', href: '/south-surrey-houses-for-sale' },
    ],
  },

  'south-surrey-rancher-homes-for-sale': {
    kind: 'seo', subareaDisplay: 'South Surrey', type: 'House',
    h1: 'Rancher Homes for Sale in South Surrey',
    eyebrow: 'South Surrey · Single-Level Homes',
    description: 'Browse single-storey rancher homes in South Surrey, White Rock, and Crescent Beach. Popular with downsizers and buyers seeking accessible, main-floor living.',
    metaTitle: 'Rancher Homes for Sale in South Surrey & White Rock | MLS®',
    metaDesc: 'Search rancher and single-storey homes in South Surrey. Accessible main-floor living — active MLS® listings updated daily.',
    heroImg: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=1440&h=400&fit=crop',
    seoBody: 'Ranchers are single-storey detached homes highly valued by downsizers, seniors, and buyers with mobility considerations. They are relatively rare in South Surrey compared to two-storey homes, which means well-priced ranchers tend to sell quickly. Crescent Beach and Ocean Park have a higher concentration of older rancher-style homes, while Cloverdale has newer single-level options.',
    quickAnswers: [
      { q: 'What is a rancher home?', a: 'A rancher (or bungalow) is a single-storey detached home where all living space is on one level — no stairs required to access any room. They are popular with downsizers, seniors, and buyers wanting accessible living.' },
      { q: 'Are ranchers harder to find in South Surrey?', a: 'Yes. Ranchers represent a small share of the detached home inventory in South Surrey, making them sought-after and typically priced at a premium per square foot versus two-storey homes of the same size.' },
      { q: 'What should I check when buying a rancher?', a: 'Ranchers often have larger lot footprints than two-storey homes of the same square footage — this is a plus. Check for crawl space condition (moisture, insulation), roof age (single level puts more stress on roof structure), and strata or covenant restrictions if applicable.' },
      { q: 'Which South Surrey areas have the most ranchers?', a: 'Crescent Beach, parts of Ocean Park, older sections of White Rock, and rural Elgin Chantrell have the most traditional ranchers. Cloverdale has newer single-storey homes in subdivisions built since 2010.' },
    ],
    faqs: [
      {
        q: 'What is the price range for rancher homes in South Surrey?',
        a: 'Ranchers in South Surrey typically range from $1.1M for a smaller, older home in Cloverdale or Sunnyside Park to $3M+ for a newer custom-built rancher with high-end finishes in Ocean Park or Elgin Chantrell. The premium over two-storey homes of the same lot size reflects the scarcity and high demand.',
      },
      {
        q: 'Can I find accessible ranchers suitable for aging-in-place?',
        a: 'Yes. When searching for an accessible rancher, look for no-step entries, wider doorways (32"+ clear width), single-level laundry, and a roll-in or barrier-free bathroom. These features are more common in newer ranchers built after 2010 or in renovated properties. Randy can filter specifically for these features.',
      },
      {
        q: 'Are ranchers good investment properties?',
        a: 'Ranchers have strong resale demand because of the aging demographics in South Surrey. As more baby boomers downsize, demand for single-level homes continues to grow. Ranchers on larger lots in desirable areas also have redevelopment potential, adding a floor of value beyond the current structure.',
      },
    ],
    relatedLinks: [
      { label: 'South Surrey Houses', href: '/south-surrey-houses-for-sale' },
      { label: 'Legal Suite Homes', href: '/south-surrey-legal-suite-homes-for-sale' },
      { label: 'White Rock Houses', href: '/white-rock-houses-for-sale' },
      { label: 'All Homes', href: '/homes-for-sale' },
      { label: 'Market Stats', href: '/market-report' },
    ],
  },
}

// Map each filter-page type to its unified clean-URL page
const TYPE_TO_CLEAN_PAGE: Record<string, string> = {
  Apartment: '/condos-for-sale',
  Townhouse: '/townhouses-for-sale',
  House:     '/houses-for-sale',
}

interface Props {
  params: Promise<{ slug: string; filter: string }>
}

export const revalidate = 600

export async function generateStaticParams() {
  const slugs = ['randy']
  const filters = Object.keys(FILTER_MAP)
  return slugs.flatMap(slug => filters.map(filter => ({ slug, filter })))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { filter } = await params
  const config = FILTER_MAP[filter]
  if (!config) return { title: 'Homes' }
  return {
    title: config.metaTitle,
    description: config.metaDesc,
    openGraph: {
      title: config.metaTitle,
      description: config.metaDesc,
      images: config.heroImg ? [{ url: config.heroImg }] : [],
    },
  }
}

export default async function FilterHubPage({ params }: Props) {
  const { slug, filter } = await params
  const config = FILTER_MAP[filter]

  // Known FILTER_MAP entry → 308 redirect to the unified type page
  if (config?.type && TYPE_TO_CLEAN_PAGE[config.type]) {
    const agentPrefix = resolveAgentPrefix(slug, null)
    permanentRedirect(`${agentPrefix}${TYPE_TO_CLEAN_PAGE[config.type]}`)
  }

  // Unknown key → try CMS page, otherwise 404
  const [agent, cmsPage] = await Promise.all([
    getAgent(slug),
    getPage(slug, filter),
  ])
  if (!agent || !cmsPage) notFound()

  // Look for a matching area expertise blurb from the agent's AI-generated content.
  // Match by comparing the filter slug against subarea names (case-insensitive, slug-normalised).
  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const areaExpertise = agent.settings?.area_expertise ?? null
  const expertiseBlurb = areaExpertise?.find(e => {
    const subareaSlug = slugify(e.subarea)
    return filter.includes(subareaSlug) || subareaSlug.split('-').some(word => word.length > 4 && filter.includes(word))
  })

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <h1 className={playfair.className} style={{ fontSize: 'clamp(24px,4vw,42px)', fontWeight: 400, color: '#1a1a1a', margin: 0 }}>{cmsPage.title || filter}</h1>
        </div>
      </div>
      <div className="container" style={{ padding: '48px var(--container-padding)' }}>
        {expertiseBlurb && (
          <div style={{
            background: 'var(--brand-bg, #14213d)',
            color: '#fff',
            borderRadius: 10,
            padding: '20px 24px',
            marginBottom: 28,
            fontSize: 15,
            lineHeight: 1.75,
          }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 6, fontWeight: 600 }}>
              Local Expertise · {expertiseBlurb.subarea}
            </div>
            <p style={{ margin: 0 }}>{expertiseBlurb.blurb}</p>
          </div>
        )}
        {cmsPage.body?.split('\n\n').map((p, i) => (
          <p key={i} style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.8, marginBottom: 16 }}>{p}</p>
        ))}
      </div>
    </div>
  )
}


