import React from 'react'
import { headers } from 'next/headers'
import Image from 'next/image'
import { getAgent, getListings, getBuildings, getMarketStats, getTestimonials, getTopRealtor, getAwards, getAgentTerritories, agentCanonicalBase, resolveAgentPrefix, getNews, getFaqs, getOwnListings, getReciprocityListings, getMedia, getUnifiedSolds } from '@/lib/api'
import { normalizeCity } from '@/lib/market'
import MotionReveal from '@/components/MotionReveal.client'
import HeroParallax from '@/components/HeroParallax.client'
import { imgUrl, secondPhotoUrl, formatPrice, getHeroCredentials, getCoAgents, resolveSiteConfig } from '@/lib/types'
import type { UnifiedSoldsResponse } from '@/lib/types'
import { toHomesForSaleHref } from './homes-for-sale/subareaUtils'
import ListingCard from '@/components/ListingCard'
import TestimonialsStrip from '@/components/TestimonialsStrip'
import TestimonialsCards from '@/components/TestimonialsCards'
import SectionHeader from '@/components/SectionHeader'
import HeroSection from '@/components/HeroSection'
import AchievementsBar from '@/components/AchievementsBar'
import SoldGallery from '@/components/SoldGallery'
import MarketReportsTeaser from '@/components/MarketReportsTeaser'
import BlogTeaser from '@/components/BlogTeaser'
import CredentialRibbon from '@/components/CredentialRibbon'
import AgentFaqSection from '@/components/AgentFaqSection'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { topNeighbourhoods, lastNListToSoldRatio } from '@/lib/agent-profile'

interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 300

export async function generateStaticParams() {
  return [{ slug: 'randy' }]
}

const AREA_IMAGES: Record<string, string> = {
  'South Surrey White Rock': 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&h=580&fit=crop',
  'Morgan Creek':            'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=380&fit=crop',
  'White Rock':              'https://images.unsplash.com/photo-1445991842772-097fea258e7b?w=600&h=380&fit=crop',
  'Cloverdale':              'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=600&h=380&fit=crop',
  'Grandview Heights':       'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&h=380&fit=crop',
  'Ocean Park':              'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=380&fit=crop',
  default:                   'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=380&fit=crop',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [agent, territories, metaSoldsResult] = await Promise.all([getAgent(slug), getAgentTerritories(slug), getOwnListings(slug, { status: 'Sold', limit: 50 })])
  if (!agent) {
    return {
      title: `Real Estate in ${slug} | Browse MLS® Listings`,
      description: `Browse MLS® listings and connect with a local REALTOR® expert.`,
      robots: { index: false, follow: false },
    }
  }
  const coAgents = getCoAgents(agent)
  const displayName = coAgents.length > 0 ? `${agent.name} & ${coAgents[0].name}` : agent.name
  const territoryCities = [...new Set(territories.map(t => normalizeCity(t.city)).filter(Boolean))]
  const territoryLabel = territoryCities.length ? territoryCities.join(' & ') : 'South Surrey & White Rock'
  // Prefer sold-derived primary markets (reflects actual transaction history) over territory table
  const metaSoldAreas = topNeighbourhoods(metaSoldsResult.listings, 3)
  const primaryLabel = metaSoldAreas.length >= 2
    ? metaSoldAreas.join(' & ')
    : (territoryCities.slice(0, 3).join(' & ') || 'South Surrey & White Rock')
  const domain = agentCanonicalBase(agent)
  const guideName = agent.settings?.guide_name?.trim() || null
  const title = guideName
    ? `${guideName} | ${primaryLabel} Homes for Sale`
    : `${displayName} — REALTOR® in ${primaryLabel}`
  const description = guideName
    ? `${guideName} — browse MLS® listings in ${primaryLabel}, get a free home evaluation, and connect with ${displayName}.`
    : `${displayName} ${coAgents.length > 0 ? 'are experienced REALTORS®' : 'is an experienced REALTOR®'} in ${primaryLabel}. Browse active MLS® listings, get a free home evaluation, and connect with a trusted local expert.`
  const canonical = `https://${domain}/`
  const ogImage = agent.photo_path
    ? { url: imgUrl(agent.photo_path, 900), alt: displayName }
    : { url: `https://${domain}/opengraph.jpg`, alt: displayName }
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      siteName: displayName,
      images: [ogImage],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage.url] },
  }
}

