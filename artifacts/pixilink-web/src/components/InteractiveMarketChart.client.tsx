'use client'

import { useState } from 'react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceDot, Legend,
} from 'recharts'
import type { MonthlyTrendPoint, MonthlyTypePricePoint } from '@/lib/types'

interface Props {
  trend: MonthlyTrendPoint[]
  priceByType?: MonthlyTypePricePoint[]
  accentColor?: string
}

type Tab = 'price' | 'volume' | 'dom' | 'ppsf'

const TYPE_SERIES: { key: 'apartment' | 'townhouse' | 'house'; label: string; color: string }[] = [
  { key: 'apartment', label: 'Apartment', color: '#2563eb' },
  { key: 'townhouse', label: 'Townhouse', color: '#0d9488' },
  { key: 'house',     label: 'House',     color: '#d97706' },
]

function typeDataKey(typeKey: string, tab: Tab): string {
  if (tab === 'price')  return typeKey
  if (tab === 'volume') return `${typeKey}_sold`
  if (tab === 'dom')    return `${typeKey}_dom`
  return `${typeKey}_ppsf`
}

function fmtMonth(month: string): string {
  const [, m] = month.split('-')
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m, 10) - 1] ?? month
}

function fmtMonthFull(month: string): string {
  const [y, m] = month.split('-')
  const names = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return `${names[parseInt(m, 10) - 1] ?? month} ${y}`
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

function formatByTypeValue(v: number, tab: Tab): string {
  if (tab === 'price')  return abbreviatePrice(v)
  if (tab === 'dom')    return `${v}d`
  if (tab === 'ppsf')   return `$${v}/ft²`
  return `${v}`
}

function pctDiff(current: number, prior: number): string | null {
  if (!prior) return null
  const pct = ((current - prior) / prior) * 100
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%'
}

interface TooltipPayloadEntry {
  value: number
  name?: string
  dataKey?: string
  color?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  tab: Tab
  trend: MonthlyTrendPoint[]
}

function CustomTooltip({ active, payload, label, tab, trend }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null
  const val = payload[0]?.value ?? 0
  const idx = trend.findIndex(p => p.month === label)
  const prev = idx > 0 ? trend[idx - 1] : null
  const prevVal = prev
    ? tab === 'price' ? prev.avg_price
    : tab === 'volume' ? prev.sold
    : tab === 'dom' ? prev.avg_dom
    : (prev.avg_ppsf ?? 0)
    : null
  const delta = prevVal != null ? pctDiff(val, prevVal) : null
  const monthFull = idx >= 0 ? fmtMonthFull(trend[idx].month) : label

  let displayVal = String(val)
  if (tab === 'price') displayVal = abbreviatePrice(val)
  else if (tab === 'dom') displayVal = `${val}d`
  else if (tab === 'ppsf') displayVal = `$${val}/ft²`

  const deltaPositive = delta ? !delta.startsWith('-') : true
  const invertDom = tab === 'dom'
  const isGood = invertDom ? !deltaPositive : deltaPositive

  return (
    <div style={{
      background: 'rgba(20,33,61,0.97)', color: '#fff', borderRadius: 8,
      padding: '10px 14px', fontSize: 13, lineHeight: 1.5, minWidth: 140,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 11, color: 'rgba(255,255,255,0.85)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {monthFull}
      </div>
      <div style={{ fontWeight: 800, fontSize: 16 }}>{displayVal}</div>
      {delta && (
        <div style={{ fontSize: 11, fontWeight: 700, color: isGood ? '#4ade80' : '#f87171', marginTop: 2 }}>
          {delta} vs prior month
        </div>
      )}
    </div>
  )
}

interface ByTypeTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  tab: Tab
}

function ByTypeTooltip({ active, payload, label, tab }: ByTypeTooltipProps) {
  if (!active || !payload?.length || !label) return null
  const rows = payload.filter(e => e.value != null)
  if (!rows.length) return null
  return (
    <div style={{
      background: 'rgba(20,33,61,0.97)', color: '#fff', borderRadius: 8,
      padding: '10px 14px', fontSize: 13, lineHeight: 1.6, minWidth: 160,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 11, color: 'rgba(255,255,255,0.85)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {fmtMonthFull(label)}
      </div>
      {rows.map(e => (
        <div key={e.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: e.color, display: 'inline-block' }} />
            {e.name}
          </span>
          <span style={{ fontWeight: 800 }}>{formatByTypeValue(e.value, tab)}</span>
        </div>
      ))}
    </div>
  )
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'price', label: 'Avg Price' },
  { key: 'volume', label: 'Sales Volume' },
  { key: 'dom', label: 'Days on Market' },
  { key: 'ppsf', label: '$/sqft' },
]

const BY_TYPE_FOOTER: Record<Tab, string> = {
  price:  'Avg sold price by type',
  volume: 'Sales volume by type',
  dom:    'Days on market by type',
  ppsf:   'Price per sqft by type',
}

export default function InteractiveMarketChart({ trend, priceByType = [], accentColor = '#c9a84c' }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('price')

  if (!trend.length) return null

  const hasPpsf = trend.some(p => p.avg_ppsf && p.avg_ppsf > 0)
  const visibleTabs = hasPpsf ? TABS : TABS.filter(t => t.key !== 'ppsf')

  const chartData = trend.map(p => ({
    month: fmtMonth(p.month),
    price: p.avg_price,
    volume: p.sold,
    dom: p.avg_dom,
    ppsf: p.avg_ppsf ?? 0,
    fullMonth: p.month,
  }))

  const dataKey = activeTab
  const lastPoint = chartData[chartData.length - 1]

  const byTypeData = priceByType.filter(p => p.apartment != null || p.townhouse != null || p.house != null)
  const showByType = byTypeData.length > 0

  function yTickFormatter(v: number): string {
    if (activeTab === 'price') return abbreviatePrice(v)
    if (activeTab === 'dom') return `${v}d`
    if (activeTab === 'ppsf') return `$${v}`
    return String(v)
  }

  const gradientId = 'marketAreaGradient'

  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '22px 24px', marginTop: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            3-Year Price Trend
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary-bg)' }}>
            {activeTab === 'price' && abbreviatePrice(lastPoint.price)}
            {activeTab === 'volume' && `${lastPoint.volume} sales`}
            {activeTab === 'dom' && `${lastPoint.dom} days`}
            {activeTab === 'ppsf' && `$${lastPoint.ppsf}/ft²`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {visibleTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '7px 16px',
                fontSize: 12,
                fontWeight: activeTab === t.key ? 700 : 500,
                color: activeTab === t.key ? '#fff' : 'var(--text-muted)',
                background: activeTab === t.key ? 'var(--primary-bg)' : 'transparent',
                border: activeTab === t.key ? '1.5px solid var(--primary-bg)' : '1.5px solid var(--border)',
                borderRadius: 20,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <div style={{ minWidth: 300 }}>
          <ResponsiveContainer width="100%" height={showByType ? 290 : 260}>
            {showByType ? (
              <LineChart data={byTypeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  orientation="right"
                  tickFormatter={yTickFormatter}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <Tooltip content={<ByTypeTooltip tab={activeTab} />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1.5, strokeDasharray: '4 4' }} />
                <Legend
                  verticalAlign="top"
                  align="left"
                  height={28}
                  iconType="plainline"
                  wrapperStyle={{ fontSize: 12, paddingBottom: 4 }}
                />
                {TYPE_SERIES.map(s => (
                  <Line
                    key={s.key}
                    type="linear"
                    dataKey={typeDataKey(s.key, activeTab)}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: s.color, stroke: '#fff', strokeWidth: 2 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={accentColor} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="fullMonth"
                  tickFormatter={fmtAxisTick}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                  interval="preserveStartEnd"
                />
                <YAxis
                  orientation="right"
                  tickFormatter={yTickFormatter}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <Tooltip
                  content={<CustomTooltip tab={activeTab} trend={trend} />}
                  cursor={{ stroke: accentColor, strokeWidth: 1.5, strokeDasharray: '4 4' }}
                />
                <Area
                  type="linear"
                  dataKey={dataKey}
                  stroke={accentColor}
                  strokeWidth={2.5}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{ r: 5, fill: accentColor, stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
                {lastPoint && (
                  <ReferenceDot
                    x={lastPoint.fullMonth}
                    y={lastPoint[dataKey]}
                    r={5}
                    fill={accentColor}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'right' }}>
        {showByType ? `${BY_TYPE_FOOTER[activeTab]} · last 36 months · MLS® data` : 'Last 36 months · MLS® data'}
      </div>
    </div>
  )
}
