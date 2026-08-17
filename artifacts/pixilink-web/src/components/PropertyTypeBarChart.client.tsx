'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList, Cell,
} from 'recharts'
import type { MarketReportTypeRow } from '@/lib/types'
import { marketBadge } from '@/lib/market'

interface Props {
  byType: MarketReportTypeRow[]
  accentColor?: string
}

type Metric = 'price' | 'dom' | 'volume'

function abbreviatePrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${v}`
}

function marketCondition(row: MarketReportTypeRow): string {
  if (row.active > 0 && row.sold_30d > 0) {
    const mo = row.active / row.sold_30d
    if (mo < 4) return "Seller's"
    if (mo <= 6) return 'Balanced'
    return "Buyer's"
  }
  const b = marketBadge(row.market_type)
  const t = row.market_type
  if (t === 'strong-sellers' || t === 'sellers') return "Seller's"
  if (t === 'buyers') return "Buyer's"
  return b.label
}

const METRICS: { key: Metric; label: string }[] = [
  { key: 'price', label: 'Avg Sold Price' },
  { key: 'dom', label: 'Days on Market' },
  { key: 'volume', label: 'Sales Volume' },
]

const COLORS = ['#c9a84c', '#14213d', '#6b7280', '#9ca3af']

interface TooltipPayloadEntry {
  value: number
  payload?: { type: string }
}
interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  metric: Metric
}

function CustomTooltip({ active, payload, label, metric }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value ?? 0
  let display = String(val)
  if (metric === 'price') display = abbreviatePrice(val)
  else if (metric === 'dom') display = `${val} days avg`
  else display = `${val} homes sold`

  return (
    <div style={{
      background: 'rgba(20,33,61,0.97)', color: '#fff', borderRadius: 8,
      padding: '10px 14px', fontSize: 13, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 15 }}>{display}</div>
    </div>
  )
}

export default function PropertyTypeBarChart({ byType, accentColor = '#c9a84c' }: Props) {
  const [metric, setMetric] = useState<Metric>('price')

  if (!byType.length) return null

  const chartData = byType.map((row, i) => ({
    type: row.type,
    price: row.avg_sold_price,
    dom: row.avg_dom,
    volume: row.sold_30d,
    condition: marketCondition(row),
    color: COLORS[i] ?? accentColor,
  }))

  function labelFormatter(v: number): string {
    if (metric === 'price') return abbreviatePrice(v)
    if (metric === 'dom') return `${v}d`
    return String(v)
  }

  const conditionColors: Record<string, { bg: string; color: string }> = {
    "Seller's": { bg: '#fde9c8', color: '#b45309' },
    'Balanced': { bg: '#e5e7eb', color: '#374151' },
    "Buyer's": { bg: '#dbeafe', color: '#1d4ed8' },
  }

  return (
    <section style={{ marginTop: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-bg)', margin: 0 }}>
            Last 30 Days — By Property Type
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Sold properties only
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: metric === m.key ? 700 : 500,
                color: metric === m.key ? '#fff' : 'var(--text-muted)',
                background: metric === m.key ? 'var(--primary-bg)' : 'transparent',
                border: metric === m.key ? '1.5px solid var(--primary-bg)' : '1.5px solid var(--border)',
                borderRadius: 20,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
        <ResponsiveContainer width="100%" height={Math.max(160, byType.length * 60)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 80, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="type"
              tick={{ fontSize: 13, fontWeight: 600, fill: 'var(--text)' }}
              tickLine={false}
              axisLine={false}
              width={96}
            />
            <Tooltip
              content={<CustomTooltip metric={metric} />}
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            />
            <Bar dataKey={metric} radius={[0, 4, 4, 0]} animationDuration={700}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={i === 0 ? accentColor : COLORS[i] ?? '#9ca3af'} />
              ))}
              <LabelList
                dataKey={metric}
                position="right"
                formatter={(v: unknown) => labelFormatter(Number(v))}
                style={{ fontSize: 13, fontWeight: 800, fill: 'var(--primary-bg)' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Market condition badges per type */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          {chartData.map((row) => {
            const cs = conditionColors[row.condition] ?? conditionColors['Balanced']
            return (
              <div key={row.type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{row.type}:</span>
                <span style={{ background: cs.bg, color: cs.color, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                  {row.condition} Market
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
