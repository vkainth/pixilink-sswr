'use client'
import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { TrendsData } from './ResidencityTrendPanels.client'

const TrendPanelsDyn = dynamic(() => import('./ResidencityTrendPanels.client'), { ssr: false })
const AreaSearchDyn  = dynamic(() => import('./ResidencityAreaSearch.client'),  { ssr: false })
const CompareDyn     = dynamic(() => import('./ResidencityCompare.client'),     { ssr: false })

export default function ResidencityDashboardOrchestrator() {
  const [trends, setTrends] = useState<TrendsData | null>(null)
  const [days, setDays] = useState(60)

  const handleTrendsLoaded = useCallback((data: TrendsData) => {
    setTrends(data)
  }, [])

  return (
    <div>
      {/* Area Search (uses loaded trends) */}
      <AreaSearchDyn trends={trends} days={days} />

      {/* Compare (uses loaded trends) */}
      <div style={{ marginTop: 32 }}>
        <CompareDyn trends={trends} days={days} />
      </div>

      {/* Market Intelligence Panels */}
      <div style={{ marginTop: 0 }}>
        <div id="market-panels">
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              Showing data for the last <strong style={{ color: '#c9a84c' }}>{days} days</strong> · Updates hourly
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {([60, 90, 120] as const).map(d => (
                <button key={d} onClick={() => setDays(d)}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20,
                    cursor: 'pointer',
                    border: `1.5px solid ${days === d ? '#c9a84c' : 'rgba(255,255,255,0.15)'}`,
                    background: days === d ? '#c9a84c' : 'transparent',
                    color: days === d ? '#14213d' : 'rgba(255,255,255,0.6)',
                    transition: 'all 0.15s',
                  }}>
                  {d}d
                </button>
              ))}
              <button onClick={() => window.print()}
                style={{
                  fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20,
                  cursor: 'pointer',
                  border: '1.5px solid rgba(255,255,255,0.15)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.5)',
                }}>
                Print Report ↓
              </button>
            </div>
          </div>

          <TrendPanelsDyn days={days} onTrendsLoaded={handleTrendsLoaded} />
        </div>
      </div>
    </div>
  )
}
