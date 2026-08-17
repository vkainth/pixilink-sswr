import { playfair } from '@/lib/fonts'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getAgent, getMarketReport, getNeighbourhoods, agentCanonicalBase, resolveAgentPrefix } from '@/lib/api'
import { formatPrice, formatPriceFull } from '@/lib/types'
import { marketBadge, monthLabel, normalizeCity, monthlyMarketBadge } from '@/lib/market'
import PageQuickLinks from '@/components/PageQuickLinks'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { MonthlyTrendPoint, MarketType, NeighbourhoodSummary } from '@/lib/types'


function mPrice(p: number | null | undefined): string { return p ? formatPrice(p) : 'N/A' }
function mPriceFull(p: number | null | undefined): string { return p ? formatPriceFull(p) : 'N/A' }

interface Props {
  params: Promise<{ slug: string; segment: string; subSegment: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const revalidate = 300

const TYPE_SLUG_TO_LABEL: Record<string, string> = {
  condos: 'Condos', townhouses: 'Townhouses', detached: 'Detached', duplexes: 'Duplexes',
  // legacy aliases
  houses: 'Detached',
}
const TYPE_LABEL_TO_SLUG: Record<string, string> = {
  Condos: 'condos', Townhouses: 'townhouses', Detached: 'detached', Duplexes: 'duplexes',
}
const TYPE_KEY_MAP: Record<string, string> = {
  Condos: 'Condo', Townhouses: 'Town', Detached: 'House', Duplexes: 'Duplex',
}
const TYPE_PRICE_KEY: Record<string, 'apartment' | 'townhouse' | 'house' | 'duplex'> = {
  Condo: 'apartment', Town: 'townhouse', House: 'house', Duplex: 'duplex',
}
const TYPE_REPORT_SLUG: Record<string, string> = {
  Condo: 'condos', Town: 'townhouses', House: 'houses',
}

const TABS = ['All Types', 'Condos', 'Townhouses', 'Detached', 'Duplexes'] as const

function buildAreaLabel(neighbourhoods: NeighbourhoodSummary[]): string {
  const cities = [...new Set(neighbourhoods.map(n => normalizeCity(n.city)))]
  return cities.length === 0 ? 'Local Area' : cities.join(' & ')
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
  const { slug, segment, subSegment } = await params
  const [agent, neighbourhoods] = await Promise.all([getAgent(slug), getNeighbourhoods(slug)])
  const agentName = agent?.name || 'Your Local Agent'
  const domain = agentCanonicalBase(agent)
  const monthYear = new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
  const typeLabel = TYPE_SLUG_TO_LABEL[segment] ?? TYPE_SLUG_TO_LABEL[subSegment] ?? ''
  const n = neighbourhoods.find(nb => nb.slug === subSegment || nb.slug === segment)
  const areaName = n?.name ?? buildAreaLabel(neighbourhoods)
  const title = `${areaName} ${typeLabel} Market Archive — ${monthYear} | ${agentName}`
  const desc = `Monthly ${typeLabel.toLowerCase()} market reports for ${areaName}: 3 years of data — updated from MLS® records.`
  return {
    title, description: desc,
    alternates: { canonical: `https://${domain}/market/archive/${segment}/${subSegment}` },
    openGraph: { title, description: desc, type: 'website' },
    twitter: { card: 'summary', title, description: desc },
  }
}

export default async function MarketArchiveCombinedPage({ params, searchParams: _sp }: Props) {
  const { slug, segment, subSegment } = await params

  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const [agent, neighbourhoods] = await Promise.all([getAgent(slug), getNeighbourhoods(slug)])
  if (!agent) notFound()
  requireNotShowcase(agent)
  if (!agent.features?.market_intelligence) notFound()

  // Determine which param is type and which is subarea
  // Canonical form: /archive/{typeSlug}/{subareaSlug}
  // Also accept reversed order with a redirect to canonical
  let typeSlug: string
  let subareaSlug: string

  const segIsType = !!TYPE_SLUG_TO_LABEL[segment]
  const subIsType = !!TYPE_SLUG_TO_LABEL[subSegment]

  if (segIsType && !subIsType) {
    // canonical: type/subarea
    typeSlug = segment === 'houses' ? 'detached' : segment
    subareaSlug = subSegment
  } else if (!segIsType && subIsType) {
    // reversed: subarea/type — redirect to canonical
    const canonicalType = subSegment === 'houses' ? 'detached' : subSegment
    redirect(`/agent/${slug}/market/archive/${canonicalType}/${segment}`)
  } else {
    notFound()
  }

  const neighbourhoodMatch = neighbourhoods.find(n => n.slug === subareaSlug)
  if (!neighbourhoodMatch) notFound()

  const activeTypeLabel = TYPE_SLUG_TO_LABEL[typeSlug]
  const activeNorm = TYPE_KEY_MAP[activeTypeLabel] ?? null
  const activePriceKey = activeNorm ? (TYPE_PRICE_KEY[activeNorm] ?? null) : null
  const activeTypeReportSlug = activeNorm ? (TYPE_REPORT_SLUG[activeNorm] ?? null) : null

  const selectedSubarea = neighbourhoodMatch.subarea || neighbourhoodMatch.name
  const areaLabel = neighbourhoodMatch.name
  const firstName = agent.name.split(' ')[0]

  const report = await getMarketReport(slug, selectedSubarea)
  const o = report.overall
  const badge = marketBadge(o.market_type)
  const trend = report.monthly_trend
  const latestMonthKey = trend.length > 0 ? trend[trend.length - 1].month : null

  const typeByMonthMap = Object.fromEntries(report.monthly_trend_by_type.map(pt => [pt.month, pt]))
  const archiveTrend = activePriceKey
    ? [...trend].reverse().filter(p => { const tp = typeByMonthMap[p.month]; return tp && (tp[activePriceKey] ?? 0) > 0 })
    : [...trend].reverse()

  const consecutiveMonths = trend.length > 0 ? countConsecutiveMarket(trend, o.market_type) : 0
  const totalSold = trend.reduce((s, p) => s + p.sold, 0)

  const archiveProse: string[] = []
  if (totalSold > 0) archiveProse.push(`Over the past 3 years, ${totalSold.toLocaleString()} ${activeTypeLabel.toLowerCase()} sold in ${areaLabel}${o.avg_sold_price ? ` with an average sold price of ${mPriceFull(o.avg_sold_price)}` : ''}.`)
  if (consecutiveMonths >= 2) archiveProse.push(`The market has remained a ${badge.label.toLowerCase()} for ${consecutiveMonths} consecutive months.`)

  // Helper: clean archive URL
  function archiveHref(tSlug: string | null, sSlug: string | null): string {
    if (!tSlug && !sSlug) return ap('/market/archive')
    if (!tSlug) return ap(`/market/archive/${sSlug}`)
    if (!sSlug) return ap(`/market/archive/${tSlug}`)
    return ap(`/market/archive/${tSlug}/${sSlug}`)
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: ap('/') },
      { '@type': 'ListItem', position: 2, name: 'Market', item: ap('/market') },
      { '@type': 'ListItem', position: 3, name: 'Monthly Archive', item: ap('/market/archive') },
      { '@type': 'ListItem', position: 4, name: activeTypeLabel, item: ap(`/market/archive/${typeSlug}`) },
      { '@type': 'ListItem', position: 5, name: areaLabel, item: ap(`/market/archive/${typeSlug}/${subareaSlug}`) },
    ],
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Hero */}
      <div style={{ background: '#fff', padding: '48px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <a href={ap('/market')} style={{ color: '#888', textDecoration: 'none' }}>Market</a>
            <span>›</span>
            <a href={ap('/market/archive')} style={{ color: '#888', textDecoration: 'none' }}>Archive</a>
            <span>›</span>
            <a href={ap(`/market/archive/${typeSlug}`)} style={{ color: '#888', textDecoration: 'none' }}>{activeTypeLabel}</a>
            <span>›</span>
            <span>{areaLabel}</span>
          </div>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 12 }}>Real Estate Market</div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', marginBottom: 8 }}>
            {areaLabel} {activeTypeLabel} Archive
          </h1>
          <p style={{ fontSize: 14, color: '#555', maxWidth: 560, margin: 0 }}>
            Monthly {activeTypeLabel.toLowerCase()} market archive for {areaLabel} — updated from MLS® data.
          </p>
        </div>
      </div>

