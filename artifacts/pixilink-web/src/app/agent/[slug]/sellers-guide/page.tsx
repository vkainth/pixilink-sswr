import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getAgentTerritories, getMarketStats, getListings, resolveAgentPrefix, agentAreaDisplay } from '@/lib/api'
import { imgUrl, formatPrice } from '@/lib/types'
import ContactSidebarForm from '@/components/ContactSidebarForm'
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
  const title = `Home Seller's Guide — ${shortArea}`
  const description = `How to sell your home for maximum value in ${shortArea}. Pricing, marketing, negotiation and closing — expert guidance from ${agent?.name || 'your local agent'}.`
  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

const steps = [
  {
    n: '01', title: 'Get a Market Evaluation', icon: '📊',
    body: 'The biggest mistake sellers make is pricing too high. An overpriced home sits, accumulates days on market, and typically sells for less than it would have at the right price. Get a realistic CMA first.',
    tip: 'Online estimates (Zillow, etc.) can be off by 10–20% or more. Only a local agent reviewing actual comparable sales gives you an accurate number.',
  },
  {
    n: '02', title: 'Prepare the Property', icon: '🏠',
    body: 'First impressions drive offers. Declutter, deep clean, address deferred maintenance and improve curb appeal. Professional staging — even partial staging — typically returns 5–10x its cost in sale price.',
    tip: 'Buyers evaluate homes emotionally first and logically second. Smell, light and first impressions matter disproportionately.',
  },
  {
    n: '03', title: 'Professional Photography & Marketing', icon: '📸',
    body: 'Over 95% of buyers search online before ever visiting a property. Professional photography, a floor plan, and in some cases a video walkthrough, dramatically increase clicks and showings. Do not cut corners here.',
    tip: 'Twilight photography, aerial drone shots and 3D tours are worth the investment for higher-value homes.',
  },
  {
    n: '04', title: 'MLS Launch & Exposure', icon: '📣',
    body: 'Your listing goes live on MLS®, which syncs automatically to Realtor.ca and hundreds of buyer-agent feeds. Social media, agent-to-agent marketing and targeted digital ads extend your reach to the right buyers.',
    tip: 'The first 7–10 days on market are the most critical. Price correctly from day one — do not test the market.',
  },
  {
    n: '05', title: 'Showings & Open Houses', icon: '🔑',
    body: 'Your agent coordinates all showings and provides feedback. Flexibility with viewing requests matters. A well-presented home that is easy to show generates more offers. Consider a strategic open house in the first week.',
    tip: 'Plan to vacate for all showings — buyers want to imagine themselves in the space, not feel like guests.',
  },
  {
    n: '06', title: 'Offers & Negotiation', icon: '✍️',
    body: 'When offers arrive, your agent reviews every term: price, subject conditions, deposit, completion date and inclusions. The highest price is not always the best offer. Your agent\'s negotiation experience here can be worth tens of thousands.',
    tip: 'A clean offer with strong subjects from a pre-approved buyer is often worth more than a higher price with weak conditions.',
  },
  {
    n: '07', title: 'Accepted Offer to Closing', icon: '🎉',
    body: 'Once subjects are removed, the sale is firm. Your notary or lawyer handles the title transfer and distribution of funds. On completion day, the keys change hands and the funds are released to you.',
    tip: 'Coordinate your move-out date to align with possession day. Leaving a home clean and in good condition is both required and appreciated.',
  },
]

