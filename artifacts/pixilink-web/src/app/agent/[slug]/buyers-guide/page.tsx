import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getAgentTerritories, getListings, getMarketStats, resolveAgentPrefix, agentAreaDisplay } from '@/lib/api'
import { imgUrl, formatPrice } from '@/lib/types'
import ContactSidebarForm from '@/components/ContactSidebarForm'
import ListingStrip from '@/components/ListingStrip'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const [agent, territories] = await Promise.all([getAgent(slug), getAgentTerritories(slug).catch(() => [])])
  const shortArea = agentAreaDisplay(territories)
  const title = `Home Buyer's Guide — ${shortArea}`
  const description = `A step-by-step guide to buying a home in ${shortArea}. Pre-approval, offers, negotiations and closing — expert guidance from ${agent?.name || 'your local agent'}.`
  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

const steps = [
  {
    n: '01', title: 'Get Pre-Approved', icon: '📄',
    body: 'Before you look at a single listing, talk to a mortgage broker or bank. A pre-approval letter tells sellers you are serious and tells you exactly what you can afford. Do this before falling in love with a property.',
    tip: 'Budget for property transfer tax, legal fees and home inspection costs — typically 1.5–2.5% on top of the purchase price.',
  },
  {
    n: '02', title: 'Define What You Want', icon: '🗺️',
    body: 'Write down your must-haves vs. nice-to-haves. Neighbourhood, bedrooms, commute distance, school catchments, parking, strata vs. freehold — get specific before you start searching. The clearer you are, the faster you will find the right home.',
    tip: 'In this market, be ready to compromise on 2 of your 3 top priorities. Identify which 3 matter most.',
  },
  {
    n: '03', title: 'Work with a Local Agent', icon: '🤝',
    body: 'A buyer\'s agent costs you nothing — the seller pays both commissions. But the right agent makes an enormous difference: MLS access, off-market opportunities, negotiation strategy and deep knowledge of what specific properties are actually worth.',
    tip: 'Choose an agent who knows the specific neighbourhoods you are targeting — not just the broader city.',
  },
  {
    n: '04', title: 'Search & Shortlist', icon: '🔍',
    body: 'Once you know your budget and criteria, your agent will send you matching listings the moment they hit MLS. Act quickly in a sellers\' market — well-priced homes move fast. Book showings within 24 hours of a listing going live.',
    tip: 'Visit at different times of day. A quiet neighbourhood at noon may be very different at 5pm.',
  },
  {
    n: '05', title: 'Make an Offer', icon: '✍️',
    body: 'Your agent will prepare a contract of purchase and sale with price, deposit, subject conditions (financing, inspection) and a completion date. In competitive situations, your agent\'s advice on offer strategy is critical — don\'t rely on emotion.',
    tip: 'Subject to inspection is not optional. Never waive it unless you truly have the expertise and budget to handle unknown issues.',
  },
  {
    n: '06', title: 'Conditions & Due Diligence', icon: '🔎',
    body: 'Once subjects are in place, you have a window — typically 7–10 business days — to confirm financing and conduct your home inspection. Review the strata documents carefully if buying a condo or townhouse.',
    tip: 'Read every page of the strata documents. Special levies and underfunded depreciation reports are a red flag.',
  },
  {
    n: '07', title: 'Remove Subjects & Close', icon: '🔑',
    body: 'If everything checks out, you remove subjects and the sale is firm. You\'ll work with a notary or lawyer who handles the title transfer and financial settlement. On completion day, the keys are yours.',
    tip: 'Plan to take possession 1–3 days before your mortgage needs to close to give yourself buffer.',
  },
]

