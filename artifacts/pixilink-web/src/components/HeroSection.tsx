import React from 'react'
import Image from 'next/image'
import type { AgentProfile, AgentTestimonial, TopRealtor } from '@/lib/types'
import { imgUrl, getCoAgents } from '@/lib/types'
import type { ResolvedSiteConfig } from '@/lib/types'
import { TrustIcon } from '@/lib/trust-icons'
import HeroPhotoCircle from '@/components/HeroPhotoCircle.client'
import SearchBar from '@/components/SearchBar'

const HERO_BG = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1440&h=700&fit=crop'

interface Props {
  agent: AgentProfile
  agentPrefix: string
  heroStyle: ResolvedSiteConfig['hero_style']
  heroStats: { v: string; l: string }[]
  guideName: string | null
  territoryLabel: string
  topRealtor: TopRealtor | null
  testimonials: AgentTestimonial[]
  firstName: string
}

export default function HeroSection(props: Props) {
  const { agent, agentPrefix, heroStyle, heroStats, guideName, territoryLabel, topRealtor, testimonials, firstName } = props
  const coAgents = getCoAgents(agent)
  const isDualAgent = coAgents.length > 0
  const coAgent = coAgents[0] || null
  const ap = (p: string) => `${agentPrefix}${p}`

  const headshotSrc = agent.headshot_path ? imgUrl(agent.headshot_path, 400) : null
  const photoSrc400 = agent.photo_path ? imgUrl(agent.photo_path, 400) : null
  const photoSrc600 = agent.photo_path ? imgUrl(agent.photo_path, 600) : null
  const photoSrc900 = agent.photo_path ? imgUrl(agent.photo_path, 900) : null
  const cardPhotoSrc = headshotSrc || photoSrc400

  const ratings = testimonials.map(t => t.rating).filter((r): r is number => typeof r === 'number' && r > 0)
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null

  if (heroStyle === 'split') {
    return <HeroSplit {...props} avgRating={avgRating} ratingsCount={ratings.length} />
  }
  if (heroStyle === 'circle-centered') {
    return <HeroCircleCentered {...props} />
  }
  if (heroStyle === 'text-only') {
    return <HeroTextOnly {...props} />
  }
  if (heroStyle === 'photo-strip') {
    return <HeroPhotoStrip {...props} />
  }

  // Default: full-bleed
  const hs = agent.settings?.hero_stats
  const tiles = hs ? [
    hs.stat1_value ? { v: hs.stat1_value, l: hs.stat1_label || '' } : null,
    hs.stat2_value ? { v: hs.stat2_value, l: hs.stat2_label || '' } : null,
    hs.stat3_value ? { v: hs.stat3_value, l: hs.stat3_label || '' } : null,
    hs.stat4_value ? { v: hs.stat4_value, l: hs.stat4_label || '' } : null,
  ].filter((t): t is { v: string; l: string } => t !== null) : []

  return (
    <>
      <div className="hero-outer" style={{ position: 'relative', height: 700, overflow: 'hidden' }}>
        <Image src={HERO_BG} alt="Home exterior" fill priority unoptimized className="hero-bg-img" style={{ objectFit: 'cover' }} />
        <div className="hero-overlay" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, rgba(var(--brand-bg-rgb),0.75) 40%, rgba(var(--brand-bg-rgb),0.10) 100%)' }} />

        <div className="hero-content-wrap" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
          <div className="container" style={{ width: '100%' }}>
            <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 48, alignItems: 'center', maxWidth: 1200 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.90)', marginBottom: 18 }}>
                  {guideName ? 'Your Local Real Estate Guide' : agent.brokerage}
                </div>
                <h1 style={{ fontSize: 'clamp(40px,5vw,64px)', fontWeight: 800, lineHeight: 1.05, margin: '0 0 10px', color: '#fff', letterSpacing: -1.5, fontFamily: "'Playfair Display', Georgia, serif" }}>
                  {guideName || `${territoryLabel} Real Estate`}
                </h1>
                {!isDualAgent && (
                  <p style={{ fontSize: 18, color: 'var(--accent)', fontWeight: 600, margin: '0 0 6px', letterSpacing: 0.3 }}>
                    {guideName ? `Powered by ${agent.name} · REALTOR®` : `${agent.name} · REALTOR®`}{topRealtor?.sold_count ? ` · ${topRealtor.sold_count} homes sold` : ''}
                  </p>
                )}
                {agent.bio && (
                  <p style={{ fontSize: 16, color: '#fff', marginBottom: 32, lineHeight: 1.7, maxWidth: 520 }}>
                    {agent.bio.split('\n\n')[0]}
                  </p>
                )}
                <SearchBar agentPrefix={agentPrefix} />
                {heroStats.length > 0 && (
                  <div style={{ display: 'flex', gap: 32, marginTop: 28, flexWrap: 'wrap' }}>
                    {heroStats.map(s => (
                      <div key={s.l}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{s.v}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div id="contact" className="hero-contact" style={{ marginTop: 8 }}>
                <div style={{ background: '#fff', borderRadius: 14, padding: '28px 26px', border: '1px solid #e5e7eb', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', color: '#14213d' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 20 }}>
                    {isDualAgent && coAgent ? (
                      <div style={{ display: 'flex', marginBottom: 14 }}>
                        {cardPhotoSrc ? (
                          <img src={cardPhotoSrc} alt={agent.name} style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 8%', border: '3px solid var(--accent)', position: 'relative', zIndex: 2 }} />
                        ) : (
                          <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, fontWeight: 700, color: '#999', border: '3px solid var(--accent)', position: 'relative', zIndex: 2 }}>
                            {agent.name.charAt(0)}
                          </div>
                        )}
                        <img src={imgUrl(coAgent.photo, 400)} alt={coAgent.name} style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 15%', border: '3px solid var(--accent)', marginLeft: -30, position: 'relative', zIndex: 1 }} />
                      </div>
                    ) : cardPhotoSrc ? (
                      <HeroPhotoCircle src={cardPhotoSrc} name={agent.name} objectPosition="50% 8%" />
                    ) : (
                      <div style={{ width: 150, height: 150, borderRadius: '50%', background: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, fontWeight: 700, color: '#999', marginBottom: 14, border: '3px solid var(--accent)' }}>
                        {agent.name.charAt(0)}
                      </div>
                    )}
                    <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3, color: 'var(--text)' }}>
                      {isDualAgent && coAgent ? `${agent.name} & ${coAgent.name}` : agent.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 3 }}>
                      REALTOR{isDualAgent ? 'S' : ''}®
                    </div>
                    {agent.brokerage && (
                      <div style={{ fontSize: 11, color: '#767676', marginTop: 4 }}>{agent.brokerage}</div>
                    )}
                  </div>

                  {tiles.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: 20 }}>
                      {tiles.map(tile => (
                        <div key={tile.l} style={{ textAlign: 'center', background: '#f5f6f8', borderRadius: 8, padding: '10px 8px' }}>
                          <div style={{ fontSize: tile.v.length > 10 ? 11 : 22, fontWeight: tile.v.length > 10 ? 700 : 800, color: 'var(--accent)', lineHeight: tile.v.length > 10 ? 1.2 : 1, marginTop: tile.v.length > 10 ? 2 : 0 }}>{tile.v}</div>
                          <div style={{ fontSize: 10, color: '#555', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{tile.l}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <a href={`tel:${agent.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--accent)', color: '#fff', padding: '13px 0', borderRadius: 7, fontWeight: 700, fontSize: 15, textDecoration: 'none', marginBottom: 9, letterSpacing: 0.2 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.14-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    {agent.phone}
                  </a>
                  {agent.email && (
                    <a href={`mailto:${agent.email}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'transparent', color: '#333', padding: '11px 0', borderRadius: 7, fontWeight: 600, fontSize: 13, textDecoration: 'none', marginBottom: 9, border: '1px solid #d1d5db', letterSpacing: 0.2 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      {agent.email}
                    </a>
                  )}
                  <a href={ap('/contact')} style={{ display: 'block', textAlign: 'center', color: 'var(--accent)', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginTop: 4 }}>
                    Free Home Evaluation →
                  </a>
                  {agent.license_number && (
                    <div style={{ fontSize: 10, color: '#aaa', textAlign: 'center', marginTop: 14 }}>Lic. {agent.license_number}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Band */}
      <div className="trust-band" style={{ background: 'var(--primary-bg)', padding: '14px 0' }}>
        <div className="container">
          <div className="trust-chips" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
            {(agent.settings?.hero_stats?.trust_chips?.length
              ? agent.settings.hero_stats.trust_chips.map(chip => {
                  const isLegacyString = typeof chip === 'string'
                  const text = isLegacyString ? chip : chip.text
                  const iconId = isLegacyString ? 'star' : chip.icon
                  return { icon: <TrustIcon key={text} icon={iconId} size={14} />, text }
                })
              : ([
                  ...(agent.settings?.hero_stats?.stat2_value
                    ? [{ icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#c9a84c', flexShrink: 0 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, text: `${agent.settings.hero_stats.stat2_value} ${agent.settings.hero_stats.stat2_label || 'Google Reviews'}` }]
                    : []),
                  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#c9a84c', flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, text: '30+ Years · Since 1993' },
                  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#c9a84c', flexShrink: 0 }}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>, text: "eXp President's Award" },
                  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#c9a84c', flexShrink: 0 }}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>, text: 'FVREB Medallion Club' },
                ] as Array<{ icon: React.ReactNode; text: string }>)
            ).map(chip => (
              <div key={chip.text} className="trust-chip" style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>
                {chip.icon}<span>{chip.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Highlights */}
      {!!agent.settings?.hero_stats?.highlights?.length && (
        <div className="agent-highlights" style={{ background: '#fff', padding: '40px 0', borderBottom: '1px solid #e8eaed' }}>
          <div className="container">
            <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--primary-bg)', fontWeight: 700, textAlign: 'center', marginBottom: 24 }}>
              Why Work With {isDualAgent && coAgent ? `${agent.name.split(' ')[0]} & ${coAgent.name.split(' ')[0]}` : (agent.name?.split(' ')[0] || 'Me')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
              {agent.settings.hero_stats.highlights.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px', border: '1px solid #e8eaed', borderRadius: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TrustIcon icon={h.icon} size={16} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#172b4d', lineHeight: 1.4, paddingTop: 6 }}>{h.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .hero-outer { height: auto !important; overflow: visible !important; background: var(--brand-bg) !important; }
          .hero-bg-img { display: none !important; }
          .hero-overlay { display: none !important; }
          .hero-content-wrap { position: static !important; padding: 40px 0 !important; }
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-contact { display: block !important; width: 100% !important; margin-top: 32px !important; }
        }
      `}</style>
    </>
  )
}

function HeroSplit({ agent, agentPrefix, heroStats, guideName, territoryLabel, topRealtor, avgRating, ratingsCount, firstName }: Props & { avgRating: number | null; ratingsCount: number }) {
  const ap = (p: string) => `${agentPrefix}${p}`
  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 600) : null
  const coAgents = getCoAgents(agent)
  const isDualAgent = coAgents.length > 0
  const coAgent = coAgents[0] || null
  const credentials = agent.settings?.hero_stats?.trust_chips

  return (
    <div style={{ background: '#fafaf9', paddingTop: 60, paddingBottom: 80, borderBottom: '1px solid var(--border)' }}>
      <div className="container">
        <div className="hero-split-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 64, alignItems: 'center', maxWidth: 1160 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16, fontWeight: 700 }}>
              {guideName ? 'Your Local Real Estate Guide' : `${territoryLabel} REALTOR®`}
            </div>
            <h1 style={{ fontSize: 'clamp(36px,4.5vw,58px)', fontWeight: 800, lineHeight: 1.08, margin: '0 0 18px', color: 'var(--primary-bg)', letterSpacing: -1.5, fontFamily: "'Playfair Display', Georgia, serif" }}>
              {guideName || agent.name}
            </h1>
            {guideName && (
              <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
                {agent.name} · REALTOR®{topRealtor?.sold_count ? ` · ${topRealtor.sold_count} homes sold` : ''}
              </p>
            )}
            {agent.bio && (
              <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 28, lineHeight: 1.75, maxWidth: 480 }}>
                {agent.bio.split('\n\n')[0]}
              </p>
            )}
            {credentials && credentials.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
                {credentials.slice(0, 4).map(chip => {
                  const text = typeof chip === 'string' ? chip : chip.text
                  return <span key={text} style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', background: 'var(--off-white)', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--primary-bg)' }}>{text}</span>
                })}
              </div>
            )}
            {avgRating != null && ratingsCount >= 3 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28 }}>
                <span style={{ color: '#f59e0b', fontSize: 18, letterSpacing: -1 }}>
                  {'★'.repeat(Math.round(Math.min(5, Math.max(1, avgRating))))}{'☆'.repeat(5 - Math.round(Math.min(5, Math.max(1, avgRating))))}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary-bg)' }}>{avgRating.toFixed(1)}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>· {ratingsCount} reviews</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <a href={`tel:${agent.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--primary-bg)', color: '#fff', padding: '14px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.14-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Call {firstName}
              </a>
              <a href={ap('/contact')} style={{ display: 'inline-block', background: 'transparent', color: 'var(--primary-bg)', padding: '14px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', border: '2px solid var(--primary-bg)' }}>
                Send a Message
              </a>
            </div>
            {heroStats.length > 0 && (
              <div style={{ display: 'flex', gap: 28, marginTop: 36, paddingTop: 32, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                {heroStats.slice(0, 4).map(s => (
                  <div key={s.l}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary-bg)' }}>{s.v}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hero-split-photo" style={{ position: 'relative' }}>
            {isDualAgent && coAgent && agent.photo_path ? (
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', height: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                  <img src={imgUrl(agent.photo_path, 400)} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 10%' }} />
                </div>
                <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', height: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', marginTop: 24 }}>
                  <img src={imgUrl(coAgent.photo, 400)} alt={coAgent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 10%' }} />
                </div>
              </div>
            ) : photoSrc ? (
              <div style={{ borderRadius: 12, overflow: 'hidden', height: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', position: 'relative' }}>
                <img src={photoSrc} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 10%', display: 'block' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)', padding: '24px 20px 20px' }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{agent.name}</div>
                  <div style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 600, marginTop: 2 }}>{agent.brokerage}</div>
                </div>
              </div>
            ) : (
              <div style={{ borderRadius: 12, height: 520, background: 'var(--off-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, border: '1px solid var(--border)' }}>🏠</div>
            )}
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .hero-split-grid { grid-template-columns: 1fr !important; gap: 40px !important; } }`}</style>
    </div>
  )
}

function HeroCircleCentered({ agent, agentPrefix, heroStats, guideName, territoryLabel, topRealtor, firstName }: Props) {
  const ap = (p: string) => `${agentPrefix}${p}`
  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 400) : null
  const coAgents = getCoAgents(agent)
  const coAgent = coAgents[0] || null
  const isDualAgent = coAgents.length > 0

  return (
    <div style={{ background: 'var(--primary-bg)', padding: '80px 0 60px', textAlign: 'center' }}>
      <div className="container" style={{ maxWidth: 700 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          {isDualAgent && coAgent ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {photoSrc ? (
                <img src={photoSrc} alt={agent.name} style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 15%', border: '3px solid var(--accent)', position: 'relative', zIndex: 2 }} />
              ) : (
                <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 700, color: '#fff', border: '3px solid var(--accent)', position: 'relative', zIndex: 2 }}>{agent.name.charAt(0)}</div>
              )}
              <img src={imgUrl(coAgent.photo, 400)} alt={coAgent.name} style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 15%', border: '3px solid var(--accent)', marginLeft: -20, position: 'relative', zIndex: 1 }} />
            </div>
          ) : photoSrc ? (
            <img src={photoSrc} alt={agent.name} style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 15%', border: '4px solid var(--accent)', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }} />
          ) : (
            <div style={{ width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, fontWeight: 700, color: '#fff', border: '4px solid var(--accent)' }}>{agent.name.charAt(0)}</div>
          )}
        </div>
        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12, fontWeight: 700 }}>
          {guideName ? 'Your Local Real Estate Guide' : `${territoryLabel} REALTOR®`}
        </div>
        <h1 style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 12px', color: '#fff', fontFamily: "'Playfair Display', Georgia, serif" }}>
          {guideName || agent.name}
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginBottom: 8, fontWeight: 500 }}>
          {guideName ? `Powered by ${agent.name}` : agent.brokerage}{topRealtor?.sold_count ? ` · ${topRealtor.sold_count}+ homes sold` : ''}
        </p>
        {agent.bio && <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.70)', marginBottom: 28, lineHeight: 1.7, maxWidth: 540, margin: '0 auto 28px' }}>{agent.bio.split('\n\n')[0]}</p>}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href={`tel:${agent.phone}`} style={{ display: 'inline-block', background: 'var(--accent)', color: '#fff', padding: '13px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Call {firstName}</a>
          <a href={ap('/contact')} style={{ display: 'inline-block', background: 'rgba(255,255,255,0.12)', color: '#fff', padding: '13px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.25)' }}>Send a Message</a>
        </div>
        {heroStats.length > 0 && (
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 44, paddingTop: 36, borderTop: '1px solid rgba(255,255,255,0.12)', flexWrap: 'wrap' }}>
            {heroStats.slice(0, 4).map(s => (
              <div key={s.l}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{s.v}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 }}>{s.l}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function HeroTextOnly({ agent, agentPrefix, heroStats, guideName, territoryLabel, firstName }: Props) {
  const ap = (p: string) => `${agentPrefix}${p}`
  return (
    <div style={{ background: '#fff', padding: '80px 0 64px', borderBottom: '1px solid var(--border)' }}>
      <div className="container" style={{ maxWidth: 800 }}>
        <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 18, fontWeight: 700 }}>
          {guideName ? 'Your Local Real Estate Guide' : `${territoryLabel} REALTOR®`}
        </div>
        <h1 style={{ fontSize: 'clamp(40px,5.5vw,72px)', fontWeight: 900, lineHeight: 1.0, margin: '0 0 18px', color: 'var(--primary-bg)', letterSpacing: -2.5, fontFamily: "'Playfair Display', Georgia, serif" }}>
          {guideName || `${territoryLabel} Real Estate`}
        </h1>
        {!guideName && <p style={{ fontSize: 18, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>{agent.name} · REALTOR® · {agent.brokerage}</p>}
        {agent.bio && <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.75, maxWidth: 560 }}>{agent.bio.split('\n\n')[0]}</p>}
        <div style={{ display: 'flex', gap: 12 }}>
          <a href={`tel:${agent.phone}`} style={{ display: 'inline-block', background: 'var(--primary-bg)', color: '#fff', padding: '14px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Call {firstName}</a>
          <a href={ap('/contact')} style={{ display: 'inline-block', color: 'var(--primary-bg)', padding: '14px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', border: '2px solid var(--primary-bg)' }}>Send a Message</a>
        </div>
        {heroStats.length > 0 && (
          <div style={{ display: 'flex', gap: 40, marginTop: 44, paddingTop: 36, borderTop: '2px solid var(--accent)', flexWrap: 'wrap' }}>
            {heroStats.slice(0, 4).map(s => (
              <div key={s.l}>
                <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--primary-bg)', letterSpacing: -1 }}>{s.v}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1.2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function HeroPhotoStrip({ agent, agentPrefix, heroStats, guideName, territoryLabel, topRealtor, firstName }: Props) {
  const ap = (p: string) => `${agentPrefix}${p}`
  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 900) : null

  return (
    <div>
      <div style={{ position: 'relative', height: 320, overflow: 'hidden', background: 'var(--primary-bg)' }}>
        {photoSrc && <img src={photoSrc} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 20%', display: 'block' }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)' }} />
      </div>
      <div style={{ background: '#fff', padding: '44px 0 52px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12, fontWeight: 700 }}>
                {guideName ? 'Your Local Real Estate Guide' : `${territoryLabel} REALTOR®`}
              </div>
              <h1 style={{ fontSize: 'clamp(28px,3.5vw,48px)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 10px', color: 'var(--primary-bg)', fontFamily: "'Playfair Display', Georgia, serif" }}>
                {guideName || agent.name}
              </h1>
              <p style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 500 }}>
                {guideName ? `${agent.name} · REALTOR®` : agent.brokerage}{topRealtor?.sold_count ? ` · ${topRealtor.sold_count}+ homes sold` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <a href={`tel:${agent.phone}`} style={{ display: 'inline-block', background: 'var(--primary-bg)', color: '#fff', padding: '13px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap' }}>Call {firstName}</a>
              <a href={ap('/contact')} style={{ display: 'inline-block', color: 'var(--primary-bg)', padding: '13px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', border: '2px solid var(--primary-bg)', whiteSpace: 'nowrap' }}>Contact</a>
            </div>
          </div>
          {heroStats.length > 0 && (
            <div style={{ display: 'flex', gap: 32, marginTop: 32, paddingTop: 28, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
              {heroStats.slice(0, 4).map(s => (
                <div key={s.l}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-bg)' }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 }}>{s.l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
