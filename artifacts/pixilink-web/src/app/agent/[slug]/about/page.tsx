import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getTopRealtor, getAwards, getMedia, getNeighbourhoods, getTestimonials, getOwnListings, resolveAgentPrefix, getAgentTerritories, agentAreaDisplay, agentCanonicalBase } from '@/lib/api'
import { imgUrl, formatPrice, getCoAgents, resolveSiteConfig } from '@/lib/types'
import { buildSoldFaqs } from '@/lib/agent-profile'
import AgentPhotoWithFallback from '@/components/AgentPhotoWithFallback.client'
import ContactSidebarForm from '@/components/ContactSidebarForm'
import TestimonialsStrip from '@/components/TestimonialsStrip'
import PageQuickLinks from '@/components/PageQuickLinks'
import W2HomeEvaluation from '@/components/W2HomeEvaluation.client'
import ListingStrip from '@/components/ListingStrip'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

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
  const title = `About ${agent?.name || 'Your Agent'} — ${shortArea} REALTOR®`
  const description = agent?.bio?.slice(0, 160) || `${agent?.name || 'Your local agent'} is a real estate professional serving ${shortArea}. Learn about their track record, approach and areas of expertise.`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      ...(agent?.photo_path ? { images: [{ url: agent.photo_path }] } : {}),
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function AboutPage({ params }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const [agent, topRealtor, awards, media, neighbourhoods, testimonials, ownActive, ownSold] = await Promise.all([
    getAgent(slug),
    getTopRealtor(slug),
    getAwards(slug),
    getMedia(slug),
    getNeighbourhoods(slug),
    getTestimonials(slug),
    getOwnListings(slug, { status: 'Active', limit: 4 }),
    getOwnListings(slug, { status: 'Sold', limit: 20 }),
  ])
  if (!agent) notFound()

  const isShowcasePreset = resolveSiteConfig(agent).layout_preset === 'showcase'

  // SC palette — explicit colours for showcase agents (no CSS var fallbacks)
  const C = {
    heading:          isShowcasePreset ? '#1C1C1E'           : 'var(--primary-bg)',
    body:             isShowcasePreset ? '#3D3D3D'           : 'var(--text)',
    muted:            isShowcasePreset ? '#6b6b6b'           : 'var(--text-muted)',
    border:           isShowcasePreset ? '#e8e3dc'           : 'var(--border)',
    accent:           isShowcasePreset ? '#9B8B7A'           : 'var(--accent)',
    bg:               isShowcasePreset ? '#F5F3F0'           : 'var(--off-white)',
    ctaPrimary:       isShowcasePreset ? '#9B8B7A'           : 'var(--cta-primary)',
    ctaPrimaryText:   isShowcasePreset ? '#fff'              : 'var(--cta-primary-text)',
    ctaSecBorder:     isShowcasePreset ? '#9B8B7A'           : 'var(--cta-secondary-border)',
    ctaSecText:       isShowcasePreset ? '#1C1C1E'           : 'var(--cta-secondary-text)',
    phoneLink:        isShowcasePreset ? '#9B8B7A'           : 'var(--primary-bg)',
  } as const

  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 600) : null
  const bioParagraphs = agent.bio?.split('\n\n').filter(Boolean) || []
  const coAgents = getCoAgents(agent)
  const isDualAgent = coAgents.length > 0
  const coAgent = coAgents[0] || null
  const coAgentBioParagraphs = coAgent?.bio?.split('\n\n').filter(Boolean) || []

  // Track-record stats from the data layer (no fabricated numbers)
  const stats: { value: string; label: string }[] = []
  if (topRealtor) {
    if (topRealtor.sold_count) stats.push({ value: topRealtor.sold_count.toLocaleString(), label: 'Homes Sold' })
    if (topRealtor.sold_volume) stats.push({ value: formatPrice(topRealtor.sold_volume), label: 'Sales Volume' })
    if (topRealtor.avg_dom != null) stats.push({ value: `${topRealtor.avg_dom}`, label: 'Avg Days on Market' })
    if (topRealtor.active_count) stats.push({ value: topRealtor.active_count.toLocaleString(), label: 'Homes For Sale' })
  }

  const headshot = media.find((m) => m.type === 'headshot') ?? null
  const galleryMedia = media.filter((m) => m.collection === 'gallery')

  const photoFallback = agent.settings?.photo_fallback_url ?? null

  const heroPhoto = headshot?.url
    ? imgUrl(headshot.url, 600)
    : photoSrc

  const agentDomain = agentCanonicalBase(agent)
  const soldFaqs = buildSoldFaqs(ownSold.listings, agent.name)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': ['RealEstateAgent', 'Person'],
    '@id': `https://${agentDomain}/#agent`,
    name: agent.name,
    description: agent.bio || undefined,
    telephone: agent.phone,
    email: agent.email,
    ...(heroPhoto ? { image: heroPhoto } : {}),
    ...(agent.license_number ? { hasCredential: { '@type': 'EducationalOccupationalCredential', name: `BC Real Estate License #${agent.license_number}` } } : {}),
    ...(agent.brokerage ? { memberOf: { '@type': 'Organization', name: agent.brokerage } } : {}),
    areaServed: neighbourhoods.slice(0, 8).map(n => ({ '@type': 'Place', name: n.name })),
    ...(topRealtor?.sold_count ? { numberOfItems: topRealtor.sold_count } : {}),
  }

  const firstName = agent.name.split(' ')[0]

  const showcaseFaqJsonLd = isShowcasePreset ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What makes ${firstName} different from other REALTORS®?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${firstName} combines deep local market knowledge with a client-first approach. Every client receives personalized attention, transparent communication, and a strategic plan tailored to their goals — whether buying or selling.`,
        },
      },
      {
        '@type': 'Question',
        name: `How long has ${firstName} been in real estate?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: agent.settings?.licensed_since
            ? `${firstName} has been licensed since ${agent.settings.licensed_since}, bringing years of hands-on experience and market insight to every transaction.`
            : `${firstName} is an experienced REALTOR® with a strong track record of successful transactions in the local market.`,
        },
      },
      {
        '@type': 'Question',
        name: `Which areas does ${firstName} serve?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: neighbourhoods.length
            ? `${firstName} specializes in ${neighbourhoods.slice(0, 5).map(n => n.name).join(', ')}${neighbourhoods.length > 5 ? ' and surrounding areas' : ''}.`
            : `${firstName} serves buyers and sellers across the local market area.`,
        },
      },
      ...soldFaqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    ],
  } : null
  const coFirstName = coAgent?.name.split(' ')[0] ?? ''

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {showcaseFaqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(showcaseFaqJsonLd) }} />}

      {/* Hero */}
      <div style={{ background: '#fff', padding: '56px 0', borderBottom: '1px solid #e5e7eb' }}>
        <div className="container">
          {isDualAgent && coAgent ? (
            /* ── Dual-agent hero ── */
            <div>
              <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 20, fontWeight: 500 }}>About Us</div>
              <div className="dual-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 36, maxWidth: 680 }}>
                {/* Primary agent */}
                <div style={{ textAlign: 'center' }}>
                  {(heroPhoto || photoFallback) ? (
                    <AgentPhotoWithFallback
                      src={heroPhoto ?? photoFallback!}
                      alt={headshot?.alt || agent.name}
                      fallbackSrc={photoFallback ?? undefined}
                      style={{ width: '100%', maxWidth: 280, aspectRatio: '3/4', objectFit: 'cover', objectPosition: 'top', borderRadius: 8, boxShadow: '0 8px 28px rgba(0,0,0,0.12)', display: 'block', margin: '0 auto' }}
                    />
                  ) : (
                    <div style={{ width: '100%', maxWidth: 280, aspectRatio: '3/4', background: C.bg, borderRadius: 8, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>👤</div>
                  )}
                  <h1 className={playfair.className} style={{ fontSize: 'clamp(1.25rem,2.5vw,1.75rem)', fontWeight: 400, lineHeight: 1.2, marginTop: 16, marginBottom: 4, color: '#1a1a1a' }}>
                    {agent.name}
                    {agent.settings?.designation && (
                      <span style={{ fontSize: '0.65em', fontWeight: 400, color: '#9ca3af', marginLeft: 4 }}>{agent.settings.designation}</span>
                    )}
                  </h1>
                  <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>{agent.brokerage}</p>
                  {agent.phone && (
                    <a href={`tel:${agent.phone}`} style={{ fontSize: 14, fontWeight: 600, color: C.phoneLink, textDecoration: 'none' }}>
                      {agent.phone}
                    </a>
                  )}
                </div>

                {/* Co-agent */}
                <div style={{ textAlign: 'center' }}>
                  {coAgent.photo ? (
                    <img
                      src={imgUrl(coAgent.photo, 600)}
                      alt={coAgent.name}
                      style={{ width: '100%', maxWidth: 280, aspectRatio: '3/4', objectFit: 'cover', objectPosition: 'top', borderRadius: 8, boxShadow: '0 8px 28px rgba(0,0,0,0.12)', display: 'block', margin: '0 auto' }}
                    />
                  ) : (
                    <div style={{ width: '100%', maxWidth: 280, aspectRatio: '3/4', background: C.bg, borderRadius: 8, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>👤</div>
                  )}
                  <h2 className={playfair.className} style={{ fontSize: 'clamp(1.25rem,2.5vw,1.75rem)', fontWeight: 400, lineHeight: 1.2, marginTop: 16, marginBottom: 4, color: '#1a1a1a' }}>
                    {coAgent.name}
                    {coAgent.title && !coAgent.title.includes(' ') && (
                      <span style={{ fontSize: '0.65em', fontWeight: 400, color: '#9ca3af', marginLeft: 4 }}>{coAgent.title}</span>
                    )}
                  </h2>
                  <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>{agent.brokerage}</p>
                  {coAgent.phone && (
                    <a href={`tel:${coAgent.phone}`} style={{ fontSize: 14, fontWeight: 600, color: C.phoneLink, textDecoration: 'none' }}>
                      {coAgent.phone}
                    </a>
                  )}
                </div>
              </div>

              {/* CTAs below both columns */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a href={ap('/my-listings')}
                  style={{ background: C.ctaPrimary, color: C.ctaPrimaryText, padding: '11px 22px', borderRadius: 6, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none' }}>
                  Browse Our Homes
                </a>
                <a href={ap('/my-listings')}
                  style={{ border: `1.5px solid ${C.ctaSecBorder}`, color: C.ctaSecText, padding: '11px 22px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                  See Recent Sales
                </a>
                <a href={ap('/market')}
                  style={{ border: `1.5px solid ${C.ctaSecBorder}`, color: C.ctaSecText, padding: '11px 22px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                  View Market Stats
                </a>
              </div>
            </div>
          ) : (
            /* ── Single-agent hero (unchanged) ── */
            <div className="about-hero" style={{ display: 'grid', gridTemplateColumns: (heroPhoto || photoFallback) ? '180px 1fr' : '1fr', gap: 40, alignItems: 'center' }}>
              {(heroPhoto || photoFallback) && (
                <AgentPhotoWithFallback
                  src={heroPhoto ?? photoFallback!}
                  alt={headshot?.alt || agent.name}
                  fallbackSrc={photoFallback ?? undefined}
                  style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', objectPosition: 'top', borderRadius: 8, boxShadow: '0 8px 28px rgba(0,0,0,0.12)' }}
                />
              )}
              <div>
                <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>About</div>
                <h1 className={playfair.className} style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 400, lineHeight: 1.15, marginBottom: 10, color: '#1a1a1a' }}>
                  {agent.name}
                </h1>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 14, fontWeight: 500 }}>{agent.brokerage}</p>
                {bioParagraphs[0] && (
                  <p style={{ fontSize: 15, color: '#555', lineHeight: 1.7, maxWidth: 540, marginBottom: 24 }}>
                    {bioParagraphs[0]}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a href={ap('/my-listings')}
                    style={{ background: C.ctaPrimary, color: C.ctaPrimaryText, padding: '11px 22px', borderRadius: 6, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none' }}>
                    Browse My Homes
                  </a>
                  <a href={ap('/my-listings')}
                    style={{ border: `1.5px solid ${C.ctaSecBorder}`, color: C.ctaSecText, padding: '11px 22px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                    See Recent Sales
                  </a>
                  <a href={ap('/market')}
                    style={{ border: `1.5px solid ${C.ctaSecBorder}`, color: C.ctaSecText, padding: '11px 22px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                    View Market Stats
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {stats.length > 0 && (
        <div style={{ background: '#fff', borderBottom: `1px solid ${C.border}` }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length},1fr)`, borderLeft: `1px solid ${C.border}` }}>
              {stats.map(s => (
                <div key={s.label} style={{ padding: '20px 24px', borderRight: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: C.heading, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="container" style={{ padding: '56px var(--container-padding)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 56 }} className="about-layout">
          <div>
            {/* Full bio */}
            {bioParagraphs.length > 0 && (
              <div style={{ marginBottom: 48 }}>
                {isDualAgent ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                    {(heroPhoto || photoFallback) && (
                      <img
                        src={heroPhoto ?? photoFallback!}
                        alt={agent.name}
                        style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 15%', flexShrink: 0 }}
                      />
                    )}
                    <div>
                      <h2 style={{ fontSize: 24, fontWeight: 700, color: C.heading, margin: 0 }}>About {agent.name}</h2>
                      {agent.phone && (
                        <a href={`tel:${agent.phone}`} style={{ display: 'block', fontSize: 13, color: C.muted, fontWeight: 600, textDecoration: 'none', marginTop: 2 }}>
                          📞 {agent.phone}
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: C.heading, marginBottom: 24 }}>My Approach</h2>
                )}
                {bioParagraphs.map((para, i) => (
                  <p key={i} style={{ marginBottom: 18, color: C.body, lineHeight: 1.8, fontSize: 15 }}>{para}</p>
                ))}
              </div>
            )}

            {isDualAgent && coAgent && coAgentBioParagraphs.length > 0 && (
              <div style={{ marginBottom: 48, paddingTop: 32, borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                  {coAgent.photo && (
                    <img
                      src={imgUrl(coAgent.photo, 400)}
                      alt={coAgent.name}
                      style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 15%', flexShrink: 0 }}
                    />
                  )}
                  <div>
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: C.heading, margin: 0 }}>About {coAgent.name}</h2>
                    {coAgent.phone && (
                      <a href={`tel:${coAgent.phone}`} style={{ display: 'block', fontSize: 13, color: C.muted, fontWeight: 600, textDecoration: 'none', marginTop: 2 }}>
                        📞 {coAgent.phone}
                      </a>
                    )}
                  </div>
                </div>
                {coAgentBioParagraphs.map((para, i) => (
                  <p key={i} style={{ marginBottom: 18, color: C.body, lineHeight: 1.8, fontSize: 15 }}>{para}</p>
                ))}
              </div>
            )}

            {/* Awards */}
            {awards.length > 0 && (
              <div style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: C.heading, marginBottom: 24 }}>Awards &amp; Recognition</h2>
                <div style={{ background: '#fff', borderRadius: 10, padding: '8px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  {awards.map((a, i) => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < awards.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                      {a.logo_url ? (
                        <img src={a.logo_url} alt={a.organization || a.title} style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 8, height: 8, background: C.accent, borderRadius: '50%', flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.body }}>{a.title}</div>
                        {(a.organization || a.year) && (
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                            {[a.organization, a.year].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        {a.description && (
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{a.description}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {galleryMedia.length > 0 && (
              <div style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: C.heading, marginBottom: 24 }}>Gallery</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
                  {galleryMedia.map(m => (
                    <div key={m.id}>
                      <img
                        src={m.thumbnail_url || imgUrl(m.url, 400)}
                        alt={m.alt || m.caption || agent.name}
                        style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                      />
                      {m.caption && (
                        <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{m.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Quick navigation links */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 48 }}>
              <a href={ap('/buyers')} style={{ background: '#fff', border: `1px solid ${C.border}`, color: C.body, padding: '9px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
                Buyers Guide →
              </a>
              <a href={ap('/sellers')} style={{ background: '#fff', border: `1px solid ${C.border}`, color: C.body, padding: '9px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
                Sellers Guide →
              </a>
              <a href={ap('/home-evaluation')} style={{ background: '#fff', border: `1px solid ${C.border}`, color: C.body, padding: '9px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
                Free Home Valuation →
              </a>
              <a href={ap('/contact')} style={{ background: '#fff', border: `1px solid ${C.border}`, color: C.body, padding: '9px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
                Contact →
              </a>
            </div>

            {/* What's Your Home Worth */}
            {isShowcasePreset ? (
              <div style={{ marginBottom: 48, background: '#1C1C1E', padding: '32px 28px' }}>
                <p style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#9B8B7A', fontWeight: 700, marginBottom: 12 }}>No Cost, No Obligation</p>
                <h2 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(1.4rem,2.5vw,2rem)', fontWeight: 400, color: '#fff', marginBottom: 12, lineHeight: 1.2 }}>
                  What&apos;s Your Home Worth?
                </h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 24 }}>
                  {agent.name} will review your property and prepare a professional Comparative Market Analysis — real numbers from real MLS® data, at no cost to you.
                </p>
                <a href={ap('/home-evaluation')} style={{ display: 'inline-block', background: '#9B8B7A', color: '#1C1C1E', padding: '13px 28px', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
                  Get My Free Evaluation →
                </a>
              </div>
            ) : (
              <div style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: C.heading, marginBottom: 8 }}>What&apos;s Your Home Worth?</h2>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>
                  Free data-backed evaluation from {agent.name} — based on real sold comparables in your neighbourhood, not automated estimates. Response within 6 hours.
                </p>
                <W2HomeEvaluation agent={agent} />
              </div>
            )}

            {agent.license_number && (
              <p style={{ fontSize: 12, color: C.muted, marginTop: 32 }}>
                BC Real Estate License #{agent.license_number} · {agent.brokerage}
              </p>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <ContactSidebarForm agent={agent} />
          </div>
        </div>
      </div>

      {/* Own Active Listings Preview — hidden for showcase agents (listings live on /properties) */}
      {!isShowcasePreset && ownActive.listings.length > 0 && (
        <div style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '52px 0' }}>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: C.heading, margin: 0 }}>
                {isDualAgent ? 'Our Active Listings' : 'My Active Listings'}
              </h2>
              <a href={ap('/my-listings')} style={{ fontSize: 13, color: C.accent, fontWeight: 600, textDecoration: 'none' }}>
                View all listings →
              </a>
            </div>
            <ListingStrip listings={ownActive.listings} columns={4} />
          </div>
        </div>
      )}

      {/* Own Sold Preview — hidden for showcase agents */}
      {!isShowcasePreset && ownSold.listings.length > 0 && (
        <div style={{ background: C.bg, borderTop: '1px solid #e5e7eb', padding: '52px 0' }}>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: C.heading, margin: 0 }}>
                {isDualAgent && coAgent
                  ? `Recently Sold by ${firstName} & ${coFirstName}`
                  : `Recently Sold by ${firstName}`}
              </h2>
              <a href={ap('/my-listings')} style={{ fontSize: 13, color: C.accent, fontWeight: 600, textDecoration: 'none' }}>
                View all sold →
              </a>
            </div>
            <ListingStrip listings={ownSold.listings} showSoldPrice={false} columns={3} />
          </div>
        </div>
      )}

      {/* Testimonials */}
      <TestimonialsStrip testimonials={testimonials} />

      <PageQuickLinks slug={slug} exclude="/about" context="about" isShowcase={isShowcasePreset} />

      <style>{`
        @media (max-width:900px){
          .about-layout{grid-template-columns:1fr!important}
          .about-hero{grid-template-columns:1fr!important}
          .about-hero img{width:120px!important;height:160px!important;margin:0 auto;display:block}
          .dual-hero-grid{grid-template-columns:1fr!important;max-width:320px!important}
        }
      `}</style>
    </div>
  )
}
