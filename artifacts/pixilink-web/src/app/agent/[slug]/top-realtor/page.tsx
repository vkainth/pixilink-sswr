import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getTopRealtor, getNeighbourhoods, getMarketStats, getTestimonials, resolveAgentPrefix } from '@/lib/api'
import PageQuickLinks from '@/components/PageQuickLinks'
import { imgUrl, formatPrice, getCoAgents } from '@/lib/types'
import { notFound } from 'next/navigation'
import { requireNotShowcase } from '@/lib/showcase'
import { getAgentAchievements, getCoAgentAchievements } from '@/lib/agent-achievements'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [agent, neighbourhoods] = await Promise.all([getAgent(slug), getNeighbourhoods(slug)])
  if (!agent) return {}
  const coAgents = getCoAgents(agent)
  const isDual = coAgents.length > 0
  const displayNames = isDual
    ? `${agent.name} & ${coAgents.map(c => c.name).join(' & ')}`
    : agent.name
  const uniqueCities = [...new Set(neighbourhoods.map(n => n.city || n.name))]
  const areaLabel = uniqueCities.slice(0, 3).join(' & ') || 'Your Area'
  const title = `Top REALTOR® in ${areaLabel} | ${displayNames} — ${agent.brokerage}`
  const description = `${displayNames} ${isDual ? 'are' : 'is'} the top-rated REALTOR® team in ${areaLabel}. Award-winning real estate expertise, proven sold results, and straight advice. Free home evaluation.`
  const photo = agent.photo_path ? imgUrl(agent.photo_path, 600) : undefined
  const canonical = agent.settings?.custom_domain
    ? `https://${agent.settings.custom_domain}/top-realtor`
    : `/agent/${slug}/top-realtor`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'profile',
      images: photo ? [{ url: photo }] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function TopRealtorRootPage({ params }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const [agent, topRealtor, neighbourhoods, stats, testimonials] = await Promise.all([
    getAgent(slug),
    getTopRealtor(slug),
    getNeighbourhoods(slug),
    getMarketStats(slug),
    getTestimonials(slug),
  ])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const coAgents = getCoAgents(agent)
  const isDual = coAgents.length > 0
  const displayNames = isDual
    ? `${agent.name} & ${coAgents.map(c => c.name).join(' & ')}`
    : agent.name
  const pronoun = isDual ? 'they' : 'he'
  const possessive = isDual ? 'their' : 'his'

  const ratings = testimonials.map(t => t.rating).filter((r): r is number => typeof r === 'number' && r > 0)
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null

  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 600) : null
  const firstName = isDual ? displayNames : agent.name.split(' ')[0]
  const areas = neighbourhoods.map(n => n.name).join(', ')
  const uniqueCities = [...new Set(neighbourhoods.map(n => n.city || n.name))]
  const areaLabel = uniqueCities.slice(0, 3).join(' & ') || 'Your Area'

  const siteUrl = agent.settings?.custom_domain
    ? `https://${agent.settings.custom_domain}`
    : ''

  const soldCount = topRealtor?.sold_count ?? null
  const soldVolume = topRealtor?.sold_volume ?? null
  const avgDom = topRealtor?.avg_dom ?? stats.avg_dom ?? null
  const avgSoldPrice = stats.avg_sold_price ?? null

  const marketLabel = (() => {
    if (avgDom === null) return null
    if (avgDom < 15) return "Seller's Market"
    if (avgDom < 25) return 'Balanced Market'
    return "Buyer's Market"
  })()

  const apiAchievements = agent.settings?.achievements
  const agentAchievements = apiAchievements?.length ? apiAchievements : getAgentAchievements(slug)
  const primaryCredentials = agentAchievements.length > 0
    ? agentAchievements
    : [
        ...(topRealtor?.awards?.length ? [{ label: topRealtor.awards[0].title }] : []),
        { label: `${agent.brokerage} — Licensed in BC` },
      ]

  const faqItems = isDual
    ? [
        {
          q: `Who are the top REALTORS® in ${areaLabel}?`,
          a: `${displayNames} of ${agent.brokerage} are consistently ranked among the top REALTORS® in ${areaLabel}. With${soldCount ? ` over ${soldCount.toLocaleString()} homes sold` : ' years of combined experience'} and${soldVolume ? ` more than ${formatPrice(soldVolume)} in career sales volume` : ' deep local expertise'}, they provide buyers and sellers with real data, honest advice, and proven results.`,
        },
        {
          q: `How many homes have ${displayNames} sold?`,
          a: soldCount
            ? `${displayNames} have sold over ${soldCount.toLocaleString()} homes throughout ${areaLabel}. ${soldVolume ? `Total career sales volume exceeds ${formatPrice(soldVolume)}.` : ''} You can view recent sold listings directly on this site.`
            : `${displayNames} have an extensive combined track record of sold homes throughout ${areaLabel}. Browse recent sold results on this site for full details.`,
        },
        {
          q: `What areas do ${displayNames} serve?`,
          a: `${displayNames} specialize in ${areas || areaLabel}. They have deep knowledge of local pricing, building inventory, and neighbourhood trends across all of these communities.`,
        },
        {
          q: `How do I get a free home evaluation in ${areaLabel}?`,
          a: `You can request a free, no-obligation home evaluation directly on this site. ${displayNames} provide data-driven valuations based on real MLS® sold data — typically delivered within a few hours. There is no pressure and no commitment required.`,
        },
        {
          q: `What brokerage are ${displayNames} with?`,
          a: `${displayNames} are licensed REALTORS® with ${agent.brokerage}. They can be reached directly at ${agent.phone}.`,
        },
        {
          q: `Is ${areaLabel} a buyer's or seller's market right now?`,
          a: marketLabel
            ? `Based on current MLS® data, ${areaLabel} is experiencing a ${marketLabel}. ${stats.active_count ? `There are currently ${stats.active_count.toLocaleString()} active listings.` : ''} ${stats.sold_last_30_days ? `${stats.sold_last_30_days} homes sold in the last 30 days.` : ''} ${avgSoldPrice ? `The average sold price is ${formatPrice(avgSoldPrice)}.` : ''} Contact ${displayNames} for the latest local market update.`
            : `Market conditions in ${areaLabel} change regularly. Contact ${displayNames} directly for an up-to-date assessment of current buyer and seller conditions in this area.`,
        },
      ]
    : [
        {
          q: `Who is the top REALTOR® in ${areaLabel}?`,
          a: `${agent.name} of ${agent.brokerage} is consistently ranked among the top REALTORS® in ${areaLabel}. With${soldCount ? ` over ${soldCount.toLocaleString()} homes sold` : ' years of experience'} and${soldVolume ? ` more than ${formatPrice(soldVolume)} in career sales volume` : ' deep local expertise'}, ${firstName} provides buyers and sellers with real data, honest advice, and proven results.`,
        },
        {
          q: `How many homes has ${agent.name} sold?`,
          a: soldCount
            ? `${agent.name} has sold over ${soldCount.toLocaleString()} homes throughout ${areaLabel}. ${soldVolume ? `Total career sales volume exceeds ${formatPrice(soldVolume)}.` : ''} You can view recent sold listings directly on this site.`
            : `${agent.name} has an extensive track record of sold homes throughout ${areaLabel}. Browse recent sold results on this site for full details.`,
        },
        {
          q: `What areas does ${agent.name} serve?`,
          a: `${agent.name} specializes in ${areas || areaLabel}. ${firstName} has deep knowledge of local pricing, building inventory, and neighbourhood trends across all of these communities.`,
        },
        {
          q: `How do I get a free home evaluation in ${areaLabel}?`,
          a: `You can request a free, no-obligation home evaluation directly on this site. ${agent.name} provides data-driven valuations based on real MLS® sold data — typically delivered within a few hours. There is no pressure and no commitment required.`,
        },
        {
          q: `What is ${agent.name}'s brokerage?`,
          a: `${agent.name} is a licensed REALTOR® with ${agent.brokerage}${agent.license_number ? `, licence #${agent.license_number}` : ''}. ${firstName} can be reached directly at ${agent.phone}.`,
        },
        {
          q: `Is ${areaLabel} a buyer's or seller's market right now?`,
          a: marketLabel
            ? `Based on current MLS® data, ${areaLabel} is experiencing a ${marketLabel}. ${stats.active_count ? `There are currently ${stats.active_count.toLocaleString()} active listings.` : ''} ${stats.sold_last_30_days ? `${stats.sold_last_30_days} homes sold in the last 30 days.` : ''} ${avgSoldPrice ? `The average sold price is ${formatPrice(avgSoldPrice)}.` : ''} Contact ${firstName} for the latest local market update.`
            : `Market conditions in ${areaLabel} change regularly. Contact ${agent.name} directly for an up-to-date assessment of current buyer and seller conditions in this area.`,
        },
      ]

  const personNodes = [
    {
      '@type': 'Person',
      name: agent.name,
      jobTitle: `REALTOR® — ${agent.brokerage}`,
      url: `${siteUrl}/top-realtor`,
      ...(photoSrc ? { image: photoSrc } : {}),
      telephone: agent.phone,
      ...(agent.email ? { email: agent.email } : {}),
      worksFor: { '@type': 'Organization', name: agent.brokerage },
      ...(topRealtor?.awards?.length ? { award: topRealtor.awards[0].title } : {}),
      knowsAbout: [`${areaLabel} Real Estate`, 'Condo Sales', 'Detached Homes', 'Investment Properties', 'BC Real Estate Market'],
      areaServed: { '@type': 'Place', name: `${areaLabel}, BC, Canada` },
    },
    ...coAgents.map(ca => ({
      '@type': 'Person',
      name: ca.name,
      jobTitle: `REALTOR® — ${ca.title || agent.brokerage}`,
      url: `${siteUrl}/top-realtor`,
      ...(ca.photo ? { image: imgUrl(ca.photo, 400) } : {}),
      ...(ca.phone ? { telephone: ca.phone } : {}),
      ...(ca.email ? { email: ca.email } : {}),
      worksFor: { '@type': 'Organization', name: ca.title || agent.brokerage },
      knowsAbout: [`${areaLabel} Real Estate`, 'Condo Sales', 'Detached Homes', 'Investment Properties', 'BC Real Estate Market'],
      areaServed: { '@type': 'Place', name: `${areaLabel}, BC, Canada` },
    })),
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: `Top REALTOR® in ${areaLabel}`, item: `${siteUrl}/top-realtor` },
        ],
      },
      ...personNodes,
      {
        '@type': ['RealEstateAgent', 'LocalBusiness'],
        name: `${displayNames} — ${agent.brokerage}`,
        url: `${siteUrl}/top-realtor`,
        telephone: agent.phone,
        ...(photoSrc ? { image: photoSrc } : {}),
        areaServed: { '@type': 'Place', name: `${areaLabel}, BC, Canada` },
        ...(topRealtor?.awards?.length ? { award: topRealtor.awards[0].title } : {}),
        memberOf: { '@type': 'Organization', name: agent.brokerage },
        ...(avgRating && ratings.length >= 3
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: avgRating.toFixed(1),
                reviewCount: ratings.length,
                bestRating: 5,
                worstRating: 1,
              },
            }
          : {}),
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: `Real Estate Services in ${areaLabel}, BC`,
          itemListElement: [
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: `Home Selling — ${areaLabel}` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: `Home Buying — ${areaLabel}` } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Free Home Evaluation' } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Condo Specialist' } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Investment Properties' } },
          ],
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqItems.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: (photoSrc || isDual) ? '1fr auto' : '1fr', gap: 48, alignItems: 'center' }} className="tr-root-hero-grid">
            <div>
              <nav aria-label="breadcrumb" style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                <a href={ap('/')} style={{ color: '#888', textDecoration: 'none' }}>Home</a>
                <span style={{ margin: '0 6px' }}>›</span>
                <span>Top REALTOR®</span>
              </nav>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>
                Top Real Estate {isDual ? 'Team' : 'Agent'}
              </div>
              <h1 className={playfair.className} style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 400, lineHeight: 1.1, color: '#1a1a1a', marginBottom: 16, marginTop: 0 }}>
                Top REALTOR® in {areaLabel} — {displayNames}
              </h1>
              <p style={{ fontSize: 15, color: '#555', maxWidth: 520, lineHeight: 1.7, marginBottom: 8 }}>
                <strong style={{ color: '#1a1a1a' }}>{displayNames}</strong> — {agent.brokerage}
              </p>
              <p style={{ fontSize: 15, color: '#555', maxWidth: 520, lineHeight: 1.7, marginBottom: 28 }}>
                {isDual
                  ? `${displayNames} have been among the most trusted REALTORS® in ${areas || areaLabel} for over two decades. Real results. Straight advice. No pressure.`
                  : `${firstName} has been one of the most trusted REALTORS® in ${areas || areaLabel} for over two decades. Real results. Straight advice. No pressure.`}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href={ap('/contact')} className="btn-primary" style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Book a Consultation
                </a>
                <a href={ap('/homes-for-sale')} style={{ border: '1px solid var(--border)', color: 'var(--text)', padding: '12px 24px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                  See {isDual ? 'Our' : 'My'} Homes For Sale →
                </a>
                <a href={ap('/sold')} style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '12px 24px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                  See Sold Results →
                </a>
              </div>
            </div>

            {/* Photo block — side by side for dual-agent, single circle for solo */}
            {isDual ? (
              <div style={{ display: 'flex', gap: 0, flexShrink: 0 }} className="tr-root-photos">
                {coAgents.map((ca, i) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <div key={i} style={{ textAlign: 'center', marginLeft: i > 0 ? -20 : 0, zIndex: coAgents.length - i }}>
                    {ca.photo ? (
                      <img
                        src={imgUrl(ca.photo, 400)}
                        alt={ca.name}
                        style={{
                          width: 130, height: 130, borderRadius: '50%', objectFit: 'cover',
                          objectPosition: 'center 15%', border: '3px solid var(--brand-accent, #d4af37)',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.18)', display: 'block',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 130, height: 130, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.08)', border: '3px solid var(--brand-accent, #d4af37)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
                      }}>👤</div>
                    )}
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-bg)', marginTop: 8 }}>{ca.name.split(' ')[0]}</div>
                  </div>
                ))}
                {photoSrc && (
                  <div style={{ textAlign: 'center', marginLeft: -20, zIndex: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoSrc}
                      alt={agent.name}
                      style={{
                        width: 130, height: 130, borderRadius: '50%', objectFit: 'cover',
                        objectPosition: 'center 15%', border: '3px solid var(--brand-accent, #d4af37)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.18)', display: 'block',
                      }}
                    />
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-bg)', marginTop: 8 }}>{agent.name.split(' ')[0]}</div>
                  </div>
                )}
              </div>
            ) : photoSrc ? (
              <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', width: 200, flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoSrc} alt={agent.name} style={{ width: '100%', display: 'block', aspectRatio: '3/4', objectFit: 'cover', objectPosition: 'top' }} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Market snapshot */}
      {(stats.active_count > 0 || stats.sold_last_30_days > 0 || stats.avg_sold_price) && (
        <div style={{ background: 'var(--off-white)', borderBottom: '1px solid var(--border)', padding: '20px 0' }}>
          <div className="container">
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px 32px' }}>
                <div style={{ flexShrink: 0 }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Live Market Snapshot · {areaLabel}
                  </div>
                  {marketLabel && (
                    <div style={{
                      display: 'inline-block',
                      background: marketLabel === "Seller's Market" ? '#fef3c7' : marketLabel === 'Balanced Market' ? '#dbeafe' : '#dcfce7',
                      color: marketLabel === "Seller's Market" ? '#92400e' : marketLabel === 'Balanced Market' ? '#1e40af' : '#166534',
                      fontSize: 13, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                    }}>
                      {marketLabel}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 28px', flex: 1 }}>
                  {stats.active_count > 0 && (
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', lineHeight: 1 }}>{stats.active_count.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Homes For Sale</div>
                    </div>
                  )}
                  {stats.sold_last_30_days > 0 && (
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', lineHeight: 1 }}>{stats.sold_last_30_days.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sold Last 30 Days</div>
                    </div>
                  )}
                  {stats.avg_sold_price && (
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', lineHeight: 1 }}>{formatPrice(stats.avg_sold_price)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Sold Price</div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>Based on MLS® data</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container" style={{ padding: '56px var(--container-padding) 72px' }}>
        <div className="top-realtor-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 56 }}>
          <div>

            {/* Bio — dual-agent: show both bios */}
            {isDual ? (
              <section style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 20 }}>Meet {displayNames}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {agent.bio && (
                    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '28px' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 12 }}>{agent.name}</div>
                      {agent.bio.split('\n\n').map((para, i) => (
                        <p key={i} style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text)', marginBottom: i < agent.bio!.split('\n\n').length - 1 ? 18 : 0 }}>{para}</p>
                      ))}
                    </div>
                  )}
                  {coAgents.map((ca, i) => ca.bio && (
                    <div key={i} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '28px' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 12 }}>{ca.name}</div>
                      {ca.bio.split('\n\n').map((para, j) => (
                        <p key={j} style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text)', marginBottom: j < ca.bio.split('\n\n').length - 1 ? 18 : 0 }}>{para}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            ) : agent.bio && (
              <section style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 20 }}>About {agent.name}</h2>
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '28px' }}>
                  {agent.bio.split('\n\n').map((para, i) => (
                    <p key={i} style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text)', marginBottom: i < agent.bio!.split('\n\n').length - 1 ? 18 : 0 }}>{para}</p>
                  ))}
                </div>
              </section>
            )}

            {/* Per-agent credentials — dual-agent: two columns */}
            {isDual && (primaryCredentials.length > 0 || coAgents.some(ca => {
              const key = ca.name.trim().toLowerCase()
              const apiCaAch = agent.settings?.co_agent_achievements?.[key]
              return (apiCaAch?.length ? apiCaAch : getCoAgentAchievements(ca.name)).length > 0
            })) && (
              <section style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 18 }}>Credentials &amp; Achievements</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                  {/* Primary agent credentials */}
                  <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 14 }}>{agent.name}</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {primaryCredentials.map((ach, i) => (
                        <li key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < primaryCredentials.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13, color: 'var(--text)' }}>
                          <span style={{ color: 'var(--accent)', flexShrink: 0 }}>✓</span>
                          <span>{ach.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Co-agent credentials */}
                  {coAgents.map((ca, i) => {
                    const key = ca.name.trim().toLowerCase()
                    const apiCaAch = agent.settings?.co_agent_achievements?.[key]
                    const caAch = apiCaAch?.length ? apiCaAch : getCoAgentAchievements(ca.name)
                    if (caAch.length === 0) return null
                    return (
                      <div key={i} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 14 }}>{ca.name}</div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {caAch.map((ach, j) => (
                            <li key={j} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: j < caAch.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13, color: 'var(--text)' }}>
                              <span style={{ color: 'var(--accent)', flexShrink: 0 }}>✓</span>
                              <span>{ach.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Awards — single agent only */}
            {!isDual && topRealtor?.awards && topRealtor.awards.length > 0 && (
              <section style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 18 }}>Awards &amp; Recognition</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                  {topRealtor.awards.map(award => (
                    <div key={award.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <span style={{ fontSize: 24, flexShrink: 0 }}>🏅</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-bg)' }}>{award.title}</div>
                          {award.organization && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 2 }}>{award.organization} {award.year ? `· ${award.year}` : ''}</div>}
                          {award.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>{award.description}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* By neighbourhood */}
            {neighbourhoods.length > 0 && (
              <section style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 8 }}>
                  Top {isDual ? 'Team' : 'Agent'} By Neighbourhood
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
                  {isDual ? `${displayNames} cover` : `${firstName} covers`} all of these communities — click through for neighbourhood-specific sales data.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
                  {neighbourhoods.map(n => (
                    <a key={n.slug} href={ap(`/neighbourhood/${n.slug}`)}
                      style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary-bg)' }}>{n.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{n.active_count} active listings</div>
                      </div>
                      <span style={{ color: 'var(--accent)', fontSize: 16 }}>→</span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* FAQ — AEO section */}
            <section style={{ marginBottom: 48 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 20 }}>
                Frequently Asked Questions
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {faqItems.map((f, i) => (
                  <div key={i} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-bg)', margin: '0 0 10px' }}>{f.q}</h3>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.8, margin: 0 }}>{f.a}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div>
            {isDual ? (
              <>
                {/* Dual-agent: show both agent cards */}
                {photoSrc && (
                  <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoSrc} alt={agent.name} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
                    <div style={{ padding: '16px 18px' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-bg)' }}>{agent.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 8 }}>{agent.brokerage}</div>
                      <a href={`tel:${agent.phone}`} style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-bg)', textDecoration: 'none', display: 'block' }}>{agent.phone}</a>
                      {agent.license_number && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Lic. #{agent.license_number}</div>}
                    </div>
                  </div>
                )}
                {coAgents.map((ca, i) => (
                  <div key={i} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                    {ca.photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imgUrl(ca.photo, 400)} alt={ca.name} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
                    )}
                    <div style={{ padding: '16px 18px' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-bg)' }}>{ca.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 8 }}>{ca.title || agent.brokerage}</div>
                      {ca.phone && <a href={`tel:${ca.phone}`} style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-bg)', textDecoration: 'none', display: 'block' }}>{ca.phone}</a>}
                    </div>
                  </div>
                ))}
              </>
            ) : photoSrc && (
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoSrc} alt={agent.name} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-bg)' }}>{agent.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 8 }}>{agent.brokerage}</div>
                  <a href={`tel:${agent.phone}`} style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-bg)', textDecoration: 'none', display: 'block' }}>{agent.phone}</a>
                  {agent.license_number && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Lic. #{agent.license_number}</div>}
                </div>
              </div>
            )}
            <div style={{ background: 'var(--primary-bg)', borderRadius: 10, padding: '20px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Ready to get started?</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
                Book a no-obligation call with {isDual ? 'our team' : firstName} today.
              </div>
              <a href={ap('/contact')} style={{ display: 'block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '12px', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                Contact {isDual ? 'the Team' : firstName}
              </a>
              <a href={`tel:${agent.phone}`} style={{ display: 'block', marginTop: 8, color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>{agent.phone}</a>
            </div>
          </div>
        </div>
      </div>

      <PageQuickLinks slug={slug} exclude="/top-realtor" />
      <style>{`
        @media (max-width: 900px) {
          .top-realtor-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 680px) {
          .tr-root-hero-grid { grid-template-columns: 1fr !important; }
          .tr-root-photos { display: none !important; }
        }
      `}</style>
    </div>
  )
}
