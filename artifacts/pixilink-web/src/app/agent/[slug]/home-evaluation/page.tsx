import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getMarketStats, getListings, resolveAgentPrefix, getAgentTerritories, agentAreaDisplay } from '@/lib/api'
import { imgUrl, formatPrice } from '@/lib/types'
import W2HomeEvaluation from '@/components/W2HomeEvaluation'
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
  const [agent, territories] = await Promise.all([
    getAgent(slug),
    getAgentTerritories(slug).catch(() => []),
  ])
  const shortArea = agentAreaDisplay(territories)
  const title = `Free Home Evaluation — ${agent?.name || 'Your Agent'} | ${shortArea}`
  const description = `Get a free, no-obligation market evaluation from ${agent?.name || 'your local agent'}. Find out what your home is worth based on real recent MLS® sales data.`
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function HomeEvaluationPage({ params }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const [agent, stats, recentSoldAll, territories] = await Promise.all([
    getAgent(slug),
    getMarketStats(slug),
    getListings(slug, { status: 'Sold', limit: 10 }).then(r => r.listings),
    getAgentTerritories(slug).catch(() => []),
  ])
  if (!agent) notFound()

  const shortArea = agentAreaDisplay(territories)
  const firstName = agent.name.split(' ')[0]
  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 600) : null

  const recentSold = recentSoldAll.slice(0, 3)

  const soldToListQualifying = recentSoldAll.filter(s => Number(s.sold_price) > 0 && Number(s.list_price) > 0)
  const soldToListRatio = soldToListQualifying.length >= 3
    ? {
        ratio: (soldToListQualifying.reduce((sum, s) => sum + (Number(s.sold_price) / Number(s.list_price) * 100), 0) / soldToListQualifying.length).toFixed(1),
        n: soldToListQualifying.length,
      }
    : null

  const reviewValue = agent.settings?.hero_stats?.stat2_value?.trim()
  const reviewLabel = agent.settings?.hero_stats?.stat2_label?.trim() || 'Google Reviews'

  const steps = [
    { n: '01', title: 'Submit Your Address', body: 'Fill in the form with your address, property type and any notes about your home. The more detail the better.' },
    { n: '02', title: 'Comparable Sales Analysis', body: `${firstName} reviews every comparable sale in your neighbourhood — same type, similar size, recent dates. No automated estimates.` },
    { n: '03', title: 'Receive Your CMA', body: `You receive a personalised Comparative Market Analysis (CMA) — a realistic price range backed by real data, not an algorithm.` },
    { n: '04', title: 'No Pressure Follow-Up', body: `${firstName} will go through the numbers with you. No obligation to list — just honest information so you can make a confident decision.` },
  ]

  const whyItems = [
    { icon: '📊', title: 'Real MLS® data', body: `${firstName} works with actual sold prices — not Zestimate-style estimates that can be off by 10–20%.` },
    { icon: '🏘️', title: 'Neighbourhood expertise', body: `Price differences can be dramatic even within the same neighbourhood. ${firstName} knows the micro-market differences.` },
    { icon: '⏱️', title: 'Fast turnaround', body: 'Most CMAs are delivered within 24–48 hours. Sometimes faster.' },
    { icon: '🤝', title: 'No obligation', body: 'A market evaluation is not a commitment to sell. Many homeowners get an annual CMA just to track equity.' },
  ]

  const agentDomain = agent.settings?.custom_domain || `${slug}.pixilink.com`

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Free Home Evaluation',
      description: 'Comparative Market Analysis (CMA) — free, no-obligation property valuation based on real MLS® sold data.',
      provider: {
        '@type': 'RealEstateAgent',
        '@id': `https://${agentDomain}/#agent`,
        name: agent.name,
        telephone: agent.phone,
      },
      areaServed: territories.length
        ? territories.map(t => ({ '@type': 'City', name: t.city })).filter((v, i, a) => a.findIndex(x => x.name === v.name) === i)
        : [{ '@type': 'City', name: shortArea }],
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'CAD', description: 'Free, no-obligation CMA' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: `How to Get a Free Home Evaluation from ${agent.name}`,
      description: 'A Comparative Market Analysis (CMA) delivered in 24–48 hours — based on real MLS® sold data, no automated estimates.',
      step: steps.map(s => ({
        '@type': 'HowToStep',
        name: s.title,
        text: s.body,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is the home evaluation really free?',
          acceptedAnswer: { '@type': 'Answer', text: `Yes, completely free and no-obligation. ${firstName} will review your home's details and prepare a professional Comparative Market Analysis at no cost. There is no pressure to list.` },
        },
        {
          '@type': 'Question',
          name: 'How long does it take to receive my home evaluation?',
          acceptedAnswer: { '@type': 'Answer', text: 'Most Comparative Market Analyses (CMAs) are delivered within 24–48 hours of your request. Sometimes faster.' },
        },
        {
          '@type': 'Question',
          name: 'How is a CMA different from an online home value estimate?',
          acceptedAnswer: { '@type': 'Answer', text: `A CMA is prepared by ${firstName} using real, recently sold properties that closely match your home in type, size, and location. Online estimates can be off by 10–20% because they rely on algorithms with incomplete local data. A CMA is specific to your property.` },
        },
        {
          '@type': 'Question',
          name: 'Do I need to list my home to get a free evaluation?',
          acceptedAnswer: { '@type': 'Answer', text: 'No. Many homeowners get an annual CMA to track their equity or plan ahead. You are under no obligation to sell after receiving your evaluation.' },
        },
        ...(soldToListRatio ? [{
          '@type': 'Question',
          name: `What is ${firstName}'s list-to-sold ratio?`,
          acceptedAnswer: { '@type': 'Answer', text: `${firstName}'s recent listings sold at an average of ${soldToListRatio.ratio}% of list price across ${soldToListRatio.n} sales — reflecting well-priced, market-accurate valuations.` },
        }] : []),
      ],
    },
  ]

  return (
    <div style={{ background: 'var(--site-canvas)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Hero */}
      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--site-rule)' }}>
        <div className="container">
          <div className="eval-hero" style={{ display: 'grid', gridTemplateColumns: photoSrc ? '1fr 180px' : '1fr', gap: 40, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>Free Home Evaluation</div>
              <h1 className={playfair.className} style={{ fontSize: 'clamp(26px,4vw,48px)', fontWeight: 400, lineHeight: 1.1, color: '#1a1a1a', marginBottom: 14, marginTop: 0, maxWidth: 620 }}>
                What Is Your Home Worth in Today&apos;s Market?
              </h1>
              <p style={{ fontSize: 15, color: '#555', maxWidth: 520, lineHeight: 1.75, marginBottom: soldToListRatio ? 12 : 0 }}>
                Get a free, no-obligation Comparative Market Analysis from {agent.name} — based on real sold prices, not automated estimates.
              </p>
              {soldToListRatio && (
                <p style={{ fontSize: 14, color: '#555', maxWidth: 520, lineHeight: 1.75, marginBottom: 0, fontStyle: 'italic' }}>
                  {firstName}&apos;s recent listings sold at an average of {soldToListRatio.ratio}% of list price across {soldToListRatio.n} sales.
                </p>
              )}
            </div>
            {photoSrc && (
              <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--site-rule)' }}>
                <img src={photoSrc} alt={agent.name} style={{ width: '100%', display: 'block', aspectRatio: '3/4', objectFit: 'cover', objectPosition: 'top' }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Credential strip — only rendered when real review data is configured */}
      {reviewValue && (
        <div style={{ background: 'var(--site-ink)', padding: '10px 0' }}>
          <div className="container">
            <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.88)', fontWeight: 500, lineHeight: 1.5 }}>
              <strong style={{ color: '#fff' }}>
                {reviewValue} {reviewLabel}
              </strong>
            </p>
          </div>
        </div>
      )}

      {/* Market snapshot */}
      {(stats.avg_sold_price || stats.avg_dom != null) && (
        <div style={{ background: '#fff', borderBottom: '1px solid var(--site-rule)', padding: '16px 0' }}>
          <div className="container">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {stats.avg_sold_price && (
                <div style={{ background: 'var(--site-canvas)', border: '1px solid var(--site-rule)', borderRadius: 8, padding: '10px 18px' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--site-accent-text)' }}>{formatPrice(stats.avg_sold_price)}</div>
                  <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Sold Price</div>
                </div>
              )}
              {stats.avg_dom != null && (
                <div style={{ background: 'var(--site-canvas)', border: '1px solid var(--site-rule)', borderRadius: 8, padding: '10px 18px' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--site-accent-text)' }}>{stats.avg_dom}d</div>
                  <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Days on Market</div>
                </div>
              )}
              <div style={{ background: 'var(--site-canvas)', border: '1px solid var(--site-rule)', borderRadius: 8, padding: '10px 18px' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--site-accent-text)' }}>{stats.sold_last_30_days}</div>
                <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sold Last 30 Days</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container" style={{ padding: '56px var(--container-padding) 72px' }}>
        <div className="home-eval-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 56, alignItems: 'start' }}>
          {/* Left */}
          <div>
            {/* How it works */}
            <section style={{ marginBottom: 56 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--site-ink)', marginBottom: 8 }}>How It Works</h2>
              <p style={{ fontSize: 14, color: 'var(--site-muted)', marginBottom: 28, lineHeight: 1.7 }}>
                A Comparative Market Analysis is the most accurate way to know what your home will actually sell for — not what Zillow says.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {steps.map((s, i) => (
                  <div key={s.n} style={{ display: 'flex', gap: 20, paddingBottom: i < steps.length - 1 ? 28 : 0, position: 'relative' }}>
                    {i < steps.length - 1 && (
                      <div style={{ position: 'absolute', left: 20, top: 44, bottom: 0, width: 2, background: 'var(--site-rule)' }} />
                    )}
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: agent.theme_color || '#111111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: agent.primary_bg_color || '#14213d', flexShrink: 0 }}>
                      {s.n}
                    </div>
                    <div style={{ paddingTop: 8 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--site-ink)', marginBottom: 6 }}>{s.title}</div>
                      <p style={{ fontSize: 14, color: 'var(--site-body)', lineHeight: 1.7, margin: 0 }}>{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Why a CMA */}
            <section style={{ marginBottom: 56 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--site-ink)', marginBottom: 22 }}>Why Get a CMA?</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
                {whyItems.map(item => (
                  <div key={item.title} style={{ background: '#fff', border: '1px solid var(--site-rule)', borderRadius: 10, padding: '20px 22px' }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--site-ink)', marginBottom: 8 }}>{item.title}</div>
                    <p style={{ fontSize: 13, color: 'var(--site-body)', lineHeight: 1.65, margin: 0 }}>{item.body}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent sales context */}
            {recentSold.length > 0 && (
              <section>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--site-ink)', marginBottom: 6 }}>Recent Sales Across the Region</h2>
                <p style={{ fontSize: 13, color: 'var(--site-muted)', marginBottom: 18 }}>Real MLS® sold data — a sample of what comparable properties have actually sold for.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recentSold.map(s => (
                    <div key={s.id} style={{ background: '#fff', border: '1px solid var(--site-rule)', borderRadius: 8, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--site-body)' }}>{s.address}</div>
                        <div style={{ fontSize: 12, color: 'var(--site-muted)' }}>{s.type} · {s.beds} bed · {s.sqft > 0 ? `${s.sqft.toLocaleString()} ft²` : ''}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--site-accent-text)' }}>{formatPrice(s.sold_price || s.list_price)}</div>
                        {s.dom != null && <div style={{ fontSize: 11, color: 'var(--site-muted)' }}>{s.dom}d on market</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12 }}>
                  <a href={ap('/sold')} style={{ fontSize: 13, color: 'var(--site-accent-text)', fontWeight: 600, textDecoration: 'none' }}>View all recent sales →</a>
                </div>
              </section>
            )}
          </div>

          {/* Right: form */}
          <div style={{ position: 'sticky', top: 'calc(var(--nav-height,64px) + 16px)' }}>
            <W2HomeEvaluation agent={agent} />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .home-eval-grid { grid-template-columns: 1fr !important; }
          .eval-hero { grid-template-columns: 1fr !important; }
          .eval-hero > div:last-child { display: none !important; }
        }
      `}</style>
    </div>
  )
}
