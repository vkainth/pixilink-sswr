import { Suspense } from 'react'
import { headers } from 'next/headers'
import { Playfair_Display } from 'next/font/google'
import { getAgent, getMarketStats, getMarketReport, getNeighbourhoods, getListings, getPriceMatrix, getMarketBreakdown, agentCanonicalBase, resolveAgentPrefix } from '@/lib/api'
import PageQuickLinks from '@/components/PageQuickLinks'
import { formatPrice, formatPriceFull } from '@/lib/types'
import {
  marketBadge, marketVerdict, monthLabel, absorptionBadge, absorptionFaqAnswer, normalizeCity, monthlyMarketBadge,
} from '@/lib/market'
import MarketHeadlineStats from '@/components/MarketHeadlineStats.client'
import NeighbourhoodBreakdownTable, { type NeighbourhoodRow } from '@/components/NeighbourhoodBreakdownTable.client'
import MarketBreakdownCharts from '@/components/MarketBreakdownCharts.client'
import MarketStatsInteractive from '@/components/MarketStatsInteractive.client'
import InteractiveMarketChart from '@/components/InteractiveMarketChart.client'
import PropertyTypeBarChart from '@/components/PropertyTypeBarChart.client'
import PriceMatrixGrid from '@/components/PriceMatrixGrid'
import NeighbourhoodBarChart from '@/components/NeighbourhoodBarChart.client'
import ReportFilterBar from '@/components/ReportFilterBar.client'
import MarketEmailCapture from '@/components/MarketEmailCapture.client'
import MarketSparklineCard from '@/components/MarketSparklineCard.client'
import { notFound } from 'next/navigation'
import { requireNotShowcase } from '@/lib/showcase'
import type { Metadata } from 'next'
import type {
  NeighbourhoodSummary, MonthlyTrendPoint, MarketType, MarketReportTypeRow, MonthlyTypePricePoint,
} from '@/lib/types'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '500'], display: 'swap' })


// Market-page-scoped no-data fallbacks: show "N/A" instead of the shared "Contact".
function mPrice(p: number | null | undefined): string {
  return p ? formatPrice(p) : 'N/A'
}
function mPriceFull(p: number | null | undefined): string {
  return p ? formatPriceFull(p) : 'N/A'
}

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const revalidate = 300

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildAreaLabel(neighbourhoods: NeighbourhoodSummary[]): string {
  const cities = [...new Set(neighbourhoods.map(n => normalizeCity(n.city)))]
  if (cities.length === 0) return 'Local Area'
  return cities.join(' & ')
}

function pctChange(current: number, prior: number): string | null {
  if (!prior) return null
  const pct = ((current - prior) / prior) * 100
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%'
}

function normalizePropertyType(type: string): 'Condo' | 'Town' | 'House' | 'Duplex' | null {
  const t = type.toLowerCase()
  if (t.includes('apartment') || t.includes('condo')) return 'Condo'
  if (t.includes('townhouse') || t.includes('row') || t.includes('town')) return 'Town'
  if (t === 'duplex' || t === 'half duplex' || t.startsWith('duplex')) return 'Duplex'
  if (t.includes('house') || t.includes('detach') || t.includes('single')) return 'House'
  return null
}

function countConsecutiveMarket(trend: MonthlyTrendPoint[], marketType: MarketType): number {
  let count = 0
  for (let i = trend.length - 1; i >= 1; i--) {
    const delta =
      ((trend[i].avg_price - trend[i - 1].avg_price) / (trend[i - 1].avg_price || 1)) * 100
    if (marketType === 'sellers' || marketType === 'strong-sellers') {
      if (delta > -1.5) count++
      else break
    } else if (marketType === 'buyers') {
      if (delta < 1.5) count++
      else break
    } else {
      if (Math.abs(delta) <= 2) count++
      else break
    }
  }
  return Math.max(count, 1)
}

function deriveTrendLabel(curr: MonthlyTrendPoint, prev: MonthlyTrendPoint | null): '↑' | '→' | '↓' {
  if (!prev) return '→'
  const pct = ((curr.avg_price - prev.avg_price) / (prev.avg_price || 1)) * 100
  if (pct >= 0.5) return '↑'
  if (pct <= -0.5) return '↓'
  return '→'
}


// ── Styles ────────────────────────────────────────────────────────────────────

const th: React.CSSProperties = {
  textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', padding: '11px 14px', whiteSpace: 'nowrap',
}
const td: React.CSSProperties = { fontSize: 13, color: 'var(--text)', padding: '12px 14px', whiteSpace: 'nowrap' }

// ── Sub-components ────────────────────────────────────────────────────────────

