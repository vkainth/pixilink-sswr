'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { MonthlyTypePricePoint } from '@/lib/types'

interface Props {
  data: MonthlyTypePricePoint[]
  lockedType: string
}

const TYPE_KEY_MAP: Record<string, keyof MonthlyTypePricePoint> = {
  Apartment: 'apartment',
  Townhouse: 'townhouse',
  House: 'house',
  Duplex: 'duplex',
}

function fmtMonth(m: string): string {
  const [y, mo] = m.split('-')
  const d = new Date(Number(y), Number(mo) - 1, 1)
  return d.toLocaleDateString('en-CA', { month: 'short', year: '2-digit' })
}

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${v}`
}

interface TipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function PriceTip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(20,33,61,0.97)', color: '#fff', borderRadius: 8,
      padding: '10px 14px', fontSize: 13, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 15 }}>{fmtPrice(payload[0]?.value ?? 0)}</div>
    </div>
  )
}

export default function PropertyTypeTrendChart({ data, lockedType }: Props) {
  const key = TYPE_KEY_MAP[lockedType] ?? 'apartment'

  const points = data
    .filter(d => d[key] != null)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12)
    .map(d => ({ month: fmtMonth(d.month), price: d[key] as number }))

  if (points.length < 2) return null

  const values = points.map(p => p.price)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const pad    = (maxVal - minVal) * 0.18 || 60000

  const typeLabel = lockedType === 'Apartment' ? 'Condo' : lockedType

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>
        Avg {typeLabel} Sold Price — Last 12 Months
      </div>
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px 12px' }}>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={points} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[Math.max(0, minVal - pad), maxVal + pad]}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtPrice}
              width={60}
            />
            <Tooltip content={<PriceTip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#c9a84c"
              strokeWidth={2.5}
              dot={{ fill: '#c9a84c', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#c9a84c' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
