'use client'

import { useState } from 'react'
import type { MonthlyTrendPoint, MonthlyTypePricePoint } from '@/lib/types'
import { formatPriceFull } from '@/lib/types'
import { monthLabel } from '@/lib/market'

type TypeFilter = 'all' | 'apartment' | 'townhouse' | 'house'

const TYPE_LABELS: Record<TypeFilter, string> = {
  all: 'All',
  apartment: 'Condos',
  townhouse: 'Townhouses',
  house: 'Houses',
}

const th: React.CSSProperties = {
  textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', padding: '11px 14px', whiteSpace: 'nowrap',
  background: 'var(--off-white)', position: 'sticky', top: 0, zIndex: 2,
}
const td: React.CSSProperties = { fontSize: 13, color: 'var(--text)', padding: '12px 14px', whiteSpace: 'nowrap' }
const captionStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-muted)', textAlign: 'left',
  padding: '10px 14px 8px', fontStyle: 'italic', captionSide: 'top',
}

const LIMIT = 24

interface Props {
  monthly_trend: MonthlyTrendPoint[]
  monthly_trend_by_type: MonthlyTypePricePoint[]
  monthKey: string
  slug: string
  agentPrefix?: string
  areaLabel: string
  labelFull: string
}

function buildMonthPath(prefix: string, month: string): string {
  const [y, mo] = month.split('-')
  return `${prefix}/market-report/${y}/${mo}`
}

export default function TrendTableClient({
  monthly_trend,
  monthly_trend_by_type,
  monthKey,
  slug,
  agentPrefix,
  areaLabel,
  labelFull,
}: Props) {
  const prefix = agentPrefix ?? `/agent/${slug}`
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const combinedRows = [...monthly_trend].reverse().slice(0, LIMIT)
  const typeRows = [...monthly_trend_by_type]
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, LIMIT)

  const headingLabel =
    typeFilter === 'all'
      ? '24-Month Trend'
      : `24-Month Trend — ${TYPE_LABELS[typeFilter]}`

  return (
    <section style={{ marginTop: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', margin: 0 }}>
          {headingLabel}
        </h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['all', 'apartment', 'townhouse', 'house'] as TypeFilter[]).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 14px',
                borderRadius: 20,
                border: `1px solid ${typeFilter === t ? 'var(--accent)' : 'var(--border)'}`,
                background: typeFilter === t ? 'var(--accent)' : '#fff',
                color: typeFilter === t ? 'var(--primary-bg)' : 'var(--text)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 560, border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <caption style={captionStyle}>
            {areaLabel} 24-month real estate market trend
            {typeFilter !== 'all' ? ` — ${TYPE_LABELS[typeFilter]}` : ''} — homes sold,
            average sold price, days on market, and price per square foot. Data through {labelFull}.
          </caption>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={th}>Month</th>
              <th style={th}>Sold</th>
              <th style={th}>Avg Price</th>
              <th style={th}>Avg DOM</th>
              <th style={th}>Avg $/sqft</th>
            </tr>
          </thead>
          <tbody>
            {typeFilter === 'all'
              ? combinedRows.map(p => (
                  <tr
                    key={p.month}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: p.month === monthKey ? 'rgba(var(--accent-rgb),0.06)' : undefined,
                    }}
                  >
                    <td style={{ ...td, fontWeight: p.month === monthKey ? 800 : 600 }}>
                      <a
                        href={buildMonthPath(prefix, p.month)}
                        style={{ color: p.month === monthKey ? 'var(--accent)' : 'var(--text)', textDecoration: 'none' }}
                      >
                        {monthLabel(p.month)}
                      </a>
                    </td>
                    <td style={td}>{p.sold.toLocaleString()}</td>
                    <td style={td}>{formatPriceFull(p.avg_price)}</td>
                    <td style={td}>{p.avg_dom}d</td>
                    <td style={td}>{p.avg_ppsf ? `$${Math.round(p.avg_ppsf).toLocaleString('en-CA')}` : '—'}</td>
                  </tr>
                ))
              : typeRows.map(p => {
                  const k = typeFilter
                  const price = p[k as keyof MonthlyTypePricePoint] as number | null
                  const sold = p[`${k}_sold` as keyof MonthlyTypePricePoint] as number | null
                  const dom = p[`${k}_dom` as keyof MonthlyTypePricePoint] as number | null
                  const ppsf = p[`${k}_ppsf` as keyof MonthlyTypePricePoint] as number | null
                  return (
                    <tr
                      key={p.month}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: p.month === monthKey ? 'rgba(var(--accent-rgb),0.06)' : undefined,
                      }}
                    >
                      <td style={{ ...td, fontWeight: p.month === monthKey ? 800 : 600 }}>
                        <a
                          href={buildMonthPath(prefix, p.month)}
                          style={{ color: p.month === monthKey ? 'var(--accent)' : 'var(--text)', textDecoration: 'none' }}
                        >
                          {monthLabel(p.month)}
                        </a>
                      </td>
                      <td style={td}>{sold != null ? sold.toLocaleString() : '—'}</td>
                      <td style={td}>{price != null ? formatPriceFull(price) : '—'}</td>
                      <td style={td}>{dom != null ? `${dom}d` : '—'}</td>
                      <td style={td}>{ppsf != null ? `$${Math.round(ppsf).toLocaleString('en-CA')}` : '—'}</td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