function MonthComparisonTable({ trend }: { trend: MonthlyTrendPoint[] }) {
  if (trend.length < 2) return null

  const cur = trend[trend.length - 1]
  const pri = trend[trend.length - 2]
  const lyr = trend.length >= 13 ? trend[trend.length - 13] : null

  function pctBadge(current: number, prior: number | undefined, invertColor = false) {
    if (!prior) return null
    const pct = ((current - prior) / prior) * 100
    const positive = invertColor ? pct <= 0 : pct >= 0
    return (
      <span style={{
        display: 'inline-block', marginLeft: 6,
        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
        background: positive ? '#dcfce7' : '#fee2e2',
        color: positive ? '#15803d' : '#dc2626',
      }}>
        {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
      </span>
    )
  }

  const curLabel = monthLabel(cur.month)
  const priLabel = monthLabel(pri.month)
  const lyrLabel = lyr ? monthLabel(lyr.month) + ' (LY)' : '—'

  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 14 }}>
        How does this period compare?
      </h2>
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--off-white)' }}>
              <th style={th}>Metric</th>
              <th style={{ ...th, color: 'var(--primary-bg)' }}>{curLabel} · Last 30 days</th>
              <th style={th}>{priLabel}</th>
              <th style={th}>{lyrLabel}</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ ...td, fontWeight: 600, color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Homes Sold</td>
              <td style={{ ...td, fontWeight: 800, color: 'var(--primary-bg)' }}>
                {cur.sold}{pctBadge(cur.sold, pri.sold)}
              </td>
              <td style={td}>{pri.sold}</td>
              <td style={td}>{lyr ? lyr.sold : '—'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ ...td, fontWeight: 600, color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg Sold Price</td>
              <td style={{ ...td, fontWeight: 800, color: 'var(--primary-bg)' }}>
                {mPrice(cur.avg_price)}{pctBadge(cur.avg_price, pri.avg_price)}
              </td>
              <td style={td}>{mPrice(pri.avg_price)}</td>
              <td style={td}>{lyr ? mPrice(lyr.avg_price) : '—'}</td>
            </tr>
            <tr>
              <td style={{ ...td, fontWeight: 600, color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg Days on Market</td>
              <td style={{ ...td, fontWeight: 800, color: 'var(--primary-bg)' }}>
                {cur.avg_dom}d{pctBadge(cur.avg_dom, pri.avg_dom, true)}
              </td>
              <td style={td}>{pri.avg_dom}d</td>
              <td style={td}>{lyr ? `${lyr.avg_dom}d` : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ── BenchmarkPriceTable ───────────────────────────────────────────────────────

type BenchmarkRow = {
  label: string
  normType: 'Condo' | 'Town' | 'House'
  avgPrice: number
  ppsf: number | null
  yoy: number | null
  marketType: MarketType
}

function deriveBenchmarkRows(
  byType: MarketReportTypeRow[],
  trendByType: MonthlyTypePricePoint[],
): BenchmarkRow[] {
  const typeKeyMap: Record<string, 'apartment' | 'townhouse' | 'house'> = {
    Condo: 'apartment', Town: 'townhouse', House: 'house',
  }
  const displayOrder: Array<{ label: string; normType: 'Condo' | 'Town' | 'House' }> = [
    { label: 'Houses', normType: 'House' },
    { label: 'Townhouses', normType: 'Town' },
    { label: 'Condos', normType: 'Condo' },
  ]
  const latestTrend = trendByType.length > 0 ? trendByType[trendByType.length - 1] : null
  const prevYearTrend = trendByType.length >= 13 ? trendByType[trendByType.length - 13] : null
  const rows: BenchmarkRow[] = []
  for (const { label, normType } of displayOrder) {
    const typeRow = byType.find(r => normalizePropertyType(r.type) === normType)
    if (!typeRow || !typeRow.avg_sold_price) continue
    const key = typeKeyMap[normType]
    const latestPrice = latestTrend?.[key] ?? null
    const prevYearPrice = prevYearTrend?.[key] ?? null
    const ppsfKey = `${key}_ppsf` as keyof MonthlyTypePricePoint
    const ppsf = latestTrend ? (latestTrend[ppsfKey] as number | null | undefined) ?? null : null
    const yoy = latestPrice && prevYearPrice && prevYearPrice > 0
      ? ((latestPrice - prevYearPrice) / prevYearPrice) * 100
      : null
    rows.push({ label, normType, avgPrice: typeRow.avg_sold_price, ppsf, yoy, marketType: typeRow.market_type })
  }
  return rows
}

function BenchmarkPriceTable({
  byType,
  trendByType,
  areaLabel,
}: {
  byType: MarketReportTypeRow[]
  trendByType: MonthlyTypePricePoint[]
  areaLabel: string
}) {
  const rows = deriveBenchmarkRows(byType, trendByType)
  if (rows.length === 0) return null

  const rowsWithYoy = rows.filter(r => r.yoy !== null)
  const mostAffordable = [...rows].sort((a, b) => a.avgPrice - b.avgPrice)[0]
  const fastestGrowing = rowsWithYoy.length > 0
    ? [...rowsWithYoy].sort((a, b) => b.yoy! - a.yoy!)[0]
    : null
  const slowestGrowing = rowsWithYoy.length > 1
    ? [...rowsWithYoy].sort((a, b) => a.yoy! - b.yoy!)[0]
    : null

  const insightSentences: string[] = []
  if (mostAffordable) {
    insightSentences.push(
      `${mostAffordable.label} are the most accessible entry point in ${areaLabel}, currently averaging ${formatPriceFull(mostAffordable.avgPrice)} — well below the cost of a detached home.`
    )
  }
  if (fastestGrowing && fastestGrowing.yoy !== null) {
    const direction = fastestGrowing.yoy >= 0 ? 'appreciated' : 'declined'
    insightSentences.push(
      `${fastestGrowing.label} have ${direction} the ${fastestGrowing.yoy >= 0 ? 'most' : 'least'} over the past year at ${fastestGrowing.yoy >= 0 ? '+' : ''}${fastestGrowing.yoy.toFixed(1)}%${slowestGrowing && slowestGrowing !== fastestGrowing && slowestGrowing.yoy !== null ? `, while ${slowestGrowing.label} saw the weakest movement at ${slowestGrowing.yoy >= 0 ? '+' : ''}${slowestGrowing.yoy.toFixed(1)}%` : ''}.`
    )
    if (fastestGrowing.yoy >= 3) {
      insightSentences.push(
        `For investors, ${fastestGrowing.label.toLowerCase()} have shown the strongest price appreciation — buyers looking for long-term value may want to prioritise this segment.`
      )
    } else if (fastestGrowing.yoy < 0) {
      insightSentences.push(
        `Buyers currently have more negotiating room across all property types in ${areaLabel} — consult a local agent before making pricing decisions.`
      )
    } else {
      insightSentences.push(
        `Price growth across all types has been steady — ${areaLabel} remains a stable market for both owner-occupiers and investors.`
      )
    }
  }

  return (
    <section style={{ marginTop: 32 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-bg)', margin: 0 }}>
          Benchmark Prices by Property Type
        </h2>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{areaLabel} · Last 30 days</span>
      </div>
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--off-white)' }}>
              <th style={th}>Property Type</th>
              <th style={{ ...th, textAlign: 'right' }}>Avg Sold Price</th>
              <th style={{ ...th, textAlign: 'right' }}>Avg $/sqft</th>
              <th style={{ ...th, textAlign: 'right' }}>YoY Change</th>
              <th style={{ ...th, textAlign: 'center' }}>Condition</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const badge = marketBadge(row.marketType)
              const yoyPositive = row.yoy !== null && row.yoy >= 0
              return (
                <tr key={row.normType} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ ...td, fontWeight: 700, color: 'var(--primary-bg)' }}>{row.label}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 800, fontSize: 14, color: 'var(--primary-bg)' }}>
                    {formatPrice(row.avgPrice)}
                  </td>
                  <td style={{ ...td, textAlign: 'right', color: 'var(--text-muted)' }}>
                    {row.ppsf ? `$${Math.round(row.ppsf).toLocaleString()}` : '—'}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {row.yoy !== null ? (
                      <span style={{
                        display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                        background: yoyPositive ? '#dcfce7' : '#fee2e2',
                        color: yoyPositive ? '#15803d' : '#dc2626',
                      }}>
                        {yoyPositive ? '+' : ''}{row.yoy.toFixed(1)}%
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <span style={{ background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {badge.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {insightSentences.length > 0 && (
        <div style={{ marginTop: 14, background: '#fffbf0', border: '1px solid #fde68a', borderRadius: 8, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Market Insight
          </div>
          {insightSentences.map((s, i) => (
            <p key={i} style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, margin: i < insightSentences.length - 1 ? '0 0 4px' : 0 }}>
              {s}
            </p>
          ))}
        </div>
      )}
    </section>
  )
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const tab = typeof sp.tab === 'string' ? sp.tab : 'overview'
  const rawSubarea = typeof sp.subarea === 'string' && sp.subarea ? sp.subarea : null
  const [agent, neighbourhoods] = await Promise.all([getAgent(slug), getNeighbourhoods(slug)])
  // Normalize: legacy redirects pass path slugs (e.g. 'white-rock'); the page/API expects
  // the subarea name/value (e.g. 'White Rock') from n.subarea || n.name.
  const subarea = rawSubarea
    ? (neighbourhoods.find(n => n.slug === rawSubarea)?.subarea
        ?? neighbourhoods.find(n => n.slug === rawSubarea)?.name
        ?? neighbourhoods.find(n => (n.subarea || n.name).toLowerCase() === rawSubarea.toLowerCase())?.subarea
        ?? neighbourhoods.find(n => (n.subarea || n.name).toLowerCase() === rawSubarea.toLowerCase())?.name
        ?? rawSubarea)
    : null
  const area = subarea || buildAreaLabel(neighbourhoods)
  const agentName = agent?.name || 'Your Local Agent'
  const domain = agentCanonicalBase(agent)
  const now = new Date()
  const monthYear = now.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })

  if (tab === 'archive') {
    const title = `${area} Real Estate Market Reports — ${monthYear} | ${agentName}`
    const desc = `Monthly real estate market reports for ${area}: browse 3 years of sales data, avg prices, days on market and market conditions — updated monthly from MLS® records.`
    return {
      title,
      description: desc,
      alternates: { canonical: `https://${domain}/market/archive` },
      openGraph: { title, description: desc, type: 'website', images: [{ url: `https://${domain}/opengraph.jpg`, width: 1200, height: 630, alt: title }] },
      twitter: { card: 'summary_large_image', title, description: desc },
    }
  }

  const title = `${area} Real Estate Market — Live Stats & Monthly Reports | ${agentName}`
  const desc = `Live MLS® market stats and monthly reports for ${area} — average sold price, days on market, absorption rate, sales volume and 3-year trends from ${agentName}.`
  return {
    title,
    description: desc,
    alternates: { canonical: `https://${domain}/market` },
    openGraph: { title, description: desc, images: [{ url: `https://${domain}/opengraph.jpg`, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description: desc },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function MarketPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const tab = typeof sp.tab === 'string' && sp.tab === 'archive' ? 'archive' : 'overview'
  const marketView = 'agent'
  const rawSubareaParam = typeof sp.subarea === 'string' && sp.subarea ? sp.subarea : undefined
  const selectedMonth = typeof sp.month === 'string' && sp.month ? sp.month : null
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  // Step 1: agent + neighbourhoods first so we can normalize the subarea slug
  const [agent, neighbourhoods] = await Promise.all([getAgent(slug), getNeighbourhoods(slug)])
  if (!agent) notFound()
  requireNotShowcase(agent)
  if (!agent.features?.market_intelligence) notFound()

  // Normalize: legacy redirects pass path slugs (e.g. 'white-rock') as ?subarea=.
  // The API and UI active-state comparisons both expect n.subarea || n.name (e.g. 'White Rock').
  const selectedSubarea: string | undefined = rawSubareaParam
    ? (neighbourhoods.find(n => n.slug === rawSubareaParam)?.subarea
        ?? neighbourhoods.find(n => n.slug === rawSubareaParam)?.name
        ?? neighbourhoods.find(n => (n.subarea || n.name).toLowerCase() === rawSubareaParam.toLowerCase())?.subarea
        ?? neighbourhoods.find(n => (n.subarea || n.name).toLowerCase() === rawSubareaParam.toLowerCase())?.name
        ?? rawSubareaParam)
    : undefined

  // Step 2: fetch scoped data with the normalized subarea value
  const [stats, report, soldData, priceMatrix, breakdown] = await Promise.all([
    getMarketStats(slug),
    getMarketReport(slug, selectedSubarea),
    getListings(slug, { status: 'Sold', limit: 9, ...(selectedSubarea ? { subarea: selectedSubarea } : {}) }),
    getPriceMatrix(slug, selectedSubarea),
    getMarketBreakdown(slug, selectedSubarea ?? undefined),
  ])


  const soldListings = soldData.listings
  const areaLabel = selectedSubarea || buildAreaLabel(neighbourhoods)
  const o = report.overall
  const firstName = agent.name.split(' ')[0]

  const ltsRatio =
    stats.avg_sold_price && stats.avg_list_price
      ? `${((stats.avg_sold_price / stats.avg_list_price) * 100).toFixed(1)}%`
      : null

  const absorption = absorptionBadge(o)
  const badge = marketBadge(o.market_type)
  const months = report.monthly_trend.map(p => monthLabel(p.month))
  const priceSeries = report.monthly_trend.map(p => Math.round(p.avg_price / 1000))
  const soldSeries = report.monthly_trend.map(p => p.sold)
  const domSeries = report.monthly_trend.map(p => p.avg_dom)

  const soldCount = selectedSubarea ? o.sold_30d : stats.sold_last_30_days
  const avgSoldPrice = selectedSubarea ? o.avg_sold_price : stats.avg_sold_price
  const avgDom = selectedSubarea ? o.avg_dom : (stats.avg_dom ?? o.avg_dom)

  const maxTypePrice = report.by_type.length > 0
    ? Math.max(...report.by_type.map(r => r.avg_sold_price))
    : 0

  const fastestType = report.by_type.length > 0
    ? ([...report.by_type].filter(t => t.avg_dom > 0 && t.sold_30d >= 2).sort((a, b) => a.avg_dom - b.avg_dom)[0] ?? null)
    : null

  // ── Headline KPIs ──────────────────────────────────────────────────────────
  const headlineActiveInventory = selectedSubarea ? o.active : stats.active_count
  const headlineHasBaseDom = selectedSubarea ? true : stats.avg_dom != null

  // ── AEO Prose: Overview ───────────────────────────────────────────────────
  const now = new Date()
  const currentMonthFull = now.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
  const latestTrendPoint = report.monthly_trend.length > 0
    ? report.monthly_trend[report.monthly_trend.length - 1]
    : null
  const prevTrendPoint = report.monthly_trend.length >= 2
    ? report.monthly_trend[report.monthly_trend.length - 2]
    : null

  const priceChangePct = latestTrendPoint && prevTrendPoint
    ? pctChange(latestTrendPoint.avg_price, prevTrendPoint.avg_price)
    : null

  const overviewProse: string[] = []
  if (avgSoldPrice && soldCount != null && avgDom) {
    const latestLabel = latestTrendPoint ? monthLabel(latestTrendPoint.month) : currentMonthFull
    overviewProse.push(
      `In ${latestLabel}, ${soldCount} homes sold across ${areaLabel} at an average price of ${mPriceFull(avgSoldPrice)}${priceChangePct ? ` — ${priceChangePct.startsWith('+') ? 'up' : 'down'} ${priceChangePct.replace(/^[+-]/, '')} from the prior month` : ''}. Properties averaged ${avgDom} days on market.`
    )
  }
  if (absorption) {
    const marketDesc =
      o.market_type === 'strong-sellers' ? 'a strong seller\'s market with tight inventory and competitive offers'
      : o.market_type === 'sellers' ? 'a seller\'s market where demand continues to outpace supply'
      : o.market_type === 'buyers' ? 'a buyer\'s market where increased supply gives buyers more negotiating room'
      : 'a balanced market with healthy conditions for both buyers and sellers'
    overviewProse.push(
      `With ${absorption.months.toFixed(1)} months of supply, ${areaLabel} is ${marketDesc}.`
    )
  }
  if (fastestType) {
    overviewProse.push(
      `Among property types, ${fastestType.type} homes are selling fastest at an average of ${fastestType.avg_dom} days on market.`
    )
  }

  // ── AEO Prose: Archive ────────────────────────────────────────────────────
  const consecutiveMonths = report.monthly_trend.length > 0
    ? countConsecutiveMarket(report.monthly_trend, o.market_type)
    : 0
  const totalSold12mo = report.monthly_trend.reduce((s, p) => s + p.sold, 0)
  const archiveProse: string[] = []
  if (totalSold12mo > 0) {
    archiveProse.push(
      `Over the past 3 years, ${totalSold12mo.toLocaleString()} homes sold across ${areaLabel}${avgSoldPrice ? ` with an average sold price of ${mPriceFull(avgSoldPrice)}` : ''}.`
    )
  }
  if (consecutiveMonths >= 2) {
    archiveProse.push(
      `The market has remained a ${badge.label.toLowerCase()} for ${consecutiveMonths} consecutive months, based on MLS® absorption rate data.`
    )
  } else {
    archiveProse.push(
      `Current conditions favour ${o.market_type === 'buyers' ? 'buyers' : o.market_type === 'balanced' ? 'neither buyers nor sellers — a balanced market' : 'sellers'}, though conditions vary by neighbourhood and property type.`
    )
  }
  archiveProse.push(
    `Monthly reports below track sales volume, average prices, and days on market so buyers and sellers can spot trends before making decisions.`
  )

  // ── Intent-matched CTA ────────────────────────────────────────────────────
  const ctaData =
    o.market_type === 'strong-sellers' || o.market_type === 'sellers'
      ? { headline: 'Find out what your home is worth right now', sub: `Seller's market conditions mean your property could be worth more than you think. Get a free, data-driven evaluation from ${firstName}.`, btnLabel: 'Get a Free Home Valuation', href: ap('/home-evaluation') }
      : o.market_type === 'buyers'
      ? { headline: 'See all homes for sale right now', sub: `Buyer's market conditions mean more choice and more negotiating room. Browse all active listings in ${areaLabel} and start your search today.`, btnLabel: 'Browse Homes For Sale', href: ap('/homes-for-sale') }
      : { headline: 'Book a free market consultation', sub: `Balanced market conditions require smart strategy for both buyers and sellers. ${firstName} can help you navigate today's market with confidence.`, btnLabel: 'Book a Free Consultation', href: ap('/contact?reason=market') }

  // ── Benchmark rows (used for FAQs + BenchmarkPriceTable) ─────────────────
  const benchmarkRows = deriveBenchmarkRows(report.by_type, report.monthly_trend_by_type)
  const benchmarkHouse = benchmarkRows.find(r => r.normType === 'House')
  const benchmarkTown = benchmarkRows.find(r => r.normType === 'Town')
  const benchmarkCondo = benchmarkRows.find(r => r.normType === 'Condo')
  const benchmarkFastestGrowing = benchmarkRows.filter(r => r.yoy !== null).sort((a, b) => b.yoy! - a.yoy!)[0] ?? null

  // ── FAQs (Overview) ───────────────────────────────────────────────────────
  const faqs = [
    {
      q: `Is ${areaLabel} a buyer's or seller's market right now?`,
      a: `${areaLabel} is currently a ${badge.label.toLowerCase()}. The absorption rate — the pace at which active listings are being absorbed by buyers — points to ${o.market_type === 'strong-sellers' || o.market_type === 'sellers' ? 'more demand than supply, giving sellers an edge on pricing and conditions' : o.market_type === 'buyers' ? 'more supply than demand, giving buyers more negotiating room' : 'roughly balanced conditions between buyers and sellers'}. There are ${o.active} active listings and ${o.sold_30d} homes sold in the last 30 days.`,
    },
    ...(avgSoldPrice
      ? [{
          q: `What is the average home price in ${areaLabel}?`,
          a: `The average sold price in ${areaLabel} is currently ${formatPriceFull(avgSoldPrice)}, based on sales over the past 30 days. Prices vary significantly by property type — condominiums and townhouses typically start lower, while detached homes command a premium.`,
        }]
      : []),
    {
      q: `What does the absorption rate mean for ${areaLabel}?`,
      a: absorption
        ? absorptionFaqAnswer(areaLabel, absorption.months, o.market_type)
        : `The absorption rate measures how quickly active listings are being purchased. A rate below 4 months indicates a seller's market, 4–6 months is balanced, and above 6 months favours buyers. Data updates monthly.`,
    },
    {
      q: `How long do homes stay on the market in ${areaLabel}?`,
      a: avgDom && avgDom > 0
        ? `Homes in ${areaLabel} are selling in an average of ${avgDom} days on market. Properties that are priced correctly and presented well tend to attract offers faster, sometimes within the first week of listing.`
        : `Days on market varies by property type and price point. Check back monthly for updated averages specific to your neighbourhood or property type.`,
    },
    ...(fastestType
      ? [{
          q: `What types of properties sell fastest in ${areaLabel}?`,
          a: `Among all property types tracked, ${fastestType.type} properties are currently selling fastest in ${areaLabel} with an average of ${fastestType.avg_dom} days on market. ${fastestType.type} listings also represent some of the strongest demand, with ${fastestType.sold_30d} sales in the last 30 days.`,
        }]
      : []),
    ...(benchmarkRows.length >= 2
      ? [{
          q: `What is the average price of a house, townhouse, and condo in ${areaLabel}?`,
          a: [
            benchmarkHouse ? `Detached houses in ${areaLabel} average ${formatPriceFull(benchmarkHouse.avgPrice)}.` : null,
            benchmarkTown ? `Townhouses average ${formatPriceFull(benchmarkTown.avgPrice)}.` : null,
            benchmarkCondo ? `Condos average ${formatPriceFull(benchmarkCondo.avgPrice)}.` : null,
            `These figures reflect sold prices over the past 30 days from MLS® records and are updated monthly. Prices vary by neighbourhood, size, and condition — contact ${firstName} for a personalised estimate.`,
          ].filter(Boolean).join(' '),
        }]
      : []),
    ...(benchmarkFastestGrowing && benchmarkFastestGrowing.yoy !== null
      ? [{
          q: `Which property type has appreciated the most in ${areaLabel}?`,
          a: `Based on MLS® data, ${benchmarkFastestGrowing.label.toLowerCase()} have shown the strongest year-over-year price movement in ${areaLabel} at ${benchmarkFastestGrowing.yoy >= 0 ? '+' : ''}${benchmarkFastestGrowing.yoy.toFixed(1)}% compared to the same period last year.${benchmarkFastestGrowing.yoy >= 3 ? ` This outperformance makes ${benchmarkFastestGrowing.label.toLowerCase()} a compelling segment for buyers focused on long-term value.` : ` Price growth has been moderate overall — buyers should evaluate value on a property-by-property basis.`} Consult a local agent for current conditions before making investment decisions.`,
        }]
      : []),
    {
      q: `How many homes sold in ${areaLabel} last month?`,
      a: `${soldCount} homes sold in ${areaLabel} over the past 30 days. Tracking monthly sales volume is one of the best indicators of market momentum — rising sales generally signal growing buyer confidence, while declining volume can signal hesitancy or seasonal slowdown.`,
    },
    {
      q: `What does "months of supply" mean in ${areaLabel}?`,
      a: `Months of supply measures how long it would take to sell all current active listings at the current pace of sales. Under 4 months is a seller's market; 4–6 months is balanced; over 6 months favours buyers.${absorption ? ` In ${areaLabel}, the current absorption rate of ${absorption.months.toFixed(1)} months reflects a ${badge.label.toLowerCase()}.` : ''}`,
    },
  ]

  // ── Neighbourhood breakdown (Overview, hub view only) ─────────────────────
  let neighbourhoodRows: NeighbourhoodRow[] = []
  if (tab === 'overview' && !selectedSubarea && neighbourhoods.length > 0) {
    const reports = await Promise.all(
      neighbourhoods.map(n =>
        getMarketReport(slug, n.subarea || n.name).then(r => ({
          name: n.name,
          slug: n.slug,
          subareaParam: n.subarea || n.name,
          report: r,
        }))
      )
    )
    neighbourhoodRows = reports
  }

  // ── Archive data ──────────────────────────────────────────────────────────
  let neighReports: typeof report[] = []
  if (tab === 'archive' && neighbourhoods.length > 0) {
    neighReports = await Promise.all(
      neighbourhoods.map(n => getMarketReport(slug, n.subarea || n.name))
    )
  }

  const overallStats = stats
  const listToSale =
    overallStats.avg_list_price && o.avg_sold_price && overallStats.avg_list_price > 0
      ? ((o.avg_sold_price / overallStats.avg_list_price) * 100).toFixed(1)
      : null

  const trend = report.monthly_trend
  const latestPoint = trend.length > 0 ? trend[trend.length - 1] : null
  const prevPoint = trend.length >= 2 ? trend[trend.length - 2] : null
  const latestMonthKey = latestPoint?.month ?? null
  const [latestYear, latestMonth] = latestMonthKey ? latestMonthKey.split('-') : ['', '']

  const activeType = typeof sp.type === 'string' ? sp.type : 'All Types'
  const typeKeyMap: Record<string, string> = { Condos: 'Condo', Townhouses: 'Town', Detached: 'House', Duplexes: 'Duplex' }
  const activeNorm = typeKeyMap[activeType] ?? null
  const featuredTypeRow = activeNorm
    ? report.by_type.find(r => normalizePropertyType(r.type) === activeNorm)
    : null

  const typeByMonthPriceKey: Record<string, 'apartment' | 'townhouse' | 'house' | 'duplex'> = {
    Condo: 'apartment', Town: 'townhouse', House: 'house', Duplex: 'duplex',
  }
  const activePriceKey: 'apartment' | 'townhouse' | 'house' | 'duplex' | null = activeNorm
    ? (typeByMonthPriceKey[activeNorm] ?? null)
    : null
  const typeReportSlugMap: Record<string, string> = {
    Condo: 'condos', Town: 'townhouses', House: 'houses', Duplex: 'duplexes',
  }
  const activeTypeSlug = activeNorm ? (typeReportSlugMap[activeNorm] ?? null) : null
  const typeByMonthMap = Object.fromEntries(
    report.monthly_trend_by_type.map(pt => [pt.month, pt])
  )
  const filteredArchiveTrend = activePriceKey
    ? [...trend].reverse().filter(p => {
        const tp = typeByMonthMap[p.month]
        return tp && (tp[activePriceKey] ?? 0) > 0
      })
    : [...trend].reverse()

  // ── JSON-LD ───────────────────────────────────────────────────────────────
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: ap('/') },
      { '@type': 'ListItem', position: 2, name: 'Market', item: ap('/market') },
      ...(selectedSubarea && rawSubareaParam ? [{ '@type': 'ListItem', position: 3, name: selectedSubarea, item: ap(`/market/${rawSubareaParam}`) }] : []),
    ],
  }

  const datasetJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${areaLabel} Real Estate Market Statistics`,
    description: `Live MLS® market data for ${areaLabel} — average sold price, days on market, active listings, sales volume and absorption rate.`,
    temporalCoverage: 'P30D',
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Average Sold Price', value: avgSoldPrice ? formatPriceFull(avgSoldPrice) : null },
      { '@type': 'PropertyValue', name: 'Average Days on Market', value: avgDom },
      { '@type': 'PropertyValue', name: 'Homes For Sale', value: selectedSubarea ? o.active : stats.active_count },
      { '@type': 'PropertyValue', name: 'Homes Sold (30d)', value: soldCount },
      { '@type': 'PropertyValue', name: 'Months of Supply', value: absorption ? `${absorption.months.toFixed(1)} months` : null },
    ],
    creator: { '@type': 'RealEstateAgent', name: agent.name },
  }

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${areaLabel} Real Estate Market — Live Stats & Monthly Reports`,
    description: `Live MLS® market statistics and monthly reports for ${areaLabel}. Average price, days on market, sales volume and absorption rate from ${agent.name}.`,
    author: { '@type': 'RealEstateAgent', name: agent.name },
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const itemListJsonLd = tab === 'archive' ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${areaLabel} Monthly Market Reports`,
    description: `Monthly real estate market report archive for ${areaLabel}`,
    itemListElement: [...trend].reverse().slice(0, 12).map((p, i) => {
      const [y, m] = p.month.split('-')
      return {
        '@type': 'ListItem',
        position: i + 1,
        name: `${monthLabel(p.month)} Market Report — ${areaLabel}`,
        url: `${ap('/market-report')}/${y}/${m}`,
      }
    }),
  } : null

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      {itemListJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', padding: '48px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 12 }}>
            Real Estate Market
          </div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', marginBottom: 8 }}>
            {areaLabel} Real Estate Market
          </h1>
          <p style={{ fontSize: 14, color: '#555', maxWidth: 560, margin: 0 }}>
            Live stats and monthly reports across {selectedSubarea || 'the areas'} {firstName} serves — updated every 5 minutes from MLS® data.
          </p>
        </div>
      </div>


      {/* ══ BOARD MARKET OVERVIEW TAB ══════════════════════════════════════ */}
      {/* ══ AGENT'S AREA: inner sub-tabs + full existing content ══════════ */}
      {marketView === 'agent' && (<>

      {/* ── Tab Strip (agent sub-tabs) ───────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        <div className="container" style={{ display: 'flex', padding: '0 var(--container-padding)' }}>
          {[
            { label: 'Overview', href: ap('/market'), desc: 'Live stats, charts & KPIs', active: tab === 'overview' },
            { label: 'Monthly Archive', href: ap('/market/archive'), desc: 'Historical monthly reports', active: tab === 'archive' },
          ].map(t => (
            <a
              key={t.label}
              href={t.href}
              style={{
                padding: '14px 20px',
                fontSize: 13,
                fontWeight: t.active ? 700 : 500,
                color: t.active ? 'var(--primary-bg)' : 'var(--text-muted)',
                borderBottom: t.active ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {t.label}
              <span style={{ fontSize: 10, fontWeight: 400, color: t.active ? 'var(--text-muted)' : 'rgba(107,114,128,0.6)' }}>
                {t.desc}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* ── Subarea Strip (Overview tab only) ──────────────────────────── */}
      {tab === 'overview' && neighbourhoods.length > 0 && (
        <div className="subarea-strip-wrap" style={{ background: '#fff', borderBottom: '1px solid var(--border)', overflowX: 'auto', position: 'relative' }}>
          <div className="container" style={{ display: 'flex', gap: 4, padding: '0 var(--container-padding)' }}>
            <a
              href={ap('/market')}
              style={{
                padding: '10px 14px', fontSize: 12,
                fontWeight: !selectedSubarea ? 700 : 500,
                color: !selectedSubarea ? 'var(--primary-bg)' : 'var(--text-muted)',
                borderBottom: !selectedSubarea ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                textDecoration: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              All Areas
              <span className="tab-count" style={{
                fontSize: 10, fontWeight: 600, background: 'var(--off-white)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', borderRadius: 10, padding: '1px 6px', lineHeight: 1.6,
              }}>
                {neighbourhoods.reduce((sum, n) => sum + (n.active_count ?? 0), 0)}
              </span>
            </a>
            {neighbourhoods.map(n => (
              <a
                key={n.slug}
                href={ap(`/market/${n.slug}`)}
                style={{
                  padding: '10px 14px', fontSize: 12,
                  fontWeight: selectedSubarea === (n.subarea || n.name) ? 700 : 500,
                  color: selectedSubarea === (n.subarea || n.name) ? 'var(--primary-bg)' : 'var(--text-muted)',
                  borderBottom: selectedSubarea === (n.subarea || n.name) ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                  textDecoration: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {n.name}
                {n.active_count > 0 && (
                  <span className="tab-count" style={{
                    fontSize: 10, fontWeight: 600, background: 'var(--off-white)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', borderRadius: 10, padding: '1px 6px', lineHeight: 1.6,
                  }}>
                    {n.active_count}
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="container" style={{ padding: '36px var(--container-padding) 72px' }}>

        {/* ── Archive tab: prose + CTA banner ──────────────────────────── */}
        {tab === 'archive' && archiveProse.length > 0 && (
          <div style={{ marginBottom: 20, maxWidth: 720 }}>
            {archiveProse.map((sentence, i) => (
              <p key={i} style={{
                fontSize: 15, lineHeight: 1.75, color: 'var(--text)', margin: '0 0 6px',
                fontWeight: i === 0 ? 500 : 400,
              }}>
                {sentence}
              </p>
            ))}
          </div>
        )}
        {tab === 'archive' && (
          <div style={{
            background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
            padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 20, flexWrap: 'wrap', marginBottom: 32,
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary-bg)', marginBottom: 4 }}>
                {ctaData.headline}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                {ctaData.sub}
              </p>
            </div>
            <a
              href={ctaData.href}
              style={{
                background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '11px 22px',
                borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {ctaData.btnLabel} →
            </a>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            OVERVIEW TAB
        ════════════════════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <>
            <style>{`
              .market-hero-card { display: flex; gap: 24px; }
              .market-hero-left { flex: 1; min-width: 0; }
              .market-hero-right { flex: 0 0 340px; min-width: 0; }
              @media (max-width: 767px) {
                .market-hero-card { flex-direction: column; }
                .market-hero-right { flex: none; width: 100%; }
              }
              @media (max-width: 479px) {
                .market-hero-right { display: none; }
              }
            `}</style>

            {/* ── 2-col hero: badges + first sentence + CTA / sparkline ── */}
            <div className="market-hero-card" style={{
              background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
              padding: '22px 24px', marginBottom: 28,
            }}>
              <div className="market-hero-left">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span style={{ background: badge.bg, color: badge.color, padding: '5px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                    {badge.label}
                  </span>
                  {absorption && (
                    <span style={{ background: absorption.bg, color: absorption.color, padding: '5px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                      {absorption.months.toFixed(1)} mo supply — {absorption.label}
                    </span>
                  )}
                </div>
                {overviewProse[0] && (
                  <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text)', margin: '0 0 20px', fontWeight: 500 }}>
                    {overviewProse[0]}
                  </p>
                )}
                <a
                  href={ctaData.href}
                  style={{
                    display: 'inline-block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)',
                    padding: '11px 22px', borderRadius: 6, fontWeight: 700, fontSize: 13,
                    textDecoration: 'none', whiteSpace: 'nowrap',
                  }}
                >
                  {ctaData.btnLabel} →
                </a>
              </div>
              {report.monthly_trend.length > 0 && (
                <div className="market-hero-right">
                  <MarketSparklineCard trend={report.monthly_trend} />
                </div>
              )}
            </div>

            <MarketHeadlineStats
              trend={report.monthly_trend}
              subareaParam={selectedSubarea}
              isSubarea={!!selectedSubarea}
              soldCount={soldCount}
              avgSoldPrice={avgSoldPrice}
              avgDom={avgDom}
              activeInventory={headlineActiveInventory}
              ltsRatio={ltsRatio}
              absorptionMonths={absorption ? absorption.months : null}
              hasBaseDom={headlineHasBaseDom}
            />

            {/* Quick action links */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20, marginBottom: 4 }}>
              <a href={ap('/homes-for-sale')} style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '9px 18px', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>View Homes For Sale</a>
              <a href={ap('/sold')} style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 18px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>Recently Sold</a>
              <a href={ap('/home-evaluation')} style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 18px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>Free Home Evaluation</a>
              <a href="?tab=archive" style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 18px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>Monthly Reports →</a>
            </div>

            {/* Interactive 3-year chart — immediately after quick-action links */}
            {report.monthly_trend.length > 0 && (
              <InteractiveMarketChart trend={report.monthly_trend} priceByType={report.monthly_trend_by_type} />
            )}

            {/* Benchmark prices by type + investment insight */}
            {report.by_type.length > 0 && (
              <BenchmarkPriceTable
                byType={report.by_type}
                trendByType={report.monthly_trend_by_type}
                areaLabel={areaLabel}
              />
            )}

            {/* By Property Type — interactive bar chart */}
            {report.by_type.length > 0 && (
              <PropertyTypeBarChart byType={report.by_type} />
            )}

            {/* Price matrix: bedrooms × type */}
            <PriceMatrixGrid matrix={priceMatrix} />

            {/* Neighbourhood bar chart */}
            {!selectedSubarea && neighbourhoodRows.length > 0 && (
              <NeighbourhoodBarChart rows={neighbourhoodRows} agentPath={agentPrefix} />
            )}

            {/* Month-over-month comparison table */}
            <MonthComparisonTable trend={report.monthly_trend} />

            {/* By Property Type detail table (tabs connected) + recently sold */}
            <MarketStatsInteractive
              byType={report.by_type}
              soldListings={soldListings}
              maxTypePrice={maxTypePrice}
              slug={slug}
              agentPrefix={agentPrefix}
              hideVisualBars={true}
            />

            {/* Neighbourhood sortable table */}
            {!selectedSubarea && neighbourhoodRows.length > 0 && (
              <section style={{ marginTop: 44 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', margin: 0 }}>Neighbourhood Breakdown</h2>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click headers to sort · Click neighbourhood to drill down</span>
                </div>
                <NeighbourhoodBreakdownTable rows={neighbourhoodRows} agentPath={agentPrefix} />
              </section>
            )}

            {/* Market breakdown charts — age, levels, lot size, bathrooms */}
            <MarketBreakdownCharts breakdown={breakdown} areaLabel={areaLabel} />

            {/* FAQ section */}
            <section style={{ marginTop: 56 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 20 }}>
                Frequently Asked Questions — {areaLabel} Market
              </h2>
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                {faqs.map((faq, i) => (
                  <details key={i} style={{ borderBottom: i < faqs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <summary style={{ padding: '16px 20px', fontSize: 14, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', background: '#fff', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <span>{faq.q}</span>
                      <span style={{ color: 'var(--accent)', fontSize: 20, flexShrink: 0, lineHeight: 1 }}>+</span>
                    </summary>
                    <div style={{ padding: '0 20px 18px', background: 'var(--off-white)', fontSize: 14, color: 'var(--text)', lineHeight: 1.8 }}>
                      {faq.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>

            {/* Markets by Neighbourhood grid */}
            {!selectedSubarea && neighbourhoods.length > 0 && (
              <section style={{ marginTop: 56 }}>
                <div style={{ marginBottom: 18 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 6px' }}>
                    Markets by Neighbourhood
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                    Dedicated market stats pages for each neighbourhood — condos, townhouses, and houses.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                  {neighbourhoods.map(n => (
                    <div
                      key={n.slug}
                      style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', display: 'block' }}
                    >
                      <a href={ap(`/market/${n.slug}`)} style={{ textDecoration: 'none', display: 'block', marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary-bg)', marginBottom: 4 }}>
                          {n.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {n.city}
                          {n.active_count > 0 ? ` · ${n.active_count} active` : ''}
                        </div>
                      </a>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(['condos', 'townhouses', 'houses'] as const).map(t => {
                          const typeMap = { condos: 'Apartment', townhouses: 'Townhouse', houses: 'House' }
                          return (
                            <a
                              key={t}
                              href={ap(`/homes-for-sale?subarea=${encodeURIComponent(n.subarea || n.name)}&type=${typeMap[t]}`)}
                              style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--off-white)', border: '1px solid var(--border)', padding: '3px 9px', borderRadius: 5, textDecoration: 'none', textTransform: 'capitalize' }}
                            >
                              {t}
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ARCHIVE TAB
        ════════════════════════════════════════════════════════════════ */}
        {tab === 'archive' && (
          <>
            {/* Email capture strip */}
            <MarketEmailCapture
              slug={slug}
              currentMonthLabel={latestPoint ? monthLabel(latestPoint.month) : currentMonthFull}
            />

            {/* Subarea pill strip (archive tab) */}
            {neighbourhoods.length > 0 && (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', marginBottom: 28, borderBottom: '1px solid var(--border)', background: '#fff', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 4, padding: '10px 12px', minWidth: 'max-content' }}>
                  <a
                    href={ap('/market/archive')}
                    style={{
                      padding: '7px 14px', fontSize: 12, borderRadius: 20, textDecoration: 'none', whiteSpace: 'nowrap',
                      fontWeight: !rawSubareaParam ? 700 : 500,
                      background: !rawSubareaParam ? 'var(--primary-bg)' : 'var(--off-white)',
                      color: !rawSubareaParam ? '#fff' : 'var(--text-muted)',
                      border: `1px solid ${!rawSubareaParam ? 'var(--primary-bg)' : 'var(--border)'}`,
                    }}
                  >
                    All Areas
                  </a>
                  {neighbourhoods.map(n => {
                    const isActive = rawSubareaParam === n.slug
                    return (
                      <a
                        key={n.slug}
                        href={ap(`/market/archive/${n.slug}`)}
                        style={{
                          padding: '7px 14px', fontSize: 12, borderRadius: 20, textDecoration: 'none', whiteSpace: 'nowrap',
                          fontWeight: isActive ? 700 : 500,
                          background: isActive ? 'var(--primary-bg)' : 'var(--off-white)',
                          color: isActive ? '#fff' : 'var(--text-muted)',
                          border: `1px solid ${isActive ? 'var(--primary-bg)' : 'var(--border)'}`,
                        }}
                      >
                        {n.name}
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Featured latest month card */}
            {latestPoint && (
              <div style={{ background: 'var(--primary-bg)', borderRadius: 12, padding: '28px 32px', marginBottom: 40, display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }} className="featured-card">
                <div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ background: badge.bg, color: badge.color, padding: '4px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>
                      {badge.label}
                    </span>
                    {consecutiveMonths >= 2 && (
                      <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 13 }}>
                        {consecutiveMonths} consecutive months
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: 22, marginBottom: 14, lineHeight: 1.2 }}>
                    {monthLabel(latestPoint.month)} {latestYear} · {areaLabel}
                    {activeNorm && featuredTypeRow ? ` ${activeNorm}s` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Sold</div>
                      <a href={ap(`/sold?month=${latestPoint.month}`)} style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 18, textDecoration: 'none' }}>
                        {(featuredTypeRow?.sold_30d ?? latestPoint.sold).toLocaleString()} →
                      </a>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Avg Price</div>
                      <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>
                        {mPrice(featuredTypeRow?.avg_sold_price ?? latestPoint.avg_price)}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Avg DOM</div>
                      <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 15 }}>
                        {(featuredTypeRow?.avg_dom ?? latestPoint.avg_dom)}d
                      </span>
                    </div>
                    {listToSale && (
                      <div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>List-to-Sale</div>
                        <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: 15 }}>
                          {listToSale}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {latestYear && latestMonth && (
                  <a
                    href={(() => {
                      const base = rawSubareaParam
                        ? ap(`/market-report/${latestYear}/${latestMonth}/${rawSubareaParam}`)
                        : ap(`/market-report/${latestYear}/${latestMonth}`)
                      return activeTypeSlug ? `${base}/${activeTypeSlug}` : base
                    })()}
                    className="featured-card-btn"
                    style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '13px 22px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    Read Full Report →
                  </a>
                )}
              </div>
            )}

            {/* Property type filter */}
            <Suspense fallback={<div style={{ height: 45, borderBottom: '1px solid var(--border)', marginBottom: 24 }} />}>
              <ReportFilterBar activeType={activeType} selectedMonth={selectedMonth} />
            </Suspense>

            {/* Monthly Archive Table */}
            {trend.length > 0 && (
              <section style={{ marginBottom: 56 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-bg)', margin: 0 }}>
                    Monthly Archive
                    {activeNorm && (
                      <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>· {activeNorm}s</span>
                    )}
                  </h2>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filteredArchiveTrend.length} months tracked</span>
                </div>

                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <table className="archive-table" style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', background: '#fff' }}>
                    <thead>
                      <tr style={{ background: 'var(--off-white)', borderBottom: '2px solid var(--border)' }}>
                        <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Month</th>
                        <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Market</th>
                        <th style={{ padding: '11px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Sold</th>
                        <th style={{ padding: '11px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Condo</th>
                        <th style={{ padding: '11px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Town</th>
                        <th style={{ padding: '11px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>House</th>
                        <th style={{ padding: '11px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Duplex</th>
                        <th style={{ padding: '11px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Avg Price</th>
                        <th style={{ padding: '11px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Avg DOM</th>
                        <th style={{ padding: '11px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Trend</th>
                        <th style={{ padding: '11px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredArchiveTrend.length === 0 ? (
                        <tr>
                          <td colSpan={11} style={{ padding: '22px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                            No monthly data available for this property type.
                          </td>
                        </tr>
                      ) : filteredArchiveTrend.map((p, idx, arr) => {
                        const prev = idx < arr.length - 1 ? arr[idx + 1] : null
                        const trendArrow = deriveTrendLabel(p, prev)
                        const mtLabel = monthlyMarketBadge(p.active, p.sold) ?? { label: '—', bg: '#f3f4f6', color: '#9ca3af' }
                        const [y, m] = p.month.split('-')
                        const trendColor = trendArrow === '↑' ? '#059669' : trendArrow === '↓' ? '#dc2626' : 'var(--text-muted)'
                        const isFeatured = p.month === (selectedMonth ?? latestMonthKey)
                        const isEven = idx % 2 === 1
                        const typePoint = typeByMonthMap[p.month]
                        const rowAvgPrice = activePriceKey && typePoint && typePoint[activePriceKey]
                          ? typePoint[activePriceKey] as number
                          : p.avg_price

                        const condoSold = typePoint?.apartment_sold ?? null
                        const townSold = typePoint?.townhouse_sold ?? null
                        const houseSold = typePoint?.house_sold ?? null
                        const duplexSold = typePoint?.duplex_sold ?? null

                        const reportBase = rawSubareaParam
                          ? ap(`/market-report/${y}/${m}/${rawSubareaParam}`)
                          : ap(`/market-report/${y}/${m}`)

                        function typeCountCell(count: number | null | undefined, typeSlug: string) {
                          if (!count) return <td style={{ padding: '13px 12px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-muted)' }}>—</td>
                          return (
                            <td style={{ padding: '13px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <a href={`${reportBase}/${typeSlug}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
                                {count}
                              </a>
                            </td>
                          )
                        }

                        return (
                          <tr
                            key={p.month}
                            style={{
                              background: isFeatured ? 'rgba(var(--accent-rgb, 180,140,80), 0.06)' : isEven ? 'var(--off-white)' : '#fff',
                              borderLeft: isFeatured ? '3px solid var(--accent)' : '3px solid transparent',
                              borderBottom: '1px solid var(--border)',
                            }}
                          >
                            <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                              <span style={{ fontWeight: isFeatured ? 800 : 600, fontSize: 14, color: 'var(--text)' }}>
                                {monthLabel(p.month)} {p.month.split('-')[0]}
                              </span>
                              {isFeatured && (
                                <span style={{ marginLeft: 8, background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase', verticalAlign: 'middle' }}>
                                  {p.month === latestMonthKey ? 'Latest' : 'Selected'}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                              <span style={{ background: mtLabel.bg, color: mtLabel.color, padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                {mtLabel.label}
                              </span>
                            </td>
                            <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <a href={ap(`/sold?month=${p.month}`)} style={{ fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', fontSize: 14 }}>
                                {p.sold} →
                              </a>
                            </td>
                            {typeCountCell(condoSold, 'condos')}
                            {typeCountCell(townSold, 'townhouses')}
                            {typeCountCell(houseSold, 'houses')}
                            {typeCountCell(duplexSold, 'duplexes')}
                            <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                              {mPrice(rowAvgPrice)}
                            </td>
                            <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
                              {p.avg_dom}d
                            </td>
                            <td style={{ padding: '13px 16px', textAlign: 'center', fontSize: 20, fontWeight: 800, color: trendColor, lineHeight: 1 }}>
                              {trendArrow}
                            </td>
                            <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                                <a href={activeTypeSlug ? `${reportBase}/${activeTypeSlug}` : reportBase} style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                                  Read Report →
                                </a>
                                <a href={ap('/homes-for-sale')} className="archive-active-link" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none' }}>
                                  Browse active →
                                </a>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Neighbourhood Market Pulse Table */}
            {neighbourhoods.length > 0 && neighReports.length > 0 && (
              <section style={{ marginBottom: 56 }}>
                <div style={{ marginBottom: 16 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 6px' }}>
                    Neighbourhood Market Pulse
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                    Absorption rate, price trend and avg sold price by neighbourhood — live MLS® data.
                  </p>
                </div>

                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <table className="pulse-table" style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', background: '#fff' }}>
                    <thead>
                      <tr style={{ background: 'var(--off-white)', borderBottom: '2px solid var(--border)' }}>
                        <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Neighbourhood</th>
                        <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Market</th>
                        <th style={{ padding: '11px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Absorption</th>
                        <th style={{ padding: '11px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Avg Sold (30d)</th>
                        <th style={{ padding: '11px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Condo Avg</th>
                        <th style={{ padding: '11px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Town Avg</th>
                        <th style={{ padding: '11px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>House Avg</th>
                        <th style={{ padding: '11px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Sold 30d</th>
                      </tr>
                    </thead>
                    <tbody>
                      {neighbourhoods.map((n, i) => {
                        const neigh = neighReports[i]
                        if (!neigh) return null
                        const ab = absorptionBadge(neigh.overall)
                        const byType = neigh.by_type
                        const totalSold = byType.reduce((s, r) => s + r.sold_30d, 0)

                        const condoRow = byType.find(r => normalizePropertyType(r.type) === 'Condo')
                        const townRow = byType.find(r => normalizePropertyType(r.type) === 'Town')
                        const houseRow = byType.find(r => normalizePropertyType(r.type) === 'House')
                        const isEven = i % 2 === 1
                        const subareaParam = encodeURIComponent(n.subarea || n.name)

                        return (
                          <tr
                            key={n.slug}
                            style={{
                              background: isEven ? 'var(--off-white)' : '#fff',
                              borderBottom: '1px solid var(--border)',
                            }}
                          >
                            <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <a
                                  href={ap(`/market/${n.slug}`)}
                                  style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-bg)', textDecoration: 'none' }}
                                >
                                  {n.name}
                                </a>
                                <a
                                  href={ap(`/homes-for-sale?subarea=${subareaParam}`)}
                                  style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
                                >
                                  Active →
                                </a>
                              </div>
                            </td>
                            <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                              {ab ? (
                                <span style={{ background: ab.bg, color: ab.color, padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                  {ab.label}
                                </span>
                              ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                            </td>
                            <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
                              {ab ? `${ab.months.toFixed(1)} mo` : '—'}
                            </td>
                            <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                              {neigh.overall.avg_sold_price > 0 ? mPrice(neigh.overall.avg_sold_price) : '—'}
                            </td>
                            <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {condoRow ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{mPrice(condoRow.avg_sold_price)}</span>
                                  <a href={ap(`/sold?subarea=${subareaParam}&type=${encodeURIComponent('Apartment')}`)} style={{ fontSize: 10, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                                    {condoRow.sold_30d} sold →
                                  </a>
                                </div>
                              ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                            </td>
                            <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {townRow ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{mPrice(townRow.avg_sold_price)}</span>
                                  <a href={ap(`/sold?subarea=${subareaParam}&type=${encodeURIComponent('Townhouse')}`)} style={{ fontSize: 10, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                                    {townRow.sold_30d} sold →
                                  </a>
                                </div>
                              ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                            </td>
                            <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {houseRow ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{mPrice(houseRow.avg_sold_price)}</span>
                                  <a href={ap(`/sold?subarea=${subareaParam}&type=${encodeURIComponent('House')}`)} style={{ fontSize: 10, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                                    {houseRow.sold_30d} sold →
                                  </a>
                                </div>
                              ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                            </td>
                            <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {totalSold > 0 ? (
                                <a href={ap(`/sold?subarea=${subareaParam}`)} style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
                                  {totalSold} →
                                </a>
                              ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Markets by Neighbourhood grid (archive tab) */}
            {neighbourhoods.length > 0 && (
              <section style={{ marginBottom: 56 }}>
                <div style={{ marginBottom: 18 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 6px' }}>
                    Markets by Neighbourhood
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                    Monthly market report archives for each neighbourhood — condos, townhouses, houses, and duplexes.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                  {neighbourhoods.map(n => (
                    <div
                      key={n.slug}
                      style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', display: 'block' }}
                    >
                      <a href={ap(`/market/archive/${n.slug}`)} style={{ textDecoration: 'none', display: 'block', marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary-bg)', marginBottom: 4 }}>
                          {n.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {n.city}
                          {n.active_count > 0 ? ` · ${n.active_count} active` : ''}
                        </div>
                      </a>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(['condos', 'townhouses', 'houses', 'duplexes'] as const).map(t => {
                          const labelMap = { condos: 'Condos', townhouses: 'Towns', houses: 'Houses', duplexes: 'Duplexes' }
                          const typeMap = { condos: 'Apartment', townhouses: 'Townhouse', houses: 'House', duplexes: 'Duplex' }
                          return (
                            <a
                              key={t}
                              href={ap(`/homes-for-sale?subarea=${encodeURIComponent(n.subarea || n.name)}&type=${typeMap[t]}`)}
                              style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--off-white)', border: '1px solid var(--border)', padding: '3px 9px', borderRadius: 5, textDecoration: 'none' }}
                            >
                              {labelMap[t]}
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Internal links */}
            <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 26px', marginBottom: 44 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-bg)', marginBottom: 12 }}>
                Explore more market data
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { label: 'Live Market Overview', href: ap('/market') },
                  { label: 'All Homes For Sale', href: ap('/homes-for-sale') },
                  { label: 'Recently Sold Homes', href: ap('/sold') },
                  { label: 'All Neighbourhoods', href: ap('/neighbourhoods') },
                  { label: 'Price Matrix', href: ap('/price-matrix') },
                ].map(l => (
                  <a key={l.href} href={l.href} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}>
                    {l.label}
                  </a>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ── Agent CTA panel (both tabs) ──────────────────────────────── */}
        <div style={{ marginTop: 48, background: 'var(--primary-bg)', borderRadius: 10, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
              {tab === 'archive' ? `What's your home worth right now?` : `Wondering what your home is worth in this market?`}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
              Get a free, data-driven evaluation from {firstName} — no obligation, based on actual recent sales.
            </div>
          </div>
          <a
            href={ap('/home-evaluation')}
            style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', border: 'none', padding: '14px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-block' }}
          >
            Free Valuation →
          </a>
        </div>
      </div>

      </>)}

      <PageQuickLinks slug={slug} context="market" exclude="/market" />

      <style>{`
        details summary::-webkit-details-marker{display:none}
        details[open] summary span:last-child{transform:rotate(45deg);display:inline-block}
        @media(max-width:640px){.tab-count{display:none}}
        @media(max-width:900px){.featured-card{grid-template-columns:1fr!important}}
        @media(max-width:767px){
          .featured-card{grid-template-columns:1fr!important}
          .featured-card-btn{display:block;width:100%;text-align:center;box-sizing:border-box}
          .archive-table th:nth-child(6),.archive-table td:nth-child(6){display:none}
          .archive-active-link{display:none!important}
          .archive-table{min-width:0!important}
          .pulse-table th:nth-child(3),.pulse-table td:nth-child(3){display:none}
          .pulse-table th:nth-child(5),.pulse-table td:nth-child(5){display:none}
          .pulse-table th:nth-child(6),.pulse-table td:nth-child(6){display:none}
          .pulse-table th:nth-child(7),.pulse-table td:nth-child(7){display:none}
          .pulse-table{min-width:0!important}
        }
        .archive-table tr:last-child td{border-bottom:none}
        .pulse-table tr:last-child td{border-bottom:none}
        .archive-table th,.pulse-table th{position:sticky;top:0}
        .archive-table a:hover,.pulse-table a:hover{text-decoration:underline}
        .subarea-strip-wrap::after{content:'';position:absolute;top:0;right:0;bottom:0;width:56px;background:linear-gradient(to right,transparent,rgba(255,255,255,0.95));pointer-events:none;z-index:1}
      `}</style>
    </div>
  )
}
