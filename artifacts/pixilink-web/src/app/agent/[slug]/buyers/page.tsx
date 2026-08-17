import { playfair } from '@/lib/fonts'
import { getAgent, getPage, getAwards, getNeighbourhoods, agentCanonicalBase, getAgentTerritories, agentAreaDisplay } from '@/lib/api'
import ContactSidebarForm from '@/components/ContactSidebarForm'
import W3MortgagePreQual from '@/components/W3MortgagePreQual.client'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCoAgents } from '@/lib/types'
import type { NeighbourhoodSummary } from '@/lib/types'


interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [agent, page, territories] = await Promise.all([
    getAgent(slug),
    getPage(slug, 'buyers'),
    getAgentTerritories(slug).catch(() => []),
  ])
  const coMeta = agent ? getCoAgents(agent) : []
  const agentName = agent
    ? coMeta.length > 0
      ? `${agent.name.split(' ')[0]} & ${coMeta[0].name.split(' ')[0]}`
      : agent.name
    : 'Your Agent'
  const shortArea = agentAreaDisplay(territories)
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/buyers`

  const title = page?.meta_title || `Buying a Home in ${shortArea} | ${agentName}`
  const description =
    page?.meta_description ||
    `Complete buyer's guide for purchasing a home in ${shortArea}. Neighbourhood comparison, buying process, costs, and first-time buyer programs. Contact ${agentName} to get started.`

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `Home Buyer's Guide — ${shortArea}`,
    serviceType: 'Real Estate Buying',
    description: `${agentName} helps buyers find and purchase homes in ${shortArea}. Expert guidance from pre-approval through possession day.`,
    provider: {
      '@type': 'RealEstateAgent',
      name: agentName,
      telephone: agent?.phone,
      url: `https://${domain}`,
    },
    areaServed: territories.length
      ? [...new Set(territories.map(t => t.city))].map(name => ({ '@type': 'City', name }))
      : [{ '@type': 'City', name: shortArea }],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CAD',
      description: 'Free buyer representation — no direct cost to buyers',
    },
  }

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: 'website', url: canonical },
    twitter: { card: 'summary_large_image', title, description },
    other: { 'script:ld+json': JSON.stringify(serviceJsonLd) },
  }
}

interface Block {
  type?: string
  heading?: string
  text?: string
  content?: string
  items?: string[]
  url?: string
  label?: string
  level?: number
  caption?: string
  alt?: string
  style?: string
}

function renderBlock(block: Block, i: number) {
  const type = block.type || (block.heading ? 'heading-text' : 'text')
  if (type === 'heading-text' || (block.heading && block.text)) {
    return (
      <div key={i} style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 8 }}>{block.heading}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>{block.text}</p>
      </div>
    )
  }
  if (type === 'text' || type === 'paragraph') {
    return <p key={i} style={{ marginBottom: 18, color: 'var(--text)', lineHeight: 1.8, fontSize: 15 }}>{block.content || block.text}</p>
  }
  if (type === 'heading') {
    const size = block.level === 3 ? 20 : 26
    return <h2 key={i} style={{ fontSize: size, fontWeight: 700, color: 'var(--primary-bg)', margin: '28px 0 12px' }}>{block.content || block.heading}</h2>
  }
  if (type === 'list' && block.items) {
    return (
      <ul key={i} style={{ paddingLeft: 20, marginBottom: 18 }}>
        {block.items.map((item, j) => (
          <li key={j} style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.8, marginBottom: 6 }}>{item}</li>
        ))}
      </ul>
    )
  }
  if (type === 'cta') {
    return (
      <div key={i} style={{ margin: '28px 0' }}>
        <a href={block.url || '#'}
          style={{ display: 'inline-block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '12px 28px', borderRadius: 6, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' as const, textDecoration: 'none' }}>
          {block.label || 'Learn More'}
        </a>
      </div>
    )
  }
  if (type === 'divider') {
    return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '32px 0' }} />
  }
  return null
}