export default async function AgentHomePage({ params }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  // Phase 1: load agent to resolve site config
  const agent = await getAgent(slug)
  if (!agent) notFound()
  const cfg = resolveSiteConfig(agent)

  // Phase 2: fetch all page data in parallel, skipping expensive optional fetches
  const [
    housesResult, townhousesResult, condosResult, greatBuysResult,
    buildings, stats, testimonials, topRealtor, awards, territories,
    soldResult, newsResult, faqsResult, ownActiveResult, reciprocityResult,
    showcaseMediaResult, showcaseSoldResult,
  ] = await Promise.all([
    getListings(slug, { status: 'Active', type: 'House', limit: 4 }),
    getListings(slug, { status: 'Active', type: 'Townhouse', limit: 4 }),
    getListings(slug, { status: 'Active', type: 'Condo', limit: 4 }),
    getListings(slug, { status: 'Active', price_reduced: true, limit: 4 }),
    cfg.sections.buildings
      ? getBuildings(slug)
      : Promise.resolve([]),
    cfg.sections.market_reports
      ? getMarketStats(slug)
      : Promise.resolve(null),
    cfg.sections.testimonials !== false
      ? getTestimonials(slug)
      : Promise.resolve([]),
    getTopRealtor(slug),
    getAwards(slug),
    getAgentTerritories(slug),
    cfg.sections.sold_gallery
      ? getUnifiedSolds(slug, 1)
      : Promise.resolve({ items: [], total_count: 0, total_volume: 0, page: 1, limit: 24 } as UnifiedSoldsResponse),
    cfg.sections.blog
      ? getNews(slug, 1, 3)
      : Promise.resolve({ posts: [], total: 0 }),
    cfg.sections.faqs
      ? getFaqs(slug)
      : Promise.resolve([]),
    cfg.layout_preset === 'showcase'
      ? getOwnListings(slug, { status: 'Active', limit: 8 })
      : Promise.resolve({ listings: [], total: 0 }),
    cfg.layout_preset === 'showcase'
      ? getReciprocityListings(slug, 8)
      : Promise.resolve({ listings: [], total: 0 }),
    cfg.layout_preset === 'showcase'
      ? getMedia(slug).catch(() => [])
      : Promise.resolve([]),
    cfg.layout_preset === 'showcase'
      ? getOwnListings(slug, { status: 'Sold', limit: 50 })
      : Promise.resolve({ listings: [], total: 0 }),
  ])

  const houseListings = housesResult.listings
  const houseTotal = housesResult.total
  const townhouseListings = townhousesResult.listings
  const townhouseTotal = townhousesResult.total
  const condoListings = condosResult.listings
  const condoTotal = condosResult.total
  const greatBuysListings = greatBuysResult.listings
  const greatBuysTotal = greatBuysResult.total
  // soldResult is always a valid UnifiedSoldsResponse — getUnifiedSolds() never returns null
  const unifiedSoldsData: UnifiedSoldsResponse = (soldResult as UnifiedSoldsResponse) ?? { items: [], total_count: 0, total_volume: 0, page: 1, limit: 24 }
  const soldListings = unifiedSoldsData.items
  const blogPosts = newsResult.posts
  const agentFaqs = faqsResult
  const ownActiveListings = ownActiveResult.listings
  const hasOwnActive = ownActiveListings.length > 0
  const reciprocityListings = reciprocityResult.listings
  const isShowcasePreset = cfg.layout_preset === 'showcase'
  const showcaseHeadshot = showcaseMediaResult.find((m: { type?: string }) => m.type === 'headshot') ?? null
  // A property photo for the hero, if the agent has one. The showcase heroes previously
  // only ever had the portrait to work with, which is the wrong shape for a full-width
  // strip — a headshot cropped to 3:2 crops to a face and a lot of wall. Optional by
  // design: agents without a hero row keep the portrait, so nothing changes for them.
  const showcaseHero = showcaseMediaResult.find((m: { type?: string }) => m.type === 'hero') ?? null
  const ownSoldListings = showcaseSoldResult.listings
  const ownSoldTotal = showcaseSoldResult.total

  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 600) : null

  // Unified sold count: listing-side + buyer-represented (from getUnifiedSolds when gallery is enabled)
  const unifiedSoldCount = cfg.sections.sold_gallery && unifiedSoldsData.total_count > 0
    ? unifiedSoldsData.total_count
    : (topRealtor?.sold_count ?? 0)

  const heroStats: { v: string; l: string }[] = []
  if (unifiedSoldCount) heroStats.push({ v: unifiedSoldCount.toLocaleString(), l: 'Homes Sold' })
  const ratings = testimonials.map(t => t.rating).filter((r): r is number => typeof r === 'number' && r > 0)
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null
  if (avgRating) heroStats.push({ v: `${avgRating.toFixed(1)}`, l: `★ Avg Rating (${ratings.length})` })
  if (stats?.active_count) heroStats.push({ v: stats.active_count.toLocaleString(), l: 'Homes For Sale' })
  if (stats?.sold_last_30_days) heroStats.push({ v: String(stats.sold_last_30_days), l: 'Sold Last 30 Days' })

  // Areas — group buildings by subarea, deduplicate, up to 3
  const areaCounts: Record<string, number> = {}
  for (const b of buildings) {
    const area = b.subarea || b.city
    areaCounts[area] = (areaCounts[area] || 0) + b.active_listings
  }
  const areas = Object.entries(areaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count, img: AREA_IMAGES[name] ?? AREA_IMAGES.default }))

  // Market snapshot stat items
  const snapshotStats = [
    stats?.active_count ? { v: stats.active_count.toLocaleString(), l: 'Homes For Sale' } : null,
    stats?.sold_last_30_days ? { v: String(stats.sold_last_30_days), l: 'Sold This Month' } : null,
    stats?.avg_sold_price ? { v: formatPrice(stats.avg_sold_price), l: 'Avg Sold Price' } : null,
    topRealtor?.avg_dom != null ? { v: `${topRealtor.avg_dom}d`, l: 'Avg Days on Market' } : null,
  ].filter(Boolean) as { v: string; l: string }[]

  const firstName = agent.name.split(' ')[0]
  const coAgents = getCoAgents(agent)
  const isDualAgent = coAgents.length > 0
  const coAgent = coAgents[0] || null

  const avgRatingFull = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null

  const domain = agentCanonicalBase(agent)
  const siteUrl = `https://${domain}`

  const territoryCities = [...new Set(territories.map(t => normalizeCity(t.city)).filter(Boolean))]
  const territorySubareas = [...new Set(territories.map(t => t.subarea).filter((s): s is string => !!s))]
  const territoryLabel = territoryCities.length ? territoryCities.join(' & ') : 'South Surrey & White Rock'
  // Prefer sold-derived primary markets (reflects actual transaction history);
  // fall back to territory table for new/thin agents (< 2 distinct sold areas).
  const soldAreas = topNeighbourhoods(ownSoldListings, 3)
  const primaryMarkets = soldAreas.length >= 2
    ? `${soldAreas.slice(0, -1).join(', ')} & ${soldAreas[soldAreas.length - 1]}`
    : (() => {
        const tc = territoryCities.slice(0, 3)
        return tc.length >= 2
          ? `${tc.slice(0, -1).join(', ')} & ${tc[tc.length - 1]}`
          : (tc[0] || 'Metro Vancouver')
      })()
  // areaServed: territory cities + subareas + any sold areas not already in territories
  const soldCitiesForSchema = soldAreas.filter(a => !territoryCities.includes(a))
  const areaServed = territories.length
    ? [
        ...territoryCities.map(name => ({ '@type': 'City', name })),
        ...territorySubareas.slice(0, 12).map(name => ({ '@type': 'Place', name })),
        ...soldCitiesForSchema.map(name => ({ '@type': 'Place', name })),
      ]
    : soldAreas.length > 0
    ? soldAreas.map(name => ({ '@type': 'Place', name }))
    : [
        { '@type': 'City', name: 'South Surrey' },
        { '@type': 'City', name: 'White Rock' },
      ]
  const primaryCity = territoryCities[0] || 'Surrey'
  const heroCredentials = getHeroCredentials(agent)
  const guideName = agent.settings?.guide_name?.trim() || null

  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: agent.name,
    url: siteUrl,
    telephone: agent.phone,
    ...(agent.email ? { email: agent.email } : {}),
    ...(agent.license_number ? { identifier: `BCFSA #${agent.license_number.replace(/^BCFSA\s*#\s*/i, '').trim()}` } : {}),
    description: agent.bio?.slice(0, 200) || `Top REALTOR® serving ${territoryLabel}.`,
    image: agent.photo_path ? imgUrl(agent.photo_path, 900) : undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: primaryCity,
      addressRegion: 'BC',
      addressCountry: 'CA',
    },
    areaServed,
    '@id': `${siteUrl}/#agent`,
    worksFor: { '@type': 'Organization', name: agent.brokerage },
    ...(agent.license_number ? { hasCredential: `BCFSA #${agent.license_number.replace(/^BCFSA\s*#\s*/i, '').trim()}` } : {}),
    ...(agent.settings?.licensed_since ? { foundingDate: String(agent.settings.licensed_since) } : {}),
    ...(avgRatingFull && ratings.length >= 2 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: avgRatingFull.toFixed(1),
        reviewCount: ratings.length,
        bestRating: '5',
      },
    } : {}),
    ...(agent.settings?.languages?.length ? { knowsLanguage: agent.settings.languages } : {}),
    ...(() => {
      const sameAs: string[] = []
      const sl = agent.settings?.social_links
      if (sl?.facebook) sameAs.push(sl.facebook)
      if (sl?.instagram) sameAs.push(sl.instagram)
      if (sl?.linkedin) sameAs.push(sl.linkedin)
      if (sl?.twitter) sameAs.push(sl.twitter)
      if (sl?.youtube) sameAs.push(sl.youtube)
      return sameAs.length ? { sameAs } : {}
    })(),
    ...(unifiedSoldCount ? { knowsAbout: `${unifiedSoldCount}+ homes sold in ${primaryMarkets}` } : {}),
    ...(topRealtor?.awards?.length
      ? { award: topRealtor.awards.map(a => `${a.title}${a.year ? ` (${a.year})` : ''}`) }
      : heroCredentials.length ? { award: heroCredentials } : {}),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `Real Estate Services — ${primaryCity}`,
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: `Home Selling — ${primaryCity}` } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: `Home Buying — ${primaryCity}` } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: `Free Home Evaluation — ${primaryCity}` } },
      ],
    },
  }

  // ── Showcase (Modern Luxury) homepage ──────────────────────────────────────
  if (isShowcasePreset) {
    const SC_CHARCOAL  = 'var(--site-ink)'
    const SC_GOLD      = 'var(--site-accent)'
    // Accent applied to TEXT on a light background. The raw accent is ~2:1 on the canvas
    // and fails AA; this is the darkened variant. Sections on SC_CHARCOAL keep SC_GOLD.
    const SC_GOLD_TEXT = 'var(--site-accent-text)'
    const SC_OFF_WHITE = 'var(--site-canvas)'
    const playfairStyle: React.CSSProperties = { fontFamily: "var(--font-display),Georgia,serif" }

    const agentPhotoSrc = showcaseHeadshot ? imgUrl(showcaseHeadshot.url, 900) : photoSrc

    // Hero imagery at 1600px. The CDN's ?w= is a genuine downscale when the source is
    // bigger (3000px source: 843KB native vs 492KB at 1600, real detail either way) but a
    // pure upscale when it is smaller — a ?w=2400 request on a 1024px original comes back
    // 2399x1598 with edge detail matching a local upscale to three decimals, at 3.5x the
    // bytes. 1600 is the compromise: sharp on a large display, and heroes are meant to be
    // large originals, so the upscale case is the caller supplying the wrong image.
    const heroPropertySrc = showcaseHero?.url ? imgUrl(showcaseHero.url, 1600) : null
    // What the wide hero strip shows: the property if there is one, else the portrait.
    const heroImageSrc = heroPropertySrc ?? agentPhotoSrc
    const heroImageAlt = heroPropertySrc ? (showcaseHero?.alt || showcaseHero?.caption || agent.name) : agent.name
    // photo_focal_x/y describe the PORTRAIT — they mark where the face sits, and hers are
    // 50/15. Applying that to a property photo crops to the top of the frame, which on a
    // poolside shot is sky. So the focal point applies only when the portrait is the hero;
    // a property shot gets centred, and would need its own per-image focal to do better.
    const heroObjectPosition = heroPropertySrc
      ? '50% 50%'
      : `${agent.photo_focal_x ?? 50}% ${agent.photo_focal_y ?? 12}%`

    // Compute real stats from data
    const oldestAward = awards.length ? awards[awards.length - 1] : null
    const yearsActive = oldestAward?.year
      ? Math.max(1, new Date().getFullYear() - parseInt(String(oldestAward.year)) + 1)
      : null
    const last5Ratio = lastNListToSoldRatio(ownSoldListings, 5)
    const scStats: { v: string; l: string }[] = []
    // unifiedSoldCount, not ownSoldTotal: own-listings counts only the listing side, so the
    // hero read "18+ Homes Sold" while the sold gallery lower down on the same page showed
    // the unified 43. Same figure the hub preset already uses for this label.
    const scSoldCount = unifiedSoldCount || ownSoldTotal
    if (scSoldCount > 0) scStats.push({ v: `${scSoldCount}+`, l: 'Homes Sold' })
    if (awards.length > 0) scStats.push({ v: `${awards.length}`, l: 'Industry Awards' })
    if (yearsActive) scStats.push({ v: `${yearsActive}+`, l: 'Years Experience' })
    if (last5Ratio) scStats.push({ v: `${last5Ratio.ratio}%`, l: 'of Asking Price (Last 5)' })
    const scMarkets = [...new Set(territories.map((t: { city?: string | null }) => t.city).filter(Boolean))].length
    if (scMarkets > 0) scStats.push({ v: `${scMarkets}+`, l: 'Communities' })

    // Default FAQ set for AEO when no agent FAQs are stored — structured for schema.org/FAQPage
    const showcaseFaqs = agentFaqs.length > 0 ? agentFaqs : [
      {
        sort_order: 0,
        question: `How do I start buying a home in ${primaryMarkets}?`,
        answer: `The first step is a free, no-obligation consultation with ${firstName}. We discuss your goals, budget, and timeline, then walk through pre-approval, neighbourhood search, and the entire purchase process — from offer to completion.`,
      },
      {
        sort_order: 1,
        question: `Which communities does ${firstName} serve?`,
        answer: `${firstName} specializes in ${primaryMarkets}${territoryCities.length > 3 ? ` and surrounding communities including ${territoryCities.slice(3, 6).join(', ')}` : ''}. Reach out to discuss your specific area of interest.`,
      },
      {
        sort_order: 2,
        question: `What does ${firstName} charge to sell my home?`,
        answer: `Commission is discussed confidentially during our listing consultation. ${firstName} provides full-service representation — professional photography, MLS® listing, digital marketing, open houses, and expert negotiation — with a focus on maximizing your net proceeds.`,
      },
      {
        sort_order: 3,
        question: `Can ${firstName} help me find homes not yet on the market?`,
        answer: `Yes. ${firstName} maintains an active buyer network and regularly identifies off-market opportunities before they appear on MLS®. Share your criteria and ${firstName} will tap into those connections on your behalf.`,
      },
      {
        sort_order: 4,
        question: `How is ${firstName} different from other REALTORS® in ${primaryMarkets}?`,
        answer: `${firstName} combines deep local market knowledge with a highly personalized approach. Every client works directly with ${firstName} — not a junior team member — from first showing through closing and beyond.${last5Ratio ? ` In the last ${last5Ratio.count} transactions, ${firstName} closed at an average of ${last5Ratio.ratio}% of asking price.` : ''}`,
      },
      {
        sort_order: 5,
        question: `How long does it typically take to buy or sell a home in ${primaryMarkets}?`,
        answer: `Timelines vary by market conditions. Buying typically takes 2–8 weeks from offer to completion once you are pre-approved. Listings in ${primaryMarkets} currently average ${topRealtor?.avg_dom != null ? `${topRealtor.avg_dom} days on market` : 'a few weeks on market'}. ${firstName} will give you a realistic timeline based on your specific situation.`,
      },
    ]

    return (
      <div style={{ fontFamily: "var(--font-body),'Helvetica Neue',sans-serif", overflowX: 'hidden' }}>
        {/* One observer for every [data-sc-reveal] on the page. Renders nothing. */}
        <MotionReveal />
        <HeroParallax />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }} />
        {showcaseFaqs.length > 0 && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: showcaseFaqs.slice(0, 8).map((f: { question: string; answer: string }) => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          }) }} />
        )}

        {/* ── Hero — 3 variants driven by cfg.showcase_hero_style ── */}
        {cfg.showcase_hero_style === 'fullbleed-cinematic' ? (
          /* ── Full-bleed Cinematic ── */
          <div style={{ background: SC_CHARCOAL }}>
            <div style={{ position: 'relative', minHeight: 'clamp(480px,82vh,900px)', overflow: 'hidden' }}>
              {heroImageSrc ? (
                <Image data-sc-parallax src={heroImageSrc} alt={heroImageAlt} fill unoptimized priority style={{ objectFit: 'cover', objectPosition: heroObjectPosition }} />
              ) : (
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, var(--site-dark-raised) 0%, var(--site-dark) 55%, var(--site-dark-deep) 100%)' }} />
              )}
              {/* Overlay — heavier bottom-left, lighter top-right */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.25) 100%)' }} />
              {/* Text — bottom left */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 'clamp(36px,5vh,70px) clamp(28px,5vw,80px)', maxWidth: 820 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
                  <div style={{ width: 52, height: 1, background: SC_GOLD, flexShrink: 0 }} />
                  <p style={{ fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', color: SC_GOLD, fontWeight: 700, margin: 0 }}>
                    {agent.brokerage}
                  </p>
                </div>
                <h1 style={{ ...playfairStyle, fontSize: 'clamp(2.8rem,7vw,5.5rem)', fontWeight: 300, lineHeight: 1.0, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
                  {agent.name}
                </h1>
                <p style={{ fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: SC_GOLD, fontWeight: 600, margin: '0 0 18px' }}>
                  REALTOR® in {primaryMarkets}
                </p>
                <div style={{ width: 320, height: 1, background: 'rgba(255,255,255,0.12)', marginBottom: 18 }} />
                <p style={{ ...playfairStyle, fontSize: 'clamp(1.05rem,1.8vw,1.4rem)', fontStyle: 'italic', color: 'rgba(255,255,255,0.72)', margin: '0 0 28px', lineHeight: 1.45 }}>
                  Exceptional Homes. Expert Guidance.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: heroCredentials.length > 0 ? 28 : 0 }}>
                  <a href={ap('/featured-properties')} style={{ background: SC_GOLD, color: SC_CHARCOAL, padding: '14px 32px', fontWeight: 700, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block' }}>
                    Explore Properties
                  </a>
                  <a href={ap('/home-evaluation')} style={{ border: '1px solid rgba(255,255,255,0.40)', color: '#fff', padding: '14px 28px', fontWeight: 600, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block' }}>
                    What&apos;s My Home Worth?
                  </a>
                </div>
                {heroCredentials.length > 0 && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    {heroCredentials.slice(0, 3).map((cred, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 7 }}>◆</span>}
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{cred}</span>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {scStats.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', background: 'rgba(20,20,22,0.92)', backdropFilter: 'blur(8px)' }}>
                <div className="container" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', padding: '0 var(--container-padding)' }}>
                  {scStats.map((s, i) => (
                    <div key={s.l} className="sc-stat-item" style={{ display: 'flex', alignItems: 'center' }}>
                      {i > 0 && <div className="sc-stat-divider" style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.09)', flexShrink: 0 }} />}
                      <div className="sc-stat-tile" style={{ textAlign: 'center', padding: '22px 40px' }}>
                        <div style={{ ...playfairStyle, fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{s.v}</div>
                        <div style={{ fontSize: 9, color: SC_GOLD, textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: 6 }}>{s.l}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : cfg.showcase_hero_style === 'editorial-stack' ? (
          /* ── Editorial Stack ── */
          <div>
            {/* Photo strip */}
            <div style={{ position: 'relative', height: 'clamp(340px,58vh,700px)', overflow: 'hidden', background: '#111' }}>
              {heroImageSrc ? (
                <>
                  <Image data-sc-parallax src={heroImageSrc} alt={heroImageAlt} fill unoptimized priority style={{ objectFit: 'cover', objectPosition: heroObjectPosition }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%', background: 'linear-gradient(to top, rgba(20,20,22,1.0) 0%, rgba(20,20,22,0.6) 40%, transparent 100%)' }} />
                </>
              ) : (
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, var(--site-dark-raised) 0%, var(--site-dark) 55%, var(--site-dark-deep) 100%)' }} />
              )}
              {/* Brokerage badge — top right */}
              <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(6px)', padding: '9px 16px' }}>
                <div style={{ width: 24, height: 1, background: SC_GOLD, flexShrink: 0 }} />
                <span style={{ fontSize: 9, letterSpacing: '0.30em', textTransform: 'uppercase', color: SC_GOLD, fontWeight: 700 }}>
                  {agent.brokerage}
                </span>
              </div>
              {/* Name + market at bottom of photo */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 clamp(24px,5vw,64px) clamp(24px,4vw,40px)' }}>
                <h1 style={{ ...playfairStyle, fontSize: 'clamp(2.2rem,5.5vw,4.5rem)', fontWeight: 400, lineHeight: 1.05, color: '#fff', margin: '0 0 10px', letterSpacing: '0.01em' }}>
                  {agent.name}
                </h1>
                <p style={{ fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: SC_GOLD, fontWeight: 600, margin: 0 }}>
                  REALTOR® in {primaryMarkets}
                </p>
              </div>
            </div>
            {/* Content band */}
            <div style={{ background: 'linear-gradient(160deg, var(--site-dark-raised) 0%, var(--site-dark) 55%, var(--site-dark-deep) 100%)', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <div className={`container sc-editorial-band${heroPropertySrc && agentPhotoSrc ? " sc-editorial-band--portrait" : ""}`} style={{ padding: 'clamp(40px,6vw,64px) var(--container-padding)', position: 'relative' }}>
                {/* Portrait, straddling the strip/band boundary. The wide hero now carries a
                    property rather than a face, so the agent comes back here as an offset card
                    — the overlap is the point, it stitches the two bands together. Only shown
                    when the hero is a property photo; otherwise the strip is already the
                    portrait and this would repeat it. */}
                {heroPropertySrc && agentPhotoSrc && (
                  <div className="sc-editorial-portrait" aria-hidden="true">
                    <Image src={agentPhotoSrc} alt="" fill unoptimized
                      style={{ objectFit: 'cover', objectPosition: `${agent.photo_focal_x ?? 50}% ${agent.photo_focal_y ?? 12}%` }} />
                  </div>
                )}
                {/* Left: tagline + bio + CTA */}
                <div>
                  <p style={{ ...playfairStyle, fontSize: 'clamp(1.05rem,1.7vw,1.4rem)', fontStyle: 'italic', fontWeight: 400, color: 'rgba(255,255,255,0.68)', margin: '0 0 16px', lineHeight: 1.45 }}>
                    Exceptional Homes. Expert Guidance.
                  </p>
                  {agent.bio && (
                    <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.68)', lineHeight: 1.85, margin: '0 0 28px', maxWidth: 480 }}>
                      {agent.bio.replace(/\n+/g, ' ').slice(0, 200)}{agent.bio.length > 200 ? '…' : ''}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: heroCredentials.length > 0 ? 20 : 0 }}>
                    <a href={ap('/featured-properties')} style={{ background: SC_GOLD, color: SC_CHARCOAL, padding: '13px 28px', fontWeight: 700, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block' }}>
                      Explore Properties
                    </a>
                    <a href={ap('/home-evaluation')} style={{ border: `1px solid rgba(var(--brand-accent-rgb),0.65)`, color: SC_GOLD, padding: '13px 24px', fontWeight: 600, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block' }}>
                      What&apos;s My Home Worth?
                    </a>
                  </div>
                  {heroCredentials.length > 0 && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 4 }}>
                      {heroCredentials.slice(0, 3).map((cred, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 7 }}>◆</span>}
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.58)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{cred}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
                {/* Right: stats */}
                {scStats.length > 0 && (
                  <div style={{ borderLeft: '1px solid rgba(255,255,255,0.10)', paddingLeft: 'clamp(28px,4vw,48px)' }} className="sc-editorial-stats">
                    {scStats.map((s, i) => (
                      <div key={s.l} style={{ paddingBottom: i < scStats.length - 1 ? 20 : 0, marginBottom: i < scStats.length - 1 ? 20 : 0, borderBottom: i < scStats.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ ...playfairStyle, fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1, minWidth: 64 }}>{s.v}</div>
                        <div style={{ fontSize: 9, color: SC_GOLD, textTransform: 'uppercase', letterSpacing: '0.16em', lineHeight: 1.4 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── Split hero (default) ── */
          <div style={{ background: 'linear-gradient(160deg, var(--site-dark-raised) 0%, var(--site-dark) 55%, var(--site-dark-deep) 100%)' }}>
          <div style={{ minHeight: 'clamp(520px,78vh,800px)' }} className={`sc-hero-split${!agentPhotoSrc ? ' sc-hero-split--nophoto' : ''}`}>
            {/* Left: text column */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(56px,8vw,100px) clamp(32px,6vw,80px)' }}>
              {/* Brokerage label inline with gold rule */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 26 }}>
                <div style={{ width: 52, height: 1, background: SC_GOLD, flexShrink: 0 }} />
                <p style={{ fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', color: SC_GOLD, fontWeight: 700, margin: 0 }}>
                  {agent.brokerage}
                </p>
              </div>
              <h1 style={{ ...playfairStyle, fontSize: 'clamp(2.4rem,5vw,4rem)', fontWeight: 400, lineHeight: 1.08, color: '#fff', margin: '0 0 10px', letterSpacing: '0.01em' }}>
                {agent.name}
              </h1>
              <p style={{ fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: SC_GOLD, fontWeight: 600, margin: '0 0 20px' }}>
                REALTOR® in {primaryMarkets}
              </p>
              {/* Editorial separator */}
              <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 20 }} />
              <p style={{ ...playfairStyle, fontSize: 'clamp(1.05rem,1.7vw,1.4rem)', fontStyle: 'italic', fontWeight: 400, color: 'rgba(255,255,255,0.68)', margin: '0 0 20px', lineHeight: 1.45 }}>
                Exceptional Homes. Expert Guidance.
              </p>
              {agent.bio && (
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 1.9, maxWidth: 440, margin: '0 0 32px' }}>
                  {agent.bio.replace(/\n+/g, ' ').slice(0, 180)}{agent.bio.length > 180 ? '…' : ''}
                </p>
              )}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href={ap('/featured-properties')} style={{ background: SC_GOLD, color: SC_CHARCOAL, padding: '14px 32px', fontWeight: 700, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block' }}>
                  Explore Properties
                </a>
                <a href={ap('/home-evaluation')} style={{ border: `1px solid rgba(var(--brand-accent-rgb),0.65)`, color: SC_GOLD, padding: '14px 28px', fontWeight: 600, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block' }}>
                  What&apos;s My Home Worth?
                </a>
              </div>
              {heroCredentials.length > 0 && (
                <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {heroCredentials.slice(0, 3).map((cred, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 7 }}>◆</span>}
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.58)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{cred}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
            {/* Right: portrait panel */}
            {agentPhotoSrc && (
              <div style={{ background: '#111', position: 'relative', overflow: 'hidden' }}>
                {/* Gold vertical accent at the seam — gradient fade top/bottom */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: `linear-gradient(to bottom, transparent 0%, ${SC_GOLD} 15%, ${SC_GOLD} 85%, transparent 100%)`, zIndex: 2 }} />
                <Image
                  src={agentPhotoSrc}
                  alt={agent.name}
                  fill
                  unoptimized
                  priority
                  style={{ objectFit: 'cover', objectPosition: 'center 8%' }}
                />
                {/* Depth vignette */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.08) 40%, transparent 65%)', zIndex: 1 }} />
                {/* Name badge overlay */}
                <div className="sc-photo-badge" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '32px 28px 24px', zIndex: 3 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.30em', textTransform: 'uppercase', color: SC_GOLD, fontWeight: 700, marginBottom: 5 }}>
                    {agent.brokerage}
                  </div>
                  <div style={{ ...playfairStyle, fontSize: 18, fontWeight: 400, color: '#fff', lineHeight: 1.2, letterSpacing: '0.01em' }}>
                    {agent.name}
                  </div>
                </div>
              </div>
            )}
          </div>
            {/* Stats strip */}
            {scStats.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', background: 'rgba(20,20,22,0.90)', backdropFilter: 'blur(8px)' }}>
                <div className="container" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', padding: '0 var(--container-padding)' }}>
                  {scStats.map((s, i) => (
                    <div key={s.l} className="sc-stat-item" style={{ display: 'flex', alignItems: 'center' }}>
                      {i > 0 && <div className="sc-stat-divider" style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.09)', flexShrink: 0 }} />}
                      <div className="sc-stat-tile" style={{ textAlign: 'center', padding: '22px 40px' }}>
                        <div style={{ ...playfairStyle, fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{s.v}</div>
                        <div style={{ fontSize: 9, color: SC_GOLD, textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: 6 }}>{s.l}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Active Listings ── */}
        {(hasOwnActive || reciprocityListings.length > 0) && (
          <section data-sc-reveal style={{ background: '#fff', padding: 'clamp(56px,8vw,80px) 0' }}>
            <div className="container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD_TEXT, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
                    {hasOwnActive ? 'Active Listings' : 'Available Homes'}
                  </p>
                  <h2 style={{ ...playfairStyle, fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 400, color: SC_CHARCOAL, margin: 0 }}>
                    {hasOwnActive ? `${firstName}'s Active Listings` : 'Available Properties'}
                  </h2>
                </div>
                <a href={ap('/featured-properties')} style={{ fontSize: 12, fontWeight: 700, color: SC_CHARCOAL, textDecoration: 'none', borderBottom: `1px solid ${SC_GOLD}`, paddingBottom: 3, whiteSpace: 'nowrap' }}>
                  View All Properties →
                </a>
              </div>
              <div className="sc-active-grid">
                {(hasOwnActive ? ownActiveListings : reciprocityListings).slice(0, 6).map(l => {
                  const photo = l.photo_url ? imgUrl(l.photo_url, 600) : null
                  // Same width as the primary, or hovering would pull the heavier native file.
                  const photo2 = photo ? imgUrl(secondPhotoUrl(l.photo_url), 600) : ''
                  const href = `${agentPrefix}/listing/${l.slug || l.mls_no}`
                  return (
                    <a key={l.id} href={href} className="sc-active-card" style={{ display: 'block', textDecoration: 'none', overflow: 'hidden' }}>
                      <div style={{ position: 'relative', paddingBottom: '66%', background: SC_CHARCOAL, overflow: 'hidden' }}>
                        {photo && (
                          <img
                            src={photo}
                            alt={l.address || 'Property'}
                            loading="lazy"
                            className="sc-active-card-img"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        )}
                        {photo2 && (
                          /* Second photo, revealed on hover. Derived URL, so it may not
                             exist — a background-image that 404s never paints, which is
                             why this is a div and not an <img>. */
                          <div className="sc-card-swap" aria-hidden="true"
                            style={{ backgroundImage: `url(${photo2})` }} />
                        )}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.38) 48%, transparent 72%)' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 20px 18px' }}>
                          <div style={{ ...playfairStyle, fontSize: 22, fontWeight: 700, color: SC_GOLD, marginBottom: 5, lineHeight: 1.1 }}>
                            {formatPrice(l.list_price)}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 3, lineHeight: 1.3 }}>
                            {l.address}
                          </div>
                          {(l.subarea || l.city) && (
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.60)', marginBottom: 10 }}>
                              {l.subarea || l.city}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'rgba(255,255,255,0.60)', marginBottom: 14 }}>
                            {l.beds > 0 && <span>{l.beds} bd</span>}
                            {l.baths > 0 && <span>· {l.baths} ba</span>}
                            {l.sqft > 0 && <span>· {l.sqft.toLocaleString()} ft²</span>}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: SC_GOLD, textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: `1px solid ${SC_GOLD}`, paddingBottom: 2 }}>
                            View Property →
                          </span>
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Awards Strip ── */}
        {awards.length > 0 && (
          <div data-sc-reveal style={{ background: SC_CHARCOAL, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '36px 0' }}>
            <div className="container">
              <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD, textTransform: 'uppercase', fontWeight: 700, marginBottom: 20, textAlign: 'center' }}>Awards &amp; Recognition</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                {awards.map((a) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(var(--brand-accent-rgb),0.10)', border: `1px solid rgba(var(--brand-accent-rgb),0.25)`, padding: '8px 16px' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: SC_GOLD, flexShrink: 0, display: 'block' }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.80)', fontWeight: 500 }}>{a.title}</span>
                    {a.year && <span style={{ fontSize: 11, color: SC_GOLD, fontWeight: 600 }}>{a.year}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Recently Sold (own listings) ── */}
        {ownSoldListings.length > 0 && (
          <section data-sc-reveal style={{ background: SC_CHARCOAL, padding: 'clamp(56px,8vw,80px) 0' }}>
            <div className="container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Track Record</p>
                  <h2 style={{ ...playfairStyle, fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 400, color: '#fff', margin: 0 }}>
                    Recently Sold
                    {ownSoldTotal > 0 && <span style={{ fontSize: '0.55em', fontWeight: 400, color: SC_GOLD, marginLeft: 14 }}>{ownSoldTotal}+ homes sold</span>}
                  </h2>
                </div>
                <a href={ap('/featured-properties')} style={{ fontSize: 12, fontWeight: 700, color: SC_GOLD, textDecoration: 'none', borderBottom: `1px solid ${SC_GOLD}`, paddingBottom: 3, whiteSpace: 'nowrap' }}>
                  Full Portfolio →
                </a>
              </div>
              <div className="sc-sold-grid">
                {ownSoldListings.slice(0, 8).map(l => {
                  const photo = l.photo_url ? imgUrl(l.photo_url, 600) : null
                  // Same width as the primary, or hovering would pull the heavier native file.
                  const photo2 = photo ? imgUrl(secondPhotoUrl(l.photo_url), 600) : ''
                  const href = `${agentPrefix}/sold/${l.mls_no}`
                  const soldPrice = l.sold_price ? formatPrice(l.sold_price) : null
                  const typeLabel = l.type === 'Apartment Unit' ? 'Condo' : l.type === 'House/Single Family' ? 'House' : l.type || null
                  return (
                    <a key={l.id} href={href} className="sc-sold-card" style={{ display: 'block', textDecoration: 'none', background: 'var(--site-dark-raised)', overflow: 'hidden' }}>
                      <div style={{ position: 'relative', paddingBottom: '72%', background: 'var(--site-dark-alt)', overflow: 'hidden' }}>
                        {photo && (
                          <img
                            src={photo}
                            alt={l.address || 'Sold property'}
                            loading="lazy"
                            className="sc-sold-card-img"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        )}
                        {photo2 && (
                          /* Second photo, revealed on hover. Derived URL, so it may not
                             exist — a background-image that 404s never paints, which is
                             why this is a div and not an <img>. */
                          <div className="sc-card-swap" aria-hidden="true"
                            style={{ backgroundImage: `url(${photo2})` }} />
                        )}
                        {!photo && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(var(--brand-accent-rgb),0.25)', fontSize: 40 }}>
                            🏠
                          </div>
                        )}
                        <div style={{ position: 'absolute', top: 12, left: 12, background: SC_GOLD, color: SC_CHARCOAL, fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '4px 10px' }}>
                          SOLD
                        </div>
                      </div>
                      <div style={{ padding: '14px 16px 16px' }}>
                        {soldPrice && (
                          <div style={{ ...playfairStyle, fontSize: 20, fontWeight: 700, color: 'var(--site-canvas)', marginBottom: 5, lineHeight: 1.1 }}>
                            {soldPrice}
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: SC_GOLD, opacity: 0.85, marginBottom: 5, lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {l.address || l.mls_no}
                        </div>
                        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>
                          {l.beds > 0 && <span>{l.beds} bd</span>}
                          {l.baths > 0 && <span>· {l.baths} ba</span>}
                          {typeLabel && <span>· {typeLabel}</span>}
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
          <section data-sc-reveal style={{ background: '#fff', padding: 'clamp(56px,8vw,80px) 0' }}>
            <div className="container">
              <div style={{ textAlign: 'center', marginBottom: 48 }}>
                <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD_TEXT, textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>Client Stories</p>
                <h2 style={{ ...playfairStyle, fontSize: 'clamp(1.8rem,3vw,2.5rem)', fontWeight: 400, color: SC_CHARCOAL, margin: 0 }}>
                  What My Clients Say
                </h2>
              </div>
              <TestimonialsCards testimonials={testimonials} />
            </div>
          </section>
        )}

        {/* ── Sell With Me Teaser ── */}
        <section data-sc-reveal style={{ background: SC_CHARCOAL, padding: 'clamp(64px,10vw,100px) 0' }}>
          <div className="container">
            <div className="sc-sell-grid">
              <div>
                <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD, textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>Thinking of Selling?</p>
                <h2 style={{ ...playfairStyle, fontSize: 'clamp(2rem,3.5vw,3rem)', fontWeight: 400, color: '#fff', marginBottom: 20, lineHeight: 1.2 }}>
                  Ready to List<br />Your Home?
                </h2>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.62)', lineHeight: 1.8, marginBottom: 32, maxWidth: 420 }}>
                  {firstName} brings a strategic approach to every listing — from positioning and pricing to marketing and negotiation.
                </p>
                <a href={ap('/sell-with-me')} style={{ display: 'inline-block', background: SC_GOLD, color: SC_CHARCOAL, padding: '14px 28px', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
                  See How I Can Help →
                </a>
              </div>
              <div>
                {[
                  { n: '01', title: 'Strategic Pricing', body: 'A data-backed pricing strategy that maximizes your sale price without leaving money on the table.' },
                  { n: '02', title: 'Premium Marketing', body: 'Professional photography, staging consultation, and targeted digital marketing to reach qualified buyers.' },
                  { n: '03', title: 'Expert Negotiation', body: 'Skilled negotiation that protects your interests and closes deals on the best possible terms.' },
                ].map((item, idx) => (
                  <div key={item.n} style={{ display: 'flex', gap: 20, marginBottom: idx < 2 ? 28 : 0, paddingBottom: idx < 2 ? 28 : 0, borderBottom: idx < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                    <div style={{ ...playfairStyle, fontSize: 34, fontWeight: 800, color: 'rgba(var(--brand-accent-rgb),0.28)', lineHeight: 1, flexShrink: 0 }}>{item.n}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 8 }}>{item.title}</div>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.52)', lineHeight: 1.7, margin: 0 }}>{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Home Evaluation CTA ── */}
        <section data-sc-reveal style={{ background: SC_OFF_WHITE, padding: 'clamp(56px,8vw,80px) 0', borderBottom: '1px solid #e5e0d8', textAlign: 'center' }}>
          <div className="container" style={{ maxWidth: 640 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD_TEXT, textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>Free Evaluation</p>
            <h2 style={{ ...playfairStyle, fontSize: 'clamp(2rem,3vw,2.8rem)', fontWeight: 400, color: SC_CHARCOAL, marginBottom: 16, lineHeight: 1.2 }}>
              What Is Your Home Worth?
            </h2>
            <p style={{ fontSize: 15, color: '#666', lineHeight: 1.75, marginBottom: 32 }}>
              Get a free Comparative Market Analysis from {firstName} — based on real recent MLS® sales, not automated estimates.
            </p>
            <a href={ap('/home-evaluation')} style={{ display: 'inline-block', background: SC_CHARCOAL, color: '#fff', padding: '14px 32px', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
              Get My Free CMA
            </a>
          </div>
        </section>

        {/* ── FAQ ── */}
        {showcaseFaqs.length > 0 && (
          <AgentFaqSection faqs={showcaseFaqs} agentName={agent.name} siteUrl={siteUrl} />
        )}

        {/* ── About Snippet ── */}
        {agent.bio && (
          <section data-sc-reveal style={{ background: SC_CHARCOAL, padding: 'clamp(56px,8vw,80px) 0' }}>
            <div className="container">
              <div className="sc-about-grid">
                {agentPhotoSrc && (
                  <div style={{ position: 'relative', aspectRatio: '3/4', maxHeight: 420, overflow: 'hidden' }}>
                    <Image src={agentPhotoSrc} alt={agent.name} fill unoptimized style={{ objectFit: 'cover', objectPosition: '50% 10%' }} />
                  </div>
                )}
                <div>
                  <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD, textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>About {firstName}</p>
                  <h2 style={{ ...playfairStyle, fontSize: 'clamp(1.8rem,3vw,2.5rem)', fontWeight: 400, color: '#fff', marginBottom: 20 }}>{agent.name}</h2>
                  {agent.bio.split(/\n\n+/).slice(0, 2).map((para, i) => (
                    <p key={i} style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.85, marginBottom: 14 }}>{para.trim()}</p>
                  ))}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
                    <a href={ap('/about')} style={{ display: 'inline-block', border: `1px solid rgba(var(--brand-accent-rgb),0.45)`, color: SC_GOLD, padding: '12px 24px', fontWeight: 600, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
                      Full Biography →
                    </a>
                    <a href={ap('/contact')} style={{ display: 'inline-block', background: SC_GOLD, color: SC_CHARCOAL, padding: '12px 24px', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
                      Get in Touch
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Contact CTA ── */}
        <section data-sc-reveal style={{ background: SC_OFF_WHITE, padding: 'clamp(40px,6vw,60px) 0', textAlign: 'center' }}>
          <div className="container">
            <p style={{ fontSize: 15, color: '#666', marginBottom: 8 }}>
              {agent.phone && (
                <a href={`tel:${agent.phone}`} style={{ color: SC_CHARCOAL, fontWeight: 700, textDecoration: 'none' }}>{agent.phone}</a>
              )}
              {agent.phone && agent.email && <span style={{ color: '#ccc', margin: '0 10px' }}>·</span>}
              {agent.email && (
                <a href={`mailto:${agent.email}`} style={{ color: '#666', textDecoration: 'none' }}>{agent.email}</a>
              )}
            </p>
          </div>
        </section>

        <style>{`
          .sc-hero-split {
            display: grid;
            grid-template-columns: 1fr 42%;
          }
          .sc-hero-split--nophoto {
            grid-template-columns: 1fr;
          }
          .sc-sell-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 64px;
            align-items: start;
          }
          .sc-about-grid {
            display: grid;
            grid-template-columns: ${agentPhotoSrc ? '300px 1fr' : '1fr'};
            gap: 56px;
            align-items: center;
          }
          .sc-active-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .sc-active-card { transition: box-shadow 0.25s; }
          .sc-active-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.28); }
          .sc-active-card-img { transition: transform 0.45s ease; }
          .sc-active-card:hover .sc-active-card-img { transform: scale(1.05); }
          .sc-sold-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
          .sc-sold-card { transition: box-shadow 0.25s; }
          .sc-sold-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.40); }
          .sc-sold-card-img { transition: transform 0.45s ease, opacity 0.3s ease; opacity: 0.85; }
          .sc-sold-card:hover .sc-sold-card-img { transform: scale(1.04); opacity: 1; }
          /* Crossfade to the listing's second photo on hover. The .sc-card-swap layer and
             its reduced-motion guard live in globals.css; only the trigger is here, so it
             sits with the zoom above rather than in a separate file. focus-visible is
             included so the effect is reachable by keyboard, not mouse-only. */
          @media (prefers-reduced-motion: no-preference) {
            .sc-active-card:hover .sc-card-swap,
            .sc-active-card:focus-visible .sc-card-swap,
            .sc-sold-card:hover .sc-card-swap,
            .sc-sold-card:focus-visible .sc-card-swap { opacity: 1; }
          }
          /* Suppress the shared layout value-prop CTA — showcase has its own sell section */
          .layout-value-prop { display: none !important; }
          /* Editorial Stack — portrait overlapping the strip/band boundary.
             Pulled up by its own height so it sits half over the photo strip; the band's
             stats column gets padding to clear it. */
          .sc-editorial-portrait {
            position: absolute;
            top: -150px;
            right: var(--container-padding);
            width: 168px;
            height: 210px;
            overflow: hidden;
            border: 6px solid var(--site-dark);
            box-shadow: 0 18px 40px rgba(0,0,0,0.45);
            z-index: 2;
          }
          /* Only the variant that actually renders the card pays for the clearance. */
          .sc-editorial-band--portrait .sc-editorial-stats { padding-top: 74px; }
          /* Editorial Stack two-column layout */
          .sc-editorial-band {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: clamp(24px,4vw,48px);
            align-items: start;
          }
          @media (max-width: 900px) {
            .sc-hero-split { grid-template-columns: 1fr; }
            /* Show portrait above the text on mobile instead of hiding it */
            .sc-hero-split > div:first-child { order: 2; padding-top: 36px !important; padding-bottom: 36px !important; }
            .sc-hero-split > div:last-child { order: 1; display: block !important; height: 320px; min-height: 260px; }
            /* Hide gold accent line and name badge on mobile */
            .sc-hero-split > div:last-child > div:first-child { display: none; }
            .sc-photo-badge { display: none !important; }
            .sc-sell-grid { grid-template-columns: 1fr; gap: 40px; }
            .sc-about-grid { grid-template-columns: 1fr; }
            .sc-active-grid { grid-template-columns: repeat(2, 1fr); }
            .sc-sold-grid { grid-template-columns: repeat(2, 1fr); }
            /* Editorial Stack — stack to single column */
            .sc-editorial-band { grid-template-columns: 1fr !important; }
            /* Below 900px the band is single-column, so an absolutely-placed card would
               overlap the text. Drop it back into the flow at a smaller size. */
            .sc-editorial-band--portrait .sc-editorial-stats { padding-top: 28px; }
            .sc-editorial-portrait { position: static !important; top: auto !important; right: auto !important; width: 116px; height: 145px; margin: -60px 0 20px; border-width: 4px; }
            .sc-editorial-stats { border-left: none !important; padding-left: 0 !important; border-top: 1px solid rgba(255,255,255,0.10); padding-top: 28px; display: flex !important; flex-wrap: wrap; gap: 20px 32px; }
            .sc-editorial-stats > div { border-bottom: none !important; margin-bottom: 0 !important; padding-bottom: 0 !important; }
          }
          @media (max-width: 560px) {
            .sc-hero-split > div:first-child { padding-left: 20px !important; padding-right: 20px !important; padding-top: 28px !important; padding-bottom: 28px !important; }
            /* Stats strip — 2 tiles per row on phones */
            .sc-stat-item { flex: 0 0 50%; box-sizing: border-box; justify-content: center; }
            .sc-stat-divider { display: none !important; }
            .sc-stat-item:nth-child(odd) { border-right: 1px solid rgba(255,255,255,0.09); }
            .sc-stat-tile { padding: 16px 12px !important; }
            .sc-active-grid { grid-template-columns: 1fr; }
            .sc-sold-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "var(--font-body),'Helvetica Neue',sans-serif", overflowX: 'hidden' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }} />

      {/* ─── Hero (variant driven by site_config) ─── */}
      <HeroSection
        agent={agent}
        agentPrefix={agentPrefix}
        heroStyle={cfg.hero_style}
        heroStats={heroStats}
        guideName={guideName}
        territoryLabel={territoryLabel}
        topRealtor={topRealtor}
        testimonials={testimonials}
        firstName={firstName}
      />

      {/* ─── Credential Ribbon (showcase preset: licensed_since / brokerage / language strip) ─── */}
      {cfg.sections.credentials && (
        <CredentialRibbon agent={agent} />
      )}

      {/* ─── Achievements Bar (showcase preset / explicit enable) ─── */}
      {cfg.sections.achievements && (
        <AchievementsBar agent={agent} soldCount={unifiedSoldCount || topRealtor?.sold_count} avgDom={topRealtor?.avg_dom} />
      )}

      {/* ─── Own Active / Reciprocity Listings Strip (showcase preset only) ─── */}
      {isShowcasePreset && (hasOwnActive || reciprocityListings.length > 0) && (
        <section style={{ padding: '56px 0 0', background: '#fff' }}>
          <div className="container">
            <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: 6 }}>
                  {hasOwnActive ? 'Active Listings' : 'Available in Your Area'}
                </div>
                <h2 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 700, margin: 0, color: 'var(--primary-bg)' }}>
                  {hasOwnActive
                    ? `${firstName}'s Active Listings`
                    : `Listings Available Through ${firstName}`}
                </h2>
                {!hasOwnActive && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
                    {firstName} represents buyers and sellers across {territoryLabel}. These homes are listed by REALTOR® members — {firstName} can help you with any of them.
                  </p>
                )}
              </div>
              <a href={ap('/homes-for-sale')} style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-bg)', textDecoration: 'none', borderBottom: '2px solid var(--accent)', paddingBottom: 2, whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 24 }}>
                View All Homes →
              </a>
            </div>
            <div className="prop-type-row">
              {hasOwnActive
                ? ownActiveListings.slice(0, 4).map(l => <ListingCard key={l.id} listing={l} />)
                : reciprocityListings.slice(0, 4).map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
            {!hasOwnActive && reciprocityListings.length > 0 && (
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 14, marginBottom: 0 }}>
                * MLS® Reciprocity — listings courtesy of REBGV member brokerages. {firstName} acts as buyer&apos;s agent; contact {firstName} to book a showing.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ─── Market Snapshot ─── */}
      {snapshotStats.length > 0 && (
        <a href={ap('/market')} style={{ display: 'block', textDecoration: 'none' }}>
          <div style={{ background: '#fff', padding: '32px 0', borderTop: '2px solid var(--accent)', borderBottom: '1px solid #e8eaed' }}>
            <div className="container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--primary-bg)', fontWeight: 700 }}>Market Snapshot</div>
                <div style={{ fontSize: 11, color: '#767676', letterSpacing: 1.5, textTransform: 'uppercase' }}>Live MLS · Updated daily →</div>
              </div>
              <div className="snapshot-grid">
                {snapshotStats.map(item => (
                  <div key={item.l} className="snapshot-card" style={{ background: '#f7f8fa', border: '1px solid #e8eaed', borderRadius: 8, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 'clamp(28px,3vw,38px)', fontWeight: 800, color: 'var(--primary-bg)', lineHeight: 1 }}>{item.v}</div>
                    <div style={{ fontSize: 11, color: '#767676', textTransform: 'uppercase', letterSpacing: 1.2 }}>{item.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </a>
      )}

      {/* ─── Property type quick-links ─── */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '14px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 6 }}>Browse by type</span>
            <a href={ap('/homes-for-sale')} style={{ display: 'inline-block', padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: 'var(--primary-bg)', color: '#fff', border: `1px solid ${'var(--primary-bg)'}`, textDecoration: 'none' }}>All Homes</a>
            <a href={ap('/condos-for-sale')} style={{ display: 'inline-block', padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, background: 'var(--off-white)', color: 'var(--text)', border: '1px solid var(--border)', textDecoration: 'none' }}>Condos for Sale</a>
            <a href={ap('/townhouses-for-sale')} style={{ display: 'inline-block', padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, background: 'var(--off-white)', color: 'var(--text)', border: '1px solid var(--border)', textDecoration: 'none' }}>Townhouses</a>
            <a href={ap('/houses-for-sale')} style={{ display: 'inline-block', padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, background: 'var(--off-white)', color: 'var(--text)', border: '1px solid var(--border)', textDecoration: 'none' }}>Houses</a>
          </div>
        </div>
      </div>

      {/* ─── Sold Gallery (showcase preset) ─── */}
      {cfg.sections.sold_gallery && soldListings.length > 0 && (
        <SoldGallery soldListings={soldListings} agentPrefix={agentPrefix} firstName={firstName} />
      )}

      {/* ─── Great Buys — Price Reduced ─── */}
      {greatBuysListings.length > 0 && (
        <section style={{ padding: '56px 0 0', background: '#fffbf5', borderTop: '2px solid #f5e6c8' }}>
          <div className="container">
            <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#b45309', fontWeight: 700 }}>Price Reduced</span>
                  <span style={{ fontSize: 10, background: '#dc2626', color: '#fff', fontWeight: 700, letterSpacing: 0.5, padding: '2px 7px', borderRadius: 3, textTransform: 'uppercase' }}>🏷 Deal Alert</span>
                </div>
                <h2 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 700, margin: 0, color: 'var(--primary-bg)' }}>
                  Great Buys
                  {greatBuysTotal > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', fontFamily: 'inherit', marginLeft: 10 }}>
                      {greatBuysTotal} price-reduced home{greatBuysTotal !== 1 ? 's' : ''}
                    </span>
                  )}
                </h2>
              </div>
              <a href={ap('/homes-for-sale?price_reduced=1')} style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-bg)', textDecoration: 'none', borderBottom: '2px solid #b45309', paddingBottom: 2, whiteSpace: 'nowrap' }}>
                View All Price Reductions →
              </a>
            </div>
            <div className="prop-type-row">
              {greatBuysListings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          </div>
        </section>
      )}

      {/* ─── Houses for Sale ─── */}
      {houseListings.length > 0 && (
        <section style={{ padding: '56px 0 0', background: '#fff' }}>
          <div className="container">
            <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: 6 }}>Active</div>
                <h2 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 700, margin: 0, color: 'var(--primary-bg)' }}>
                  Houses for Sale
                  {houseTotal > 0 && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', fontFamily: 'inherit', marginLeft: 10 }}>{houseTotal} listings</span>}
                </h2>
              </div>
              <a href={ap('/houses-for-sale')} style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-bg)', textDecoration: 'none', borderBottom: '2px solid var(--accent)', paddingBottom: 2, whiteSpace: 'nowrap' }}>View All Houses →</a>
            </div>
            <div className="prop-type-row">{houseListings.map(l => <ListingCard key={l.id} listing={l} />)}</div>
          </div>
        </section>
      )}

      {/* ─── Townhouses for Sale ─── */}
      {townhouseListings.length > 0 && (
        <section style={{ padding: '48px 0 0', background: '#fff' }}>
          <div className="container">
            <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: 6 }}>Active</div>
                <h2 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 700, margin: 0, color: 'var(--primary-bg)' }}>
                  Townhouses for Sale
                  {townhouseTotal > 0 && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', fontFamily: 'inherit', marginLeft: 10 }}>{townhouseTotal} listings</span>}
                </h2>
              </div>
              <a href={ap('/townhouses-for-sale')} style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-bg)', textDecoration: 'none', borderBottom: '2px solid var(--accent)', paddingBottom: 2, whiteSpace: 'nowrap' }}>View All Townhouses →</a>
            </div>
            <div className="prop-type-row">{townhouseListings.map(l => <ListingCard key={l.id} listing={l} />)}</div>
          </div>
        </section>
      )}

      {/* ─── Condos for Sale ─── */}
      {condoListings.length > 0 && (
        <section style={{ padding: '48px 0 56px', background: '#fff' }}>
          <div className="container">
            <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: 6 }}>Active</div>
                <h2 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 700, margin: 0, color: 'var(--primary-bg)' }}>
                  Condos for Sale
                  {condoTotal > 0 && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', fontFamily: 'inherit', marginLeft: 10 }}>{condoTotal} listings</span>}
                </h2>
              </div>
              <a href={ap('/condos-for-sale')} style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-bg)', textDecoration: 'none', borderBottom: '2px solid var(--accent)', paddingBottom: 2, whiteSpace: 'nowrap' }}>View All Condos →</a>
            </div>
            <div className="prop-type-row">{condoListings.map(l => <ListingCard key={l.id} listing={l} />)}</div>
          </div>
        </section>
      )}

      {/* Fallback if no typed listings */}
      {houseListings.length === 0 && townhouseListings.length === 0 && condoListings.length === 0 && (
        <section style={{ padding: '72px 0', background: '#fff' }}>
          <div className="container">
            <SectionHeader
              eyebrow="Homes For Sale"
              title="Homes for Sale"
              subtitle={(stats?.active_count ?? 0) > 0 ? `${stats!.active_count.toLocaleString()} active listings in the area` : undefined}
              actionHref={ap('/homes-for-sale')}
              actionLabel="View All Homes"
            />
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <a href={ap('/homes-for-sale')} style={{ display: 'inline-block', border: `2px solid ${'var(--primary-bg)'}`, color: 'var(--primary-bg)', padding: '13px 36px', borderRadius: 6, fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none' }}>
                Browse All Homes
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ─── Most Active Buildings ─── */}
      {cfg.sections.buildings && buildings.length > 0 && (
        <section style={{ padding: '72px 0', background: 'var(--primary-bg)' }}>
          <div className="container">
            <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>Condo Directory</div>
                <h2 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(24px,3vw,36px)', fontWeight: 700, margin: 0, color: '#fff' }}>
                  Most Active Buildings
                </h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 6, marginBottom: 0 }}>Sorted by current active listings</p>
              </div>
              <a href={ap('/buildings')} style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', borderBottom: '1px solid var(--accent)', paddingBottom: 2, whiteSpace: 'nowrap' }}>
                Browse all buildings →
              </a>
            </div>
            <div className="buildings-grid">
              {buildings.slice(0, 6).map(b => (
                <a key={b.id} href={ap(`/building/${b.slug}`)} className="building-card" style={{ display: 'block', textDecoration: 'none', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.20)', borderRadius: 8, padding: '20px 22px', transition: 'background 0.2s, border-color 0.2s' }}>
                  <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.80)', marginBottom: 8, fontWeight: 700 }}>{b.subarea || b.city}</div>
                  <div style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>{b.name}</div>
                  {b.address && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 12, lineHeight: 1.4 }}>{b.address.split(',')[0]}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: b.address ? 0 : 12 }}>
                    {b.year_built && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)' }}>Built {b.year_built}</span>}
                    {b.year_built && b.active_listings > 0 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>·</span>}
                    {b.active_listings > 0
                      ? <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>{b.active_listings} active {b.active_listings === 1 ? 'home' : 'homes'}</span>
                      : <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.60)' }}>No active homes</span>
                    }
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Areas covered ─── */}
      {areas.length >= 2 && (
        <section style={{ padding: '72px 0', background: 'var(--off-white)' }}>
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>Coverage Area</div>
                <h2 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(24px,3vw,36px)', fontWeight: 700, margin: 0, color: 'var(--primary-bg)' }}>
                  Areas {firstName} Covers
                </h2>
              </div>
              {(stats?.active_count ?? 0) > 0 && (
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{stats!.active_count} active listings across all areas</span>
              )}
            </div>
            <div className="areas-grid" style={{ display: 'grid', gridTemplateColumns: areas.length >= 3 ? '1.65fr 1fr' : '1fr 1fr', gap: 4, borderRadius: 10, overflow: 'hidden', height: 420 }}>
              <a href={ap(toHomesForSaleHref(areas[0].name))} className="area-card" style={{ position: 'relative', overflow: 'hidden', display: 'block', textDecoration: 'none' }}>
                <Image src={areas[0].img} alt={areas[0].name} fill unoptimized className="area-img" style={{ objectFit: 'cover', transition: 'transform 0.4s ease' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(26,26,26,0.82) 30%, rgba(26,26,26,0.05) 65%)' }} />
                <div style={{ position: 'absolute', bottom: 28, left: 28 }}>
                  <div style={{ fontFamily: "var(--font-display),Georgia,serif", color: '#fff', fontWeight: 700, fontSize: 28, marginBottom: 6 }}>{areas[0].name}</div>
                  <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 13 }}>{areas[0].count} active listings</div>
                </div>
              </a>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {areas.slice(1).map(area => (
                  <a key={area.name} href={ap(toHomesForSaleHref(area.name))} className="area-card" style={{ position: 'relative', flex: 1, overflow: 'hidden', display: 'block', textDecoration: 'none' }}>
                    <Image src={area.img} alt={area.name} fill unoptimized className="area-img" style={{ objectFit: 'cover', transition: 'transform 0.4s ease' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(26,26,26,0.78) 35%, rgba(26,26,26,0.05) 70%)' }} />
                    <div style={{ position: 'absolute', bottom: 16, left: 18 }}>
                      <div style={{ fontFamily: "var(--font-display),Georgia,serif", color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 3 }}>{area.name}</div>
                      <div style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>{area.count} active listings</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── About the Agent ─── */}
      <section style={{ padding: '80px 0', background: '#fff' }}>
        <div className="container">
          <div className="about-grid" style={{ display: 'grid', gridTemplateColumns: photoSrc ? '260px 1fr' : '1fr', gap: 56, alignItems: 'start', maxWidth: 1000 }}>
            {photoSrc && (
              <div>
                <div style={{ position: 'relative', width: 260, height: 347, borderRadius: 8, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }}>
                  <Image src={photoSrc} alt={agent.name} fill unoptimized style={{ objectFit: 'cover', objectPosition: 'top' }} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{agent.name}</div>
                  <div style={{ color: 'var(--accent)', fontSize: 13, marginTop: 2 }}>{agent.brokerage}</div>
                  {avgRating && ratings.length > 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>★★★★★ {avgRating.toFixed(1)} · {ratings.length} Reviews</div>
                  )}
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <a href={`tel:${agent.phone}`} style={{ fontSize: 13, color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}>{agent.phone}</a>
                    {agent.email && <a href={`mailto:${agent.email}`} style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>{agent.email}</a>}
                  </div>
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>About</div>
              <h2 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(24px,3vw,36px)', fontWeight: 700, marginBottom: 24, color: 'var(--primary-bg)', lineHeight: 1.2 }}>
                {agent.name}
              </h2>
              {agent.bio?.split('\n\n').slice(0, 3).map((para, i) => (
                <p key={i} style={{ marginBottom: 16, color: 'var(--text-muted)', lineHeight: 1.85, fontSize: 15 }}>{para}</p>
              ))}
              {awards.length > 0 && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
                  {awards.slice(0, 3).map(a => (
                    <div key={a.id} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', borderLeft: `3px solid ${'var(--accent)'}`, borderRadius: 6, padding: '8px 14px', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: 'var(--primary-bg)' }}>{a.title}</div>
                      {a.year && <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{a.year}</div>}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 16, marginTop: 28 }}>
                <a href={ap('/about')} style={{ background: 'var(--primary-bg)', color: '#fff', padding: '12px 24px', borderRadius: 6, fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none' }}>Full Bio</a>
                <a href={`tel:${agent.phone}`} style={{ border: `2px solid ${'var(--primary-bg)'}`, color: 'var(--primary-bg)', padding: '12px 24px', borderRadius: 6, fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none' }}>{agent.phone}</a>
              </div>
              {agent.license_number && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 20 }}>License #{agent.license_number} · {agent.brokerage}</p>
              )}
            </div>
          </div>

          {/* Co-agent row */}
          {isDualAgent && coAgent?.bio && (
            <div style={{ marginTop: 56, paddingTop: 56, borderTop: '1px solid var(--border)', maxWidth: 1000 }}>
              <div className="about-grid" style={{ display: 'grid', gridTemplateColumns: coAgent.photo ? '260px 1fr' : '1fr', gap: 56, alignItems: 'start' }}>
                {coAgent.photo && (
                  <div>
                    <div style={{ position: 'relative', width: 260, height: 347, borderRadius: 8, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }}>
                      <img src={imgUrl(coAgent.photo, 400)} alt={coAgent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
                    </div>
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{coAgent.name}</div>
                      {coAgent.title && <div style={{ color: 'var(--accent)', fontSize: 13, marginTop: 2 }}>{coAgent.title}</div>}
                      {coAgent.phone && <div style={{ marginTop: 14 }}><a href={`tel:${coAgent.phone}`} style={{ fontSize: 13, color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}>{coAgent.phone}</a></div>}
                    </div>
                  </div>
                )}
                <div>
                  <h3 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(24px,3vw,36px)', fontWeight: 700, marginBottom: 24, color: 'var(--primary-bg)', lineHeight: 1.2 }}>{coAgent.name}</h3>
                  {coAgent.bio.split('\n\n').slice(0, 3).map((para, i) => (
                    <p key={i} style={{ marginBottom: 16, color: 'var(--text-muted)', lineHeight: 1.85, fontSize: 15 }}>{para}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Market Reports CTA ─── */}
      {cfg.sections.market_reports && stats && (
        <MarketReportsTeaser stats={stats} agentPrefix={agentPrefix} firstName={firstName} />
      )}

      {/* ─── Blog Teaser ─── */}
      {cfg.sections.blog && blogPosts.length > 0 && (
        <BlogTeaser posts={blogPosts} agentPrefix={agentPrefix} />
      )}

      {/* ─── FAQ Section (showcase preset — crawler-readable Q&A prose) ─── */}
      {cfg.sections.faqs && agentFaqs.length > 0 && (
        <AgentFaqSection faqs={agentFaqs} agentName={agent.name} siteUrl={siteUrl} />
      )}

      {/* ─── Testimonials ─── */}
      {cfg.sections.testimonials === 'strip' && (
        <TestimonialsStrip testimonials={testimonials} />
      )}
      {cfg.sections.testimonials === 'cards' && (
        <TestimonialsCards testimonials={testimonials} />
      )}

      {/* ─── Valuation CTA ─── */}
      {cfg.sections.cta_home_eval && (
        <section style={{ background: 'var(--primary-bg)', padding: '80px 0', textAlign: 'center' }}>
          <div className="container" style={{ maxWidth: 640 }}>
            <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 14 }}>Free Service</div>
            <h2 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 700, color: '#fff', marginBottom: 16, lineHeight: 1.15 }}>
              What&apos;s Your Home Worth?
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.62)', marginBottom: 36, lineHeight: 1.8 }}>
              Get a free, no-obligation market evaluation from {agent.name} — based on real recent sales in your neighbourhood, not automated estimates.
            </p>
            <a href={ap('/contact?reason=valuation')}
              style={{ display: 'inline-block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '16px 40px', borderRadius: 6, fontWeight: 700, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', textDecoration: 'none' }}>
              Request a Free Valuation
            </a>
          </div>
        </section>
      )}

      <style>{`
        .layout-value-prop { display: none !important; }
        .area-card:hover .area-img { transform: scale(1.04); }
        .building-card:hover { background: rgba(255,255,255,0.09) !important; border-color: rgba(255,255,255,0.22) !important; }

        .prop-type-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .buildings-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .snapshot-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        @media (max-width: 900px) {
          .hero-outer { height: auto !important; overflow: visible !important; background: var(--brand-bg) !important; }
          .hero-bg-img { display: none !important; }
          .hero-overlay { display: none !important; }
          .hero-content-wrap { position: static !important; padding: 40px 0 !important; }
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-contact { display: block !important; width: 100% !important; margin-top: 32px !important; }
          .buildings-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .about-grid { grid-template-columns: 1fr !important; }
          .areas-grid { height: auto !important; grid-template-columns: 1fr !important; }
          .areas-grid > a:first-child { height: 280px !important; }
          .areas-grid > div { flex-direction: row !important; gap: 4px !important; }
          .areas-grid > div > a { min-height: 160px; flex: 1; }
        }
        @media (max-width: 700px) {
          .prop-type-row { grid-template-columns: repeat(2, 1fr) !important; }
          .snapshot-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .section-header-row { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
        }
        @media (max-width: 480px) {
          .prop-type-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
