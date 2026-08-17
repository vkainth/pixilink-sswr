'use client'

import { useState, useEffect } from 'react'
import type { MarketReportTypeRow, AgentListing } from '@/lib/types'
import { formatPriceFull, formatPrice, imgUrl, formatDate } from '@/lib/types'
import { marketBadge } from '@/lib/market'

// Market-page-scoped no-data fallbacks: show "N/A" instead of the shared "Contact".
function naPrice(p: number | null | undefined): string {
  return p ? formatPrice(p) : 'N/A'
}
function naPriceFull(p: number | null | undefined): string {
  return p ? formatPriceFull(p) : 'N/A'
}

interface Props {
  byType: MarketReportTypeRow[]
  soldListings: AgentListing[]
  maxTypePrice: number
  slug: string
  agentPrefix?: string
  hideVisualBars?: boolean
}

const th: React.CSSProperties = {
  textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', padding: '11px 14px', whiteSpace: 'nowrap',
  position: 'sticky', top: 0, zIndex: 2, background: 'var(--off-white)',
}
const td: React.CSSProperties = {
  fontSize: 13, color: 'var(--text)', padding: '12px 14px', whiteSpace: 'nowrap',
}

function useIsLoggedIn() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
    fetch(`${basePath}/api/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((d: { user?: { id?: string | number } | null } | null) => {
        setIsLoggedIn(!!(d?.user?.id))
      })
      .catch(() => setIsLoggedIn(false))
  }, [])
  return isLoggedIn
}

export default function MarketStatsInteractive({ byType, soldListings, maxTypePrice, slug, agentPrefix, hideVisualBars = false }: Props) {
  const prefix = agentPrefix ?? `/agent/${slug}`
  const [activeType, setActiveType] = useState<string>('All')
  const isLoggedIn = useIsLoggedIn()

  const allTypes = ['All', ...byType.map(r => r.type)]
  const filteredByType = activeType === 'All' ? byType : byType.filter(r => r.type === activeType)
  const filteredMaxTypePrice = filteredByType.length > 0 ? Math.max(...filteredByType.map(r => r.avg_sold_price)) : 0
  const filteredSold = activeType === 'All' ? soldListings : soldListings.filter(l => l.type === activeType)

  const tabStyle = (type: string): React.CSSProperties => ({
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: activeType === type ? 700 : 500,
    color: activeType === type ? 'var(--primary-bg)' : 'var(--text-muted)',
    background: activeType === type ? 'var(--off-white)' : 'transparent',
    border: activeType === type ? '1.5px solid var(--border)' : '1.5px solid transparent',
    borderRadius: 20,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  })

  return (
    <>
      {/* By Property Type — tabs + table read as one connected unit */}
      {byType.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', margin: 0 }}>By Property Type</h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {activeType === 'All' ? 'All property types' : `Filtered to ${activeType}`}
            </span>
          </div>

          {/* Visual price bars (hidden when PropertyTypeBarChart is used) */}
          {!hideVisualBars && (
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                Avg Sold Price by Type
              </div>
              {filteredByType.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>No data for selected type.</div>
              ) : (
                filteredByType.map(row => (
                  <div key={row.type} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{row.type}</span>
                      <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{naPriceFull(row.avg_sold_price)}</span>
                    </div>
                    <div style={{ height: 10, background: 'var(--off-white)', borderRadius: 5, border: '1px solid var(--border)' }}>
                      <div style={{
                        height: '100%',
                        width: `${filteredMaxTypePrice > 0 ? (row.avg_sold_price / filteredMaxTypePrice) * 100 : 0}%`,
                        background: 'linear-gradient(90deg, var(--accent), #e8c97d)',
                        borderRadius: 5,
                      }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Connected card: type-tab header sits directly on top of the table it filters */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: '#fff', overflow: 'clip' }}>
            {allTypes.length > 1 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--off-white)' }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>
                  Property Type
                </span>
                {allTypes.map(type => (
                  <button key={type} onClick={() => setActiveType(type)} style={tabStyle(type)}>
                    {type}
                  </button>
                ))}
              </div>
            )}

            {/* Numeric detail table */}
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 360 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--off-white)' }}>
                  <th style={th}>Type</th>
                  <th style={th}>Sold (30d)</th>
                  <th style={th}>Avg Sold</th>
                  <th style={th}>Avg DOM</th>
                  <th style={th}>Active</th>
                  <th style={th}>Market</th>
                </tr>
              </thead>
              <tbody>
                {filteredByType.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>No data for selected type.</td>
                  </tr>
                ) : (
                  filteredByType.map((row, i) => {
                    const b = marketBadge(row.market_type)
                    return (
                      <tr key={row.type} style={{ borderBottom: i < filteredByType.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ ...td, fontWeight: 700 }}>{row.type}</td>
                        <td style={td}>{row.sold_30d.toLocaleString()}</td>
                        <td style={{ ...td, fontWeight: 700 }}>{naPriceFull(row.avg_sold_price)}</td>
                        <td style={td}>{row.avg_dom}d</td>
                        <td style={td}>{row.active.toLocaleString()}</td>
                        <td style={td}>
                          <span style={{ background: b.bg, color: b.color, padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                            {b.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>
        </section>
      )}

      {/* Recently Sold Grid */}
      {soldListings.length > 0 && (
        <section style={{ marginTop: 44 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', margin: 0 }}>Recently Sold</h2>
            {activeType !== 'All' && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{activeType} only</span>
            )}
          </div>

          {filteredSold.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No recently sold {activeType.toLowerCase()} listings found.
            </div>
          ) : (
            <>
              <div className="sold-grid">
                {filteredSold.map(listing => {
                  const baths = listing.baths % 1 === 0 ? listing.baths.toFixed(0) : listing.baths.toFixed(1)
                  const href = `${prefix}/sold/${listing.mls_no}`
                  return (
                    <a key={listing.id} href={href} style={{ display: 'block', background: '#fff', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textDecoration: 'none', color: 'inherit', transition: 'box-shadow 0.2s, transform 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.12)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLElement).style.transform = 'none' }}>

                      {/* Photo */}
                      <div style={{ position: 'relative', paddingBottom: '60%', background: '#f3f4f6', overflow: 'hidden' }}>
                        {listing.photo_url ? (
                          <img src={imgUrl(listing.photo_url, 400)} alt={listing.address} loading="lazy"
                            width={400} height={248}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                          </div>
                        )}
                        <div style={{ position: 'absolute', top: 8, left: 8, background: '#111111', color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: '3px 7px', borderRadius: 3 }}>
                          SOLD
                        </div>
                        {listing.type && (
                          <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 3 }}>
                            {listing.type}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ padding: '12px 14px 14px' }}>
                        {/* Price */}
                        {isLoggedIn && listing.sold_price ? (
                          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--accent)', lineHeight: 1.15, marginBottom: 3 }}>
                            Sold {formatPrice(listing.sold_price)}
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.15, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ filter: 'blur(6px)', userSelect: 'none', color: 'var(--primary-bg)', pointerEvents: 'none', fontSize: 17 }}>
                              {naPrice(listing.list_price)}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--primary-bg)', color: '#fff', padding: '2px 7px', borderRadius: 4, letterSpacing: 0.4, filter: 'none', flexShrink: 0 }}>
                              Sign In
                            </span>
                          </div>
                        )}

                        <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {listing.address}
                        </div>
                        {listing.sold_date && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                            {formatDate(listing.sold_date, { month: 'short', day: 'numeric' })}
                            {listing.subarea ? ` · ${listing.subarea}` : ''}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                          {listing.beds > 0 && <span>{listing.beds} bd</span>}
                          {listing.baths > 0 && <span>{baths} ba</span>}
                          {listing.sqft > 0 && <span>{listing.sqft.toLocaleString()} ft²</span>}
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>

              {!isLoggedIn && (
                <div style={{ marginTop: 14, background: 'var(--off-white)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>
                    Sign in free to see all sold prices.
                  </span>
                  <a href={`${prefix}/sign-in`}
                    style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', textDecoration: 'none', padding: '8px 20px', borderRadius: 6, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                    Sign In
                  </a>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <style>{`
        .sold-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 860px) {
          .sold-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 540px) {
          .sold-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  )
}
