'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts'
import type { MonthlyTrendPoint, MarketReportTypeRow } from '@/lib/types'

interface Props {
  monthly_trend: MonthlyTrendPoint[]
  by_type: MarketReportTypeRow[]
  currentMonth?: string
}

function shortMonth(m: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(m)
  if (match) {
    const d = new Date(Number(match[1]), Number(match[2]) - 1, 1)
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-CA', { month: 'short' })
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

const PRICE_COLOR = '#c9a84c'
const VOLUME_COLOR = '#3b82f6'
const DOM_COLOR = '#f59e0b'
const PPSF_COLOR = '#3b82f6'
const TYPE_COLORS = ['#334155', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const chartCard: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '18px 20px',
}

const chartTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 14,
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
      {label && <div style={{ fontWeight: 700, marginBottom: 4, color: '#1a1a1a' }}>{label}</div>}
      {children}
    </div>
  )
}

function PriceTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <TooltipWrap label={label}>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || PRICE_COLOR }}>
          {p.name ? `${p.name}: ` : ''}{fmtExactPrice(p.value ?? 0)}
        </div>
      ))}
    </TooltipWrap>
  )
}

function CountTooltip({ active, payload, label, suffix = '' }: TooltipProps & { suffix?: string }) {
  if (!active || !payload?.length) return null
  return (
    <TooltipWrap label={label}>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || VOLUME_COLOR }}>
          {p.name ? `${p.name}: ` : ''}{(p.value ?? 0).toLocaleString('en-CA')}{suffix}
        </div>
      ))}
    </TooltipWrap>
  )
}

function PpsqftTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <TooltipWrap label={label}>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || PPSF_COLOR }}>
          ${Math.round(p.value ?? 0).toLocaleString('en-CA')}/sqft
        </div>
      ))}
    </TooltipWrap>
  )
}

function PieTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <TooltipWrap>
      <div style={{ color: p.color || PRICE_COLOR, fontWeight: 700 }}>{p.name}</div>
      <div style={{ color: '#333' }}>{(p.value ?? 0).toLocaleString('en-CA')} sold (30d)</div>
    </TooltipWrap>
  )
}

export default function MarketChartsClient({ monthly_trend, by_type, currentMonth }: Props) {
  const trend = [...monthly_trend].sort((a, b) => a.month.localeCompare(b.month))
  const trendData = trend.map(p => ({
    month: shortMonth(p.month),
    avg_price: p.avg_price,
    sold: p.sold,
    avg_dom: p.avg_dom,
    avg_ppsf: p.avg_ppsf ?? 0,
  }))

  const typeData = by_type.map(r => ({
    type: r.type,
    avg_price: r.avg_sold_price,
    sold: r.sold_30d,
  }))

  const pieData = by_type.map(r => ({ name: r.type, value: r.sold_30d }))

  const dateRangeSubtitle = trendData.length >= 2
    ? `${trendData[0].month} – ${trendData[trendData.length - 1].month}`
    : ''

  return (
    <section style={{ marginTop: 36 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 4 }}>
          12-Month Trend
        </h2>
        {dateRangeSubtitle && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{dateRangeSubtitle} · MLS® sales data</p>
        )}
      </div>

      {/* Primary charts — full width, stacked */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 }}>

        {/* 1. Avg Sold Price — Line, full width */}
        {trendData.length > 0 && (
          <div style={chartCard}>
            <div style={chartTitle}>Avg Sold Price</div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tickFormatter={fmtAxisPrice} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={58} />
                <Tooltip content={<PriceTooltip />} />
                {currentMonth && (
                  <ReferenceLine
                    x={currentMonth}
                    stroke={PRICE_COLOR}
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={{ value: currentMonth, position: 'top', fontSize: 10, fill: PRICE_COLOR }}
                  />
                )}
                <Line type="monotone" dataKey="avg_price" stroke={PRICE_COLOR} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: PRICE_COLOR }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 2. Homes Sold — Bar, full width */}
        {trendData.length > 0 && (
          <div style={chartCard}>
            <div style={chartTitle}>Homes Sold</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={36} />
                <Tooltip content={<CountTooltip />} />
                {currentMonth && (
                  <ReferenceLine
                    x={currentMonth}
                    stroke={VOLUME_COLOR}
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={{ value: currentMonth, position: 'top', fontSize: 10, fill: VOLUME_COLOR }}
                  />
                )}
                <Bar dataKey="sold" fill={VOLUME_COLOR} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Secondary metrics — 2-column */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 20 }}>

        {/* 3. Avg Days on Market — Bar */}
        {trendData.length > 0 && (
          <div style={chartCard}>
            <div style={chartTitle}>Avg Days on Market</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={36} />
                <Tooltip content={<CountTooltip suffix=" days" />} />
                {currentMonth && (
                  <ReferenceLine
                    x={currentMonth}
                    stroke={DOM_COLOR}
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={{ value: currentMonth, position: 'top', fontSize: 10, fill: DOM_COLOR }}
                  />
                )}
                <Bar dataKey="avg_dom" fill={DOM_COLOR} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 4. Avg $/sqft — Line */}
        {trendData.some(d => d.avg_ppsf > 0) && (
          <div style={chartCard}>
            <div style={chartTitle}>Avg $/sqft</div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tickFormatter={(v: number) => `$${v}`} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={52} />
                <Tooltip content={<PpsqftTooltip />} />
                {currentMonth && (
                  <ReferenceLine
                    x={currentMonth}
                    stroke={PPSF_COLOR}
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={{ value: currentMonth, position: 'top', fontSize: 10, fill: PPSF_COLOR }}
                  />
                )}
                <Line type="monotone" dataKey="avg_ppsf" stroke={PPSF_COLOR} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: PPSF_COLOR }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* By-type charts — 2-column */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>

        {/* 5. Avg Price by Type — Bar with per-type cell colours */}
        {typeData.length > 0 && (
          <div style={chartCard}>
            <div style={chartTitle}>Avg Price by Property Type</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={typeData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="type" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tickFormatter={fmtAxisPrice} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={58} />
                <Tooltip content={<PriceTooltip />} />
                <Bar dataKey="avg_price" radius={[3, 3, 0, 0]}>
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 6. Sales Mix by Type — Donut */}
        {pieData.length > 0 && pieData.some(d => d.value > 0) && (
          <div style={chartCard}>
            <div style={chartTitle}>Sales Mix by Type (30d)</div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  )
}