const BUYER_FAQS = [
  {
    q: 'How do I get pre-approved for a mortgage?',
    a: 'Contact a mortgage broker or your bank to start the pre-approval process. You\'ll provide proof of income, employment, and assets. A pre-approval locks in your rate for 90–120 days and shows sellers you\'re a serious buyer. Your agent can refer you to trusted local mortgage brokers.',
  },
  {
    q: 'How much of a deposit do I need to make an offer?',
    a: 'Deposits in BC are typically 1–5% of the purchase price, submitted within 24 hours of an accepted offer. The deposit forms part of your down payment and is held in trust until completion. It is separate from your total down payment.',
  },
  {
    q: 'What are subjects (conditions) in a real estate offer?',
    a: 'Subjects are conditions that must be satisfied before your purchase completes — most commonly financing approval and a satisfactory home inspection. The subject period is typically 5–7 business days. Once subjects are removed, the contract is firm and binding.',
  },
  {
    q: 'What closing costs should I budget for?',
    a: 'In addition to your down payment, budget for Property Transfer Tax (1% on first $200K, 2% on the balance — first-time buyer exemptions may apply), legal/notary fees ($1,200–$2,500), home inspection ($400–$600), and moving costs. Your agent can provide a full cost estimate before you make an offer.',
  },
  {
    q: 'How long does the buying process take?',
    a: 'From starting your search to moving in, most buyers complete a purchase in 30–90 days. Being pre-approved and working with an agent who provides instant listing alerts speeds this up significantly. Completion typically takes 4–6 weeks after an accepted offer.',
  },
  {
    q: 'Are there programs for first-time buyers in BC?',
    a: 'Yes — first-time buyers may qualify for the BC First-Time Home Buyer exemption on Property Transfer Tax (homes up to $500K fully exempt), the First Home Savings Account (FHSA), and the federal First-Time Home Buyer Incentive. Ask your mortgage broker which programs apply to your situation.',
  },
  {
    q: 'Do I pay my buyer\'s agent\'s commission?',
    a: 'In most BC transactions, the buyer\'s agent commission is paid by the seller through the listing brokerage. As a buyer, you receive full representation, market data, and negotiation support at no direct cost to you.',
  },
]

const PROCESS_STEPS = [
  {
    num: '01',
    title: 'Search & Evaluate',
    body: 'Get set up with real-time MLS® alerts the moment matching homes hit the market. Your agent provides full sold data so you can evaluate value before making any decision. In a seller\'s market, being first matters — same-day showing capability keeps you ahead.',
  },
  {
    num: '02',
    title: 'Make a Winning Offer',
    body: 'When you find the right home, your agent prepares a data-backed offer: price, deposit, subjects, and completion date — all optimised for your position. Negotiation depth and subject-clause strategy make the difference.',
  },
  {
    num: '03',
    title: 'Subject Period & Due Diligence',
    body: 'Home inspection, strata document review (if applicable), financing confirmation, and title review — all coordinated within 5–7 business days. For condos: depreciation report, 2 years of strata minutes, and contingency reserve fund are always reviewed.',
  },
  {
    num: '04',
    title: 'Completion & Move In',
    body: 'On completion day your lawyer or notary transfers funds and registers title. Your agent stays available through possession day and beyond — every detail handled so nothing surprises you at closing.',
  },
]

const BUYER_COSTS = [
  { label: 'Down Payment', amount: '5–20% of purchase price', notes: '$35K–$200K on a $1M home' },
  { label: 'Legal / Notary Fees', amount: '$1,200–$2,500', notes: 'Title transfer + mortgage registration' },
  { label: 'Property Transfer Tax', amount: '1% on first $200K, 2% on balance', notes: 'First-time buyer exemption may apply (homes ≤ $500K)' },
  { label: 'Home Inspection', amount: '$400–$600', notes: 'Recommended on all property types' },
  { label: 'Strata Docs Review', amount: '$200–$400', notes: 'Lawyer reviews minutes + depreciation report' },
  { label: 'Moving Costs', amount: '$800–$3,000', notes: 'Depends on size and distance' },
]

const AREA_TAGS: Record<string, string> = {
  'South Surrey': 'Family / Lifestyle',
  'White Rock': 'Waterfront / Downsizers',
  'Cloverdale': 'Space & Value',
  'Surrey': 'Urban / Mixed',
  'Vancouver': 'Urban / Prestige',
  'Burnaby': 'Central / Commuter',
  'Richmond': 'Waterfront / Multicultural',
  'Langley': 'Growing Community',
  'Coquitlam': 'Family / Schools',
  'Abbotsford': 'Affordable / Space',
  'Chilliwack': 'Value / Nature',
  'Mission': 'Rural / Affordable',
}

