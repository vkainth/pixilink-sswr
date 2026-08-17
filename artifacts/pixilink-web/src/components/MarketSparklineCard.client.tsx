'use client'

import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import type { MonthlyTrendPoint } from '@/lib/types'

interface Props {
  trend: MonthlyTrendPoint[]
  accentColor?: string
}

function abbreviatePrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${v}`
}

function fmtMonthShort(month: string): string {
  const [, m] = month.split('-')
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m, 10) - 1] ?? month
}

interface SparkTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function SparkTooltip({ active, payload, label }: SparkTooltipProps) {
  if (!active || !payload?.length || !label) return null
  return (
    <div style={{
      background: 'rgba(20,33,61,0.95)', color: '#fff', borderRadius: 6,
      padding: '6px 10px', fontSize: 12, lineHeight: 1.4,
      boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 800 }}>{abbreviatePrice(payload[0].value)}</div>
    </div>
  )
}

export default function MarketSparklineCard({ trend, accentColor = '#c9a84c' }: Props) {
  if (!trend.length) return null

  const last6 = trend.slice(-6)
  const chartData = last6.map(p => ({
    month: fmtMonthShort(p.month),
    price: p.avg_price,
  }))

  const latestPrice = last6[last6.length - 1]?.avg_price ?? 0
  const prevPrice = last6[last6.length - 2]?.avg_price ?? 0

  let arrow = '→'
  let arrowColor = '#9ca3af'
  if (latestPrice > prevPrice * 1.002) {
    arrow = '↑'
    arrowColor = '#16a34a'
  } else if (latestPrice < prevPrice * 0.998) {
    arrow = '↓'
    arrowColor = '#dc2626'
  }

  const gradId = 'sparkGrad'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary-bg)', lineHeight: 1 }}>
          {abbreviatePrice(latestPrice)}
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, color: arrowColor, lineHeight: 1 }}>
          {arrow}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
          avg price · last month
        </span>
      </div>

      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 4 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={accentColor} stopOpacity={0.35} />
                <stop offset="95%" stopColor={accentColor} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <Tooltip content={<SparkTooltip />} cursor={{ stroke: accentColor, strokeWidth: 1, strokeDasharray: '3 3' }} />
            <Area
              type="monotone"
              dataKey="price"
              stroke={accentColor}
              strokeWidth={2.5}
              fill={`url(#${gradId})`}
              dot={(props) => {
                const isLast = props.index === chartData.length - 1
                if (!isLast) return <g key={props.key} />
                return (
                  <circle
                    key={props.key}
                    cx={props.cx}
                    cy={props.cy}
                    r={5}
                    fill={accentColor}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )
              }}
              activeDot={{ r: 4, fill: accentColor, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
        <span>{chartData[0]?.month}</span>
        <span>6-month avg price trend · MLS®</span>
        <span>{chartData[chartData.length - 1]?.month}</span>
      </div>
    </div>
  )
}