      {/* Tab Strip */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        <div className="container" style={{ display: 'flex', padding: '0 var(--container-padding)' }}>
          {[
            { label: 'Overview', href: ap(`/market/${subareaSlug}`), active: false },
            { label: 'Monthly Archive', href: ap(`/market/archive/${subareaSlug}`), active: false },
            { label: `${activeTypeLabel} Archive`, href: ap(`/market/archive/${typeSlug}/${subareaSlug}`), active: true },
          ].map(t => (
            <a key={t.label} href={t.href} style={{
              padding: '14px 20px', fontSize: 13, fontWeight: t.active ? 700 : 500,
              color: t.active ? 'var(--primary-bg)' : 'var(--text-muted)',
              borderBottom: t.active ? '2.5px solid var(--accent)' : '2.5px solid transparent',
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}>{t.label}</a>
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

        {/* Filter bar */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 28, overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {TABS.map(tab => {
              const tabSlug = tab === 'All Types' ? null : TYPE_LABEL_TO_SLUG[tab]
              const isActive = tab === activeTypeLabel
              const href = archiveHref(tabSlug, subareaSlug)
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
              <a href={archiveHref(typeSlug, null)} style={{
                padding: '5px 12px', fontSize: 12, borderRadius: 20, textDecoration: 'none', whiteSpace: 'nowrap',
                fontWeight: 500, background: 'var(--off-white)', color: 'var(--text-muted)', border: '1px solid var(--border)',
              }}>All Areas</a>
              {neighbourhoods.map(n => {
                const isActive = n.slug === subareaSlug
                return (
                  <a key={n.slug} href={archiveHref(typeSlug, n.slug)} style={{
                    padding: '5px 12px', fontSize: 12, borderRadius: 20, textDecoration: 'none', whiteSpace: 'nowrap',
                    fontWeight: isActive ? 700 : 500,
                    background: isActive ? 'var(--primary-bg)' : 'var(--off-white)',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    border: isActive ? '1px solid var(--primary-bg)' : '1px solid var(--border)',
                  }}>{n.name}</a>
                )
              })}
            </div>
          )}
        </div>

        {/* Monthly Archive Table */}
        {trend.length > 0 && (
          <section style={{ marginBottom: 56 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-bg)', margin: 0 }}>
                Monthly Archive
                <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>· {areaLabel} · {activeTypeLabel}</span>
              </h2>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{archiveTrend.length} months tracked</span>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: 10, border: '1px solid var(--border)' }}>
              <table className="archive-table" style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', background: '#fff' }}>
                <thead>
                  <tr style={{ background: 'var(--off-white)', borderBottom: '2px solid var(--border)' }}>
                    {['Month','Market','Sold','Condo','Town','House','Duplex','Avg Price','Avg DOM','Trend','Report'].map((h, i) => (
                      <th key={h} style={{ padding: i < 3 || i >= 7 ? '11px 16px' : '11px 12px', textAlign: i >= 2 && i !== 9 ? 'right' : i === 9 ? 'center' : 'left', fontSize: i >= 3 && i <= 6 ? 10 : 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {archiveTrend.length === 0 ? (
                    <tr><td colSpan={11} style={{ padding: '22px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No monthly data available for this filter.</td></tr>
                  ) : archiveTrend.map((p, idx, arr) => {
                    const prev = idx < arr.length - 1 ? arr[idx + 1] : null
                    const trendArrow = deriveTrendLabel(p, prev)
                    const mtLabel = monthlyMarketBadge(p.active, p.sold) ?? { label: '—', bg: '#f3f4f6', color: '#9ca3af' }
                    const [y, m] = p.month.split('-')
                    const trendColor = trendArrow === '↑' ? '#059669' : trendArrow === '↓' ? '#dc2626' : 'var(--text-muted)'
                    const isFeatured = p.month === latestMonthKey
                    const isEven = idx % 2 === 1
                    const typePoint = typeByMonthMap[p.month]
                    const rowAvgPrice = activePriceKey && typePoint && typePoint[activePriceKey] ? typePoint[activePriceKey] as number : p.avg_price
                    const condoSold = typePoint?.apartment_sold ?? null
                    const townSold = typePoint?.townhouse_sold ?? null
                    const houseSold = typePoint?.house_sold ?? null
                    const duplexSold = typePoint?.duplex_sold ?? null
                    const reportBase = ap(`/market-report/${y}/${m}/${subareaSlug}`)
                    function typeCountCell(count: number | null | undefined, tSlug: string) {
                      if (!count) return <td style={{ padding: '13px 12px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-muted)' }}>—</td>
                      return <td style={{ padding: '13px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}><a href={`${reportBase}/${tSlug}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>{count}</a></td>
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
                        <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{mPrice(rowAvgPrice)}</td>
                        <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{p.avg_dom}d</td>
                        <td style={{ padding: '13px 16px', textAlign: 'center', fontSize: 20, fontWeight: 800, color: trendColor, lineHeight: 1 }}>{trendArrow}</td>
                        <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <a href={activeTypeReportSlug ? `${reportBase}/${activeTypeReportSlug}` : reportBase} style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Read →</a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Internal links */}
        <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 26px', marginBottom: 44 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-bg)', marginBottom: 12 }}>Explore more market data</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              { label: 'All Areas Archive', href: ap(`/market/archive/${typeSlug}`) },
              { label: `${areaLabel} Archive`, href: ap(`/market/archive/${subareaSlug}`) },
              { label: `${areaLabel} Market Stats`, href: ap(`/market/${subareaSlug}`) },
              { label: 'Full Archive', href: ap('/market/archive') },
              { label: 'Homes For Sale', href: ap('/homes-for-sale') },
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
          <a href={ap('/home-evaluation')} style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '14px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-block' }}>
            Free Valuation →
          </a>
        </div>
      </div>

      <PageQuickLinks slug={slug} context="market" exclude="/market/archive" />

      <style>{`
        @media(max-width:767px){.archive-table{min-width:0!important}}
        .archive-table tr:last-child td{border-bottom:none}
        .archive-table th{position:sticky;top:0}
        .archive-table a:hover{text-decoration:underline}
      `}</style>
    </div>
  )
}
