'use client'
import { useEffect, useState } from 'react'

const ANNUAL_RATE = 0.0275
const MONTHLY_RATE = ANNUAL_RATE / 12
const AMORT_MONTHS = 300

function calcMonthly(price: number): number {
  const principal = price * 0.8
  if (principal <= 0) return 0
  return Math.round(principal * MONTHLY_RATE * Math.pow(1 + MONTHLY_RATE, AMORT_MONTHS) / (Math.pow(1 + MONTHLY_RATE, AMORT_MONTHS) - 1))
}

function fmtPrice(p: number): string {
  if (!p) return '—'
  if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(2)}M`
  return `$${Math.round(p / 1000)}K`
}

function fmtMortgage(p: number): string {
  const m = calcMonthly(p)
  if (!m) return ''
  return `~$${m.toLocaleString()}/mo`
}

interface SparkEntry { month: string; sold_count: number; avg_price: number }

function Sparkline({ data, color = '#c9a84c' }: { data: SparkEntry[]; color?: string }) {
  if (!data || data.length < 2) return <span style={{ display: 'inline-block', width: 40, height: 20 }} />
  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
  const vals = sorted.map(d => d.sold_count)
  const mn = Math.min(...vals)
  const mx = Math.max(...vals)
  const range = mx - mn || 1
  const W = 44, H = 20
  const pts = sorted.map((d, i) => {
    const x = (i / (sorted.length - 1)) * W
    const y = H - ((d.sold_count - mn) / range) * (H - 2) - 1
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

interface TrendsData {
  most_active: Array<{ subarea: string; city: string; sold_count: number; avg_price: number }>
  speed_of_market: Array<{ subarea: string; city: string; avg_dom: number; sold_count: number }>
  price_per_sqft: Array<{ subarea: string; city: string; avg_ppsf: number; sold_count: number }>
  price_gains: Array<{ subarea: string; city: string; pct_change: number; avg_price: number; prior_avg: number; sold_count: number }>
  price_drops: Array<{ subarea: string; city: string; pct_change: number; avg_price: number; prior_avg: number; sold_count: number }>
  sold_to_list: Array<{ subarea: string; city: string; avg_stl: number; sold_count: number }>
  inventory_health: Array<{ subarea: string; city: string; months_supply: number; active_count: number; monthly_sold: number; market_type: string }>
  sparklines: Record<string, SparkEntry[]>
  days: number
}

function SkeletonPanel() {
  return (
    <div style={{ background: '#1a2540', borderRadius: 12, padding: '20px 20px', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ height: 16, width: '60%', background: 'rgba(255,255,255,0.08)', borderRadius: 6, marginBottom: 16, animation: 'pulse 1.4s ease-in-out infinite' }} />
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ height: 12, width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 10, animation: 'pulse 1.4s ease-in-out infinite' }} />
      ))}
    </div>
  )
}

function marketPill(type: string) {
  if (type === 'sellers') return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#3b1515', color: '#f87171' }}>🔴 Seller's</span>
  if (type === 'buyers') return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#15303b', color: '#60b4f8' }}>🟢 Buyer's</span>
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#3b2e10', color: '#f0c060' }}>🟡 Balanced</span>
}

function Row({ label, val, sub, sparkData, badge }: {
  label: string; val: string; sub?: string; sparkData?: SparkEntry[]; badge?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{sub}</div>}
      </div>
      {badge && <div style={{ flexShrink: 0 }}>{badge}</div>}
      {sparkData && sparkData.length >= 2 && (
        <div style={{ flexShrink: 0 }}><Sparkline data={sparkData} /></div>
      )}
      <div style={{ fontSize: 12, fontWeight: 700, color: '#c9a84c', flexShrink: 0, textAlign: 'right', minWidth: 60 }}>{val}</div>
    </div>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#1a2540', borderRadius: 12, padding: '20px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}

interface Props {
  days?: number
  onDaysChange?: (d: number) => void
  onTrendsLoaded?: (data: TrendsData) => void
}

export default function ResidencityTrendPanels({ days = 60, onDaysChange, onTrendsLoaded }: Props) {
  const [trends, setTrends] = useState<TrendsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/residencity/trends?days=${days}`)
      .then(r => r.json())
      .then((data: TrendsData) => {
        setTrends(data)
        setLoading(false)
        if (onTrendsLoaded) onTrendsLoaded(data)
      })
      .catch(() => setLoading(false))
  }, [days, onTrendsLoaded])

  if (loading || !trends) {
    return (
      <div>
        <style>{`@keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
          <SkeletonPanel /><SkeletonPanel /><SkeletonPanel />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
          <SkeletonPanel /><SkeletonPanel />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <SkeletonPanel /><SkeletonPanel />
        </div>
      </div>
    )
  }

  const spark = (sub: string) => trends.sparklines?.[sub] ?? []

  return (
    <div>
      {/* Row 1: Activity & Speed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>

        <Panel title="Most Active Neighbourhoods" subtitle={`Top areas by sold count — last ${trends.days} days`}>
          {(trends.most_active ?? []).slice(0, 10).map((r, i) => (
            <Row key={i}
              label={r.subarea}
              sub={`${r.city} · avg ${fmtPrice(r.avg_price)} · ${fmtMortgage(r.avg_price)}`}
              val={`${r.sold_count} sold`}
              sparkData={spark(r.subarea)}
            />
          ))}
        </Panel>

        <Panel title="Speed of Market" subtitle="Fastest-selling areas by avg days on market">
          {(trends.speed_of_market ?? []).slice(0, 10).map((r, i) => (
            <Row key={i}
              label={r.subarea}
              sub={`${r.city} · ${r.sold_count} solds`}
              val={`${r.avg_dom}d DOM`}
              sparkData={spark(r.subarea)}
            />
          ))}
        </Panel>

        <Panel title="Price Per Sq Ft" subtitle="Top areas by avg $/sqft — last period">
          {(trends.price_per_sqft ?? []).slice(0, 10).map((r, i) => (
            <Row key={i}
              label={r.subarea}
              sub={`${r.city} · ${r.sold_count} solds`}
              val={`$${r.avg_ppsf}/sf`}
              sparkData={spark(r.subarea)}
            />
          ))}
        </Panel>

      </div>

      {/* Row 2: Price Movement */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>

        <Panel title="Biggest Price Gains ▲" subtitle={`Avg sold price increase vs prior ${trends.days}-day window (min 3 solds)`}>
          {(trends.price_gains ?? []).slice(0, 10).map((r, i) => (
            <Row key={i}
              label={r.subarea}
              sub={`${fmtPrice(r.prior_avg)} → ${fmtPrice(r.avg_price)} · ${fmtMortgage(r.avg_price)}`}
              val={`+${r.pct_change.toFixed(1)}%`}
              sparkData={spark(r.subarea)}
              badge={<span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#15301f', color: '#4ade80' }}>▲</span>}
            />
          ))}
          {(trends.price_gains ?? []).length === 0 && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', padding: '8px 0' }}>Insufficient data for this period</div>
          )}
        </Panel>

        <Panel title="Biggest Price Drops ▼" subtitle={`Avg sold price decrease vs prior ${trends.days}-day window (min 3 solds)`}>
          {(trends.price_drops ?? []).slice(0, 10).map((r, i) => (
            <Row key={i}
              label={r.subarea}
              sub={`${fmtPrice(r.prior_avg)} → ${fmtPrice(r.avg_price)} · ${fmtMortgage(r.avg_price)}`}
              val={`${r.pct_change.toFixed(1)}%`}
              sparkData={spark(r.subarea)}
              badge={<span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#3b0f0f', color: '#f87171' }}>▼</span>}
            />
          ))}
          {(trends.price_drops ?? []).length === 0 && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', padding: '8px 0' }}>Insufficient data for this period</div>
          )}
        </Panel>

      </div>

      {/* Row 3: Market Health */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>

        <Panel title="Sold-to-List Ratio" subtitle="Areas where sellers get closest to (or above) asking price">
          {(trends.sold_to_list ?? []).slice(0, 10).map((r, i) => (
            <Row key={i}
              label={r.subarea}
              sub={`${r.city} · ${r.sold_count} solds · ${r.avg_stl > 100 ? 'Overbid zone' : r.avg_stl < 97 ? 'Room to negotiate' : 'Near asking'}`}
              val={`${r.avg_stl.toFixed(1)}%`}
              sparkData={spark(r.subarea)}
            />
          ))}
        </Panel>

        <Panel title="Inventory Health" subtitle="Months of supply — lower = more competitive">
          {(trends.inventory_health ?? []).slice(0, 10).map((r, i) => (
            <Row key={i}
              label={r.subarea}
              sub={`${r.city} · ${r.active_count} active · ${r.monthly_sold.toFixed(1)} sold/mo`}
              val={`${r.months_supply}mo`}
              badge={marketPill(r.market_type)}
            />
          ))}
        </Panel>

      </div>
    </div>
  )
}

export type { TrendsData }
