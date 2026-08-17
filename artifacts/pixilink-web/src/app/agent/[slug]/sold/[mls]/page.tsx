import { getAgent, getListingDetail, authMe, resolveAgentPrefix } from '@/lib/api'
import { nextStepPath } from '@/lib/next-step'
import { cookies, headers } from 'next/headers'
import { formatPriceFull, pricePerSqft, formatDate } from '@/lib/types'
import ListingStrip from '@/components/ListingStrip'
import BuildingComparisonTable from '@/components/BuildingComparisonTable'
import InsightBar from '@/components/InsightBar'
import RequestShowingWidget from '@/components/RequestShowingWidget.client'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string; mls: string }>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, mls } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  // A transient backend failure throws; swallow it here (neutral title) and let
  // the page body throw so the route renders a retriable error, not a cached 404.
  let listing: Awaited<ReturnType<typeof getListingDetail>> = null
  try {
    listing = await getListingDetail(slug, mls)
  } catch {
    return { title: 'Loading…' }
  }
  if (!listing) return { title: 'Sold Listing Not Found' }
  // Sold price is intentionally omitted from metadata — it is gated behind sign-in.
  const title = `${listing.address} — Sold Listing`
  const desc = `${listing.beds} bed, ${listing.baths} bath ${listing.type || 'property'} at ${listing.address}, ${listing.city}. View sold listing details.`
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: listing.photo_url ? [{ url: listing.photo_url }] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description: desc },
  }
}

