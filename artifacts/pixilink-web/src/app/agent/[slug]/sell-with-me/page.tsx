import React from 'react'
import { headers } from 'next/headers'
import Image from 'next/image'
import { getAgent, getListings, getTestimonials, getTopRealtor, getAgentTerritories, agentCanonicalBase, resolveAgentPrefix } from '@/lib/api'
import { imgUrl, formatPrice, getHeroCredentials } from '@/lib/types'
import TestimonialsCards from '@/components/TestimonialsCards'
import { requireShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [agent, territories] = await Promise.all([getAgent(slug), getAgentTerritories(slug)])
  if (!agent) return {}
  const domain = agentCanonicalBase(agent)
  const cities = [...new Set(territories.map(t => t.city).filter(Boolean))].slice(0, 3).join(', ')
  return {
    title: `Sell Your Home | ${agent.name}`,
    description: `Sell your home in ${cities || 'the Lower Mainland'} with ${agent.name}. Strategic pricing, premium marketing, and expert negotiation to get you the best result.`,
    alternates: { canonical: `https://${domain}/sell-with-me` },
    openGraph: {
      title: `Sell Your Home | ${agent.name}`,
      description: `Strategic home-selling expertise in ${cities || 'your area'}. Get a free home evaluation today.`,
      url: `https://${domain}/sell-with-me`,
    },
  }
}

const SC_CHARCOAL  = '#1C1C1E'
const SC_GOLD      = '#9B8B7A'
const SC_OFF_WHITE = '#F5F3F0'
const PLAYFAIR: React.CSSProperties = { fontFamily: "var(--font-display),Georgia,serif" }