const AREA_DESCRIPTIONS: Record<string, string> = {
  'South Surrey': 'Morgan Creek, Grandview, Elgin — family-oriented communities with golf, top schools, and newer builds. Entry-level condos from $550K, houses from $1.1M.',
  'White Rock': 'Waterfront promenade, village atmosphere, year-round mild climate. Strong retirement and downsizer market. Condos from $500K, semis from $850K.',
  'Cloverdale': 'Largest lots, most affordable prices. Historic town centre, new builds, rapid transit expansion. Houses from $850K, townhouses from $650K.',
  'Vancouver': 'World-class amenities, walkable neighbourhoods, prestige addresses. Condos from $650K, detached from $1.5M+.',
  'Burnaby': 'Central location between Vancouver and Surrey. Excellent transit, Metrotown and Brentwood hubs. Condos from $550K.',
  'Richmond': 'Waterfront trails, Richmond Night Market, top seafood dining. Near YVR. Strong Asian-Canadian community. Condos from $550K.',
  'Langley': 'Rapidly growing with new development, wineries, and equestrian properties. Strong value vs. Metro Vancouver. Houses from $850K.',
  'Coquitlam': 'Evergreen Line rapid transit, excellent schools, Burke Mountain new builds. Strong family market. Houses from $1M.',
}

function getAreaDescription(city: string, neighbourhood: NeighbourhoodSummary): string {
  if (AREA_DESCRIPTIONS[city]) return AREA_DESCRIPTIONS[city]
  if (neighbourhood.description) return neighbourhood.description
  return `Explore homes in ${city} — a great place to buy with your agent's local expertise.`
}

function getAreaTag(city: string): string {
  return AREA_TAGS[city] || 'Local Area'
}

const TOC_ITEMS = [
  { id: 'sec-prep', label: '1. Prepare & Get Pre-Approved' },
  { id: 'sec-search', label: '2. Find Your Neighbourhood' },
  { id: 'sec-process', label: '3. The Buying Process' },
  { id: 'sec-costs', label: '4. Buyer Costs Breakdown' },
  { id: 'sec-prequalify', label: '5. Get Pre-Qualified Free' },
]

