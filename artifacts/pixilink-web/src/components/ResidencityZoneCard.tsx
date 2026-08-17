'use client'
import type { AgentProfile, MarketStats } from '@/lib/types'
import { imgUrl, formatPrice } from '@/lib/types'

export interface ZoneByTypeRow {
  type: string
  sold_30d: number
  avg_sold_price: number
  market_type: string
}

interface Props {
  label: string
  href: string
  external: boolean
  agent: AgentProfile | null
  stats: MarketStats | null
  byType: ZoneByTypeRow[]
}

function dominantMarket(rows: ZoneByTypeRow[]): string {
  if (!rows.length) return 'balanced'
  const total = rows.reduce((s, r) => s + r.sold_30d, 0) || 1
  const weighted: Record<string, number> = {}
  for (const r of rows) {
    weighted[r.market_type] = (weighted[r.market_type] || 0) + r.sold_30d / total
  }
  return Object.entries(weighted).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'balanced'
}

function badgeStyle(mkt: string): { bg: string; color: string; label: string } {
  if (mkt === 'sellers' || mkt === 'strong-sellers')
    return { bg: '#fef2f2', color: '#dc2626', label: "Seller's Market" }
  if (mkt === 'buyers')
    return { bg: '#eff6ff', color: '#2563eb', label: "Buyer's Market" }
  return { bg: '#fffbeb', color: '#d97706', label: 'Balanced Market' }
}

export default function ResidencityZoneCard({ label, href, external, agent, stats, byType }: Props) {
  const photoSrc = agent?.headshot_path || (agent?.photo_path ? imgUrl(agent.photo_path, 325) : null)
  const sold = stats?.sold_last_30_days ?? 0
  const avgPrice = stats?.avg_sold_price ?? null
  const mkt = byType.length ? dominantMarket(byType) : 'balanced'
  const badge = badgeStyle(mkt)

  return (
    <a href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb',
        padding: '24px 20px', height: '100%', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column',
        transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'pointer',
      }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)'
          el.style.transform = 'translateY(-3px)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.boxShadow = 'none'
          el.style.transform = 'none'
        }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              EXCLUSIVE ZONE{external ? ' ↗' : ''}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>{label}</div>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 6,
            background: badge.bg, color: badge.color, whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 8,
          }}>
            {badge.label}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#111', lineHeight: 1 }}>{sold}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Sold (30 days)</div>
          </div>
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#111', lineHeight: 1 }}>
              {avgPrice ? formatPrice(avgPrice) : '—'}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Avg Sold Price</div>
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          {agent ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {photoSrc
                ? <img src={photoSrc} alt={agent.name} width={42} height={42}
                    style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb', flexShrink: 0 }} />
                : <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#14213d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17, color: '#fff', flexShrink: 0 }}>
                    {agent.name.charAt(0)}
                  </div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{agent.brokerage}</div>
                <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zone Expert</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#14213d', flexShrink: 0 }}>View →</div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Zone Expert: Available</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Be the exclusive agent here</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#14213d', background: '#eef2ff', padding: '7px 14px', borderRadius: 8 }}>
                Claim →
              </span>
            </div>
          )}
        </div>
      </div>
    </a>
  )
}
