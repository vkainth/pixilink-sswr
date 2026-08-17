'use client'

import { useState } from 'react'
import type { MarketReport } from '@/lib/types'
import { formatPriceFull } from '@/lib/types'

export interface NeighbourhoodRow {
  name: string
  slug: string
  subareaParam: string
  report: MarketReport
}

interface Props {
  rows: NeighbourhoodRow[]
  agentPath: string
}

type SortKey = 'name' | 'sold' | 'avgSold' | 'dom' | 'absorption'

function AbsorptionPill({ months }: { months: number }) {
  const s =
    months < 4
      ? { bg: '#dcfce7', color: '#15803d', label: "Seller's" }
      : months <= 6
      ? { bg: '#fef9c3', color: '#b45309', label: 'Balanced' }
      : { bg: '#fee2e2', color: '#dc2626', label: "Buyer's" }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{months.toFixed(1)} mo</span>
      <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
        {s.label}
      </span>
    </span>
  )
}

const thBase: React.CSSProperties = {
  padding: '11px 14px',
  textAlign: 'left',
  fontSize: 10.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  userSelect: 'none',
}
const tdBase: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text)',
  padding: '13px 14px',
  whiteSpace: 'nowrap',
}

export default function NeighbourhoodBreakdownTable({ rows, agentPath }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('absorption')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : key === 'absorption' || key === 'dom' ? 'asc' : 'desc')
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const ao = a.report.overall
    const bo = b.report.overall
    let av: number | string, bv: number | string
    if (sortKey === 'name') { av = a.name; bv = b.name }
    else if (sortKey === 'sold') { av = ao.sold_30d; bv = bo.sold_30d }
    else if (sortKey === 'avgSold') { av = ao.avg_sold_price; bv = bo.avg_sold_price }
    else if (sortKey === 'dom') { av = ao.avg_dom; bv = bo.avg_dom }
    else { av = ao.absorption_rate; bv = bo.absorption_rate }
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return <span style={{ opacity: 0.3, fontSize: 10 }}>⇅</span>
    return <span style={{ fontSize: 10, color: 'var(--accent)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  function Th({ col, label }: { col: SortKey; label: string }) {
    return (
      <th
        onClick={() => toggleSort(col)}
        style={{
          ...thBase,
          color: sortKey === col ? 'var(--accent)' : 'var(--text-muted)',
        }}
      >
        {label} <SortIcon col={col} />
      </th>
    )
  }

  if (!rows.length) return null

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--off-white)' }}>
            <Th col="name" label="Neighbourhood" />
            <Th col="sold" label="Sold (30d)" />
            <Th col="avgSold" label="Avg Sold" />
            <Th col="dom" label="Avg DOM" />
            <Th col="absorption" label="Absorption" />
            <th style={{ ...thBase, color: 'var(--text-muted)', cursor: 'default' }}>Market</th>
            <th style={{ ...thBase, color: 'var(--text-muted)', cursor: 'default' }}>Homes</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const o = row.report.overall
            const marketLabel =
              o.market_type === 'strong-sellers' ? "Strong Seller's"
              : o.market_type === 'sellers' ? "Seller's"
              : o.market_type === 'buyers' ? "Buyer's"
              : 'Balanced'
            const marketBg =
              o.market_type === 'strong-sellers' ? '#fde2dd'
              : o.market_type === 'sellers' ? '#fde9c8'
              : o.market_type === 'buyers' ? '#dbeafe'
              : '#e5e7eb'
            const marketColor =
              o.market_type === 'strong-sellers' ? '#c0341a'
              : o.market_type === 'sellers' ? '#b45309'
              : o.market_type === 'buyers' ? '#1d4ed8'
              : '#374151'
            return (
              <tr key={row.slug} style={{ borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ ...tdBase, fontWeight: 700 }}>
                  <a
                    href={`${agentPath}/market?tab=overview&subarea=${encodeURIComponent(row.subareaParam)}`}
                    style={{ color: 'var(--accent)', textDecoration: 'none' }}
                  >
                    {row.name}
                  </a>
                  <a
                    href={`${agentPath}/neighbourhood/${row.slug}`}
                    style={{ display: 'block', fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', textDecoration: 'none', marginTop: 2 }}
                  >
                    Guide ↗
                  </a>
                </td>
                <td style={tdBase}>{o.sold_30d.toLocaleString()}</td>
                <td style={{ ...tdBase, fontWeight: 700 }}>{formatPriceFull(o.avg_sold_price)}</td>
                <td style={tdBase}>{o.avg_dom}d</td>
                <td style={tdBase}>
                  <AbsorptionPill months={o.absorption_rate} />
                </td>
                <td style={tdBase}>
                  <span style={{ background: marketBg, color: marketColor, padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                    {marketLabel}
                  </span>
                </td>
                <td style={tdBase}>
                  <a href={`${agentPath}/homes-for-sale?subarea=${encodeURIComponent(row.subareaParam)}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>Browse →</a>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
