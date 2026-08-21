import React from 'react'
import Image from 'next/image'
// NOTE: sold counts shown to visitors come from displaySoldCount(), never straight from
// topRealtor.sold_count — the MLS board holds only recent history and under-reports a
// long-career agent badly (16 vs 5,200 for Randy).
import type { AgentProfile, AgentTestimonial, TopRealtor } from '@/lib/types'
import { imgUrl, avatarUrl, getCoAgents, displaySoldCount } from '@/lib/types'

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
  /**
   * True when the page also renders CredentialRibbon directly beneath this hero. The
   * ribbon is the dedicated home for brokerage + BCFSA licence, so the card omits its
   * own licence line rather than printing the same number twice in adjacent blocks.
   */
  credentialsRibbonShown?: boolean
}

export default function HeroSection(props: Props) {
  const heroSoldCount = displaySoldCount(props.agent, props.topRealtor?.sold_count)
  // Only print the sold count inline when the achievements band is NOT already showing
  // it. That band renders hero_stats.stat1-4 as a full-width strip immediately below this
  // hero, so an agent with manual stat tiles was getting the same number twice within one
  // scroll. Agents without tiles keep the inline mention as their only one.
  const showInlineSold = heroSoldCount != null && !props.agent.settings?.hero_stats?.stat1_value
  const { agent, agentPrefix, heroStyle, heroStats, guideName, territoryLabel, topRealtor, testimonials, firstName, credentialsRibbonShown } = props
  const coAgents = getCoAgents(agent)
  const isDualAgent = coAgents.length > 0
  const coAgent = coAgents[0] || null
  const ap = (p: string) => `${agentPrefix}${p}`

  const headshotSrc = agent.headshot_path ? avatarUrl(agent.headshot_path, 400) : null
  const photoSrc400 = agent.photo_path ? avatarUrl(agent.photo_path, 400) : null
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

  return (
    <>
      {/* The hero photo is a CSS background inside a min-width query, not an <img>.
          It used to be `<Image priority unoptimized>`, which the browser preloaded at high
          priority on EVERY device — including phones, where `.hero-bg-img { display: none }`
          at 900px meant a 1440x700 photo was downloaded and then never shown. A
          background-image declared inside a media query that does not match is not
          fetched at all, so phones now pay nothing for it. It is purely decorative (it sits
          under a 75%-opaque overlay and carries an empty alt today), so no semantic <img>
          is owed. */}
      <div className="hero-outer" style={{ position: 'relative', height: 700, overflow: 'hidden' }}>
        <div className="hero-overlay" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, rgba(var(--brand-bg-rgb),0.75) 40%, rgba(var(--brand-bg-rgb),0.10) 100%)' }} />

        <div className="hero-content-wrap" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
          <div className="container" style={{ width: '100%' }}>
            <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 48, alignItems: 'center', maxWidth: 1200 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.90)', marginBottom: 18 }}>
                  {guideName ? 'Your Local Real Estate Guide' : agent.brokerage}
                </div>
                <h1 style={{ fontSize: 'clamp(40px,5vw,64px)', fontWeight: 800, lineHeight: 1.05, margin: '0 0 10px', color: '#fff', letterSpacing: -1.5, fontFamily: "var(--font-display), Georgia, serif" }}>
                  {guideName || `${territoryLabel} Real Estate`}
                </h1>
                {!isDualAgent && (
                  <p style={{ fontSize: 18, color: '#fff', fontWeight: 600, margin: '0 0 6px', letterSpacing: 0.3 }}>
                    {guideName ? `Powered by ${agent.name} · REALTOR®` : `${agent.name} · REALTOR®`}{showInlineSold ? ` · ${heroSoldCount.toLocaleString()} homes sold` : ''}
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
                        <img src={avatarUrl(coAgent.photo, 400)} alt={coAgent.name} style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 15%', border: '3px solid var(--accent)', marginLeft: -30, position: 'relative', zIndex: 1 }} />
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

                  {/* No stat tiles here, deliberately. They were built from hero_stats
                      stat1-4 — the identical source AchievementsBar renders as a full-width
                      band a few hundred pixels down the same page, so a visitor met
                      "5,200+ Properties Sold / 33 Years Experience" twice before scrolling
                      once. This card is for contact: phone, email, evaluation. Career
                      numbers belong to the achievements band, live MLS numbers to the
                      Market Snapshot section. */}

                  <a href={`tel:${agent.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--accent)', color: '#fff', padding: '13px 0', borderRadius: 7, fontWeight: 700, fontSize: 15, textDecoration: 'none', marginBottom: 9, letterSpacing: 0.2 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.14-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    {agent.phone}
                  </a>
                  {agent.email && (
                    <a href={`mailto:${agent.email}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'transparent', color: '#333', padding: '11px 0', borderRadius: 7, fontWeight: 600, fontSize: 13, textDecoration: 'none', marginBottom: 9, border: '1px solid #949aa3', letterSpacing: 0.2 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      {agent.email}
                    </a>
                  )}
                  <a href={ap('/contact')} style={{ display: 'block', textAlign: 'center', color: 'var(--accent)', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginTop: 4 }}>
                    Free Home Evaluation →
                  </a>
                  {agent.license_number && (
                    !credentialsRibbonShown && (
                      <div style={{ fontSize: 10, color: '#737373', textAlign: 'center', marginTop: 14 }}>Lic. {agent.license_number}</div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Band — only when there is something to put in it. Rendered
          unconditionally it was a bare dark strip with 28px of padding and no content
          for any agent without trust_chips. */}
      {!!agent.settings?.hero_stats?.trust_chips?.length && (
      <div className="trust-band" style={{ background: 'var(--primary-bg)', padding: '14px 0' }}>
        <div className="container">
          <div className="trust-chips" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
            {(agent.settings?.hero_stats?.trust_chips ?? []).map(chip => {
              // No hardcoded fallback. This used to fall back to a fixed list —
              // "30+ Years · Since 1993", "eXp President's Award", "FVREB Medallion Club" —
              // which are RANDY'S credentials, rendered for any agent who simply had no
              // trust_chips of their own. It also contradicted the data beside it once he had
              // real stats ("33 Years Experience" next to "30+ Years"), and repeated the
              // awards block immediately below. An agent with no chips now gets no chip row,
              // which is the only honest default: never assert a credential nobody entered.
              const isLegacyString = typeof chip === 'string'
              const text = isLegacyString ? chip : chip.text
              const iconId = isLegacyString ? 'star' : chip.icon
              return { icon: <TrustIcon key={text} icon={iconId} size={14} />, text }
            }).map(chip => (
              <div key={chip.text} className="trust-chip" style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>
                {chip.icon}<span>{chip.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* The "Why Work With X" highlights block used to render here, from
          hero_stats.highlights. Removed: AgentValuePropCta in the agent layout renders the
          SAME credentials under a heading that differed only in capitalisation ("Why work
          with Randy"), on this and every other page — so the homepage carried two
          near-identical blocks, and suburbia.ca printed "Top 10% of Realtors in GVR" and
          its five-star line twice. The layout block also holds the phone CTA, so it is the
          one worth keeping; this was a 40px-padded band spending a full screen-width on two
          short strings. getHeroCredentials() still feeds the nav subtitle and llms.txt. */}

      <style>{`
        /* Desktop only, deliberately: a background-image inside a non-matching media query
           is never fetched, which is the whole point — phones used to download this 1440x700
           photo and then hide it. */
        @media (min-width: 901px) {
          .hero-outer {
            background-image: url('${HERO_BG}');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
          }
        }
        @media (max-width: 900px) {
          .hero-outer { height: auto !important; overflow: visible !important; background: var(--brand-bg) !important; }
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
  const heroSoldCount = displaySoldCount(agent, topRealtor?.sold_count)
  const showInlineSold = heroSoldCount != null && !agent.settings?.hero_stats?.stat1_value
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
            <h1 style={{ fontSize: 'clamp(36px,4.5vw,58px)', fontWeight: 800, lineHeight: 1.08, margin: '0 0 18px', color: 'var(--primary-bg)', letterSpacing: -1.5, fontFamily: "var(--font-display), Georgia, serif" }}>
              {guideName || agent.name}
            </h1>
            {guideName && (
              <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
                {agent.name} · REALTOR®{showInlineSold ? ` · ${heroSoldCount.toLocaleString()} homes sold` : ''}
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
                  <img src={avatarUrl(agent.photo_path, 400)} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 10%' }} />
                </div>
                <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', height: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', marginTop: 24 }}>
                  <img src={avatarUrl(coAgent.photo, 400)} alt={coAgent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 10%' }} />
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
  const heroSoldCount = displaySoldCount(agent, topRealtor?.sold_count)
  const showInlineSold = heroSoldCount != null && !agent.settings?.hero_stats?.stat1_value
  const ap = (p: string) => `${agentPrefix}${p}`
  const photoSrc = agent.photo_path ? avatarUrl(agent.photo_path, 400) : null
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
              <img src={avatarUrl(coAgent.photo, 400)} alt={coAgent.name} style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 15%', border: '3px solid var(--accent)', marginLeft: -20, position: 'relative', zIndex: 1 }} />
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
        <h1 style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 12px', color: '#fff', fontFamily: "var(--font-display), Georgia, serif" }}>
          {guideName || agent.name}
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginBottom: 8, fontWeight: 500 }}>
          {guideName ? `Powered by ${agent.name}` : agent.brokerage}{showInlineSold ? ` · ${heroSoldCount.toLocaleString()}+ homes sold` : ''}
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
        <h1 style={{ fontSize: 'clamp(40px,5.5vw,72px)', fontWeight: 900, lineHeight: 1.0, margin: '0 0 18px', color: 'var(--primary-bg)', letterSpacing: -2.5, fontFamily: "var(--font-display), Georgia, serif" }}>
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
  const heroSoldCount = displaySoldCount(agent, topRealtor?.sold_count)
  const showInlineSold = heroSoldCount != null && !agent.settings?.hero_stats?.stat1_value
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
              <h1 style={{ fontSize: 'clamp(28px,3.5vw,48px)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 10px', color: 'var(--primary-bg)', fontFamily: "var(--font-display), Georgia, serif" }}>
                {guideName || agent.name}
              </h1>
              <p style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 500 }}>
                {guideName ? `${agent.name} · REALTOR®` : agent.brokerage}{showInlineSold ? ` · ${heroSoldCount.toLocaleString()}+ homes sold` : ''}
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
