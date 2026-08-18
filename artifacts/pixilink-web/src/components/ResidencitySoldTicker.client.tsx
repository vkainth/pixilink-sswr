'use client'
import { useEffect, useRef, useState } from 'react'

export interface TickerItem {
  zone?: string
  type: string
  price: number
  subarea?: string
  city?: string
}

interface ApiItem {
  subarea: string
  city: string
  type: string
  price: number
  sold_date: string
}

const TYPE_EMOJI: Record<string, string> = {
  House: '🏡',
  'House/Single Family': '🏡',
  'Single Family Detached': '🏡',
  Detached: '🏡',
  Apartment: '🏢',
  'Apartment/Condo': '🏢',
  Townhouse: '🏘',
  Duplex: '🏠',
  'Half Duplex': '🏠',
}

function typeIcon(type: string): string {
  return TYPE_EMOJI[type] ?? '🏠'
}

function fmtPrice(p: number): string {
  if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(p % 1_000_000 === 0 ? 0 : 1)}M`
  if (p >= 1_000) return `$${Math.round(p / 1_000)}K`
  return `$${p}`
}

function normalizeType(type: string): string {
  const t = type.toLowerCase()
  if (t.includes('apartment') || t.includes('condo')) return 'Apartment'
  if (t.includes('town') || t.includes('row')) return 'Townhouse'
  if (t.includes('house') || t.includes('detach')) return 'House'
  if (t.includes('duplex')) return 'Duplex'
  return type
}

export default function ResidencitySoldTicker({ items: propItems }: { items?: TickerItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState<ApiItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/residencity/recent-sold?limit=40`)
      .then(r => r.json())
      .then((data: ApiItem[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setItems(data)
          setLoaded(true)
        } else {
          setLoaded(true)
        }
      })
      .catch(() => setLoaded(true))
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track || items.length === 0) return
    let pos = 0
    let raf: number
    const step = () => {
      pos -= 0.45
      const half = track.scrollWidth / 2
      if (Math.abs(pos) >= half) pos = 0
      track.style.transform = `translateX(${pos}px)`
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [items])

  if (!loaded) {
    return (
      <div style={{ overflow: 'hidden', background: 'rgba(255,255,255,0.06)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 0' }}>
        <div style={{ display: 'flex', gap: 40, padding: '0 24px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 14, width: 200, background: 'rgba(255,255,255,0.08)', borderRadius: 7, animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
      </div>
    )
  }

  const displayItems = items.length > 0 ? items : (propItems ?? []).map(p => ({
    subarea: p.zone ?? p.subarea ?? '',
    city: p.city ?? '',
    type: p.type,
    price: p.price,
    sold_date: '',
  }))

  if (!displayItems.length) return null

  const doubled = [...displayItems, ...displayItems]

  return (
    <div style={{ overflow: 'hidden', background: 'rgba(255,255,255,0.06)', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '11px 0' }}>
      <div ref={trackRef} style={{ display: 'flex', gap: 0, willChange: 'transform', whiteSpace: 'nowrap' }}>
        {doubled.map((item, i) => {
          const norm = normalizeType(item.type)
          const location = [item.subarea, item.city].filter(Boolean).join(', ')
          return (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 28px', fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
              <span style={{ color: '#f0c060', marginRight: 2 }}>⚡</span>
              <span style={{ fontWeight: 700, color: '#fff' }}>Just Sold</span>
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>·</span>
              <span style={{ color: 'rgba(255,255,255,0.75)' }}>{location || 'Metro Vancouver'}</span>
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>·</span>
              <span>{typeIcon(norm)} {norm}</span>
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>·</span>
              <span style={{ fontWeight: 700, color: '#f0c060' }}>{fmtPrice(item.price)}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
