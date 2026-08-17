'use client'

import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import type { MonthlyTrendPoint } from '@/lib/types'

interface Props {
  trend: MonthlyTrendPoint[]
}

function shortMonth(m: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(m)
  if (match) {
    const d = new Date(Number(match[1]), Number(match[2]) - 1, 1)
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-CA', { month: 'short', year: '2-digit' })
  }
  return m
}

function fmtAxisPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`
  return `$${v}`
}

function fmtExactPrice(v: number): string {
  return `$${Math.round(v).toLocaleString('en-CA')}`
}

const ACCENT = '#111111'

const chartCard: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '18px 20px',
}

interface TooltipPayload {
  name?: string
  value?: number
  color?: string
}

interface TooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}

function TooltipWrap({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      {label && <div style={{ fontWeight: 700, marginBottom: 4, color: ACCENT }}>{label}</div>}
      {children}
    </div>
  )
}

function PriceTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <TooltipWrap label={label}>
      {payload.map((p, i) => (
        <div key={i} style={{ color: ACCENT }}>{fmtExactPrice(p.value ?? 0)}</div>
      ))}
    </TooltipWrap>
  )
}

function CountTooltip({ active, payload, label, suffix = '' }: TooltipProps & { suffix?: string }) {
  if (!active || !payload?.length) return null
  return (
    <TooltipWrap label={label}>
      {payload.map((p, i) => (
        <div key={i} style={{ color: ACCENT }}>{(p.value ?? 0).toLocaleString('en-CA')}{suffix}</div>
      ))}
    </TooltipWrap>
  )
}

function PctTooltip({ active, payload, label, suffix = '%' }: TooltipProps & { suffix?: string }) {
  if (!active || !payload?.length) return null
  return (
    <TooltipWrap label={label}>
      {payload.map((p, i) => (
        <div key={i} style={{ color: ACCENT }}>{(p.value ?? 0).toFixed(1)}{suffix}</div>
      ))}
    </TooltipWrap>
  )
}

function PpsqftTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <TooltipWrap label={label}>
      {payload.map((p, i) => (
        <div key={i} style={{ color: '#3b82f6' }}>${Math.round(p.value ?? 0).toLocaleString('en-CA')}/sqft</div>
      ))}
    </TooltipWrap>
  )
}

type MetricKey = 'avg_price' | 'sold' | 'avg_dom' | 'avg_ppsf' | 'sale_to_list' | 'active' | 'absorption'

interface MetricDef {
  key: MetricKey
  label: string
  chartType: 'line' | 'bar'
  color: string
  dataKey: string
  tooltipComp: React.ComponentType<TooltipProps & { suffix?: string }>
  tooltipSuffix?: string
  axisFormatter?: (v: number) => string
}

const METRIC_DEFS: MetricDef[] = [
  {
    key: 'avg_price',
    label: 'Avg Sold Price',
    chartType: 'line',
    color: ACCENT,
    dataKey: 'avg_price',
    tooltipComp: PriceTooltip,
    axisFormatter: fmtAxisPrice,
  },
  {
    key: 'sold',
    label: 'Homes Sold',
    chartType: 'bar',
    color: ACCENT,
    dataKey: 'sold',
    tooltipComp: CountTooltip,
  },
  {
    key: 'avg_dom',
    label: 'Avg Days on Market',
    chartType: 'bar',
    color: '#6b7280',
    dataKey: 'avg_dom',
    tooltipComp: CountTooltip,
    tooltipSuffix: ' days',
  },
  {
    key: 'avg_ppsf',
    label: 'Avg $/sqft',
    chartType: 'line',
    color: '#3b82f6',
    dataKey: 'avg_ppsf',
    tooltipComp: PpsqftTooltip,
    axisFormatter: (v: number) => `$${v}`,
  },
  {
    key: 'sale_to_list',
    label: 'Sale-to-List %',
    chartType: 'line',
    color: '#10b981',
    dataKey: 'sale_to_list',
    tooltipComp: PctTooltip,
    tooltipSuffix: '%',
    axisFormatter: (v: number) => `${v.toFixed(0)}%`,
  },
  {
    key: 'active',
    label: 'Active Inventory',
    chartType: 'bar',
    color: '#f59e0b',
    dataKey: 'active',
    tooltipComp: CountTooltip,
  },
  {
    key: 'absorption',
    label: 'Absorption Rate',
    chartType: 'line',
    color: '#8b5cf6',
    dataKey: 'absorption',
    tooltipComp: PctTooltip,
    tooltipSuffix: '%',
    axisFormatter: (v: number) => `${v.toFixed(0)}%`,
  },
]

export default function NeighbourhoodChartsClient({ trend }: Props) {
  const sorted = [...trend].sort((a, b) => a.month.localeCompare(b.month))

  const chartData = sorted.map(p => {
    const saleToList =
      (p.avg_price > 0 && (p.avg_list_price ?? 0) > 0)
        ? (p.avg_price / p.avg_list_price!) * 100
        : null
    const absorption =
      ((p.sold ?? 0) > 0 && (p.active ?? 0) > 0)
        ? (p.sold / p.active!) * 100
        : null
    return {
      month: shortMonth(p.month),
      avg_price: p.avg_price,
      sold: p.sold,
      avg_dom: p.avg_dom,
      avg_ppsf: p.avg_ppsf ?? 0,
      sale_to_list: saleToList,
      active: p.active ?? null,
      absorption,
    }
  })

  const available = METRIC_DEFS.filter(def => {
    return chartData.some(d => {
      const v = d[def.dataKey as keyof typeof d]
      return v !== null && v !== undefined && (v as number) > 0
    })
  })

  const [activeKey, setActiveKey] = useState<MetricKey>(available[0]?.key ?? 'avg_price')

  const metric = available.find(m => m.key === activeKey) ?? available[0]

  if (!metric || chartData.length === 0) return null

  const TooltipComp = metric.tooltipComp

  return (
    <div style={chartCard}>
      {/* Metric switcher pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {available.map(m => (
          <button
            key={m.key}
            onClick={() => setActiveKey(m.key)}
            style={{
              padding: '5px 13px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: activeKey === m.key ? 700 : 500,
              border: activeKey === m.key ? `1.5px solid ${m.color}` : '1.5px solid var(--border)',
              background: activeKey === m.key ? m.color : 'transparent',
              color: activeKey === m.key ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        {metric.chartType === 'line' ? (
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
            <YAxis
              tickFormatter={metric.axisFormatter}
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              width={metric.key === 'avg_price' ? 56 : 44}
            />
            <Tooltip content={<TooltipComp suffix={metric.tooltipSuffix} />} />
            <Line
              type="monotone"
              dataKey={metric.dataKey}
              stroke={metric.color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: metric.color }}
              connectNulls={false}
            />
          </LineChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
            <YAxis
              tickFormatter={metric.axisFormatter}
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              width={44}
            />
            <Tooltip content={<TooltipComp suffix={metric.tooltipSuffix} />} />
            <Bar dataKey={metric.dataKey} fill={metric.color} radius={[3, 3, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>

      {/* Caption */}
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
        24-month trend &middot; Updated monthly
      </div>
    </div>
  )
}
