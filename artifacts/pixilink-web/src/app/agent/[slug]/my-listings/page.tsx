import { headers } from 'next/headers'
import { getAgent, getOwnListings, getAgentTerritories, agentCanonicalBase, resolveAgentPrefix } from '@/lib/api'
import { formatPrice, getCoAgents, type AgentListing } from '@/lib/types'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ListingStrip from '@/components/ListingStrip'
import ListingCard from '@/components/ListingCard'

interface Props {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

function cityListLabel(cities: string[]): string {
  if (!cities.length) return 'South Surrey, White Rock and surrounding areas'
  if (cities.length === 1) return cities[0]
  return cities.slice(0, -1).join(', ') + ' & ' + cities[cities.length - 1]
}

function soldStatBadges(l: AgentListing): { text: string; highlight: boolean }[] {
  const badges: { text: string; highlight: boolean }[] = []
  if (l.dom && l.dom > 0) {
    badges.push({ text: `Sold in ${l.dom} day${l.dom === 1 ? '' : 's'}`, highlight: l.dom <= 14 })
  }
  if (l.sold_price && l.list_price) {
    const pct = Math.round((l.sold_price / l.list_price) * 100)
    badges.push({ text: `Sold at ${pct}% of asking`, highlight: pct >= 95 })
  }
  return badges
}

function SoldGrid({ listings }: { listings: AgentListing[] }) {
  if (!listings.length) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
      {listings.map((l, i) => {
        const badges = soldStatBadges(l)
        return (
          <div key={l.id || l.mls_no}>
            <ListingCard listing={l} showSoldPrice isLoggedIn priority={i < 4} />
            {badges.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, paddingLeft: 2 }}>
                {badges.map((b, bi) => (
                  <span key={bi} style={{
                    display: 'inline-block',
                    padding: '3px 9px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    background: b.highlight ? '#dcfce7' : '#f3f4f6',
                    color: b.highlight ? '#15803d' : '#374151',
                    border: `1px solid ${b.highlight ? '#86efac' : '#e5e7eb'}`,
                  }}>
                    {b.text}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [agent, territories] = await Promise.all([getAgent(slug), getAgentTerritories(slug)])
  if (!agent) return {}
  const coAgents = getCoAgents(agent)
  const isDualAgent = coAgents.length > 0
  const primaryFirst = agent.name.split(' ')[0]
  const coFirst = isDualAgent ? coAgents[0].name.split(' ')[0] : null
  const agentLabel = isDualAgent ? `${primaryFirst} & ${coFirst}` : agent.name
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/my-listings`
  const cities = [...new Set(territories.map(t => t.city).filter((c): c is string => !!c))]
  const cityLabel = cityListLabel(cities)
  const title = cities.length
    ? `${agentLabel}'s Listings in ${cityLabel} — Active Properties & Recent Sales`
    : `${agentLabel}'s Listings — Active Properties & Recent Sales`
  const description = `Browse ${agentLabel}'s personally listed active homes for sale and recently sold properties in ${cityLabel}.`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: 'website', url: canonical },
    twitter: { card: 'summary', title, description },
  }
}

export default async function MyListingsPage({ params }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const [agent, ownActive, ownSold, territories] = await Promise.all([
    getAgent(slug),
    getOwnListings(slug, { status: 'Active', limit: 24 }),
    getOwnListings(slug, { status: 'Sold', limit: 24 }),
    getAgentTerritories(slug),
  ])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const coAgents = getCoAgents(agent)
  const isDualAgent = coAgents.length > 0
  const primaryFirst = agent.name.split(' ')[0]
  const coFirst = isDualAgent ? coAgents[0].name.split(' ')[0] : null
  const displayFirstNames = isDualAgent ? `${primaryFirst} & ${coFirst}` : primaryFirst
  const displayName = isDualAgent ? `${agent.name.split(' ')[0]} & ${coAgents[0].name}` : agent.name

  const domain = agentCanonicalBase(agent)

  const territoryCities = [...new Set(territories.map(t => t.city).filter((c): c is string => !!c))]
  const areaLabel = territoryCities.length ? cityListLabel(territoryCities) : null

  function partition(listings: AgentListing[]) {
    if (!territoryCities.length) return { inArea: listings, outArea: [] as AgentListing[] }
    return {
      inArea: listings.filter(l => territoryCities.includes(l.city)),
      outArea: listings.filter(l => !territoryCities.includes(l.city)),
    }
  }

  const { inArea: activeInArea, outArea: activeOutArea } = partition(ownActive.listings)
  const { inArea: soldInArea, outArea: soldOutArea } = partition(ownSold.listings)
  const hasOutOfArea = activeOutArea.length > 0 || soldOutArea.length > 0

  const portfolioLabel = isDualAgent ? 'Our Portfolio' : 'My Portfolio'

  const activeJsonLd = ownActive.listings.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': `${displayFirstNames}'s Active Listings`,
    'description': `Properties currently listed for sale by ${displayName}${areaLabel ? ` in ${areaLabel}` : ''}.`,
    'numberOfItems': ownActive.total,
    'itemListElement': ownActive.listings.map((l, i) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'url': `https://${domain}/listing/${l.slug || l.mls_no}`,
      'name': l.address,
      'description': [
        l.type,
        l.beds ? `${l.beds} bed` : null,
        l.baths ? `${l.baths} bath` : null,
        l.list_price ? formatPrice(l.list_price) : null,
      ].filter(Boolean).join(' · '),
    })),
  } : null

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      {activeJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(activeJsonLd) }}
        />
      )}

      {/* Page header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '48px 0 32px' }}>
        <div className="container">
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 10, fontWeight: 500 }}>
            {portfolioLabel}
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', fontWeight: 700, color: '#1a1a1a', marginBottom: 10, lineHeight: 1.2 }}>
            {isDualAgent ? 'Our' : `${displayFirstNames}'s`} Active Listings &amp; Sales
          </h1>
          <p style={{ fontSize: 15, color: '#6b7280', maxWidth: 560, lineHeight: 1.65, margin: 0 }}>
            Properties personally listed by {displayName}.
            {areaLabel ? ` Serving ${areaLabel} and surrounding areas.` : ' Active listings updated daily.'}
          </p>
        </div>
      </div>

      {/* Active Listings */}
      <div style={{ padding: '52px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary-bg)', margin: 0 }}>
              Active Listings
              {ownActive.total > 0 && (
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 10 }}>
                  ({ownActive.total})
                </span>
              )}
            </h2>
            <a
              href={ap('/homes-for-sale')}
              style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
            >
              All area listings →
            </a>
          </div>

          {ownActive.listings.length > 0 ? (
            hasOutOfArea && territoryCities.length > 0 ? (
              <>
                {activeInArea.length > 0 && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-bg)', marginBottom: 14, letterSpacing: 0.3 }}>
                      {areaLabel}
                    </div>
                    <ListingStrip listings={activeInArea} />
                  </>
                )}
                {activeOutArea.length > 0 && (
                  <div style={{ marginTop: 40 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 0.3 }}>Other Markets</div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px' }}>
                      Some listings are in other markets where {displayFirstNames} also serve clients.
                    </p>
                    <ListingStrip listings={activeOutArea} />
                  </div>
                )}
              </>
            ) : (
              <ListingStrip listings={ownActive.listings} />
            )
          ) : (
            <div style={{
              background: '#fff',
              borderRadius: 10,
              padding: '40px 32px',
              textAlign: 'center',
              border: '1px solid #e5e7eb',
            }}>
              <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: 0 }}>
                No active listings at the moment. Check back soon or{' '}
                <a href={ap('/contact')} style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                  contact {displayFirstNames}
                </a>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sold Listings */}
      <div style={{ background: '#fff', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '52px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary-bg)', margin: 0 }}>
              Recently Sold by {displayFirstNames}
              {ownSold.total > 0 && (
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 10 }}>
                  ({ownSold.total})
                </span>
              )}
            </h2>
            <a
              href={ap('/sold')}
              style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
            >
              All area sold →
            </a>
          </div>

          {ownSold.listings.length > 0 ? (
            hasOutOfArea && territoryCities.length > 0 ? (
              <>
                {soldInArea.length > 0 && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-bg)', marginBottom: 14, letterSpacing: 0.3 }}>
                      {areaLabel}
                    </div>
                    <SoldGrid listings={soldInArea} />
                  </>
                )}
                {soldOutArea.length > 0 && (
                  <div style={{ marginTop: 40 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 0.3 }}>Other Markets</div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px' }}>
                      Some listings are in other markets where {displayFirstNames} also serve clients.
                    </p>
                    <SoldGrid listings={soldOutArea} />
                  </div>
                )}
              </>
            ) : (
              <SoldGrid listings={ownSold.listings} />
            )
          ) : (
            <div style={{
              background: 'var(--off-white)',
              borderRadius: 10,
              padding: '40px 32px',
              textAlign: 'center',
              border: '1px solid #e5e7eb',
            }}>
              <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: 0 }}>
                No recent sold data available.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