export default async function BuyersGuidePage({ params }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const [agent, stats, listings, territories] = await Promise.all([
    getAgent(slug),
    getMarketStats(slug),
    getListings(slug, { status: 'Active', limit: 4 }).then(r => r.listings),
    getAgentTerritories(slug).catch(() => []),
  ])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const shortArea = agentAreaDisplay(territories)
  const firstName = agent.name.split(' ')[0]
  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 400) : null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `Home Buyer's Guide — ${shortArea}`,
    description: `A step-by-step guide to buying a home in ${shortArea} with ${agent.name}.`,
    totalTime: 'P90D',
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.body,
    })),
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Hero */}
      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>Buyer&apos;s Guide</div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(26px,4vw,48px)', fontWeight: 400, lineHeight: 1.1, color: '#1a1a1a', marginBottom: 14, marginTop: 0, maxWidth: 640 }}>
            A Clear Path From Search to Keys
          </h1>
          <p style={{ fontSize: 15, color: '#555', maxWidth: 540, lineHeight: 1.75, marginBottom: 28 }}>
            Buying a home is the largest financial decision most people ever make. Here is exactly what to expect — from pre-approval to possession day.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href={ap('/homes-for-sale')} className="btn-primary" style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Browse Homes
            </a>
            <a href={ap('/contact')} style={{ border: '1px solid var(--border)', color: 'var(--text)', padding: '12px 22px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
              Talk to {firstName}
            </a>
          </div>
        </div>
      </div>

      {/* Market snapshot */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '20px 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14 }}>
            {[
              { l: 'Homes For Sale', v: String(stats.active_count) },
              { l: 'Avg List Price', v: stats.avg_list_price ? formatPrice(stats.avg_list_price) : '—' },
              { l: 'Avg Days on Market', v: stats.avg_dom != null ? `${stats.avg_dom}d` : '—' },
              { l: 'Sold Last 30 Days', v: String(stats.sold_last_30_days) },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center', padding: '12px 8px' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{s.v}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '56px var(--container-padding) 72px' }}>
        <div className="buyers-guide-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 56, alignItems: 'start' }}>
          {/* Guide steps */}
          <article>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 32 }}>The 7-Step Buying Process</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {steps.map((s, i) => (
                <div key={s.n} style={{ display: 'flex', gap: 20, paddingBottom: i < steps.length - 1 ? 36 : 0, position: 'relative' }}>
                  {i < steps.length - 1 && (
                    <div style={{ position: 'absolute', left: 20, top: 44, bottom: 0, width: 2, background: 'var(--border)' }} />
                  )}
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 12, color: 'var(--accent)', flexShrink: 0, border: '2px solid var(--accent)' }}>
                    {s.n}
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 20 }}>{s.icon}</span>
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary-bg)', margin: 0 }}>{s.title}</h3>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.8, margin: '0 0 12px' }}>{s.body}</p>
                    <div style={{ background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.25)', borderRadius: 7, padding: '10px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                      <strong style={{ color: 'var(--accent)' }}>💡 Tip: </strong>{s.tip}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Active listings strip */}
            {listings.length > 0 && (
              <section style={{ marginTop: 56 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', margin: 0 }}>Currently Available</h2>
                  <a href={ap('/homes-for-sale')} style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>View all listings →</a>
                </div>
                <ListingStrip listings={listings} columns={2} />
              </section>
            )}

            {/* Disclaimer */}
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.65, marginTop: 40 }}>
              {agent.license_number && `BC Real Estate License #${agent.license_number} · `}{agent.brokerage}. This guide is for informational purposes. {firstName} is available to advise you on your specific situation.
            </p>
          </article>

          {/* Sidebar */}
          <aside>
            <div style={{ position: 'sticky', top: 'calc(var(--nav-height,64px) + 16px)' }}>
              {photoSrc && (
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '20px', textAlign: 'center', marginBottom: 14 }}>
                  <img src={photoSrc} alt={agent.name} style={{ width: 80, height: 96, objectFit: 'cover', objectPosition: 'top', borderRadius: 8, border: '3px solid var(--accent)', marginBottom: 10 }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-bg)' }}>{agent.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 6 }}>{agent.brokerage}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Local expert in {shortArea}</div>
                  <a href={`tel:${agent.phone}`} style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--primary-bg)', textDecoration: 'none' }}>{agent.phone}</a>
                </div>
              )}
              <ContactSidebarForm agent={agent} mode="buyer" />
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .buyers-guide-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
