import { playfair } from '@/lib/fonts'
import { getAgent, getPage, getAwards, agentCanonicalBase, getAgentTerritories, agentAreaDisplay, resolveAgentPrefix } from '@/lib/api'
import { getCoAgents } from '@/lib/types'
import W2HomeEvaluation from '@/components/W2HomeEvaluation.client'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [agent, page, territories] = await Promise.all([
    getAgent(slug),
    getPage(slug, 'sellers'),
    getAgentTerritories(slug).catch(() => []),
  ])
  const coMeta = agent ? getCoAgents(agent) : []
  const agentName = agent
    ? coMeta.length > 0
      ? `${agent.name.split(' ')[0]} & ${coMeta[0].name.split(' ')[0]}`
      : agent.name
    : 'Your Agent'
  const shortArea = agentAreaDisplay(territories)
  const title = page?.meta_title || `Sell Your Home in ${shortArea} | ${agentName}`
  const description =
    page?.meta_description ||
    `Thinking of selling? ${agentName} provides expert pricing, professional marketing, and proven results across ${shortArea}. Get a free home evaluation today.`
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/sellers`

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `Home Selling Services — ${shortArea}`,
    serviceType: 'Real Estate Selling',
    description: `${agentName} helps homeowners sell their properties in ${shortArea} with expert pricing, professional marketing, and skilled negotiation.`,
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
      description: 'Free Home Evaluation — no obligation',
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

const SELLER_FAQS = [
  {
    q: 'What does it cost to sell my home in BC?',
    a: 'Seller\'s costs typically include real estate commission (commonly 3.22% on the first $100K + 1.15% on the balance, split between buyer and seller agents), legal/notary fees ($1,200–$2,000), and any agreed-upon repairs or staging costs. Your agent will provide a full net proceeds estimate before you commit to anything.',
  },
  {
    q: 'How long does it take to sell a home?',
    a: 'In a well-priced, well-marketed listing, homes in most BC markets sell within 2–4 weeks of going live. Your agent will give you a realistic timeline based on current absorption rates in your specific area and price range.',
  },
  {
    q: 'Should I renovate before selling?',
    a: 'In most cases, major renovations don\'t deliver a full return on investment. Targeted, low-cost improvements — fresh paint, professional cleaning, decluttering, and landscaping — tend to have the highest impact on buyer perception and final sale price. Your agent can advise which improvements are worthwhile for your specific home.',
  },
  {
    q: 'How is my listing price determined?',
    a: 'Your agent will prepare a Comparative Market Analysis (CMA) using recently sold properties in your neighbourhood that closely match your home\'s size, type, and features. Pricing is based on data, not automated estimates or uninformed optimism. Accurate pricing from day one results in more offers and a better final price.',
  },
  {
    q: 'What are subjects in a sales offer and should I accept them?',
    a: 'Subjects (conditions) are clauses a buyer includes — typically for financing and home inspection. A subject-free offer is stronger but carries more risk for the buyer. Your agent will help you evaluate the strength of each offer, including the risk profile of any subjects included.',
  },
  {
    q: 'How do I calculate my net proceeds from the sale?',
    a: 'Net proceeds = sale price minus mortgage payout, real estate commissions, legal fees, any repairs negotiated during subjects, and any other agreed costs. Your agent and lawyer will prepare a full statement of adjustments before completion so you know the exact amount you\'ll receive.',
  },
  {
    q: 'What happens on completion day?',
    a: 'On completion day, your lawyer or notary transfers the title to the buyer and receives the funds. Your mortgage is paid out, commissions are disbursed, and the balance is deposited to you. Possession typically takes place the following day, when the buyer receives the keys.',
  },
]

// Generic fallback steps — no geography-specific copy
const DEFAULT_STEPS = [
  { num: '01', title: 'Free Home Valuation', body: 'A precise market valuation using recent comparable sales in your immediate area — not automated estimates or averages from unrelated neighbourhoods.' },
  { num: '02', title: 'Prepare & Position', body: 'Identify improvements with real ROI, connect with trusted trades, and stage the listing to appeal to the most likely buyers.' },
  { num: '03', title: 'Professional Marketing', body: 'High-quality photography, a compelling listing write-up, and strategic exposure to buyers already active in the market.' },
  { num: '04', title: 'Negotiate Every Offer', body: 'Every offer is reviewed with your net proceeds in mind — not a quick close. Price, conditions, timeline: every term is negotiated on your behalf.' },
  { num: '05', title: 'Smooth Close', body: 'Coordinate with your lawyer, the buyer\'s agent, and your lender. You\'ll know exactly what\'s happening at every step until completion.' },
]

export default async function SellersPage({ params }: Props) {
  const { slug } = await params
  const [agent, page, awards, territories] = await Promise.all([
    getAgent(slug),
    getPage(slug, 'sellers'),
    getAwards(slug),
    getAgentTerritories(slug).catch(() => []),
  ])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const shortArea = agentAreaDisplay(territories)
  const coAgents = getCoAgents(agent)
  const displayName = coAgents.length > 0
    ? `${agent.name.split(' ')[0]} & ${coAgents[0].name.split(' ')[0]}`
    : agent.name
  const heroTitle    = page?.title    || `Sell Your Home in ${shortArea}`
  const heroSubtitle = page?.subtitle || 'Priced right, marketed hard, sold for what it\'s worth.'
  const ctaLabel     = page?.cta_label || 'Get a Home Evaluation'
  const ctaUrl       = page?.cta_url   || '#home-evaluation'

  const blocks     = (page?.blocks || []) as Block[]
  const hasBlocks  = blocks.length > 0
  const bodyParas  = page?.body?.split('\n\n').filter(Boolean) ?? []

  const isCardBlocks = hasBlocks && blocks.every(b => b.heading && b.text && !b.type)

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{ background: '#fff', padding: '56px 0', borderBottom: '1px solid #e5e7eb' }}>
        <div className="container">
          <div style={{ maxWidth: 700 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>Seller&apos;s Guide</div>
            <h1 className={playfair.className} style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 400, lineHeight: 1.15, marginBottom: 14, color: '#1a1a1a' }}>{heroTitle}</h1>
            <p style={{ fontSize: 15, color: '#555', lineHeight: 1.75, maxWidth: 540, marginBottom: 28 }}>{heroSubtitle}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href={ctaUrl}
                style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '12px 26px', borderRadius: 6, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none' }}>
                {ctaLabel}
              </a>
              {agent.phone && (
                <a href={`tel:${agent.phone}`}
                  style={{ border: '1px solid #d1d5db', color: '#374151', padding: '12px 26px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                  Call {agent.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '64px var(--container-padding)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 56 }}>
          <div>

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
                  What You Get When You List With {displayName}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
                  {blocks.map((b, i) => renderBlock(b, i))}
                </div>
              </div>
            )}

            {/* ── GENERIC FALLBACK ── */}
            {!hasBlocks && bodyParas.length === 0 && (
              <div style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 16 }}>Working With {displayName}</h2>
                {agent.bio ? (
                  <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.8 }}>{agent.bio.slice(0, 300)}{agent.bio.length > 300 ? '…' : ''}</p>
                ) : (
                  <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.8 }}>
                    {displayName} delivers accurate pricing, professional marketing, and skilled negotiation to get you the best possible outcome when selling your home.
                  </p>
                )}
              </div>
            )}

            {/* ── SELLING STEPS — always shown, no geography lock-in ── */}
            <div style={{ marginBottom: 56 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 28 }}>How It Works</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {DEFAULT_STEPS.map((step, i) => (
                  <div key={step.num} style={{ display: 'flex', gap: 24, paddingBottom: i < DEFAULT_STEPS.length - 1 ? 32 : 0, position: 'relative' }}>
                    {i < DEFAULT_STEPS.length - 1 && (
                      <div style={{ position: 'absolute', left: 19, top: 48, bottom: 0, width: 2, background: 'var(--border)' }} />
                    )}
                    <div style={{ flexShrink: 0, width: 40, height: 40, background: 'var(--primary-bg)', color: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, zIndex: 1 }}>
                      {step.num}
                    </div>
                    <div style={{ paddingTop: 8 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 6 }}>{step.title}</h3>
                      <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.75, margin: 0 }}>{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── HOME EVALUATION WIDGET ── */}
            <div id="home-evaluation" style={{ marginBottom: 56, scrollMarginTop: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 8 }}>What&apos;s Your Home Worth?</h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
                {agent.name}&apos;s home evaluation is a detailed Comparative Market Analysis based on real sold data in your neighbourhood — not an automated estimate. Free and with no obligation.
              </p>
              <W2HomeEvaluation agent={agent} />
            </div>

            {/* ── SELLER'S FAQ ── */}
            <div style={{ marginBottom: 56 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 8 }}>Seller&apos;s FAQ</h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>Common questions from sellers working with {displayName}.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SELLER_FAQS.map((faq) => (
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
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'FAQPage',
                  mainEntity: SELLER_FAQS.map(faq => ({
                    '@type': 'Question',
                    name: faq.q,
                    acceptedAnswer: { '@type': 'Answer', text: faq.a },
                  })),
                }) }}
              />
            </div>

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

            {/* ── RELATED LINKS ── */}
            <section style={{ borderTop: '1px solid var(--border)', paddingTop: 28, marginBottom: 48 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--primary-bg)' }}>Related Pages</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <a href={ap('/market')} style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>Market Stats</a>
                <a href={ap('/guide')} style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>Neighbourhood Guides</a>
                <a href={ap('/buyers')} style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>Buyers Guide</a>
                <a href={ap('/my-listings')} style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>Featured Listings</a>
                <a href={ap('/contact')} style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>Contact</a>
              </div>
            </section>

            {agent.license_number && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 16 }}>
                BC Real Estate License #{agent.license_number} · {agent.brokerage}
              </p>
            )}
          </div>

          {/* Sticky sidebar */}
          <div>
            <div style={{ position: 'sticky', top: 24 }}>
              <W2HomeEvaluation agent={agent} neighbourhood={shortArea} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
