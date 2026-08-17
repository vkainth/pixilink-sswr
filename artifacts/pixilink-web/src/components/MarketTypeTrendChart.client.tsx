'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

interface TrendRow {
  month: string
  sold: number
  avg_price: number
  avg_dom: number
  avg_ppsf?: number
}

interface Props {
  trend: TrendRow[]
}

function fmtAxisTick(month: string): string {
  const [y, m] = month.split('-')
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m, 10) - 1] ?? month
  return `${mon} '${y.slice(2)}`
}

function abbreviatePrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${v}`
}

interface TooltipPayload {
  value: number
  name?: string
  dataKey?: string
  color?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null
  const [y, m] = label.split('-')
  const names = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const monthFull = `${names[parseInt(m, 10) - 1] ?? label} ${y}`

  const soldEntry = payload.find(p => p.dataKey === 'sold')
  const priceEntry = payload.find(p => p.dataKey === 'avg_price')

  return (
    <div style={{
      background: 'rgba(20,33,61,0.97)', color: '#fff', borderRadius: 8,
      padding: '10px 14px', fontSize: 13, lineHeight: 1.6, minWidth: 150,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 11, color: 'rgba(255,255,255,0.85)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {monthFull}
      </div>
      {soldEntry != null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#94a3b8', display: 'inline-block' }} />
            Units Sold
          </span>
          <span style={{ fontWeight: 800 }}>{soldEntry.value}</span>
        </div>
      )}
      {priceEntry != null && priceEntry.value > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#c9a84c', display: 'inline-block' }} />
            Avg Price
          </span>
          <span style={{ fontWeight: 800 }}>{abbreviatePrice(priceEntry.value)}</span>
        </div>
      )}
    </div>
  )
}

export default function MarketTypeTrendChart({ trend }: Props) {
  if (!trend.length) return null

  const chartData = [...trend].sort((a, b) => a.month.localeCompare(b.month))

  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 20px 12px', marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
        Sales Volume &amp; Avg Sold Price — up to 24 months
      </div>
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <div style={{ minWidth: 300 }}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={fmtAxisTick}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={28}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={abbreviatePrice}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Legend
                verticalAlign="top"
                align="right"
                height={24}
                iconType="plainline"
                wrapperStyle={{ fontSize: 11 }}
              />
              <Bar
                yAxisId="left"
                dataKey="sold"
                name="Units Sold"
                fill="#94a3b8"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="linear"
                dataKey="avg_price"
                name="Avg Sold Price"
                stroke="#c9a84c"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#c9a84c', stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
        MLS® data · sold properties
      </div>
    </div>
  )
}
