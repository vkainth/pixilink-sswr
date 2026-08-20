import React from 'react'
import { headers } from 'next/headers'
import Image from 'next/image'
import { getAgent, getOwnListings, getAgentTerritories, agentCanonicalBase, resolveAgentPrefix, agentAreaDisplay } from '@/lib/api'
import { type AgentListing } from '@/lib/types'
import { requireShowcase } from '@/lib/showcase'
import ListingCard from '@/components/ListingCard'
import AgentFaqSection from '@/components/AgentFaqSection'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  topNeighbourhoods,
  priceRange,
  listToSoldRatio,
  buildSpecializationLine,
  buildSoldFaqs,
  primaryMarkets,
} from '@/lib/agent-profile'

interface Props {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

const SC_CHARCOAL  = 'var(--site-ink)'
const SC_GOLD      = 'var(--site-accent)'
const SC_GOLD_TEXT = 'var(--site-accent-text)'
const SC_OFF_WHITE = 'var(--site-canvas)'

/**
 * Builds a one-line SEO/AEO caption for a sold listing card.
 * Only includes fields that are actually present — never fabricates data.
 * Example: "3-bed Condo · Kitsilano — sold in 8 days · 103% of asking"
 */
function buildSoldCaption(l: AgentListing, hideDomThreshold: number): string {
  const parts: string[] = []
  if (l.beds) parts.push(`${l.beds}-bed`)
  if (l.type) parts.push(l.type)
  const area = l.subarea ?? l.city
  if (area) parts.push(area)
  const heading = parts.join(' ')
  const details: string[] = []
  if (l.dom != null && l.dom >= 0 && l.dom <= hideDomThreshold) {
    details.push(`sold in ${l.dom} day${l.dom === 1 ? '' : 's'}`)
  }
  if (typeof l.sold_price === 'number' && l.sold_price > 0 && l.list_price > 0) {
    const ratio = Math.round((l.sold_price / l.list_price) * 1000) / 10
    details.push(`${ratio}% of asking`)
  }
  return details.length > 0
    ? `${heading || 'Property'} — ${details.join(' · ')}`
    : heading || 'Recently sold property'
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [agent, territories, soldResult] = await Promise.all([
    getAgent(slug),
    getAgentTerritories(slug).catch(() => []),
    getOwnListings(slug, { status: 'Sold', limit: 20 }),
  ])
  if (!agent) return {}
  const soldListings: AgentListing[] = soldResult?.listings ?? []
  const areaLabel = primaryMarkets(soldListings) || agentAreaDisplay(territories)
  const domain = agentCanonicalBase(agent)
  const title = `Featured Properties — ${agent.name} | ${areaLabel}`
  const description = `Browse ${agent.name}'s featured listings and recently sold homes in ${areaLabel}. Premium real estate representation with a proven track record.`
  return {
    title,
    description,
    alternates: { canonical: `https://${domain}/featured-properties` },
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function FeaturedPropertiesPage({ params }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const [agent, territories, activeResult, soldResult] = await Promise.all([
    getAgent(slug),
    getAgentTerritories(slug).catch(() => []),
    getOwnListings(slug, { status: 'Active', limit: 12 }),
    getOwnListings(slug, { status: 'Sold', limit: 20 }),
  ])

  if (!agent) notFound()
  requireShowcase(agent)

  const activeListings: AgentListing[] = activeResult?.listings ?? []
  const soldListings: AgentListing[] = soldResult?.listings ?? []
  const firstName = agent.name.split(' ')[0]

  const areaLabel = primaryMarkets(soldListings) || agentAreaDisplay(territories)
  const domain = agentCanonicalBase(agent)
  const agentId = `https://${domain}#agent`

  const hideDomThreshold: number = agent.settings?.site_config?.hideStaleDaysOnMarket ?? 180

  const topAreas = topNeighbourhoods(soldListings, 3)
  const areaServed: string[] = topAreas.length > 0 ? topAreas : territories.map(t => t.subarea ?? t.city)

  const specializationLine = buildSpecializationLine(soldListings)
  const faqs = buildSoldFaqs(soldListings, agent.name)
  const soldRatio = listToSoldRatio(soldListings)

  const agentEntityLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': agentId,
    name: agent.name,
    url: `https://${domain}`,
    telephone: agent.phone || undefined,
    email: agent.email || undefined,
    areaServed: areaServed.map(area => ({ '@type': 'Place', name: area })),
  }

  /**
   * One standalone RealEstateListing JSON-LD block per active listing.
   * Emitted as individual <script> tags so Google can crawl each listing
   * independently, rather than burying them inside a single ItemList item.
   */
  const activeListingBlocks = activeListings.map(l => ({
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: l.address || 'Property',
    url: l.mls_no ? `https://${domain}/listing/${l.slug || l.mls_no}` : undefined,
    offers: l.list_price > 0 ? {
      '@type': 'Offer',
      price: l.list_price,
      priceCurrency: 'CAD',
      availability: 'https://schema.org/InStock',
    } : undefined,
    numberOfRooms: l.beds || undefined,
    floorSize: l.sqft > 0 ? { '@type': 'QuantitativeValue', value: l.sqft, unitCode: 'FTK' } : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: l.address,
      addressLocality: l.city,
      addressRegion: 'BC',
      addressCountry: 'CA',
    },
    agent: { '@id': agentId },
  }))

  /**
   * One standalone RealEstateListing JSON-LD block per sold listing —
   * mirrors activeListingBlocks so each transaction is indexable independently.
   */
  const soldListingBlocks = soldListings.map(l => ({
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: l.address || 'Property',
    url: l.mls_no ? `https://${domain}/sold/${l.mls_no}` : undefined,
    offers: typeof l.sold_price === 'number' && l.sold_price > 0 ? {
      '@type': 'Offer',
      price: l.sold_price,
      priceCurrency: 'CAD',
      availability: 'https://schema.org/Discontinued',
    } : undefined,
    numberOfRooms: l.beds || undefined,
    floorSize: l.sqft > 0 ? { '@type': 'QuantitativeValue', value: l.sqft, unitCode: 'FTK' } : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: l.address,
      addressLocality: l.city,
      addressRegion: 'BC',
      addressCountry: 'CA',
    },
    ...(l.sold_date ? { datePosted: l.sold_date } : {}),
    ...(l.type ? { additionalType: l.type } : {}),
    agent: { '@id': agentId },
  }))

