'use client'
import { useState, useEffect, useRef } from 'react'
import type { TrendsData } from './ResidencityTrendPanels.client'

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
  return `$${(p / 1000).toFixed(0)}K`
}

interface AreaResult {
  subarea: string
  city: string
  sold_count: number
  avg_price: number
  avg_dom: number
  avg_stl: number
  market_type: string
}

function resolveArea(trends: TrendsData, query: string): AreaResult | null {
  const q = query.toLowerCase().trim()
  if (!q || q.length < 2) return null

  const active = trends.most_active ?? []
  const speed = trends.speed_of_market ?? []
  const stl = trends.sold_to_list ?? []

  const matches = active.filter(r =>
    r.subarea.toLowerCase().includes(q) || r.city.toLowerCase().includes(q)
  )
  if (!matches.length) return null

  const best = matches[0]
  const domRow = speed.find(r => r.subarea === best.subarea)
  const stlRow = stl.find(r => r.subarea === best.subarea)
  const invRow = (trends.inventory_health ?? []).find(r => r.subarea === best.subarea)

  return {
    subarea: best.subarea,
    city: best.city,
    sold_count: best.sold_count,
    avg_price: best.avg_price,
    avg_dom: domRow?.avg_dom ?? 0,
    avg_stl: stlRow?.avg_stl ?? 0,
    market_type: invRow?.market_type ?? 'balanced',
  }
}

function marketPillLabel(type: string): { label: string; color: string; bg: string } {
  if (type === 'sellers') return { label: "🔴 Seller's Market", color: '#f87171', bg: '#3b1515' }
  if (type === 'buyers') return { label: "🟢 Buyer's Market", color: '#60b4f8', bg: '#15303b' }
  return { label: "🟡 Balanced Market", color: '#f0c060', bg: '#3b2e10' }
}

interface Props {
  trends: TrendsData | null
  days?: number
}

export default function ResidencityAreaSearch({ trends, days = 60 }: Props) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<AreaResult | null>(null)
  const [printMode, setPrintMode] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!trends) return
      setResult(query.length >= 2 ? resolveArea(trends, query) : null)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, trends])

  const pill = result ? marketPillLabel(result.market_type) : null
  const monthly = result ? calcMonthly(result.avg_price) : 0

  return (
    <div>
      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <div style={{
          position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
          color: 'rgba(255,255,255,0.35)', fontSize: 18, pointerEvents: 'none',
        }}>🔍</div>
        <input
          type="text"
          placeholder="Search any neighbourhood or city (e.g. Cloverdale, Burnaby Heights, Whalley)…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#1a2540', border: '1.5px solid rgba(255,255,255,0.15)',
            borderRadius: 12, padding: '14px 20px 14px 48px',
            fontSize: 14, color: '#fff', outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResult(null) }}
            style={{
              position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 18, padding: 0,
            }}>×</button>
        )}
      </div>

      {/* Result card */}
      {result && (
        <div id="area-search-result" style={{
          background: '#1a2540', borderRadius: 12, border: '1px solid rgba(201,168,76,0.3)',
          padding: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{result.subarea}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{result.city} · Last {days} days</div>
            </div>
            {pill && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, background: pill.bg, color: pill.color }}>
                {pill.label}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: `Solds (${days}d)`, value: String(result.sold_count) },
              { label: 'Avg Sold Price', value: fmtPrice(result.avg_price) },
              { label: 'Avg Days on Market', value: result.avg_dom > 0 ? `${result.avg_dom}d` : '—' },
              { label: 'Sold-to-List', value: result.avg_stl > 0 ? `${result.avg_stl.toFixed(1)}%` : '—' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#c9a84c', lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {monthly > 0 && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
              Est. mortgage on avg price: <strong style={{ color: 'rgba(255,255,255,0.8)' }}>~${monthly.toLocaleString()}/mo</strong> (20% down, 25yr, {(ANNUAL_RATE * 100).toFixed(2)}%)
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setPrintMode(true); setTimeout(() => { window.print(); setPrintMode(false) }, 200) }}
              style={{
                fontSize: 12, fontWeight: 600, padding: '9px 18px', borderRadius: 8,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
              }}>
              Print this area report ↓
            </button>
          </div>
        </div>
      )}

      {query.length >= 2 && !result && (
        <div style={{ padding: '16px 20px', background: '#1a2540', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          No data found for "{query}" — try a different neighbourhood or city name.
        </div>
      )}

      {/* Print-only styles — visibility trick: child visible overrides parent hidden */}
      {printMode && (
        <style>{`
          @media print {
            body { visibility: hidden !important; }
            #area-search-result,
            #area-search-result * { visibility: visible !important; }
            #area-search-result {
              position: fixed !important;
              top: 20px !important;
              left: 20px !important;
              right: 20px !important;
              background: #fff !important;
              color: #111 !important;
              padding: 24px !important;
              border-radius: 0 !important;
              border: none !important;
            }
            #area-search-result h2,
            #area-search-result [style*="color: #c9a84c"] { color: #14213d !important; }
            #area-search-result [style*="rgba(255,255,255,0.05)"] { background: #f5f5f5 !important; }
            #area-search-result button { display: none !important; }
          }
        `}</style>
      )}
    </div>
  )
}
