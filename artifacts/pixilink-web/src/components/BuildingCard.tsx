'use client'

import { useState } from 'react'
import type { AgentBuilding } from '@/lib/types'
import { formatPriceRange, imgUrl, buildingDisplayName } from '@/lib/types'

interface Props {
  building: AgentBuilding
  href?: string
}

export default function BuildingCard({ building, href }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const displayName = buildingDisplayName(building)

  return (
    <a href={href ?? `/building/${building.slug}`}
      style={{ display: 'block', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', transition: 'box-shadow 0.2s, transform 0.2s', textDecoration: 'none', color: 'inherit' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.14)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'; (e.currentTarget as HTMLElement).style.transform = 'none' }}>
      {/* Photo */}
      <div style={{ position: 'relative', paddingBottom: '58%', background: 'linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%)', overflow: 'hidden' }}>
        {/* Shimmer — visible until image loads */}
        {building.photo_url && !imgLoaded && (
          <div className="img-shimmer" style={{ position: 'absolute', inset: 0 }} />
        )}
        {building.photo_url ? (
          <img src={imgUrl(building.photo_url, 400)} alt={displayName} loading="lazy"
            width={400} height={248}
            onLoad={() => setImgLoaded(true)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </div>
        )}
        {building.year_built && (
          <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 3, letterSpacing: 1 }}>
            {building.year_built}
          </div>
        )}
        {building.active_listings > 0 && (
          <div style={{ position: 'absolute', bottom: 10, right: 10, background: '#111111', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 3, letterSpacing: 0.5 }}>
            {building.active_listings} active
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {displayName}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          {building.city}{building.subarea ? `, ${building.subarea}` : ''}
          {building.units && <span style={{ marginLeft: 8 }}>· {building.units} units</span>}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
          {formatPriceRange(building.min_price, building.max_price)}
        </div>
      </div>
    </a>
  )
}
