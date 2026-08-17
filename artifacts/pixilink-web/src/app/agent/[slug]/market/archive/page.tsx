import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getMarketReport, getNeighbourhoods, agentCanonicalBase, resolveAgentPrefix } from '@/lib/api'
import { formatPrice, formatPriceFull } from '@/lib/types'
import { marketBadge, absorptionBadge, monthLabel, normalizeCity, monthlyMarketBadge } from '@/lib/market'
import PageQuickLinks from '@/components/PageQuickLinks'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { MonthlyTrendPoint, MarketType, NeighbourhoodSummary, MarketReportTypeRow } from '@/lib/types'


function mPrice(p: number | null | undefined): string { return p ? formatPrice(p) : 'N/A' }
function mPriceFull(p: number | null | undefined): string { return p ? formatPriceFull(p) : 'N/A' }

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const revalidate = 300

const TABS = ['All Types', 'Condos', 'Townhouses', 'Detached', 'Duplexes'] as const
const TYPE_LABEL_TO_SLUG: Record<string, string> = {
  Condos: 'condos', Townhouses: 'townhouses', Detached: 'detached', Duplexes: 'duplexes',
}

function buildAreaLabel(neighbourhoods: NeighbourhoodSummary[]): string {
  const cities = [...new Set(neighbourhoods.map(n => normalizeCity(n.city)))]
  return cities.length === 0 ? 'Local Area' : cities.join(' & ')
}

function normalizePropertyType(type: string): 'Condo' | 'Town' | 'House' | 'Duplex' | null {
  const t = type.toLowerCase()
  if (t.includes('apartment') || t.includes('condo')) return 'Condo'
  if (t.includes('townhouse') || t.includes('row') || t.includes('town')) return 'Town'
  if (t === 'duplex' || t === 'half duplex' || t.startsWith('duplex')) return 'Duplex'
  if (t.includes('house') || t.includes('detach') || t.includes('single')) return 'House'
  return null
}

function deriveTrendLabel(curr: MonthlyTrendPoint, prev: MonthlyTrendPoint | null): '↑' | '→' | '↓' {
  if (!prev) return '→'
  const pct = ((curr.avg_price - prev.avg_price) / (prev.avg_price || 1)) * 100
  if (pct >= 0.5) return '↑'
  if (pct <= -0.5) return '↓'
  return '→'
}


function countConsecutiveMarket(trend: MonthlyTrendPoint[], marketType: MarketType): number {
  let count = 0
  for (let i = trend.length - 1; i >= 1; i--) {
    const delta = ((trend[i].avg_price - trend[i - 1].avg_price) / (trend[i - 1].avg_price || 1)) * 100
    if (marketType === 'sellers' || marketType === 'strong-sellers') { if (delta > -1.5) count++; else break }
    else if (marketType === 'buyers') { if (delta < 1.5) count++; else break }
    else { if (Math.abs(delta) <= 2) count++; else break }
  }
  return Math.max(count, 1)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [agent, neighbourhoods] = await Promise.all([getAgent(slug), getNeighbourhoods(slug)])
  const area = buildAreaLabel(neighbourhoods)
  const agentName = agent?.name || 'Your Local Agent'
  const domain = agentCanonicalBase(agent)
  const monthYear = new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
  const title = `${area} Real Estate Market Reports — ${monthYear} | ${agentName}`
  const desc = `Monthly real estate market reports for ${area}: 3 years of sales data, avg prices, days on market and market conditions — updated monthly from MLS® records.`
  return {
    title, description: desc,
    alternates: { canonical: `https://${domain}/market/archive` },
    openGraph: { title, description: desc, type: 'website' },
    twitter: { card: 'summary', title, description: desc },
  }
}

