'use client'

import { useState, useLayoutEffect, useRef } from 'react'
import type { AgentListing } from '@/lib/types'
import { formatPrice, formatDate, imgUrl } from '@/lib/types'
import { useAgentPrefix } from '@/lib/agent-context'
import { useFavorites } from '@/lib/FavoritesContext'

interface Props {
  listing: AgentListing
  showSoldPrice?: boolean
  isLoggedIn?: boolean
  priority?: boolean
  /** Suppress the "Xd on market" badge when dom exceeds this value. Default: no suppression. */
  hideDomThreshold?: number | null
}

function formatDropAmount(original: number | string, current: number | string): string {
  const orig = typeof original === 'string' ? parseFloat(String(original).replace(/[^0-9.]/g, '')) : original
  const curr = typeof current === 'string' ? parseFloat(String(current).replace(/[^0-9.]/g, '')) : current
  const drop = orig - curr
  if (!drop || drop <= 0) return '↓ Price Reduced'
  if (drop >= 1_000_000) return `↓ $${(drop / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  return `↓ $${Math.round(drop / 1000)}K`
}

const TYPE_COLORS: Record<string, string> = {
  Apartment: '#1d4ed8',
  Townhouse: '#047857',
  House: '#b45309',
}

function HeartButton({ mlsNo }: { mlsNo: string }) {
  const { isSaved, toggle, loading } = useFavorites()
  const saved = isSaved(mlsNo)

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    toggle(mlsNo)
  }

  if (loading) return null

  return (
    <button
      onClick={handleClick}
      title={saved ? 'Remove from saved' : 'Save listing'}
      style={{
        position: 'absolute', top: 10, right: 10,
        width: 32, height: 32, borderRadius: '50%',
        background: saved ? 'var(--accent)' : 'rgba(255,255,255,0.9)',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        transition: 'background 0.15s, transform 0.15s',
        zIndex: 2,
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24"
        fill={saved ? '#fff' : 'none'}
        stroke={saved ? '#fff' : '#374151'}
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    </button>
  )
}

function hasSuiteEntry(basement: string | null | undefined): boolean {
  if (!basement) return false
  return basement.includes('Separate Entry') || basement.includes('Exterior Entry')
}

function getSuiteLabel(listing: AgentListing): string | null {
  const type = listing.type
  if (type !== 'House' && type !== 'Townhouse') return null
  const kitchens = listing.kitchens ?? 0
  const basementSuite = hasSuiteEntry(listing.basement)
  if (kitchens >= 3) return '2 Suites'
  if (kitchens >= 2 && basementSuite) return 'Suite'
  if (basementSuite) return 'Suite'
  if (listing.rental_income_hint) return 'Suite'
  return null
}

export default function ListingCard({ listing, showSoldPrice, isLoggedIn, priority = false, hideDomThreshold }: Props) {
  const isSold = listing.status === 'Sold'
  const canSeeSoldPrice = isLoggedIn ?? showSoldPrice
  const guestSoldBlur = isSold && !canSeeSoldPrice
  const price = canSeeSoldPrice && listing.sold_price ? listing.sold_price : listing.list_price
  const typeColor = TYPE_COLORS[listing.type || ''] || '#6b7280'
  const baths = listing.baths % 1 === 0 ? listing.baths.toFixed(0) : listing.baths.toFixed(1)

  const agentPrefix = useAgentPrefix()
  const basePath = isSold ? `/sold/${listing.mls_no}` : `/listing/${listing.slug || listing.mls_no}`
  const href = agentPrefix + basePath

  const [imgLoaded, setImgLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  useLayoutEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) setImgLoaded(true)
  }, [])

  const suiteLabel = !isSold ? getSuiteLabel(listing) : null
  const rentalHint = !isSold ? listing.rental_income_hint : null

  return (
    <a href={href}
      style={{ display: 'block', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', transition: 'box-shadow 0.2s, transform 0.2s', textDecoration: 'none', color: 'inherit' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.14)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'; (e.currentTarget as HTMLElement).style.transform = 'none' }}>
      {/* Photo */}
      <div style={{ position: 'relative', paddingBottom: '62%', background: '#f3f4f6', overflow: 'hidden' }}>
        {/* Shimmer — visible until image loads */}
        {listing.photo_url && !imgLoaded && (
          <div className="img-shimmer" style={{ position: 'absolute', inset: 0 }} />
        )}
        {listing.photo_url ? (
          <img ref={imgRef} src={imgUrl(listing.photo_url, 400, 248)} alt={listing.address}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            width={400} height={248}
            onLoad={() => setImgLoaded(true)}
            onError={e => { const t = e.currentTarget; if (listing.photo_url && t.src !== listing.photo_url) { t.src = listing.photo_url; t.onerror = null } }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
        )}
        <div style={{ position: 'absolute', top: 10, left: 10, background: typeColor, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 3 }}>
          {listing.type || 'Home'}
        </div>
        {isSold && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: '#111111', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: '3px 8px', borderRadius: 3 }}>
            SOLD
          </div>
        )}
        {!isSold && listing.price_reduced && listing.original_price && (
          <div style={{ position: 'absolute', bottom: 10, left: 10, background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: '3px 8px', borderRadius: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>
            {formatDropAmount(listing.original_price, listing.list_price)}
          </div>
        )}
        {/* Suite badge — bottom-right when no price-reduced badge, bottom-left position otherwise */}
        {suiteLabel && !listing.price_reduced && (
          <div style={{ position: 'absolute', bottom: 10, left: 10, background: '#7c3aed', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: '3px 8px', borderRadius: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>
            {suiteLabel}
          </div>
        )}
        {suiteLabel && listing.price_reduced && (
          <div style={{ position: 'absolute', bottom: 10, right: 10, background: '#7c3aed', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: '3px 8px', borderRadius: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>
            {suiteLabel}
          </div>
        )}
        {/* Heart button — only for active listings (sold listings have SOLD badge in same spot) */}
        {!isSold && (
          <HeartButton mlsNo={listing.mls_no} />
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px 16px' }}>
        {/* Price — blurred for guests on sold listings */}
        {guestSoldBlur ? (
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ filter: 'blur(6px)', userSelect: 'none', color: 'var(--primary-bg)', pointerEvents: 'none' }}>
              {formatPrice(listing.list_price)}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--primary-bg)', color: '#fff', padding: '2px 7px', borderRadius: 4, letterSpacing: 0.5, filter: 'none', flexShrink: 0 }}>
              Sign In
            </span>
          </div>
        ) : (
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary-bg)', lineHeight: 1.1, marginBottom: 2 }}>
            {formatPrice(price)}
            {canSeeSoldPrice && listing.sold_price && listing.list_price !== listing.sold_price && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                listed {formatPrice(listing.list_price)}
              </span>
            )}
            {!isSold && listing.price_reduced && listing.original_price && (
              <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, marginLeft: 8, textDecoration: 'line-through', textDecorationColor: '#dc2626' }}>
                {formatPrice(listing.original_price)}
              </span>
            )}
          </div>
        )}
        {rentalHint && (
          <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginBottom: 2 }}>
            ~{rentalHint} rental income
          </div>
        )}
        <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 2, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {listing.address}
        </div>
        {isSold && listing.sold_date ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            Sold {formatDate(listing.sold_date, { month: 'short', day: 'numeric', year: 'numeric' })}
            {listing.subarea ? ` · ${listing.subarea}` : (listing.city ? ` · ${listing.city}` : '')}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            {listing.city}{listing.subarea ? `, ${listing.subarea}` : ''}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <span>{listing.beds} bd</span>
          <span>{baths} ba</span>
          {listing.sqft > 0 && <span>{listing.sqft.toLocaleString()} ft²</span>}
          {!isSold && listing.dom !== null && !(hideDomThreshold != null && listing.dom > hideDomThreshold) && <span style={{ marginLeft: 'auto' }}>{listing.dom}d on market</span>}
        </div>
        {(() => {
          const hasLot = Number(listing.lot_size) > 0
          const hasFrontage = Number(listing.frontage) > 0
          return listing.type === 'House' && (hasLot || hasFrontage) ? (
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', paddingTop: 6 }}>
              {hasLot && <span>{Number(listing.lot_size).toLocaleString('en-CA', { maximumFractionDigits: 0 })} sqft lot</span>}
              {hasFrontage && <span>{Number(listing.frontage).toLocaleString('en-CA', { maximumFractionDigits: 1 })} ft</span>}
            </div>
          ) : null
        })()}
      </div>
    </a>
  )
}
