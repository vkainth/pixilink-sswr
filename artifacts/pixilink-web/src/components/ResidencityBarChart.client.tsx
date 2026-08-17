'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import type { MonthlyTrendPoint } from '@/lib/types'
import { monthLabel } from '@/lib/market'

export interface ZoneMonthly {
  label: string
  trend: MonthlyTrendPoint[]
  color: string
}

interface Props {
  zones: ZoneMonthly[]
}

export default function ResidencityBarChart({ zones }: Props) {
  const allMonths = [...new Set(
    zones.flatMap(z => z.trend.map(t => t.month))
  )].sort().slice(-6)

  const data = allMonths.map(month => {
    const row: Record<string, string | number> = { month: monthLabel(month) }
    for (const z of zones) {
      const pt = z.trend.find(t => t.month === month)
      row[z.label] = pt?.sold ?? 0
    }
    return row
  })

  if (!data.length) return null

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={30} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
            labelStyle={{ fontWeight: 700, marginBottom: 4 }}
            formatter={(val) => [val, 'sold']}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {zones.map(z => (
            <Bar key={z.label} dataKey={z.label} fill={z.color} radius={[3, 3, 0, 0]} maxBarSize={32} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
