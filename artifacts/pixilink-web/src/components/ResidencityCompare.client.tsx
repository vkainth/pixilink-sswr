'use client'
import { useState, useMemo, useCallback } from 'react'
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
  return `$${Math.round(p / 1000)}K`
}

function marketLabel(type: string): string {
  if (type === 'sellers') return "🔴 Seller's"
  if (type === 'buyers') return "🟢 Buyer's"
  return "🟡 Balanced"
}

interface AreaStats {
  subarea: string
  city: string
  sold_count: number
  avg_price: number
  avg_dom: number
  avg_stl: number
  avg_ppsf: number
  months_supply: number
  market_type: string
}

function buildAreaStats(trends: TrendsData, subarea: string): AreaStats | null {
  const active = (trends.most_active ?? []).find(r => r.subarea === subarea)
  if (!active) return null
  const speed = (trends.speed_of_market ?? []).find(r => r.subarea === subarea)
  const stl = (trends.sold_to_list ?? []).find(r => r.subarea === subarea)
  const ppsf = (trends.price_per_sqft ?? []).find(r => r.subarea === subarea)
  const inv = (trends.inventory_health ?? []).find(r => r.subarea === subarea)
  return {
    subarea,
    city: active.city,
    sold_count: active.sold_count,
    avg_price: active.avg_price,
    avg_dom: speed?.avg_dom ?? 0,
    avg_stl: stl?.avg_stl ?? 0,
    avg_ppsf: ppsf?.avg_ppsf ?? 0,
    months_supply: inv?.months_supply ?? 0,
    market_type: inv?.market_type ?? 'balanced',
  }
}

interface Props {
  trends: TrendsData | null
  days?: number
}

export default function ResidencityCompare({ trends, days = 60 }: Props) {
  const [open, setOpen] = useState(false)
  const [areaA, setAreaA] = useState('')
  const [areaB, setAreaB] = useState('')
  const [printMode, setPrintMode] = useState(false)

  const handlePrint = useCallback(() => {
    setPrintMode(true)
    setTimeout(() => { window.print(); setPrintMode(false) }, 200)
  }, [])

  const subareas = useMemo(() => {
    if (!trends) return []
    return [...new Set((trends.most_active ?? []).map(r => r.subarea))].sort()
  }, [trends])

  const statsA = useMemo(() => areaA && trends ? buildAreaStats(trends, areaA) : null, [areaA, trends])
  const statsB = useMemo(() => areaB && trends ? buildAreaStats(trends, areaB) : null, [areaB, trends])

  const rows = [
    { label: `Solds (${days}d)`, a: statsA?.sold_count ? String(statsA.sold_count) : '—', b: statsB?.sold_count ? String(statsB.sold_count) : '—' },
    { label: 'Avg Sold Price', a: fmtPrice(statsA?.avg_price ?? 0), b: fmtPrice(statsB?.avg_price ?? 0) },
    { label: 'Est. Monthly (20% dn)', a: statsA?.avg_price ? `~$${calcMonthly(statsA.avg_price).toLocaleString()}/mo` : '—', b: statsB?.avg_price ? `~$${calcMonthly(statsB.avg_price).toLocaleString()}/mo` : '—' },
    { label: 'Avg $/sqft', a: statsA?.avg_ppsf ? `$${statsA.avg_ppsf}` : '—', b: statsB?.avg_ppsf ? `$${statsB.avg_ppsf}` : '—' },
    { label: 'Avg Days on Market', a: statsA?.avg_dom ? `${statsA.avg_dom}d` : '—', b: statsB?.avg_dom ? `${statsB.avg_dom}d` : '—' },
    { label: 'Sold-to-List Ratio', a: statsA?.avg_stl ? `${statsA.avg_stl.toFixed(1)}%` : '—', b: statsB?.avg_stl ? `${statsB.avg_stl.toFixed(1)}%` : '—' },
    { label: 'Market Type', a: statsA ? marketLabel(statsA.market_type) : '—', b: statsB ? marketLabel(statsB.market_type) : '—' },
    { label: 'Months of Supply', a: statsA?.months_supply ? `${statsA.months_supply}mo` : '—', b: statsB?.months_supply ? `${statsB.months_supply}mo` : '—' },
  ]

  const selectStyle: React.CSSProperties = {
    flex: 1, background: '#1a2540', border: '1.5px solid rgba(255,255,255,0.15)',
    borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fff',
    fontFamily: 'inherit', outline: 'none', cursor: 'pointer', minWidth: 0,
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          fontSize: 13, fontWeight: 700, padding: '10px 22px', borderRadius: 10,
          background: open ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${open ? '#c9a84c' : 'rgba(255,255,255,0.15)'}`,
          color: open ? '#c9a84c' : 'rgba(255,255,255,0.8)',
          cursor: 'pointer', transition: 'all 0.15s',
        }}>
        ⇌ Compare Areas {open ? '▲' : '▼'}
      </button>

      {open && (
        <div id="compare-panel" style={{ marginTop: 16, background: '#1a2540', borderRadius: 14, border: '1px solid rgba(201,168,76,0.2)', padding: 24 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <select value={areaA} onChange={e => setAreaA(e.target.value)} style={selectStyle}>
              <option value="">Select Area A…</option>
              {subareas.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>vs</div>
            <select value={areaB} onChange={e => setAreaB(e.target.value)} style={selectStyle}>
              <option value="">Select Area B…</option>
              {subareas.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {(areaA && areaB) ? (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Metric</th>
                      <th style={{ textAlign: 'center', padding: '10px 12px', color: '#c9a84c', fontSize: 13, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{areaA}</th>
                      <th style={{ textAlign: 'center', padding: '10px 12px', color: '#60b4f8', fontSize: 13, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{areaB}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.label}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#c9a84c', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.a}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#60b4f8', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 16 }}>
                <button
                  onClick={handlePrint}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                  }}>
                  Print comparison ↓
                </button>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '24px 0' }}>
              Select two areas above to compare them side-by-side.
            </div>
          )}
        </div>
      )}

      {/* Compare-only print scoping — visibility trick so only the comparison table renders */}
      {printMode && (
        <style>{`
          @media print {
            body { visibility: hidden !important; }
            #compare-panel,
            #compare-panel * { visibility: visible !important; }
            #compare-panel {
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
            #compare-panel th { color: #14213d !important; border-color: #ccc !important; }
            #compare-panel td { color: #333 !important; border-color: #eee !important; }
            #compare-panel button { display: none !important; }
            #compare-panel select { display: none !important; }
          }
        `}</style>
      )}
    </div>
  )
}