export default async function SellersGuidePage({ params }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const [agent, stats, recentSold, territories] = await Promise.all([
    getAgent(slug),
    getMarketStats(slug),
    getListings(slug, { status: 'Sold', limit: 3 }).then(r => r.listings),
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
    name: `Home Seller's Guide — ${shortArea}`,
    description: `A step-by-step guide to selling your home for maximum value in ${shortArea} with ${agent.name}.`,
    totalTime: 'P60D',
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
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>Seller&apos;s Guide</div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(26px,4vw,48px)', fontWeight: 400, lineHeight: 1.1, color: '#1a1a1a', marginBottom: 14, marginTop: 0, maxWidth: 640 }}>
            Priced Right. Marketed Hard. Sold.
          </h1>
          <p style={{ fontSize: 15, color: '#555', maxWidth: 540, lineHeight: 1.75, marginBottom: 28 }}>
            Selling your home is not complicated — but it is consequential. Here is exactly how {firstName} maximises your sale price from start to close.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href={ap('/home-evaluation')} style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '12px 24px', borderRadius: 6, fontWeight: 700, fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase', textDecoration: 'none' }}>
              Get a Free Evaluation
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
              { l: 'Sold Last 30 Days', v: String(stats.sold_last_30_days) },
              { l: 'Avg Sold Price', v: stats.avg_sold_price ? formatPrice(stats.avg_sold_price) : '—' },
              { l: 'Avg Days on Market', v: stats.avg_dom != null ? `${stats.avg_dom}d` : '—' },
              { l: 'Homes For Sale', v: String(stats.active_count) },
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
        <div className="sellers-guide-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 56, alignItems: 'start' }}>
          {/* Guide steps */}
          <article>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 32 }}>The 7-Step Selling Process</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {steps.map((s, i) => (
                <div key={s.n} style={{ display: 'flex', gap: 20, paddingBottom: i < steps.length - 1 ? 36 : 0, position: 'relative' }}>
                  {i < steps.length - 1 && (
                    <div style={{ position: 'absolute', left: 20, top: 44, bottom: 0, width: 2, background: 'var(--border)' }} />
                  )}
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 12, color: 'var(--primary-bg)', flexShrink: 0 }}>
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

            {/* Recent sold proof */}
            {recentSold.length > 0 && (
              <section style={{ marginTop: 56 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 6 }}>Recent Sales Results</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
                  Recent examples of what has sold — and for how much.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recentSold.map(s => {
                    const ratio = s.sold_price && s.list_price ? Math.round((s.sold_price / s.list_price) * 100) : null
                    return (
                      <div key={s.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{s.address}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.type} · {s.beds} bed{s.sqft > 0 ? ` · ${s.sqft.toLocaleString()} ft²` : ''}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>{formatPrice(s.sold_price || s.list_price)}</div>
                          {ratio != null && <div style={{ fontSize: 11, color: ratio >= 100 ? '#16a34a' : '#6b7280', fontWeight: 600 }}>{ratio}% of list price</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: 12 }}>
                  <a href={ap('/sold')} style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>View all sold listings →</a>
                </div>
              </section>
            )}

            {agent.license_number && (
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.65, marginTop: 40 }}>
                BC Real Estate License #{agent.license_number} · {agent.brokerage}. This guide is for informational purposes only.
              </p>
            )}
          </article>

          {/* Sidebar */}
          <aside>
            <div style={{ position: 'sticky', top: 'calc(var(--nav-height,64px) + 16px)' }}>
              {photoSrc && (
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '20px', textAlign: 'center', marginBottom: 14 }}>
                  <img src={photoSrc} alt={agent.name} style={{ width: 80, height: 96, objectFit: 'cover', objectPosition: 'top', borderRadius: 8, border: '3px solid var(--accent)', marginBottom: 10 }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-bg)' }}>{agent.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 6 }}>{agent.brokerage}</div>
                  <a href={`tel:${agent.phone}`} style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--primary-bg)', textDecoration: 'none' }}>{agent.phone}</a>
                </div>
              )}
              <div style={{ background: 'rgba(var(--accent-rgb),0.10)', border: '1px solid var(--accent)', borderRadius: 10, padding: '16px 18px', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 4 }}>What&apos;s your home worth?</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                  Get a free CMA from {firstName} — no obligation, delivered within 48 hours.
                </div>
                <a href={ap('/home-evaluation')} style={{ display: 'block', marginTop: 12, background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '10px', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none', textAlign: 'center' }}>
                  Free Home Evaluation
                </a>
              </div>
              <ContactSidebarForm agent={agent} mode="seller" />
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .sellers-guide-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
