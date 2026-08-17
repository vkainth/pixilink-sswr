'use client'

import { useEffect, useState } from 'react'
import type { AgentListing, ListingDetail } from '@/lib/types'
import { formatPrice, formatPriceFull, formatDate } from '@/lib/types'
import ListingStrip from '@/components/ListingStrip'
import BuildingComparisonTable from '@/components/BuildingComparisonTable'
import InsightBar from '@/components/InsightBar'
import { SoldPriceBanner } from '@/components/SoldPriceGate'

interface SupplementalData {
  building_solds_summary: { count: number; avg_sold_price: number } | null
  building_active: AgentListing[]
  similar_active: AgentListing[]
  similar_sold: AgentListing[]
  neighbourhood: ListingDetail['neighbourhood']
  price_history: Array<{ date: string; mls: string; status: string; price: number }>
  listing_history: Array<{ date: string; mls: string; status: string; price: number }>
}

interface Props {
  slug: string
  agentPrefix?: string
  listingSlug: string
  mls: string
  isLoggedIn: boolean
  isSold: boolean
  nextStepUrl: string | undefined
  listing: ListingDetail
}

export default function ListingSupplemental({
  slug,
  agentPrefix,
  listingSlug,
  mls,
  isLoggedIn,
  isSold,
  nextStepUrl,
  listing,
}: Props) {
  const [data, setData] = useState<SupplementalData | null>(null)
  const ap = (p: string) => `${agentPrefix ?? `/agent/${slug}`}${p}`

  useEffect(() => {
    let cancelled = false
    fetch(`/api/listing-supplemental/${slug}/${listingSlug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json) setData(json as SupplementalData)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [slug, listingSlug])

  const card: React.CSSProperties = { background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 24px' }
  const section: React.CSSProperties = { margin: '0 0 32px' }
  const sectionTitle: React.CSSProperties = { fontSize: 18, fontWeight: 800, margin: '0 0 14px', color: 'var(--primary-bg)' }

  const neighbourhood = data?.neighbourhood ?? null
  const buildingActive = data?.building_active ?? []
  const similarActive = data?.similar_active ?? []
  const similarSold = data?.similar_sold ?? []
  const priceHistory = data?.price_history ?? []
  const listingHistory = data?.listing_history ?? []

  const hasHistory = priceHistory.length > 0 || listingHistory.length > 0

  if (!data) {
    return null
  }

  return (
    <>
      {/* Neighbourhood market badges — active listings */}
      {!isSold && neighbourhood && (
        <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {neighbourhood.market_type === 'strong-sellers' || neighbourhood.market_type === 'sellers'
            ? <span style={{ background: '#fde9c8', color: '#b45309', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, letterSpacing: '0.04em' }}>Seller&apos;s Market</span>
            : neighbourhood.market_type === 'buyers'
            ? <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, letterSpacing: '0.04em' }}>Buyer&apos;s Market</span>
            : null}
        </div>
      )}

      {/* Neighbourhood stats strip — sold listings */}
      {isSold && neighbourhood && (
        <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 32 }}>
          {[
            { v: String(neighbourhood.sold_30d), l: `Homes sold in ${neighbourhood.subarea || neighbourhood.city} (30 days)` },
            { v: String(neighbourhood.active), l: 'Active listings in the area' },
            { v: neighbourhood.avg_sold_price && neighbourhood.avg_sold_price > 0 ? formatPrice(neighbourhood.avg_sold_price) : '—', l: `Avg sold price, ${neighbourhood.subarea || neighbourhood.city}` },
          ].map((cell, i) => (
            <div key={i} style={{ flex: 1, padding: '20px', borderRight: i < 2 ? '1px solid var(--border)' : 'none', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent)' }}>{cell.v}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{cell.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* InsightBar — active listings */}
      {!isSold && neighbourhood && (
        <div style={{ marginBottom: 28 }}><InsightBar data={neighbourhood} /></div>
      )}

      {/* Price & Listing History */}
      {(hasHistory || isSold) && (
        <section style={section}>
          <h2 style={sectionTitle}>History</h2>
          {!isLoggedIn ? (
            <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32 }}>🔒</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Price history &amp; past MLS activity</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, maxWidth: 360 }}>
                Sign in to view price history and past MLS activity for this property.
              </p>
              <a
                href={nextStepUrl ?? ap(`/sign-in?return=${agentPrefix ?? `/agent/${slug}`}/listing/${mls}`)}
                style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '12px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', display: 'inline-block' }}
              >
                {nextStepUrl ? 'Complete Registration →' : 'Sign In to View'}
              </a>
            </div>
          ) : (
            <div style={card}>
              {(listingHistory.length > 0 || priceHistory.length > 0) ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Date', 'MLS®', 'Status', 'Price'].map(h => (
                        <th key={h} style={{ textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, paddingBottom: 10, borderBottom: '1px solid var(--border)', paddingRight: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...listingHistory, ...priceHistory].map((row, i) => (
                      <tr key={i}>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', paddingRight: 12, color: 'var(--text-muted)' }}>{formatDate(row.date, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', paddingRight: 12, color: 'var(--text)' }}>{row.mls}</td>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', paddingRight: 12 }}>
                          <span style={{
                            background: row.status === 'Active' ? '#dcfce7' : row.status === 'Sold' ? '#f3f4f6' : '#fef9c3',
                            color: row.status === 'Active' ? '#15803d' : row.status === 'Sold' ? '#374151' : '#854d0e',
                            padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                          }}>{row.status}</span>
                        </td>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600 }}>{formatPriceFull(row.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>No price history available for this listing.</p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Other active units in the same building */}
      {listing.building && buildingActive.length > 0 && (
        <section style={section}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h2 style={{ ...sectionTitle, marginBottom: 2 }}>Other Units for Sale in {listing.building.name}</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {buildingActive.length} unit{buildingActive.length !== 1 ? 's' : ''} currently listed · sorted by price
              </div>
            </div>
            <a href={ap(`/building/${listing.building.slug}`)} style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              View building page →
            </a>
          </div>
          <BuildingComparisonTable rows={buildingActive} highlightMls={listing.mls_no} slug={slug} />
        </section>
      )}

      {/* Similar active nearby */}
      {similarActive.length > 0 && (
        <section style={section}>
          <h2 style={{ ...sectionTitle, marginBottom: 4 }}>Similar Properties Nearby</h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Comparable homes in {listing.subarea || listing.city}</div>
          {listing.building ? (
            <BuildingComparisonTable rows={similarActive} highlightMls={listing.mls_no} slug={slug} />
          ) : (
            <ListingStrip listings={similarActive} />
          )}
        </section>
      )}

      {/* Similar sold / recently sold */}
      {similarSold.length > 0 && (
        <section style={section}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h2 style={{ ...sectionTitle, marginBottom: 2 }}>{isSold ? 'Similar Recently Sold' : 'Recently Sold Nearby'}</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {isSold
                  ? `Comparable ${listing.type || 'properties'} in ${listing.subarea || listing.city} · last 90 days`
                  : 'Comparable sales · last 90 days'}
              </div>
            </div>
            {!isLoggedIn && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {nextStepUrl ? 'Complete registration to see sold prices' : 'Sign in to see sold prices'}
              </span>
            )}
          </div>
          {listing.building ? (
            <BuildingComparisonTable rows={similarSold} sold isLoggedIn={isLoggedIn} slug={slug} />
          ) : (
            <ListingStrip listings={similarSold} showSoldPrice={isLoggedIn} />
          )}
          {!isLoggedIn && (
            <SoldPriceBanner city={listing.subarea || listing.city} slug={slug} agentPrefix={agentPrefix} nextStepUrl={nextStepUrl} />
          )}
        </section>
      )}
    </>
  )
}