  const soldRange = priceRange(soldListings)
  const soldListingsLd = soldListings.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${firstName}'s Recently Sold Properties`,
    description: `Recent sales by ${agent.name}${soldRange ? ` from ${soldRange.min.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })} to ${soldRange.max.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}` : ''}`,
    numberOfItems: soldListings.length,
    itemListElement: soldListings.map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'RealEstateListing',
        name: l.address || 'Property',
        address: {
          '@type': 'PostalAddress',
          streetAddress: l.address,
          addressLocality: l.city,
          addressRegion: 'BC',
          addressCountry: 'CA',
        },
        ...(l.sold_price ? {
          offers: {
            '@type': 'Offer',
            price: l.sold_price,
            priceCurrency: 'CAD',
            availability: 'https://schema.org/Discontinued',
          },
        } : {}),
        ...(l.sold_date ? { closeDate: l.sold_date } : {}),
        ...(l.subarea || l.city ? { areaServed: { '@type': 'Place', name: l.subarea ?? l.city } } : {}),
        ...(l.type ? { propertyType: l.type } : {}),
        agent: { '@id': agentId },
      },
    })),
  } : null

  return (
    <div style={{ fontFamily: "var(--font-body),'Helvetica Neue',sans-serif", overflowX: 'hidden' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(agentEntityLd) }} />
      {activeListingBlocks.map((block, i) => (
        <script key={`listing-ld-${i}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }} />
      ))}
      {soldListingsLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(soldListingsLd) }} />
      )}
      {soldListingBlocks.map((block, i) => (
        <script key={`sold-ld-${i}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }} />
      ))}

      {/* Page header */}
      <div style={{ background: SC_CHARCOAL, padding: 'clamp(56px,8vw,88px) 0 clamp(40px,5vw,64px)' }}>
        <div style={{ height: 3, background: `linear-gradient(90deg,${SC_GOLD} 0%,#c4b09a 50%,${SC_GOLD} 100%)`, marginBottom: 'clamp(40px,5vw,64px)' }} />
        <div className="container">
          <p style={{ fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: SC_GOLD, fontWeight: 600, marginBottom: 12 }}>
            {agent.brokerage}
          </p>
          <h1 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(2.2rem,5vw,3.6rem)', fontWeight: 400, color: '#fff', lineHeight: 1.1, margin: '0 0 16px' }}>
            {firstName}&rsquo;s Featured Properties
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, maxWidth: 560 }}>
            Browse active listings and recently sold homes — expertly represented in {areaLabel}.
          </p>
        </div>
      </div>

      {/* Active listings */}
      {activeListings.length > 0 ? (
        <section style={{ background: '#fff', padding: 'clamp(56px,8vw,80px) 0' }}>
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36, gap: 16, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD_TEXT, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
                  Now Available
                </p>
                <h2 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 400, color: SC_CHARCOAL, margin: 0 }}>
                  Active Listings
                </h2>
              </div>
              <a href={ap('/homes-for-sale')} style={{ fontSize: 12, fontWeight: 700, color: SC_CHARCOAL, textDecoration: 'none', borderBottom: `1px solid ${SC_GOLD}`, paddingBottom: 3 }}>
                Search All Homes →
              </a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {activeListings.map((l, i) => (
                <ListingCard key={l.id || l.mls_no} listing={l} priority={i < 3} hideDomThreshold={hideDomThreshold} />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section style={{ background: '#fff', padding: 'clamp(56px,8vw,80px) 0' }}>
          <div className="container" style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(1.4rem,2.5vw,1.8rem)', fontWeight: 400, color: SC_CHARCOAL, marginBottom: 12 }}>
              No active listings at the moment
            </p>
            <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 28 }}>
              Check back soon, or search all available homes in {areaLabel}.
            </p>
            <a href={ap('/homes-for-sale')} style={{ display: 'inline-block', background: SC_GOLD, color: SC_CHARCOAL, padding: '14px 28px', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
              Search Homes
            </a>
          </div>
        </section>
      )}

      {/* Sold listings */}
      {soldListings.length > 0 && (
        <section style={{ background: SC_OFF_WHITE, padding: 'clamp(56px,8vw,80px) 0' }}>
          <div className="container">
            <div style={{ marginBottom: 36 }}>
              <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD_TEXT, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
                Track Record
              </p>
              <h2 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 400, color: SC_CHARCOAL, margin: 0 }}>
                Recently Sold
              </h2>
            </div>
            {/* Track record at a glance — crawlable summary text for SEO/AEO */}
            <div style={{ display: 'flex', gap: '10px 28px', flexWrap: 'wrap', marginBottom: 24, padding: '13px 18px', background: '#fff', border: '1px solid #e5e0d8', borderRadius: 6 }}>
              <span style={{ fontSize: 12, color: SC_CHARCOAL }}>
                <span style={{ fontWeight: 700 }}>{soldListings.length}</span> {soldListings.length === 1 ? 'sale' : 'sales'}
              </span>
              {soldRatio && (
                <span style={{ fontSize: 12, color: SC_CHARCOAL }}>
                  avg <span style={{ fontWeight: 700 }}>{soldRatio}%</span> of asking price
                </span>
              )}
              {topAreas.length > 0 && (
                <span style={{ fontSize: 12, color: SC_CHARCOAL }}>
                  <span style={{ fontWeight: 700 }}>Top areas:</span> {topAreas.join(' · ')}
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {soldListings.map((l, i) => (
                <figure key={l.id || l.mls_no} style={{ margin: 0 }}>
                  <ListingCard listing={l} showSoldPrice isLoggedIn priority={i < 4} hideDomThreshold={hideDomThreshold} />
                  <figcaption style={{ fontSize: 12, color: '#5c5147', lineHeight: 1.5, padding: '6px 2px 0', letterSpacing: '0.01em' }}>
                    {buildSoldCaption(l, hideDomThreshold)}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Specialization prose */}
      {specializationLine && (
        <section style={{ background: '#fff', padding: 'clamp(40px,6vw,64px) 0', borderTop: '1px solid #e8eaed' }}>
          <div className="container" style={{ maxWidth: 760 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD_TEXT, textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>
              Market Expertise
            </p>
            <p style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(1.1rem,2vw,1.35rem)', fontWeight: 400, color: SC_CHARCOAL, lineHeight: 1.7, margin: 0 }}>
              {specializationLine}
            </p>
          </div>
        </section>
      )}

      {/* FAQ from solds */}
      <AgentFaqSection
        faqs={faqs}
        agentName={agent.name}
        siteUrl={`https://${domain}`}
      />

      {/* The dark "agent + CTA" band that used to sit here was removed: it repeated the
          brokerage eyebrow, the specialisation sentence already printed higher on this
          same page, and both of the footer band's destinations (home evaluation and
          contact). Between it, the layout value-prop card and the footer band, this page
          offered "Free Home Evaluation" three times in one screen. The footer band now
          closes the page. */}

      <style>{`
        @media (max-width: 480px) {
          .sc-fp-cta-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