export default async function MarketArchivePage({ params, searchParams: _searchParams }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const [agent, neighbourhoods, report] = await Promise.all([
    getAgent(slug),
    getNeighbourhoods(slug),
    getMarketReport(slug),
  ])
  if (!agent) notFound()
  requireNotShowcase(agent)
  if (!agent.features?.market_intelligence) notFound()

  const areaLabel = buildAreaLabel(neighbourhoods)
  const firstName = agent.name.split(' ')[0]

  const o = report.overall
  const badge = marketBadge(o.market_type)
  const trend = report.monthly_trend
  const latestMonthKey = trend.length > 0 ? trend[trend.length - 1].month : null
  const archiveTrend = [...trend].reverse()

  const consecutiveMonths = trend.length > 0 ? countConsecutiveMarket(trend, o.market_type) : 0
  const totalSold12mo = trend.reduce((s, p) => s + p.sold, 0)

  const archiveProse: string[] = []
  if (totalSold12mo > 0) archiveProse.push(`Over the past 3 years, ${totalSold12mo.toLocaleString()} homes sold across ${areaLabel}${o.avg_sold_price ? ` with an average sold price of ${mPriceFull(o.avg_sold_price)}` : ''}.`)
  if (consecutiveMonths >= 2) archiveProse.push(`The market has remained a ${badge.label.toLowerCase()} for ${consecutiveMonths} consecutive months, based on MLS® absorption rate data.`)
  else archiveProse.push(`Current conditions favour ${o.market_type === 'buyers' ? 'buyers' : o.market_type === 'balanced' ? 'neither buyers nor sellers — a balanced market' : 'sellers'}, though conditions vary by neighbourhood and property type.`)

  const neighReports = neighbourhoods.length > 0
    ? await Promise.all(neighbourhoods.map(n => getMarketReport(slug, n.subarea || n.name)))
    : []

  // Helper: build a clean archive URL from optional type slug + optional subarea slug
  function archiveHref(typeSlug: string | null, subareaSlug: string | null): string {
    if (!typeSlug && !subareaSlug) return ap('/market/archive')
    if (!typeSlug) return ap(`/market/archive/${subareaSlug}`)
    if (!subareaSlug) return ap(`/market/archive/${typeSlug}`)
    return ap(`/market/archive/${typeSlug}/${subareaSlug}`)
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: ap('/') },
      { '@type': 'ListItem', position: 2, name: 'Market', item: ap('/market') },
      { '@type': 'ListItem', position: 3, name: 'Monthly Archive', item: ap('/market/archive') },
    ],
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Hero */}
      <div style={{ background: '#fff', padding: '48px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 12 }}>Real Estate Market</div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', marginBottom: 8 }}>
            {areaLabel} Market Reports
          </h1>
          <p style={{ fontSize: 14, color: '#555', maxWidth: 560, margin: 0 }}>
            Monthly market report archive — sales volume, average prices and market conditions from MLS® data.
          </p>
        </div>
      </div>

      {/* Tab Strip */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        <div className="container" style={{ display: 'flex', padding: '0 var(--container-padding)' }}>
          {[
            { label: 'Overview', href: ap('/market'), active: false, desc: 'Live stats, charts & KPIs' },
            { label: 'Monthly Archive', href: ap('/market/archive'), active: true, desc: 'Historical monthly reports' },
          ].map(t => (
            <a key={t.label} href={t.href} style={{
              padding: '14px 20px', fontSize: 13, fontWeight: t.active ? 700 : 500,
              color: t.active ? 'var(--primary-bg)' : 'var(--text-muted)',
              borderBottom: t.active ? '2.5px solid var(--accent)' : '2.5px solid transparent',
              textDecoration: 'none', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              {t.label}
              <span style={{ fontSize: 10, fontWeight: 400, color: t.active ? 'var(--text-muted)' : 'rgba(107,114,128,0.6)' }}>{t.desc}</span>
            </a>
          ))}
        </div>
      </div>

      <div className="container" style={{ padding: '36px var(--container-padding) 72px' }}>

        {/* Archive prose */}
        {archiveProse.length > 0 && (
          <div style={{ marginBottom: 20, maxWidth: 720 }}>
            {archiveProse.map((s, i) => (
              <p key={i} style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text)', margin: '0 0 6px', fontWeight: i === 0 ? 500 : 400 }}>{s}</p>
            ))}
          </div>
        )}

        {/* Filter bar — type (row 1) × subarea (row 2) */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 28, overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: neighbourhoods.length > 0 ? '1px solid var(--border)' : 'none', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {TABS.map(tab => {
              const isActive = tab === 'All Types'
              const href = archiveHref(tab === 'All Types' ? null : TYPE_LABEL_TO_SLUG[tab], null)
              return (
                <a key={tab} href={href} style={{
                  padding: '11px 18px', fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap', display: 'block',
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? 'var(--text)' : 'var(--text-muted)',
                  borderBottom: isActive ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                }}>{tab}</a>
              )
            })}
          </div>
          {neighbourhoods.length > 0 && (
            <div style={{ display: 'flex', gap: 4, padding: '10px 12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              <a href={ap('/market/archive')} style={{
                padding: '5px 12px', fontSize: 12, borderRadius: 20, textDecoration: 'none', whiteSpace: 'nowrap',
                fontWeight: 700, background: 'var(--primary-bg)', color: '#fff', border: '1px solid var(--primary-bg)',
              }}>All Areas</a>
              {neighbourhoods.map(n => (
                <a key={n.slug} href={archiveHref(null, n.slug)} style={{
                  padding: '5px 12px', fontSize: 12, borderRadius: 20, textDecoration: 'none', whiteSpace: 'nowrap',
                  fontWeight: 500, background: 'var(--off-white)', color: 'var(--text-muted)', border: '1px solid var(--border)',
                }}>{n.name}</a>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Archive Table */}
        {trend.length > 0 && (
          <section style={{ marginBottom: 56 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-bg)', margin: 0 }}>Monthly Archive</h2>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{archiveTrend.length} months tracked</span>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: 10, border: '1px solid var(--border)' }}>
              <table className="archive-table" style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', background: '#fff' }}>
                <thead>
                  <tr style={{ background: 'var(--off-white)', borderBottom: '2px solid var(--border)' }}>
                    {['Month','Market','Sold','Condo','Town','House','Duplex','Avg Price','Avg DOM','Trend','Actions'].map((h, i) => (
                      <th key={h} style={{ padding: i < 3 || i >= 7 ? '11px 16px' : '11px 12px', textAlign: i >= 2 && i !== 9 ? 'right' : i === 9 ? 'center' : 'left', fontSize: i >= 3 && i <= 6 ? 10 : 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {archiveTrend.map((p, idx, arr) => {
                    const prev = idx < arr.length - 1 ? arr[idx + 1] : null
                    const trendArrow = deriveTrendLabel(p, prev)
                    const mtLabel = monthlyMarketBadge(p.active, p.sold) ?? { label: '—', bg: '#f3f4f6', color: '#9ca3af' }
                    const [y, m] = p.month.split('-')
                    const trendColor = trendArrow === '↑' ? '#059669' : trendArrow === '↓' ? '#dc2626' : 'var(--text-muted)'
                    const isFeatured = p.month === latestMonthKey
                    const isEven = idx % 2 === 1
                    const typePoint = report.monthly_trend_by_type.find(tp => tp.month === p.month)
                    const condoSold = typePoint?.apartment_sold ?? null
                    const townSold = typePoint?.townhouse_sold ?? null
                    const houseSold = typePoint?.house_sold ?? null
                    const duplexSold = typePoint?.duplex_sold ?? null
                    const reportBase = ap(`/market-report/${y}/${m}`)
                    function typeCountCell(count: number | null | undefined, typeSlug: string) {
                      if (!count) return <td style={{ padding: '13px 12px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-muted)' }}>—</td>
                      return <td style={{ padding: '13px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}><a href={`${reportBase}/${typeSlug}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>{count}</a></td>
                    }
                    return (
                      <tr key={p.month} style={{
                        background: isFeatured ? 'rgba(180,140,80,0.06)' : isEven ? 'var(--off-white)' : '#fff',
                        borderLeft: isFeatured ? '3px solid var(--accent)' : '3px solid transparent',
                        borderBottom: '1px solid var(--border)',
                      }}>
                        <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: isFeatured ? 800 : 600, fontSize: 14, color: 'var(--text)' }}>{monthLabel(p.month)} {p.month.split('-')[0]}</span>
                          {isFeatured && <span style={{ marginLeft: 8, background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase', verticalAlign: 'middle' }}>Latest</span>}
                        </td>
                        <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                          <span style={{ background: mtLabel.bg, color: mtLabel.color, padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{mtLabel.label}</span>
                        </td>
                        <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <a href={ap(`/sold?month=${p.month}`)} style={{ fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', fontSize: 14 }}>{p.sold} →</a>
                        </td>
                        {typeCountCell(condoSold, 'condos')}
                        {typeCountCell(townSold, 'townhouses')}
                        {typeCountCell(houseSold, 'houses')}
                        {typeCountCell(duplexSold, 'duplexes')}
                        <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{mPrice(p.avg_price)}</td>
                        <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{p.avg_dom}d</td>
                        <td style={{ padding: '13px 16px', textAlign: 'center', fontSize: 20, fontWeight: 800, color: trendColor, lineHeight: 1 }}>{trendArrow}</td>
                        <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                            <a href={reportBase} style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Read Report →</a>
                            <a href={ap('/homes-for-sale')} className="archive-active-link" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none' }}>Browse active →</a>
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
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 6px' }}>Neighbourhood Market Pulse</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Absorption rate, price trend and avg sold price by neighbourhood — live MLS® data.</p>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: 10, border: '1px solid var(--border)' }}>
              <table className="pulse-table" style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', background: '#fff' }}>
                <thead>
                  <tr style={{ background: 'var(--off-white)', borderBottom: '2px solid var(--border)' }}>
                    {['Neighbourhood','Market','Absorption','Avg Sold (30d)','Condo Avg','Town Avg','House Avg','Sold 30d'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: h === 'Neighbourhood' || h === 'Market' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {neighbourhoods.map((n, i) => {
                    const neigh = neighReports[i]
                    if (!neigh) return null
                    const ab = absorptionBadge(neigh.overall)
                    const byType = neigh.by_type
                    const totalSold = byType.reduce((s: number, r: MarketReportTypeRow) => s + r.sold_30d, 0)
                    const condoRow = byType.find((r: MarketReportTypeRow) => normalizePropertyType(r.type) === 'Condo')
                    const townRow = byType.find((r: MarketReportTypeRow) => normalizePropertyType(r.type) === 'Town')
                    const houseRow = byType.find((r: MarketReportTypeRow) => normalizePropertyType(r.type) === 'House')
                    const isEven = i % 2 === 1
                    const subareaParam = encodeURIComponent(n.subarea || n.name)
                    return (
                      <tr key={n.slug} style={{ background: isEven ? 'var(--off-white)' : '#fff', borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <a href={ap(`/market/${n.slug}`)} style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-bg)', textDecoration: 'none' }}>{n.name}</a>
                            <a href={ap(`/homes-for-sale?subarea=${subareaParam}`)} style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Active →</a>
                          </div>
                        </td>
                        <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                          {ab ? <span style={{ background: ab.bg, color: ab.color, padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{ab.label}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{ab ? `${ab.months.toFixed(1)} mo` : '—'}</td>
                        <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{neigh.overall.avg_sold_price > 0 ? mPrice(neigh.overall.avg_sold_price) : '—'}</td>
                        <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {condoRow ? <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{mPrice(condoRow.avg_sold_price)}</span><a href={ap(`/sold?subarea=${subareaParam}&type=${encodeURIComponent('Apartment')}`)} style={{ fontSize: 10, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{condoRow.sold_30d} sold →</a></div> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {townRow ? <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{mPrice(townRow.avg_sold_price)}</span><a href={ap(`/sold?subarea=${subareaParam}&type=${encodeURIComponent('Townhouse')}`)} style={{ fontSize: 10, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{townRow.sold_30d} sold →</a></div> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {houseRow ? <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{mPrice(houseRow.avg_sold_price)}</span><a href={ap(`/sold?subarea=${subareaParam}&type=${encodeURIComponent('House')}`)} style={{ fontSize: 10, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{houseRow.sold_30d} sold →</a></div> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {totalSold > 0 ? <a href={ap(`/sold?subarea=${subareaParam}`)} style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>{totalSold} →</a> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Markets by Neighbourhood grid */}
        {neighbourhoods.length > 0 && (
          <section style={{ marginBottom: 56 }}>
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 6px' }}>Markets by Neighbourhood</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Monthly market report archives for each neighbourhood — condos, townhouses, detached homes, and duplexes.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {neighbourhoods.map(n => (
                <div key={n.slug} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
                  <a href={ap(`/market/archive/${n.slug}`)} style={{ textDecoration: 'none', display: 'block', marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary-bg)', marginBottom: 4 }}>{n.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.city}{n.active_count > 0 ? ` · ${n.active_count} active` : ''}</div>
                  </a>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(Object.entries(TYPE_LABEL_TO_SLUG) as [string, string][]).map(([label, tSlug]) => (
                      <a key={tSlug} href={archiveHref(tSlug, n.slug)} style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--off-white)', border: '1px solid var(--border)', padding: '3px 9px', borderRadius: 5, textDecoration: 'none' }}>{label}</a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Internal links */}
        <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 26px', marginBottom: 44 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-bg)', marginBottom: 12 }}>Explore more market data</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              { label: 'Live Market Overview', href: ap('/market') },
              { label: 'All Homes For Sale', href: ap('/homes-for-sale') },
              { label: 'Recently Sold Homes', href: ap('/sold') },
              { label: 'All Neighbourhoods', href: ap('/neighbourhoods') },
              { label: 'Price Matrix', href: ap('/price-matrix') },
            ].map(l => (
              <a key={l.href} href={l.href} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}>{l.label}</a>
            ))}
          </div>
        </section>

        {/* Agent CTA */}
        <div style={{ background: 'var(--primary-bg)', borderRadius: 10, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, marginBottom: 6 }}>What&apos;s your home worth right now?</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Get a free, data-driven evaluation from {firstName} — no obligation, based on actual recent sales.</div>
          </div>
          <a href={ap('/home-evaluation')} style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', border: 'none', padding: '14px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-block' }}>
            Free Valuation →
          </a>
        </div>

      </div>

      <PageQuickLinks slug={slug} context="market" exclude="/market/archive" />

      <style>{`
        @media(max-width:767px){
          .archive-table{min-width:0!important}
          .archive-active-link{display:none!important}
          .pulse-table th:nth-child(3),.pulse-table td:nth-child(3){display:none}
          .pulse-table th:nth-child(5),.pulse-table td:nth-child(5){display:none}
          .pulse-table th:nth-child(6),.pulse-table td:nth-child(6){display:none}
          .pulse-table th:nth-child(7),.pulse-table td:nth-child(7){display:none}
          .pulse-table{min-width:0!important}
        }
        .archive-table tr:last-child td,.pulse-table tr:last-child td{border-bottom:none}
        .archive-table th,.pulse-table th{position:sticky;top:0}
        .archive-table a:hover,.pulse-table a:hover{text-decoration:underline}
      `}</style>
    </div>
  )
}