export default async function SoldListingDetailPage({ params }: Props) {
  const { slug, mls } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const [agent, listing] = await Promise.all([getAgent(slug), getListingDetail(slug, mls)])
  if (!agent || !listing || listing.status !== 'Sold') notFound()

  // Auth: check session cookie; verified users see sold prices, guests see blurred price + sign-in CTA.
  const jar = await cookies()
  const sessionToken = jar.get('pxl_session')?.value
  const user = sessionToken ? await authMe(sessionToken) : null
  const isLoggedIn = user?.next_step === 'done'
  const nextStepUrl = user && user.next_step !== 'done'
    ? nextStepPath(slug, user.next_step)
    : undefined

  const soldPrice = listing.sold_price || listing.list_price
  const priceLabel = formatPriceFull(soldPrice)
  const listPriceLabel = formatPriceFull(listing.list_price)
  const psf = pricePerSqft(soldPrice, listing.sqft)
  const baths = listing.baths % 1 === 0 ? listing.baths.toFixed(0) : listing.baths.toFixed(1)
  const photos = listing.photos?.length ? listing.photos : listing.photo_url ? [listing.photo_url] : []
  const ratio = listing.sold_price && listing.list_price ? Math.round((listing.sold_price / listing.list_price) * 100) : null

  const card: React.CSSProperties = { background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 24px' }
  const sectionTitle: React.CSSProperties = { fontSize: 18, fontWeight: 800, margin: '0 0 14px', color: 'var(--primary-bg)' }

  const detailRows: [string, string][] = [
    ['MLS®', listing.mls_no],
    ['Property Type', listing.type || '—'],
    ...(listing.style ? [['Style', listing.style] as [string, string]] : []),
    ...(listing.year_built ? [['Year Built', String(listing.year_built)] as [string, string]] : []),
    ...(listing.sqft > 0 ? [['Floor Area', `${listing.sqft.toLocaleString()} ft²`] as [string, string]] : []),
    ...(listing.lot_size ? [['Lot Size', listing.lot_size] as [string, string]] : []),
    ...(listing.parking ? [['Parking', listing.parking] as [string, string]] : []),
    ...(listing.strata_fee ? [['Strata Fee', `$${Math.round(listing.strata_fee).toLocaleString()}/mo`] as [string, string]] : []),
    ...(listing.tax_amount ? [['Taxes', `$${Math.round(listing.tax_amount).toLocaleString()}${listing.tax_year ? ` (${listing.tax_year})` : ''}`] as [string, string]] : []),
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: listing.address,
    description: `${listing.beds} bed, ${listing.baths} bath ${listing.type || 'property'} at ${listing.address}, ${listing.city}.`,
    url: `https://${agent!.settings?.custom_domain || 'bccondosandhomes.com'}${ap(`/sold/${mls}`)}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.address,
      addressLocality: listing.city,
      addressRegion: 'BC',
      addressCountry: 'CA',
    },
    ...(listing.photo_url ? { image: listing.photo_url } : {}),
    ...(listing.year_built ? { yearBuilt: listing.year_built } : {}),
    numberOfRooms: listing.beds,
    floorSize: listing.sqft > 0 ? { '@type': 'QuantitativeValue', value: listing.sqft, unitCode: 'FTK' } : undefined,
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh', paddingBottom: 48 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Breadcrumb */}
      <div className="container" style={{ padding: '18px var(--container-padding) 0' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          <a href={ap('/sold')} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Sold Homes</a>
          {' › '}
          <a href={ap(`/sold?subarea=${encodeURIComponent(listing.subarea || '')}`)} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            {listing.subarea || listing.city}
          </a>
          {' › '}
          <span>{listing.address}</span>
        </div>
      </div>

      {/* Photo hero */}
      {photos.length > 0 && (
        <div className="container" style={{ padding: '14px var(--container-padding) 0' }}>
          <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000', aspectRatio: '16/7' }}>
            <img src={photos[0]} alt={listing.address} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
            <div style={{ position: 'absolute', top: 14, left: 14 }}>
              <span style={{ background: '#1f2937', color: '#fff', fontSize: 11, fontWeight: 800, padding: '5px 12px', borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                SOLD
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="container" style={{ padding: '28px var(--container-padding) 0' }}>
        <div className="sold-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40, alignItems: 'start' }}>
          {/* Main */}
          <div style={{ minWidth: 0 }}>
            {/* Price + address */}
            <div style={{ marginBottom: 20 }}>
              {isLoggedIn ? (
                <>
                  <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--accent)', lineHeight: 1, marginBottom: 4 }}>
                    {priceLabel}
                    {listing.sold_price && listing.sold_price !== listing.list_price && (
                      <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500, marginLeft: 12 }}>
                        listed {listPriceLabel}
                      </span>
                    )}
                  </div>
                  {ratio != null && (
                    <div style={{ fontSize: 13, color: ratio >= 100 ? '#16a34a' : '#dc2626', fontWeight: 600, marginBottom: 6 }}>
                      {ratio >= 100 ? `Sold ${ratio - 100}% over asking` : `Sold ${100 - ratio}% under asking`}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 12, background: 'var(--off-white)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px', marginBottom: 6 }}>
                  <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--accent)', filter: 'blur(8px)', userSelect: 'none' }}>$000,000</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>🔒 {nextStepUrl ? 'Complete registration to see sold price' : 'Sign in to see sold price'}</div>
                    <a href={nextStepUrl ?? ap('/sign-in')} style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>{nextStepUrl ? 'Complete Registration →' : 'Sign In →'}</a>
                  </div>
                </div>
              )}
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>{listing.address}</h1>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 4px' }}>
                {listing.city}{listing.subarea ? `, ${listing.subarea}` : ''}
              </p>
              {listing.sold_date && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  Sold {formatDate(listing.sold_date)}
                </p>
              )}
            </div>

            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginBottom: 28 }}>
              {[
                { v: String(listing.beds), l: 'Beds', icon: '🛏' },
                { v: baths, l: 'Baths', icon: '🛁' },
                { v: listing.sqft > 0 ? listing.sqft.toLocaleString() : '—', l: 'Ft²', icon: '📐' },
                ...(listing.year_built ? [{ v: String(listing.year_built), l: 'Built', icon: '🏗' }] : []),
                ...(psf ? [{ v: psf, l: 'Sold/ft²', icon: '💲' }] : []),
              ].map(s => (
                <div key={s.l} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-bg)', lineHeight: 1.1 }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Insight bar */}
            {listing.neighbourhood && (
              <div style={{ marginBottom: 28 }}><InsightBar data={listing.neighbourhood} /></div>
            )}

            {/* Description */}
            {listing.description && (
              <section style={{ marginBottom: 28 }}>
                <h2 style={sectionTitle}>About This Property</h2>
                <div style={card}>
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text)', margin: 0, whiteSpace: 'pre-line' }}>{listing.description}</p>
                </div>
              </section>
            )}

            {/* Details */}
            {detailRows.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <h2 style={sectionTitle}>Property Details</h2>
                <div style={card}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px 28px' }}>
                    {detailRows.map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 13 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                        <span style={{ color: 'var(--text)', fontWeight: 600, textAlign: 'right' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Building */}
            {listing.building && (
              <section style={{ marginBottom: 28 }}>
                <h2 style={sectionTitle}>About the Building</h2>
                <a href={ap(`/building/${listing.building.slug}`)} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{listing.building.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>View building details, current listings &amp; more sold history</div>
                  </div>
                  <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>View Building →</span>
                </a>
              </section>
            )}

            {/* Similar active */}
            {listing.similar_active.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <h2 style={{ ...sectionTitle, marginBottom: 4 }}>Homes For Sale Nearby</h2>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Comparable homes currently for sale in {listing.subarea || listing.city}</div>
                {listing.building ? (
                  <BuildingComparisonTable rows={listing.similar_active} highlightMls={listing.mls_no} slug={slug} />
                ) : (
                  <ListingStrip listings={listing.similar_active} />
                )}
              </section>
            )}

            {/* Similar sold */}
            {listing.similar_sold.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <h2 style={{ ...sectionTitle, marginBottom: 4 }}>Other Recent Sales Nearby</h2>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Comparable sales · last 90 days</div>
                {listing.building ? (
                  <BuildingComparisonTable rows={listing.similar_sold} sold isLoggedIn={isLoggedIn} slug={slug} />
                ) : (
                  <ListingStrip listings={listing.similar_sold} showSoldPrice={isLoggedIn} />
                )}
                {!isLoggedIn && (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(var(--accent-rgb),0.07)', border: '1px solid rgba(var(--accent-rgb),0.2)', borderRadius: 8, padding: '10px 16px' }}>
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>🔒 {nextStepUrl ? 'Complete your registration to see all comparable sold prices' : 'Sign in to see all comparable sold prices'}</span>
                    <a href={nextStepUrl ?? ap('/sign-in')} style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>{nextStepUrl ? 'Complete Registration →' : 'Sign In →'}</a>
                  </div>
                )}
              </section>
            )}

            {/* Internal links */}
            <div style={{ ...card }}>
              <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14, color: 'var(--text)' }}>Explore More Sold Data</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { l: 'All Sold Homes', h: ap('/sold') },
                  { l: 'Condos Sold', h: ap('/sold?type=Apartment') },
                  { l: 'Townhouses Sold', h: ap('/sold?type=Townhouse') },
                  { l: 'Houses Sold', h: ap('/sold?type=House') },
                  { l: 'Market Report', h: ap('/market-report') },
                  { l: 'Homes For Sale', h: ap('/homes-for-sale') },
                ].map(x => (
                  <a key={x.l} href={x.h} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>{x.l}</a>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="sold-detail-sidebar">
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Sold Price</div>
              {isLoggedIn ? (
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent)', marginBottom: 4 }}>{priceLabel}</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent)', filter: 'blur(7px)', userSelect: 'none' }}>$000,000</div>
                  <a href={nextStepUrl ?? ap('/sign-in')} style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    🔒 {nextStepUrl ? 'Complete Registration' : 'Sign In'}
                  </a>
                </div>
              )}
              {listing.sold_date && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sold {formatDate(listing.sold_date)}</div>
              )}
              {listing.dom != null && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{listing.dom} days on market</div>
              )}
            </div>

            <div style={{ background: 'rgba(var(--accent-rgb),0.10)', border: '1px solid var(--accent)', borderRadius: 10, padding: '16px 18px', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 4 }}>What&apos;s your home worth today?</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                Get a free CMA from {agent.name.split(' ')[0]} based on real recent sales like this one.
              </div>
            </div>

            <RequestShowingWidget agent={agent} address={listing.address} price={priceLabel} mlsNum={listing.mls_no} variant="find-similar" subarea={listing.subarea || listing.city} />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .sold-detail-grid { grid-template-columns: 1fr !important; }
          .sold-detail-sidebar { position: static !important; }
        }
      `}</style>
    </div>
  )
}