export default async function SellWithMePage({ params }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const [agent, territories, testimonials, topRealtor, soldResult] = await Promise.all([
    getAgent(slug),
    getAgentTerritories(slug),
    getTestimonials(slug),
    getTopRealtor(slug),
    getListings(slug, { status: 'Sold', limit: 6 }),
  ])

  if (!agent) notFound()
  requireShowcase(agent)

  const soldListings = soldResult.listings
  const domain = agentCanonicalBase(agent)
  const siteUrl = `https://${domain}`
  const firstName = agent.name.split(' ')[0]
  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 800) : null
  const credentials = getHeroCredentials(agent)
  const cities = [...new Set(territories.map(t => t.city).filter(Boolean))].slice(0, 4)
  const cityLabel = cities.length ? cities.join(', ') : 'the Lower Mainland'
  const ratings = testimonials.map(t => t.rating).filter((r): r is number => typeof r === 'number' && r > 0)
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to Sell Your Home in ${cityLabel} with ${agent.name}`,
    description: `A step-by-step guide to selling your home in ${cityLabel}. From free market evaluation to closing — ${firstName} guides you through every stage.`,
    image: photoSrc ?? undefined,
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Free Home Evaluation',
        text: `${firstName} prepares a detailed Comparative Market Analysis using real MLS® data. You'll know exactly where your home stands in today's market.`,
        url: `${siteUrl}/home-evaluation`,
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Preparation & Staging',
        text: `Professional staging consultation and targeted improvements to maximize buyer appeal — without overspending on renovations.`,
        url: `${siteUrl}/sell-with-me`,
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Premium Marketing',
        text: `Professional photography, curated listing description, MLS® syndication, social media campaigns, and targeted digital advertising.`,
        url: `${siteUrl}/sell-with-me`,
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: 'Offers & Negotiation',
        text: `${firstName} reviews every offer in detail, negotiates strategically on your behalf, and guides you to the strongest possible outcome.`,
        url: `${siteUrl}/sell-with-me`,
      },
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How does ${firstName} determine the right listing price?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: topRealtor?.sold_count && topRealtor.sold_count > 0
            ? `Drawing on ${topRealtor.sold_count}+ completed transactions, ${firstName} prepares a Comparative Market Analysis (CMA) using recent MLS® sales of comparable homes in your neighbourhood. This data-driven approach ensures your home is priced to attract qualified buyers while maximising your net proceeds.`
            : `${firstName} prepares a detailed Comparative Market Analysis (CMA) based on recent MLS® sales of comparable homes in your neighbourhood. This ensures your home is priced to attract qualified buyers while maximizing your net proceeds.`,
        },
      },
      {
        '@type': 'Question',
        name: `What marketing does ${firstName} provide for my listing?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Every listing includes professional photography, a staging consultation, MLS® exposure, social media marketing, and a dedicated online presence. High-traffic open houses and targeted digital ads are arranged as appropriate.',
        },
      },
      {
        '@type': 'Question',
        name: 'How long does it take to sell a home?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: topRealtor?.avg_dom && topRealtor.avg_dom > 0
            ? `${firstName}'s listings average ${Math.round(topRealtor.avg_dom)} days on market from list date to accepted offer. Market timing varies by area and property type, so during your free consultation ${firstName} will share current data for your specific neighbourhood.`
            : `Market timing varies by area and property type. During your free consultation, ${firstName} will share current market data for your specific neighbourhood.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Is the home evaluation really free?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes, completely free and no-obligation. ${firstName} will review your home's details and prepare a professional market analysis at no cost. There is no pressure to list.`,
        },
      },
    ],
  }

  return (
    <div style={{ fontFamily: "var(--font-body),'Helvetica Neue',sans-serif", overflowX: 'hidden' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* ── Hero ── */}
      <div style={{ background: SC_CHARCOAL }}>
        <div style={{ height: 3, background: `linear-gradient(90deg,${SC_GOLD} 0%,#c4b09a 50%,${SC_GOLD} 100%)` }} />
        <div className="container" style={{ padding: 'clamp(60px,10vw,96px) var(--container-padding)' }}>
          <div className="swm-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 56, alignItems: 'center' }}>
            <div>
              {credentials.length > 0 && (
                <p style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: SC_GOLD, fontWeight: 600, marginBottom: 16 }}>
                  {credentials[0]}
                </p>
              )}
              <h1 style={{ ...PLAYFAIR, fontSize: 'clamp(2.4rem,5vw,4rem)', fontWeight: 400, color: '#fff', lineHeight: 1.1, margin: '0 0 20px' }}>
                Sell Your Home<br />With Confidence.
              </h1>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.70)', lineHeight: 1.8, maxWidth: 480, margin: '0 0 32px' }}>
                Strategic pricing, premium marketing, and skilled negotiation — {firstName} handles every detail so you can focus on what&apos;s next.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href={ap('/home-evaluation')} style={{ background: SC_GOLD, color: SC_CHARCOAL, padding: '14px 28px', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block' }}>
                  Get My Free Evaluation
                </a>
                <a href={ap('/contact')} style={{ border: `1px solid rgba(155,139,122,0.45)`, color: SC_GOLD, padding: '14px 28px', fontWeight: 600, fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block' }}>
                  Book a Consultation
                </a>
              </div>
            </div>
            {photoSrc && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ position: 'relative', width: 320, maxWidth: '100%' }}>
                  <div style={{ aspectRatio: '3/4', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.55)' }}>
                    <Image src={photoSrc} alt={agent.name} fill unoptimized style={{ objectFit: 'cover', objectPosition: `${agent.photo_focal_x ?? 50}% ${agent.photo_focal_y ?? 15}%` }} />
                  </div>
                  <div style={{ position: 'absolute', top: -12, left: -12, right: 12, bottom: 12, border: `1px solid rgba(155,139,122,0.28)`, pointerEvents: 'none' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats bar */}
        {(topRealtor?.sold_count || avgRating) && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '20px 0' }}>
            <div className="container" style={{ display: 'flex', gap: '32px 48px', flexWrap: 'wrap' }}>
              {topRealtor?.sold_count ? (
                <div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{topRealtor.sold_count.toLocaleString()}+</div>
                  <div style={{ fontSize: 10, color: SC_GOLD, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>Homes Sold</div>
                </div>
              ) : null}
              {avgRating && ratings.length >= 3 ? (
                <div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{avgRating} ★</div>
                  <div style={{ fontSize: 10, color: SC_GOLD, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>Avg Rating ({ratings.length} reviews)</div>
                </div>
              ) : null}
              {topRealtor?.avg_dom != null ? (
                <div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{topRealtor.avg_dom}d</div>
                  <div style={{ fontSize: 10, color: SC_GOLD, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>Avg Days on Market</div>
                </div>
              ) : null}
              {cities.length > 0 ? (
                <div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{cities.length}</div>
                  <div style={{ fontSize: 10, color: SC_GOLD, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>Markets Served</div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* ── Selling Process ── */}
      <section style={{ background: '#fff', padding: 'clamp(56px,8vw,80px) 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD, textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>My Process</p>
            <h2 style={{ ...PLAYFAIR, fontSize: 'clamp(1.8rem,3vw,2.5rem)', fontWeight: 400, color: SC_CHARCOAL, margin: 0 }}>
              From Listing to Close
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }} className="swm-steps-grid">
            {[
              {
                n: '01',
                title: 'Free Home Evaluation',
                body: `${firstName} prepares a detailed Comparative Market Analysis using real MLS® data. You'll know exactly where your home stands in today's market.`,
              },
              {
                n: '02',
                title: 'Preparation & Staging',
                body: 'Professional staging consultation and targeted improvements to maximize buyer appeal — without overspending on renovations.',
              },
              {
                n: '03',
                title: 'Premium Marketing',
                body: 'Professional photography, curated listing description, MLS® syndication, social media campaigns, and targeted digital advertising.',
              },
              {
                n: '04',
                title: 'Offers & Negotiation',
                body: `${firstName} reviews every offer in detail, negotiates strategically on your behalf, and guides you to the strongest possible outcome.`,
              },
            ].map((step, idx) => (
              <div key={step.n} style={{ padding: '32px 28px', background: SC_OFF_WHITE, borderTop: `3px solid ${SC_GOLD}` }}>
                <div style={{ ...PLAYFAIR, fontSize: 40, fontWeight: 800, color: 'rgba(155,139,122,0.3)', lineHeight: 1, marginBottom: 16 }}>{step.n}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: SC_CHARCOAL, marginBottom: 12 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: '#555', lineHeight: 1.75, margin: 0 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Facts ── */}
      <section style={{ background: SC_CHARCOAL, padding: 'clamp(56px,8vw,80px) 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD, textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>By the Numbers</p>
            <h2 style={{ ...PLAYFAIR, fontSize: 'clamp(1.8rem,3vw,2.5rem)', fontWeight: 400, color: '#fff', margin: 0 }}>
              The Facts
            </h2>
          </div>
          {(() => {
            const currentYear = new Date().getFullYear()
            const licensedYear = agent.settings?.licensed_since ? parseInt(agent.settings.licensed_since, 10) : null
            const yearsActive = licensedYear && !isNaN(licensedYear) ? currentYear - licensedYear : null

            const rows: { label: string; value: React.ReactNode }[] = []

            if (licensedYear && yearsActive !== null && yearsActive > 0) {
              rows.push({
                label: 'Licensed since',
                value: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{licensedYear} <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.5)', fontSize: '0.9em' }}>({yearsActive} years)</span></span>,
              })
            }

            if (agent.brokerage) {
              rows.push({ label: 'Brokerage', value: agent.brokerage })
            }

            if (agent.license_number) {
              rows.push({ label: 'Licence', value: <span style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, "SFMono-Regular", monospace' }}>{agent.license_number}</span> })
            }

            if (topRealtor?.sold_count && topRealtor.sold_count > 0) {
              rows.push({
                label: 'Homes sold',
                value: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{topRealtor.sold_count.toLocaleString()}+</span>,
              })
            }

            if (topRealtor?.avg_dom && topRealtor.avg_dom > 0) {
              rows.push({
                label: 'Avg days on market',
                value: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(topRealtor.avg_dom)} days</span>,
              })
            }

            const langs = agent.settings?.languages
            const langsArr: string[] = Array.isArray(langs) ? langs : (langs ? String(langs).split(',').map((s: string) => s.trim()) : [])
            if (langsArr.length > 0) {
              rows.push({ label: 'Languages', value: langsArr.join(', ') })
            }

            if (rows.length === 0) return null

            return (
              <div style={{ maxWidth: 640, margin: '0 auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {rows.map(({ label, value }, i) => (
                      <tr key={label} style={{ borderTop: i === 0 ? '1px solid rgba(255,255,255,0.10)' : undefined, borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
                        <th
                          scope="row"
                          style={{
                            padding: '18px 0',
                            paddingRight: 32,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: SC_GOLD,
                            textAlign: 'left',
                            verticalAlign: 'top',
                            whiteSpace: 'nowrap',
                            width: '38%',
                          }}
                        >
                          {label}
                        </th>
                        <td
                          style={{
                            padding: '18px 0',
                            fontSize: 16,
                            fontWeight: 500,
                            color: '#F5F3F0',
                            verticalAlign: 'top',
                            lineHeight: 1.5,
                          }}
                        >
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>
      </section>

      {/* ── Awards & Credentials ── */}
      {topRealtor?.awards && topRealtor.awards.length > 0 && (
        <section style={{ background: SC_OFF_WHITE, padding: 'clamp(56px,8vw,80px) 0', borderTop: '1px solid #e5e0d8' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD, textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>Recognition</p>
              <h2 style={{ ...PLAYFAIR, fontSize: 'clamp(1.8rem,3vw,2.5rem)', fontWeight: 400, color: SC_CHARCOAL, margin: 0 }}>
                Awards &amp; Credentials
              </h2>
            </div>
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '10px 0', paddingRight: 24, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: SC_GOLD, textAlign: 'left', borderBottom: '2px solid #e0dbd2', width: '18%' }}>Year</th>
                    <th style={{ padding: '10px 0', paddingRight: 24, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: SC_GOLD, textAlign: 'left', borderBottom: '2px solid #e0dbd2' }}>Award</th>
                    <th style={{ padding: '10px 0', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: SC_GOLD, textAlign: 'left', borderBottom: '2px solid #e0dbd2' }}>Issued by</th>
                  </tr>
                </thead>
                <tbody>
                  {topRealtor.awards.map(award => (
                    <tr key={award.id} style={{ borderBottom: '1px solid #e5e0d8' }}>
                      <td style={{ padding: '16px 0', paddingRight: 24, fontSize: 13, fontWeight: 600, color: SC_GOLD, fontVariantNumeric: 'tabular-nums', verticalAlign: 'top' }}>
                        {award.year || '—'}
                      </td>
                      <td style={{ padding: '16px 0', paddingRight: 24, fontSize: 15, fontWeight: 600, color: SC_CHARCOAL, verticalAlign: 'top', lineHeight: 1.4 }}>
                        {award.title}
                        {award.description && (
                          <div style={{ fontSize: 12, fontWeight: 400, color: '#777', marginTop: 3 }}>{award.description}</div>
                        )}
                      </td>
                      <td style={{ padding: '16px 0', fontSize: 13, color: '#666', verticalAlign: 'top' }}>
                        {award.organization || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── Free Home Evaluation CTA ── */}
      <section style={{ background: SC_OFF_WHITE, padding: 'clamp(56px,8vw,80px) 0', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: 640 }}>
          <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD, textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>No Cost, No Obligation</p>
          <h2 style={{ ...PLAYFAIR, fontSize: 'clamp(2rem,3vw,2.8rem)', fontWeight: 400, color: SC_CHARCOAL, marginBottom: 16, lineHeight: 1.2 }}>
            What Is Your Home Worth?
          </h2>
          <p style={{ fontSize: 15, color: '#666', lineHeight: 1.75, marginBottom: 32 }}>
            {firstName} will review your property details and prepare a professional Comparative Market Analysis — at no cost to you. Real numbers, real data, no automated guesses.
          </p>
          <a href={ap('/home-evaluation')} style={{ display: 'inline-block', background: SC_CHARCOAL, color: '#fff', padding: '15px 36px', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', marginBottom: 16 }}>
            Get My Free Home Evaluation
          </a>
          <p style={{ fontSize: 12, color: '#888', marginTop: 12 }}>
            Or call {agent.phone ? <a href={`tel:${agent.phone}`} style={{ color: SC_CHARCOAL, fontWeight: 600 }}>{agent.phone}</a> : 'us'} to speak directly with {firstName}.
          </p>
        </div>
      </section>

      {/* ── Recently Sold ── */}
      {soldListings.length > 0 && (
        <section style={{ background: '#fff', padding: 'clamp(56px,8vw,80px) 0' }}>
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, gap: 16, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Track Record</p>
                <h2 style={{ ...PLAYFAIR, fontSize: 'clamp(1.8rem,3vw,2.5rem)', fontWeight: 400, color: SC_CHARCOAL, margin: 0 }}>
                  Recently Sold
                  {topRealtor?.sold_count && topRealtor.sold_count > 0 && (
                    <span style={{ fontSize: '0.5em', fontWeight: 400, color: SC_GOLD, marginLeft: 16 }}>{topRealtor.sold_count}+ homes sold</span>
                  )}
                </h2>
              </div>
              <a href={ap('/featured-properties')} style={{ fontSize: 12, fontWeight: 700, color: SC_CHARCOAL, textDecoration: 'none', borderBottom: `1px solid ${SC_GOLD}`, paddingBottom: 3, whiteSpace: 'nowrap' }}>
                Full Portfolio →
              </a>
            </div>
            <div className="swm-sold-grid">
              {soldListings.slice(0, 6).map(l => {
                const soldPriceNum = l.sold_price ? parseFloat(String(l.sold_price).replace(/[^0-9.]/g, '')) : 0
                const listPriceNum = l.list_price ? parseFloat(String(l.list_price).replace(/[^0-9.]/g, '')) : 0
                const pctDiff = soldPriceNum > 0 && listPriceNum > 0 ? ((soldPriceNum - listPriceNum) / listPriceNum * 100) : null
                const typeLabel = l.type === 'Apartment Unit' ? 'Condo' : l.type === 'House/Single Family' ? 'House' : l.type === '1/2 Duplex' ? 'Half Duplex' : l.type || ''
                const baths = l.baths % 1 === 0 ? l.baths.toFixed(0) : l.baths.toFixed(1)

                return (
                  <a key={l.id} href={`${agentPrefix}/sold/${l.mls_no}`} className="swm-sold-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit', background: '#fff', border: '1px solid #e8e3dc', transition: 'box-shadow 0.2s, transform 0.2s' }}>
                    {/* Photo */}
                    <div style={{ position: 'relative', paddingBottom: '62%', background: '#f3f0ec', overflow: 'hidden' }}>
                      {l.photo_url ? (
                        <img src={imgUrl(l.photo_url, 600)} alt={l.address}
                          loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                        </div>
                      )}
                      {/* SOLD badge */}
                      <div style={{ position: 'absolute', top: 10, left: 10, background: SC_CHARCOAL, color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '4px 10px' }}>
                        Sold
                      </div>
                      {/* Property type chip */}
                      {typeLabel && (
                        <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.92)', color: SC_CHARCOAL, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', padding: '3px 8px' }}>
                          {typeLabel}
                        </div>
                      )}
                    </div>
                    {/* Card body */}
                    <div style={{ padding: '18px 20px 20px' }}>
                      {/* Sold price + % diff */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ ...PLAYFAIR, fontSize: 22, fontWeight: 700, color: SC_CHARCOAL, fontVariantNumeric: 'tabular-nums' }}>
                          {soldPriceNum > 0 ? formatPrice(soldPriceNum) : '—'}
                        </span>
                        {pctDiff !== null && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: pctDiff >= 0 ? '#5a7a5a' : '#a05050', background: pctDiff >= 0 ? 'rgba(90,122,90,0.10)' : 'rgba(160,80,80,0.09)', padding: '2px 7px', letterSpacing: '0.04em' }}>
                            {pctDiff >= 0 ? '+' : ''}{pctDiff.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      {/* List price */}
                      {listPriceNum > 0 && (
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                          Listed: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatPrice(listPriceNum)}</span>
                        </div>
                      )}
                      {/* Address */}
                      <div style={{ fontSize: 13, fontWeight: 600, color: SC_CHARCOAL, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {l.address}
                      </div>
                      {/* Specs row */}
                      <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#888', flexWrap: 'wrap' }}>
                        {l.beds > 0 && <span>{l.beds} bd</span>}
                        {l.baths > 0 && <span>{baths} ba</span>}
                        {l.sqft > 0 && <span>{l.sqft.toLocaleString()} ft²</span>}
                        {l.dom !== null && l.dom !== undefined && <span style={{ marginLeft: 'auto' }}>{l.dom}d on market</span>}
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Testimonials ── */}
      {testimonials.length > 0 && (
        <section style={{ background: SC_OFF_WHITE, padding: 'clamp(56px,8vw,80px) 0' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD, textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>Client Stories</p>
              <h2 style={{ ...PLAYFAIR, fontSize: 'clamp(1.8rem,3vw,2.5rem)', fontWeight: 400, color: SC_CHARCOAL, margin: 0 }}>
                What My Sellers Say
              </h2>
            </div>
            <TestimonialsCards testimonials={testimonials} />
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      <section style={{ background: '#fff', padding: 'clamp(56px,8vw,80px) 0' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD, textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>FAQ</p>
            <h2 style={{ ...PLAYFAIR, fontSize: 'clamp(1.8rem,3vw,2.5rem)', fontWeight: 400, color: SC_CHARCOAL, margin: 0 }}>
              Common Questions
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              {
                q: `How does ${firstName} determine the right listing price?`,
                a: topRealtor?.sold_count && topRealtor.sold_count > 0
                  ? `Drawing on ${topRealtor.sold_count}+ completed transactions, ${firstName} prepares a Comparative Market Analysis (CMA) using recent MLS® sales of comparable homes in your neighbourhood. This data-driven approach ensures your home is priced to attract qualified buyers while maximising your net proceeds.`
                  : `${firstName} prepares a detailed Comparative Market Analysis (CMA) based on recent MLS® sales of comparable homes in your neighbourhood. This ensures your home is priced to attract qualified buyers while maximizing your net proceeds.`,
              },
              {
                q: `What marketing does ${firstName} provide for my listing?`,
                a: `Every listing includes professional photography, a staging consultation, MLS® exposure, social media marketing, and a dedicated online presence. High-traffic open houses and targeted digital ads are arranged as appropriate.`,
              },
              {
                q: 'How long does it take to sell a home?',
                a: topRealtor?.avg_dom && topRealtor.avg_dom > 0
                  ? `${firstName}'s listings average ${Math.round(topRealtor.avg_dom)} days on market from list date to accepted offer. Market timing varies by area and property type, so during your consultation ${firstName} will share current data specific to your neighbourhood.`
                  : `Market timing varies by area and property type. During your free consultation, ${firstName} will share current data for your specific neighbourhood.`,
              },
              {
                q: 'Is the home evaluation really free?',
                a: `Yes — completely free and no-obligation. ${firstName} will review your home's details and prepare a professional market analysis at no cost. There is no pressure to list.`,
              },
              {
                q: 'What are the costs of selling a home?',
                a: `Sellers typically pay a brokerage commission (split between buyer and seller agents) and legal fees. ${firstName} will walk you through a full cost breakdown during your consultation so there are no surprises.`,
              },
            ].map((item, idx, arr) => (
              <div key={idx} style={{ padding: '24px 0', borderBottom: idx < arr.length - 1 ? '1px solid #e5e0d8' : 'none' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: SC_CHARCOAL, marginBottom: 10 }}>{item.q}</h3>
                <p style={{ fontSize: 14, color: '#555', lineHeight: 1.75, margin: 0 }}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ background: SC_CHARCOAL, padding: 'clamp(56px,8vw,80px) 0', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ ...PLAYFAIR, fontSize: 'clamp(2rem,3vw,2.8rem)', fontWeight: 400, color: '#fff', marginBottom: 12 }}>
            Ready to Get Started?
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginBottom: 28, maxWidth: 460, margin: '0 auto 28px' }}>
            Contact {firstName} today for a no-obligation consultation or free home evaluation.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={ap('/home-evaluation')} style={{ background: SC_GOLD, color: SC_CHARCOAL, padding: '14px 28px', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block' }}>
              Free Home Evaluation
            </a>
            <a href={ap('/contact')} style={{ border: `1px solid rgba(155,139,122,0.45)`, color: SC_GOLD, padding: '14px 28px', fontWeight: 600, fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block' }}>
              Contact {firstName}
            </a>
          </div>
          {agent.phone && (
            <p style={{ marginTop: 24, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              Call direct: <a href={`tel:${agent.phone}`} style={{ color: SC_GOLD, textDecoration: 'none', fontWeight: 600 }}>{agent.phone}</a>
            </p>
          )}
        </div>
      </section>

      <style>{`
        .swm-sold-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.10); transform: translateY(-2px); }
        .swm-sold-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        @media (max-width: 1024px) {
          .swm-steps-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .swm-sold-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .swm-hero-grid { grid-template-columns: 1fr !important; }
          .swm-hero-grid > div:last-child { display: none !important; }
          .swm-steps-grid { grid-template-columns: 1fr !important; }
          .swm-sold-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
