'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList, Cell,
} from 'recharts'
import type { NeighbourhoodRow } from '@/components/NeighbourhoodBreakdownTable.client'

interface Props {
  rows: NeighbourhoodRow[]
  agentPath: string
  accentColor?: string
}

function abbreviatePrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${v}`
}

interface TooltipPayloadEntry {
  value: number
  payload?: { name: string; sold: number }
}
interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value ?? 0
  const name = payload[0]?.payload?.name ?? ''
  const sold = payload[0]?.payload?.sold ?? 0

  return (
    <div style={{
      background: 'rgba(20,33,61,0.97)', color: '#fff', borderRadius: 8,
      padding: '10px 14px', fontSize: 13, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{name}</div>
      <div style={{ fontWeight: 800, fontSize: 15 }}>{abbreviatePrice(val)}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{sold} sold last 30d</div>
    </div>
  )
}

export default function NeighbourhoodBarChart({ rows, agentPath, accentColor = '#c9a84c' }: Props) {
  if (!rows.length) return null

  const chartData = [...rows]
    .filter(r => r.report.overall.avg_sold_price > 0)
    .sort((a, b) => b.report.overall.avg_sold_price - a.report.overall.avg_sold_price)
    .map((row, i) => ({
      name: row.name,
      avgPrice: row.report.overall.avg_sold_price,
      sold: row.report.overall.sold_30d,
      slug: row.slug,
      subareaParam: row.subareaParam,
      rank: i,
    }))

  if (!chartData.length) return null

  return (
    <section style={{ marginTop: 44 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-bg)', margin: 0 }}>
            Average Sold Price by Neighbourhood
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Last 30 days · sorted high to low
          </p>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click bar to drill down</span>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', overflowX: 'auto' }}>
        <div style={{ minWidth: 320 }}>
          <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 48)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 96, left: 0, bottom: 4 }}
              onClick={(data: Record<string, unknown>) => {
                const ap = (data?.activePayload as Array<{ payload: { subareaParam?: string } }>)?.[0]?.payload
                if (ap?.subareaParam) {
                  window.location.href = `${agentPath}/market?tab=overview&subarea=${encodeURIComponent(ap.subareaParam)}`
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--text)' }}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="avgPrice" radius={[0, 4, 4, 0]} animationDuration={700}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? accentColor : `${accentColor}${Math.round(255 * (1 - i * 0.12)).toString(16).padStart(2, '0')}`} />
                ))}
                <LabelList
                  dataKey="avgPrice"
                  position="right"
                  formatter={(v: unknown) => abbreviatePrice(Number(v))}
                  style={{ fontSize: 13, fontWeight: 800, fill: 'var(--primary-bg)' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {chartData.map(row => (
          <a
            key={row.slug}
            href={`${agentPath}/market?tab=overview&subarea=${encodeURIComponent(row.subareaParam)}`}
            style={{
              fontSize: 12, fontWeight: 600, color: 'var(--accent)',
              textDecoration: 'none', padding: '4px 12px',
              background: 'var(--off-white)',
              border: '1px solid var(--border)',
              borderRadius: 20, whiteSpace: 'nowrap',
            }}
          >
            {row.name} · {row.sold} sold →
          </a>
        ))}
      </div>
    </section>
  )
}
