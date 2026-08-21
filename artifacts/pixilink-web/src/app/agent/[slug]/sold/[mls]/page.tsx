import { getAgent, getListingDetail, getBuildingDetail, authMe, resolveAgentPrefix } from '@/lib/api'
import { nextStepPath } from '@/lib/next-step'
import { cookies, headers } from 'next/headers'
import { formatPriceFull, pricePerSqft, formatDate, resolveSiteConfig } from '@/lib/types'
import ListingStrip from '@/components/ListingStrip'
import BuildingComparisonTable from '@/components/BuildingComparisonTable'
import InsightBar from '@/components/InsightBar'
import RequestShowingWidget from '@/components/RequestShowingWidget.client'
import { SoldPriceGateCard } from '@/components/SoldPriceGate'
import SoldSignInCard from '@/components/SoldSignInCard.client'
import WelcomeToast from '@/components/WelcomeToast.client'
import LeadOfferCapture from '@/components/LeadOfferCapture.client'
import SoldUnlockPrompt from '@/components/SoldUnlockPrompt.client'
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

  // THE AGENT'S OWN SOLD LISTINGS ARE NEVER GATED.
  //
  // The sign-in wall exists to protect other brokerages' licensed sold data. An agent's
  // own sales are her own track record — the single most persuasive thing on the site —
  // and hiding them behind "$000,000" plus three sign-in panels was arguing against the
  // page's whole purpose: a visitor who wants to know how Sharene's own listings
  // performed was met with a lock instead of an answer.
  //
  // is_own_listing is resolved by the API from agent_mls_ids (see listingDetail) and fails
  // closed, so `=== true` is deliberate: anything else is treated as somebody else's
  // listing and stays gated. Comparables further down keep using isLoggedIn, because
  // those ARE other brokerages' sales.
  const isOwnListing = listing.is_own_listing === true
  const showSold = isLoggedIn || isOwnListing

  // Showcase sites do not have the sold-data hub: /sold, /sold?type=…, /market and
  // /market-report are all requireNotShowcase, so this page was linking to five 404s on
  // its own site — the entire breadcrumb plus most of the "Explore More Sold Data" chips.
  // (A homepage-only link crawl cannot see these; they only exist on listing pages.)
  // /featured-properties is the showcase equivalent and does include her sold homes, so
  // that is where the sold links point instead.
  const isShowcase = resolveSiteConfig(agent).layout_preset === 'showcase'
  const soldIndexHref = ap(isShowcase ? '/featured-properties' : '/sold')
  const soldIndexLabel = isShowcase ? 'Properties' : 'Sold Homes'
  const exploreLinks = isShowcase
    ? [
        { l: 'All Properties', h: ap('/featured-properties') },
        { l: 'Homes For Sale', h: ap('/homes-for-sale') },
        { l: 'What’s My Home Worth?', h: ap('/home-evaluation') },
        { l: `Contact ${agent.name.split(' ')[0]}`, h: ap('/contact') },
      ]
    : [
        { l: 'All Sold Homes', h: ap('/sold') },
        { l: 'Condos Sold', h: ap('/sold?type=Apartment') },
        { l: 'Townhouses Sold', h: ap('/sold?type=Townhouse') },
        { l: 'Houses Sold', h: ap('/sold?type=House') },
        { l: 'Market Reports', h: ap('/market/archive') },  // canonical: /market-report 308s here
        { l: 'Homes For Sale', h: ap('/homes-for-sale') },
      ]

  const soldPrice = listing.sold_price || listing.list_price
  // Gated figures. Another brokerage's sold price is licensed data behind a sign-in wall,
  // so for those it must not reach the page by ANY route: not rendered, not serialised
  // into a client component's props, and not reconstructible. $/sqft is the
  // reconstructible one — 850 ft² beside $665/ft² gives the $565,000 the blur is hiding.
  const priceLabel = showSold ? formatPriceFull(soldPrice) : null
  const listPriceLabel = showSold ? formatPriceFull(listing.list_price) : null
  const psf = showSold ? pricePerSqft(soldPrice, listing.sqft) : null
  const baths = listing.baths % 1 === 0 ? listing.baths.toFixed(0) : listing.baths.toFixed(1)
  const photos = listing.photos?.length ? listing.photos : listing.photo_url ? [listing.photo_url] : []
  const ratio = showSold && listing.sold_price && listing.list_price
    ? Math.round((listing.sold_price / listing.list_price) * 100)
    : null
  const soldRatio = ratio != null ? ratio.toFixed(1) : null

  // Other units sold in the same building. This endpoint throws UpstreamUnavailableError
  // on a 5xx, and a missing comps table must never take the whole page down with it.
  const buildingDetail = listing.building?.slug
    ? await getBuildingDetail(slug, listing.building.slug).catch(() => null)
    : null
  const buildingSolds = (buildingDetail?.recent_sold ?? []).filter(r => r.mls_no !== listing.mls_no)
  const bStats = buildingDetail?.stats ?? null
  const bName = listing.building?.name ?? null
  // Proof drawn from real building data; falls back to a plain sentence rather than
  // rendering a half-empty claim when the building fetch returned nothing.
  //
  // The building aggregate is computed over strata_no sales in the last 12 months and
  // INCLUDES this listing. Where the building has exactly one sale in that window the
  // "average" IS this listing's sold price, so printing it would hand a logged-out
  // visitor the single figure the gate exists to withhold. Two or more sales makes the
  // number non-identifying; below that we fall through to the generic sentence.
  // A signed-in visitor can already see the exact price, so the guard only applies to guests.
  const bAvgIsAggregate = showSold || (bStats?.sold_count ?? 0) >= 2
  const cmaProof = bAvgIsAggregate && bStats?.avg_sold_price && bName
    ? `Recent sales at ${bName} average ${formatPriceFull(bStats.avg_sold_price)}`
      + `${bStats.avg_dom ? ` in ${Math.round(bStats.avg_dom)} days` : ''}.`
      + ` Get a free valuation from ${agent.name.split(' ')[0]} based on sales like this one.`
    : `Get a free CMA from ${agent.name.split(' ')[0]} based on real recent sales like this one.`

  const card: React.CSSProperties = { background: '#fff', border: '1px solid var(--site-rule)', borderRadius: 10, padding: '22px 24px' }
  const sectionTitle: React.CSSProperties = { fontSize: 18, fontWeight: 800, margin: '0 0 14px', color: 'var(--site-ink)' }

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
    // Photo omitted for guests: the hero is gated, and leaving the URL in JSON-LD
    // would hand it back to anyone reading the page source. og:image and
    // twitter:image deliberately keep it — that thumbnail is what earns the click
    // from search and social, which is upstream of the conversion, not part of it.
    ...(showSold && listing.photo_url ? { image: listing.photo_url } : {}),
    ...(listing.year_built ? { yearBuilt: listing.year_built } : {}),
    numberOfRooms: listing.beds,
    floorSize: listing.sqft > 0 ? { '@type': 'QuantitativeValue', value: listing.sqft, unitCode: 'FTK' } : undefined,
  }

  return (
    <div style={{ background: 'var(--site-canvas)', minHeight: '100vh', paddingBottom: 48 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <WelcomeToast />
      <SoldUnlockPrompt
        slug={slug}
        mls={listing.mls_no}
        isLoggedIn={showSold}
        agentPrefix={agentPrefix}
        subarea={listing.subarea}
        buildingSoldCount={buildingSolds.length}
        buildingName={listing.building?.name ?? null}
        returnTo={ap(`/sold/${mls}`)}
      />
      {/* Breadcrumb */}
      <div className="container" style={{ padding: '18px var(--container-padding) 0' }}>
        <div style={{ fontSize: 12, color: 'var(--site-muted)' }}>
          <a href={soldIndexHref} style={{ color: 'var(--site-muted)', textDecoration: 'none' }}>{soldIndexLabel}</a>
          {' › '}
          {/* The subarea crumb is a link only where a subarea-filtered sold index
              exists. On showcase there is none, and a breadcrumb that 404s is worse
              than plain text. */}
          {isShowcase ? (
            <span>{listing.subarea || listing.city}</span>
          ) : (
            <a href={ap(`/sold?subarea=${encodeURIComponent(listing.subarea || '')}`)} style={{ color: 'var(--site-muted)', textDecoration: 'none' }}>
              {listing.subarea || listing.city}
            </a>
          )}
          {' › '}
          <span>{listing.address}</span>
        </div>
      </div>

      {/* Photo hero. Gated for guests SERVER-SIDE: the URL is simply not emitted.
          A CSS blur would leave the image one devtools edit and one view-source
          away, which is the exact failure mode being fixed in the price gate.
          generateMetadata still uses the real photo for OG — that governs the
          click through from search and social, not the conversion on the page. */}
      {photos.length > 0 && (
        <div className="container" style={{ padding: '14px var(--container-padding) 0' }}>
          <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: 'var(--site-ink)', aspectRatio: '16/7' }}>
            {showSold ? (
              <img src={photos[0]} alt={listing.address} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
            ) : (
              <div style={{
                width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: 20,
              }}>
                <div style={{ fontSize: 30 }}>🔒</div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
                  {photos.length} photo{photos.length === 1 ? '' : 's'} of this home
                </div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
                  Sign in free to see the photos and the sold price
                </div>
                <a href={nextStepUrl ?? ap('/register')} style={{
                  marginTop: 4, background: 'var(--cta-primary)', color: 'var(--cta-primary-text)',
                  padding: '10px 22px', borderRadius: 7, fontWeight: 700, fontSize: 13.5, textDecoration: 'none',
                }}>
                  {nextStepUrl ? 'Complete Registration' : 'Unlock Photos'}
                </a>
              </div>
            )}
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
              {/* On the agent's own sale this replaces the lock as the page's trust
                  anchor: it explains why the price is open and makes the strongest
                  available claim — she sold this home — before any ask. */}
              {isOwnListing && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12,
                  background: 'rgba(var(--site-accent-rgb),0.10)',
                  border: '1px solid rgba(var(--site-accent-rgb),0.30)',
                  color: 'var(--site-accent-text)',
                  borderRadius: 999, padding: '6px 14px',
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  Listed &amp; sold by {agent.name}
                </div>
              )}
              {showSold ? (
                <>
                  <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--site-accent-text)', lineHeight: 1, marginBottom: 4 }}>
                    {priceLabel}
                    {listing.sold_price && listing.sold_price !== listing.list_price && (
                      <span style={{ fontSize: 14, color: 'var(--site-muted)', fontWeight: 500, marginLeft: 12 }}>
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
                <div style={{ marginBottom: 18 }}>
                  <SoldPriceGateCard
                    isLoggedIn={false}
                    slug={slug}
                    agentPrefix={agentPrefix}
                    soldPrice={null}
                    listPrice={null}
                    soldDate={listing.sold_date ?? null}
                    dom={listing.dom ?? null}
                    subarea={listing.subarea ?? null}
                    city={listing.city}
                    soldRatio={soldRatio}
                    nextStepUrl={nextStepUrl}
                  />
                </div>
              )}
              <h1 style={{ fontFamily: "var(--site-font-display)", fontSize: 22, fontWeight: 700, color: 'var(--site-body)', margin: '0 0 4px' }}>{listing.address}</h1>
              <p style={{ fontSize: 14, color: 'var(--site-muted)', margin: '0 0 4px' }}>
                {listing.city}{listing.subarea ? `, ${listing.subarea}` : ''}
              </p>
              {listing.sold_date && (
                <p style={{ fontSize: 13, color: 'var(--site-muted)', margin: 0 }}>
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
                <div key={s.l} style={{ background: '#fff', border: '1px solid var(--site-rule)', borderRadius: 8, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--site-ink)', lineHeight: 1.1 }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: 'var(--site-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{s.l}</div>
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
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--site-body)', margin: 0, whiteSpace: 'pre-line' }}>{listing.description}</p>
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
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--site-rule)', paddingBottom: 8, fontSize: 13 }}>
                        <span style={{ color: 'var(--site-muted)' }}>{k}</span>
                        <span style={{ color: 'var(--site-body)', fontWeight: 600, textAlign: 'right' }}>{v}</span>
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
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--site-body)' }}>{listing.building.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--site-muted)', marginTop: 2 }}>View building details, current listings &amp; more sold history</div>
                  </div>
                  <span style={{ color: 'var(--site-accent-text)', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>View Building →</span>
                </a>
              </section>
            )}

            {/* Similar active */}
            {listing.similar_active.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <h2 style={{ ...sectionTitle, marginBottom: 4 }}>Homes For Sale Nearby</h2>
                <div style={{ fontSize: 12, color: 'var(--site-muted)', marginBottom: 14 }}>Comparable homes currently for sale in {listing.subarea || listing.city}</div>
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
                <div style={{ fontSize: 12, color: 'var(--site-muted)', marginBottom: 14 }}>Comparable sales · last 90 days</div>
                {listing.building ? (
                  <BuildingComparisonTable rows={listing.similar_sold} sold isLoggedIn={isLoggedIn} slug={slug} />
                ) : (
                  <ListingStrip listings={listing.similar_sold} showSoldPrice={isLoggedIn} />
                )}
                {!isLoggedIn && (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(var(--site-accent-rgb),0.07)', border: '1px solid rgba(var(--site-accent-rgb),0.2)', borderRadius: 8, padding: '10px 16px' }}>
                    <span style={{ fontSize: 13, color: 'var(--site-body)' }}>🔒 {nextStepUrl ? 'Complete your registration to see all comparable sold prices' : 'Sign in to see all comparable sold prices'}</span>
                    <a href={nextStepUrl ?? ap('/sign-in')} style={{ fontSize: 13, fontWeight: 700, color: 'var(--site-accent-text)', textDecoration: 'none', whiteSpace: 'nowrap' }}>{nextStepUrl ? 'Complete Registration →' : 'Sign In →'}</a>
                  </div>
                )}
              </section>
            )}

            {/* Internal links */}
            <div style={{ ...card }}>
              <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14, color: 'var(--site-body)' }}>
                {isShowcase ? 'Explore More' : 'Explore More Sold Data'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {exploreLinks.map(x => (
                  <a key={x.l} href={x.h} style={{ background: 'var(--site-canvas)', border: '1px solid var(--site-rule)', color: 'var(--site-body)', padding: '8px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>{x.l}</a>
                ))}
              </div>
            </div>
          </div>

          {/* Other units sold in this building — addresses and dates visible,
              prices locked. BuildingComparisonTable is itself a paywall in
              sold + !isLoggedIn mode, so the curiosity gap is the CTA. */}
          {buildingSolds.length > 0 && listing.building && (
            <section style={{ marginBottom: 36 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--site-body)', margin: '0 0 4px' }}>
                Other Units Sold at {listing.building.name}
              </h2>
              <div style={{ fontSize: 13, color: 'var(--site-muted)', marginBottom: 12 }}>
                {buildingSolds.length} other recent sale{buildingSolds.length === 1 ? '' : 's'} in this building
                {isLoggedIn ? '.' : ' — sign in free to see every sold price.'}
              </div>
              <BuildingComparisonTable
                rows={buildingSolds}
                sold
                isLoggedIn={isLoggedIn}
                slug={slug}
                agentPrefix={agentPrefix}
              />
            </section>
          )}

          {/* Sidebar */}
          <div className="sold-detail-sidebar">
            {/* Sale-result card. When the price is visible the headline figure is already
                40px tall in the main column and, on mobile, this sits directly beneath it
                — so repeating the number was pure duplication in the one slot with the
                most conversion value. It now reports how the sale PERFORMED, which is the
                part a visitor cannot work out for themselves and the part that reflects on
                the agent. The price still appears here when the two are far apart
                (desktop, where this is a sticky sidebar beside a long page). */}
            <div style={{ background: '#fff', border: '1px solid var(--site-rule)', borderRadius: 10, padding: '18px 20px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--site-muted)', marginBottom: 6 }}>
                {showSold && ratio != null ? 'Sale Result' : 'Sold Price'}
              </div>
              {showSold ? (
                <div className="sold-sidebar-price" style={{ fontSize: 28, fontWeight: 900, color: 'var(--site-accent-text)', marginBottom: 4 }}>{priceLabel}</div>
              ) : (
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--site-accent-text)', filter: 'blur(7px)', userSelect: 'none', marginBottom: 4 }}>$000,000</div>
              )}
              {showSold && ratio != null && (
                <div style={{ fontSize: 15, fontWeight: 700, color: ratio >= 100 ? '#15803d' : 'var(--site-body)', marginBottom: 4 }}>
                  {ratio === 100
                    ? 'Sold at asking price'
                    : ratio > 100
                      ? `Sold ${ratio - 100}% over asking`
                      : `Sold ${100 - ratio}% under asking`}
                </div>
              )}
              {listing.sold_date && (
                <div style={{ fontSize: 12, color: 'var(--site-muted)' }}>Sold {formatDate(listing.sold_date)}</div>
              )}
              {listing.dom != null && (
                <div style={{ fontSize: 12, color: 'var(--site-muted)', marginTop: 2 }}>
                  {listing.dom} day{listing.dom === 1 ? '' : 's'} on market
                </div>
              )}
            </div>

            {!showSold && (
              <div style={{ marginBottom: 14 }}>
                <SoldSignInCard
                  agent={agent}
                  slug={slug}
                  agentPrefix={agentPrefix}
                  subarea={listing.subarea}
                  returnTo={ap(`/sold/${mls}`)}
                  mls={listing.mls_no}
                  nextStepUrl={nextStepUrl}
                />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <LeadOfferCapture
                slug={slug}
                offerType="sold_valuation"
                offerContext={listing.building?.name ?? listing.subarea ?? listing.city}
                accent
                title="What's your home worth today?"
                subtitle={cmaProof}
                buttonLabel="Get My Valuation"
                successMessage={`Thanks — ${agent.name.split(' ')[0]} will send your valuation shortly.`}
              />
            </div>

            <RequestShowingWidget agent={agent} address={listing.address} price={priceLabel ?? 'Sold listing'} mlsNum={listing.mls_no} variant="find-similar" subarea={listing.subarea || listing.city} />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .sold-detail-grid { grid-template-columns: 1fr !important; }
          .sold-detail-sidebar { position: static !important; }
          /* Stacked layout puts this card immediately under the 34px headline price,
             so the number would appear twice within one screen. Desktop keeps it —
             there the sidebar is a sticky rail beside a long scrolling page. */
          .sold-sidebar-price { display: none !important; }
        }
      `}</style>
    </div>
  )
}