export default async function BuyersPage({ params }: Props) {
  const { slug } = await params
  const [agent, page, awards, neighbourhoods, territories] = await Promise.all([
    getAgent(slug),
    getPage(slug, 'buyers'),
    getAwards(slug),
    getNeighbourhoods(slug),
    getAgentTerritories(slug).catch(() => []),
  ])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const shortArea = agentAreaDisplay(territories)
  const coAgents = getCoAgents(agent)
  const displayName = coAgents.length > 0
    ? `${agent.name.split(' ')[0]} & ${coAgents[0].name.split(' ')[0]}`
    : agent.name
  const heroTitle    = page?.title    || `Buying a Home in ${shortArea}`
  const heroSubtitle = page?.subtitle || 'Everything you need to know about buying a home — from pre-approval to possession day.'

  const blocks       = (page?.blocks || []) as Block[]
  const hasBlocks    = blocks.length > 0
  const bodyParas    = page?.body?.split('\n\n').filter(Boolean) ?? []
  const isCardBlocks = hasBlocks && blocks.every(b => b.heading && b.text && !b.type)

  // Derive neighbourhood cards: group by city, pick one representative per city, up to 3
  const cityMap = new Map<string, NeighbourhoodSummary>()
  for (const n of neighbourhoods) {
    if (!cityMap.has(n.city)) cityMap.set(n.city, n)
  }
  const areaCities = Array.from(cityMap.entries()).slice(0, 3)
  const showAreaCards = areaCities.length >= 2

  // Unique cities for related links
  const uniqueCities = Array.from(new Set(neighbourhoods.map(n => n.city)))

  // Credential line
  const credentialParts: string[] = []
  if (agent.brokerage) credentialParts.push(agent.brokerage)
  if (agent.license_number) credentialParts.push(`License #${agent.license_number}`)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: BUYER_FAQS.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <style>{`
        html { scroll-behavior: smooth }
        .buyers-section { scroll-margin-top: 90px }
        .buyers-toc { display: block }
        .buyers-costs-table { overflow-x: auto }
        .buyers-toc-link:hover { border-left-color: var(--accent) !important; color: var(--text) !important }
        @media (max-width: 900px) {
          .buyers-toc { display: none !important }
          .buyers-grid { grid-template-columns: 1fr !important }
          .buyers-process-grid { grid-template-columns: 1fr !important }
          .buyers-area-grid { grid-template-columns: 1fr !important }
          .buyers-feature-grid { grid-template-columns: 1fr !important }
          .buyers-prequalify-grid { grid-template-columns: 1fr !important }
          .buyers-hero-cta { flex-direction: column }
        }
      `}</style>

      {/* Hero */}
      <div style={{ background: '#fff', padding: '56px 0', borderBottom: '1px solid #e5e7eb' }}>
        <div className="container">
          <div style={{ maxWidth: 700 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>Buyer&apos;s Guide</div>
            <h1 className={playfair.className} style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 400, lineHeight: 1.15, marginBottom: 12, color: '#1a1a1a' }}>{heroTitle}</h1>
            {credentialParts.length > 0 && (
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 14, letterSpacing: 0.3 }}>
                {displayName} · {credentialParts.join(' · ')}
              </div>
            )}
            <p style={{ fontSize: 15, color: '#555', lineHeight: 1.75, maxWidth: 540, marginBottom: 28 }}>{heroSubtitle}</p>
            <div className="buyers-hero-cta" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href="#sec-prequalify"
                style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '12px 26px', borderRadius: 6, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none' }}>
                Get Pre-Qualified
              </a>
              <a href="/contact"
                style={{ border: '1.5px solid var(--cta-secondary-border)', color: 'var(--cta-secondary-text)', padding: '12px 26px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                Book a Showing
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '64px var(--container-padding, 24px)' }}>
        <div className="buyers-grid" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 56, alignItems: 'start' }}>

          {/* Left sticky ToC sidebar */}
          <aside className="buyers-toc">
            <div style={{ position: 'sticky', top: 90 }}>
              <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14, fontWeight: 700 }}>In This Guide</div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {TOC_ITEMS.map(item => (
                  <a key={item.id} href={`#${item.id}`} className="buyers-toc-link"
                    style={{ textAlign: 'left', padding: '9px 14px', borderRadius: 6, borderLeft: '3px solid var(--border)', color: 'var(--text-muted)', fontWeight: 400, fontSize: 13, textDecoration: 'none', display: 'block' }}>
                    {item.label}
                  </a>
                ))}
              </nav>
              <div style={{ marginTop: 28, background: 'var(--primary-bg)', borderRadius: 10, padding: '18px 16px' }}>
                <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Ready to start?</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>
                  {displayName} — local expertise, honest guidance.
                </div>
                {agent.phone ? (
                  <a href={`tel:${agent.phone}`}
                    style={{ display: 'block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', textAlign: 'center', padding: '10px 0', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none', marginBottom: 8 }}>
                    {agent.phone}
                  </a>
                ) : null}
                <a href="/contact"
                  style={{ display: 'block', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', textAlign: 'center', padding: '10px 0', borderRadius: 6, fontWeight: 600, fontSize: 12, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)' }}>
                  Send a Message
                </a>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main>

            {/* ── CUSTOM CONTENT FIRST ── */}
            {bodyParas.length > 0 && (
              <div style={{ marginBottom: hasBlocks ? 40 : 56 }}>
                {bodyParas.map((para, i) => (
                  <p key={i} style={{ marginBottom: 18, color: 'var(--text)', lineHeight: 1.8, fontSize: 15 }}>{para}</p>
                ))}
              </div>
            )}

            {hasBlocks && !isCardBlocks && (
              <div style={{ marginBottom: 56 }}>
                {blocks.map((block, i) => renderBlock(block, i))}
              </div>
            )}

            {isCardBlocks && (
              <div style={{ marginBottom: 56 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 24 }}>
                  Why Work With {agent.name}?
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
                  {blocks.map((b, i) => renderBlock(b, i))}
                </div>
              </div>
            )}

            {/* ── SECTION 1 — Prepare & Get Pre-Approved ── */}
            <section id="sec-prep" className="buyers-section" style={{ marginBottom: 56 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 16 }}>Prepare &amp; Get Pre-Approved</h2>
              <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.9, marginBottom: 16 }}>
                Before you start touring homes, know your budget. Work with a mortgage broker to secure a pre-approval — it locks in your rate for 90–120 days and signals to sellers you&apos;re serious. {displayName} works with trusted BC mortgage specialists who can often pre-approve you within 24 hours, with access to 30+ lenders and no hard credit pull at the inquiry stage.
              </p>

              {/* Tip callout */}
              <aside style={{ background: 'rgba(var(--accent-rgb,201,169,76),0.08)', borderLeft: '4px solid var(--accent)', padding: '14px 18px', borderRadius: 4, fontSize: 14, marginBottom: 20, color: 'var(--text)' }}>
                <strong>{coAgents.length > 0 ? 'Pro tip:' : `${agent.name.split(' ')[0]}\u2019s tip:`}</strong> A pre-approval doesn&apos;t obligate you to buy — but it instantly upgrades your offer credibility in multiple-offer scenarios.
              </aside>

              {/* 3-col feature cards */}
              <div className="buyers-feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  { title: 'Know Your Budget', body: 'Pre-approval tells you exactly what you qualify for — no surprises at offer time.' },
                  { title: '24-Hour Pre-Approval', body: "Access to 30+ lenders for fast approvals. Get pre-approved before you start your search." },
                  { title: 'Rate Lock', body: 'Pre-approvals typically lock your rate for 90–120 days while you search the market.' },
                ].map(card => (
                  <div key={card.title} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: 18 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: 'var(--primary-bg)' }}>{card.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.7 }}>{card.body}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── SECTION 2 — Find Your Neighbourhood ── */}
            <section id="sec-search" className="buyers-section" style={{ marginBottom: 56 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 16 }}>Find Your Neighbourhood</h2>
              <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.9, marginBottom: 20 }}>
                Each area {displayName} serves offers a distinct lifestyle and price point. {displayName} will walk you through each area&apos;s trade-offs based on your priorities — schools, commute, property type, and budget.
              </p>

              {showAreaCards ? (
                <div className="buyers-area-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {areaCities.map(([city, n]) => (
                    <a key={city} href={`/neighbourhood/${n.slug}`} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: 18, textDecoration: 'none', display: 'block' }}>
                      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: 'var(--primary-bg)' }}>{city}</div>
                      <span style={{ display: 'inline-block', background: 'rgba(var(--accent-rgb,201,169,76),0.12)', color: 'var(--primary-bg)', fontSize: 11, padding: '3px 8px', borderRadius: 4, fontWeight: 600, marginBottom: 10 }}>
                        {getAreaTag(city)}
                      </span>
                      <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7, margin: '0 0 8px' }}>{getAreaDescription(city, n)}</p>
                      <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>See listings →</span>
                    </a>
                  ))}
                </div>
              ) : (
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px' }}>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.8, margin: 0 }}>
                    {displayName} will help you evaluate neighbourhoods based on your lifestyle, budget, and long-term goals. From schools and commute times to price trends and resale liquidity — every decision backed by local data.
                  </p>
                </div>
              )}

              <div style={{ marginTop: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <a href="/guide"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                  Explore Neighbourhood Guides →
                </a>
                <a href="/neighbourhoods"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontWeight: 500, fontSize: 14, textDecoration: 'none' }}>
                  Market Data by Neighbourhood →
                </a>
              </div>
            </section>

            {/* ── SECTION 3 — The Buying Process ── */}
            <section id="sec-process" className="buyers-section" style={{ marginBottom: 56 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 24 }}>The Buying Process</h2>
              <div className="buyers-process-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                {PROCESS_STEPS.map(step => (
                  <div key={step.num} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 24px' }}>
                    <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>STEP {step.num}</div>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10, color: 'var(--primary-bg)' }}>{step.title}</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.8, margin: 0 }}>{step.body}</p>
                  </div>
                ))}
              </div>

              {/* Dark CTA panel */}
              <div style={{ background: 'var(--primary-bg)', borderRadius: 10, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, marginBottom: 4 }}>See a home in person today</div>
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>Same-day showings available Mon–Sun. No commitment required.</div>
                </div>
                <a href="/contact"
                  style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '14px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', flexShrink: 0 }}>
                  Request a Showing
                </a>
              </div>
            </section>

            {/* ── SECTION 4 — Buyer Costs Breakdown ── */}
            <section id="sec-costs" className="buyers-section" style={{ marginBottom: 56 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 20 }}>Buyer Costs Breakdown</h2>
              <div className="buyers-costs-table">
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', fontSize: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr', padding: '10px 20px', background: 'var(--primary-bg)', gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Cost</div>
                    <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Amount</div>
                    <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Notes</div>
                  </div>
                  {BUYER_COSTS.map((row, i) => (
                    <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr', padding: '13px 20px', borderTop: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'var(--off-white)', gap: 8, alignItems: 'start' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-bg)' }}>{row.label}</div>
                      <div style={{ fontWeight: 600, color: 'var(--accent)', fontSize: 13 }}>{row.amount}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{row.notes}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── SECTION 5 — Get Pre-Qualified Free ── */}
            <section id="sec-prequalify" className="buyers-section" style={{ marginBottom: 56 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 8 }}>Get Pre-Qualified Free</h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
                {displayName} works with licensed BC mortgage brokers — no hard credit pull, no obligation, access to 30+ lenders.
              </p>
              <div className="buyers-prequalify-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start' }}>
                <div>
                  {/* Stat trio */}
                  <div style={{ display: 'flex', gap: 24, marginBottom: 28 }}>
                    {[{ v: '30+', l: 'Lenders' }, { v: '24hr', l: 'Pre-approval' }, { v: 'Free', l: 'No hard pull' }].map(s => (
                      <div key={s.l}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)' }}>{s.v}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.l}</div>
                      </div>
                    ))}
                  </div>

                  {/* FAQ accordion */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {BUYER_FAQS.map((faq) => (
                      <details key={faq.q} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                        <summary style={{ padding: '14px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: 'var(--primary-bg)', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {faq.q}
                          <span style={{ color: 'var(--accent)', fontSize: 18, flexShrink: 0, marginLeft: 12 }}>+</span>
                        </summary>
                        <div style={{ padding: '12px 18px 16px', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.8, borderTop: '1px solid var(--border)' }}>
                          {faq.a}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>

                <div>
                  <W3MortgagePreQual agent={agent} />
                </div>
              </div>

              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
              />
            </section>

            {/* ── RELATED LINKS ── */}
            <section style={{ borderTop: '1px solid var(--border)', paddingTop: 28, marginBottom: 48 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--primary-bg)' }}>Related Pages</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {uniqueCities.map(city => (
                  <a key={city}
                    href={`/homes-for-sale?city=${encodeURIComponent(city)}`}
                    style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>
                    Homes For Sale — {city}
                  </a>
                ))}
                <a href="/market" style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>Market Stats</a>
                <a href="/guide" style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>Neighbourhood Guides</a>
                <a href="/sellers" style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>Seller&apos;s Guide</a>
                <a href="/market?tab=archive" style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>Market Reports</a>
                <a href="/price-matrix" style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>Price Matrix</a>
              </div>
            </section>

            {/* ── AWARDS ── */}
            {awards.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 20 }}>Awards &amp; Recognition</h2>
                <div style={{ background: '#fff', borderRadius: 10, padding: '8px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                  {awards.map((a, i) => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < awards.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      {a.logo_url
                        ? <img src={a.logo_url} alt={a.organization || ''} style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} />
                        : <div style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: '50%', flexShrink: 0 }} />
                      }
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary-bg)' }}>{a.title}</div>
                        {(a.organization || a.year) && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{[a.organization, a.year].filter(Boolean).join(' · ')}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agent.license_number && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 16 }}>
                BC Real Estate License #{agent.license_number} · {agent.brokerage}
              </p>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
