import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getMarketReport, getNeighbourhoods, getNeighbourhoodDetail, getNeighbourhoodReports, resolveAgentPrefix } from '@/lib/api'
import { formatPrice, formatPriceFull } from '@/lib/types'
import {
  marketBadge,
  marketVerdict,
  monthLabel,
  monthLabelFull,
  absorptionBadge,
  absorptionFaqAnswer,
  normalizeCity,
  monthlyMarketBadge,
  monthlyMarketBadgeByDom,
} from '@/lib/market'
import StatGrid from '@/components/StatGrid'
import StickyConversionBar from '@/components/StickyConversionBar'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { NeighbourhoodSummary, MonthlyTrendPoint, MarketSummary } from '@/lib/types'
import MarketTypeTrendChart from '@/components/MarketTypeTrendChart.client'


const TYPE_SLUG_TO_API: Record<string, string> = {
  condos: 'Apartment',
  townhouses: 'Townhouse',
  houses: 'House',
  duplexes: 'Duplex',
}

const TYPE_SLUG_TO_LABEL: Record<string, string> = {
  condos: 'Condos',
  townhouses: 'Townhouses',
  houses: 'Houses',
  duplexes: 'Duplexes',
}

const TYPE_SLUG_TO_SINGULAR: Record<string, string> = {
  condos: 'Condo',
  townhouses: 'Townhouse',
  houses: 'House',
  duplexes: 'Duplex',
}

const TYPE_SLUG_TO_FIELD: Record<string, 'apartment' | 'townhouse' | 'house' | 'duplex'> = {
  condos: 'apartment',
  townhouses: 'townhouse',
  houses: 'house',
  duplexes: 'duplex',
}

interface Props {
  params: Promise<{ slug: string; year: string; month: string; segment: string }>
}

export const dynamic = 'force-dynamic'

function buildAreaLabel(neighbourhoods: NeighbourhoodSummary[]): string {
  const cities = [...new Set(neighbourhoods.map(n => normalizeCity(n.city)))]
  if (cities.length === 0) return 'Local Area'
  return cities.join(' & ')
}

export const dynamicParams = true

export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, year, month, segment } = await params
  const monthKey = `${year}-${month.padStart(2, '0')}`
  const labelFull = monthLabelFull(monthKey)

  if (!TYPE_SLUG_TO_API[segment]) {
    // neighbourhood slug branch
    const [agent, detail] = await Promise.all([
      getAgent(slug),
      getNeighbourhoodDetail(slug, segment).catch(() => null),
    ])
    const subareaName = detail?.name ?? segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const agentName = agent?.name || 'Your Local Agent'
    const title = `${labelFull} ${subareaName} Real Estate Market Report | ${agentName}`
    const description = `${labelFull} real estate market report for ${subareaName} — homes sold, average sold price, days on market, and market conditions from ${agentName}.`
    return {
      title,
      description: description.length > 155 ? description.slice(0, 152) + '...' : description,
      openGraph: { title, description, type: 'article' },
      twitter: { card: 'summary', title, description },
    }
  }

  const typeLabel = TYPE_SLUG_TO_LABEL[segment]!
  const [agent, neighbourhoods, report] = await Promise.all([
    getAgent(slug),
    getNeighbourhoods(slug),
    getMarketReport(slug).catch(() => null),
  ])
  const area = buildAreaLabel(neighbourhoods)
  const agentName = agent?.name || 'Your Local Agent'
  const title = `${labelFull} ${typeLabel} Market Report — ${area} | ${agentName}`

  const field = TYPE_SLUG_TO_FIELD[segment]!
  const monthData = report?.monthly_trend_by_type?.find(p => p.month === monthKey) ?? null
  const typeSold = monthData ? ((monthData[`${field}_sold` as keyof typeof monthData] as number | null) ?? null) : null
  const typePrice = monthData ? ((monthData[field as keyof typeof monthData] as number | null) ?? null) : null

  let description: string
  if (typeSold !== null && typePrice !== null && typeSold > 0 && typePrice > 0) {
    description = `${labelFull} ${typeLabel.toLowerCase()} market report for ${area}: ${typeSold} sold at an average price of ${formatPrice(typePrice)}. Sales volume, pricing trends, days on market, and ${typeLabel.toLowerCase()} market conditions.`
  } else {
    description = `${labelFull} ${typeLabel.toLowerCase()} market report for ${area} — homes sold, average sold price, days on market, and market conditions from ${agentName}.`
  }

  if (description.length > 155) description = description.slice(0, 152) + '...'

  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
    twitter: { card: 'summary', title, description },
  }
}

const th: React.CSSProperties = {
  textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', padding: '11px 14px', whiteSpace: 'nowrap',
  background: 'var(--off-white)',
}
const td: React.CSSProperties = { fontSize: 13, color: 'var(--text)', padding: '12px 14px', whiteSpace: 'nowrap' }

export default async function MonthlyTypeReportPage({ params }: Props) {
  const { slug, year, month, segment } = await params

  const apiType = TYPE_SLUG_TO_API[segment]
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const monthKey = `${year}-${month.padStart(2, '0')}`
  const label = monthLabel(monthKey)
  const labelFull = monthLabelFull(monthKey)

  if (!apiType) {
    // ── Neighbourhood monthly report ──────────────────────────────────────
    const [agent, detail, reports, neighbourhoods] = await Promise.all([
      getAgent(slug),
      getNeighbourhoodDetail(slug, segment).catch(() => null),
      getNeighbourhoodReports(slug, segment).catch(() => [] as import('@/lib/types').MonthlyTrendPoint[]),
      getNeighbourhoods(slug),
    ])
    if (!agent || !detail) notFound()
  requireNotShowcase(agent)

    const areaLabel = buildAreaLabel(neighbourhoods)
    const subareaName = detail.name

    const allMonths = reports.map(p => p.month).sort()
    const monthData = reports.find(p => p.month === monthKey) ?? null
    const currentIdx = allMonths.indexOf(monthKey)
    const prevMonthKey = currentIdx > 0 ? allMonths[currentIdx - 1] : null
    const nextMonthKey = currentIdx >= 0 && currentIdx < allMonths.length - 1 ? allMonths[currentIdx + 1] : null
    const prevMonthData = prevMonthKey ? reports.find(p => p.month === prevMonthKey) ?? null : null

    const nbBadge = monthData
      ? (monthData.active != null
        ? monthlyMarketBadge(monthData.active, monthData.sold)
        : monthlyMarketBadgeByDom(monthData.avg_dom))
      : null

    const nbStats = monthData && monthData.avg_price > 0 ? [
      { label: 'Homes Sold', value: monthData.sold.toLocaleString() },
      { label: 'Avg Sold Price', value: formatPriceFull(monthData.avg_price) },
      { label: 'Avg Days on Market', value: `${monthData.avg_dom}d` },
      ...(monthData.avg_ppsf ? [{ label: 'Avg $/sqft', value: `$${Math.round(monthData.avg_ppsf).toLocaleString('en-CA')}` }] : []),
    ] : []

    const recentNbMonths = [...reports].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6)

    function nbMonthPath(m: string) {
      const [y, mo] = m.split('-')
      return ap(`/market-report/${y}/${mo}/${segment}`)
    }

    const faqNbPerf = {
      q: `How did the ${subareaName} real estate market perform in ${labelFull}?`,
      a: monthData && monthData.avg_price > 0
        ? `In ${labelFull}, ${monthData.sold} homes sold in ${subareaName} at an average price of ${formatPriceFull(monthData.avg_price)}, spending an average of ${monthData.avg_dom} days on the market${monthData.avg_ppsf ? ` at $${Math.round(monthData.avg_ppsf).toLocaleString('en-CA')}/sqft` : ''}.`
        : `${labelFull} market data for ${subareaName} is being compiled. Check back soon, or view the current market report for the latest data.`,
    }
    const faqNbBuyers = {
      q: `Is it a good time to buy in ${subareaName}?`,
      a: `${subareaName} ${nbBadge ? `is currently a ${nbBadge.label.toLowerCase()}` : 'market conditions vary'}. Whether now is the right time depends on your timeline and budget — a knowledgeable local agent can identify current value opportunities and help you structure a competitive offer.`,
    }
    const faqNbSellers = {
      q: `What does the ${labelFull} market mean for sellers in ${subareaName}?`,
      a: nbBadge?.label.toLowerCase().includes('seller')
        ? `${subareaName} sellers in ${labelFull} benefited from tight supply and motivated buyers. Well-priced, well-presented homes attracted strong interest. A local CMA ensures your list price is calibrated to current sold data.`
        : nbBadge?.label.toLowerCase().includes('buyer')
        ? `In ${labelFull}, ${subareaName} sellers faced more competition with increased supply. Pricing accurately and investing in presentation were key differentiators for a timely sale.`
        : `${labelFull} offered ${subareaName} sellers a stable market — demand was steady and well-priced properties sold in reasonable timeframes.`,
    }
    const faqNbPrev = prevMonthData && monthData && monthData.avg_price > 0 && prevMonthData.avg_price > 0 ? {
      q: `How did ${subareaName} compare in ${labelFull} vs. ${monthLabelFull(prevMonthKey!)}?`,
      a: (() => {
        const soldDiff = monthData.sold - prevMonthData.sold
        const soldPct = prevMonthData.sold > 0 ? Math.abs(Math.round((soldDiff / prevMonthData.sold) * 100)) : 0
        const priceDiff = monthData.avg_price - prevMonthData.avg_price
        const pricePct = prevMonthData.avg_price > 0 ? Math.abs(Math.round((priceDiff / prevMonthData.avg_price) * 100)) : 0
        const soldTrend = soldDiff > 0 ? `up ${soldPct}%` : soldDiff < 0 ? `down ${soldPct}%` : 'unchanged'
        const priceTrend = priceDiff > 0 ? `up ${pricePct}% to ${formatPriceFull(monthData.avg_price)}` : priceDiff < 0 ? `down ${pricePct}% to ${formatPriceFull(monthData.avg_price)}` : `steady at ${formatPriceFull(monthData.avg_price)}`
        return `Compared to ${monthLabelFull(prevMonthKey!)}, ${subareaName} sales were ${soldTrend} (${prevMonthData.sold} vs ${monthData.sold} sold) and the average sold price was ${priceTrend}.`
      })(),
    } : null

    const nbFaqItems = [faqNbPerf, faqNbBuyers, faqNbSellers, ...(faqNbPrev ? [faqNbPrev] : [])]

    const nbBreadcrumb = {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: ap('/') },
        { '@type': 'ListItem', position: 2, name: 'Market Report', item: ap('/market-report') },
        { '@type': 'ListItem', position: 3, name: labelFull, item: ap(`/market-report/${year}/${month}`) },
        { '@type': 'ListItem', position: 4, name: subareaName, item: ap(`/market-report/${year}/${month}/${segment}`) },
      ],
    }
    const nbArticle = {
      '@context': 'https://schema.org', '@type': 'Article',
      headline: `${labelFull} ${subareaName} Real Estate Market Report`,
      datePublished: `${year}-${month.padStart(2, '0')}-01`,
      author: { '@type': 'RealEstateAgent', name: agent.name },
      about: { '@type': 'Place', name: subareaName, address: { '@type': 'PostalAddress', addressLocality: detail.city, addressRegion: 'BC', addressCountry: 'CA' } },
    }
    const nbFaq = {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: nbFaqItems.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
    }

    const typeLinks = Object.entries(TYPE_SLUG_TO_LABEL).map(([s, lbl]) => ({
      label: `${lbl} in ${subareaName}`,
      href: ap(`/market-report/${year}/${month}/${segment}/${s}`),
    }))

    return (
      <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(nbBreadcrumb) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(nbArticle) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(nbFaq) }} />

        <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
          <div className="container">
            <div style={{ fontSize: 12, color: '#888', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <a href={ap('/market-report')} style={{ color: '#888', textDecoration: 'none' }}>Market Report</a>
              <span>›</span>
              <a href={ap(`/market-report/${year}/${month}`)} style={{ color: '#888', textDecoration: 'none' }}>{labelFull}</a>
              <span>›</span>
              <span>{subareaName}</span>
            </div>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>
              Neighbourhood Market Report
            </div>
            <h1 className={playfair.className} style={{ fontSize: 'clamp(26px,3.8vw,44px)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', margin: 0 }}>
              {labelFull} Real Estate Market — {subareaName}
            </h1>
            <p style={{ color: '#555', marginTop: 14, fontSize: 15, marginBottom: 20, maxWidth: 680, lineHeight: 1.7 }}>
              {monthData && monthData.avg_price > 0
                ? `The ${subareaName} market recorded ${monthData.sold} sales in ${labelFull} at an average sold price of ${formatPriceFull(monthData.avg_price)}. This report covers all property types in ${subareaName}.`
                : `${subareaName} real estate market data — ${labelFull}. Tracking sales volume, average sold price, and days on market for all property types.`}
            </p>
          </div>
        </div>

        <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
          <div className="container" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {prevMonthKey && (
              <a href={nbMonthPath(prevMonthKey)} style={{ fontSize: 13, color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 14px', textDecoration: 'none', background: '#fff' }}>
                ← {monthLabel(prevMonthKey)}
              </a>
            )}
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-bg)', margin: '0 4px' }}>{label}</span>
            {nextMonthKey && (
              <a href={nbMonthPath(nextMonthKey)} style={{ fontSize: 13, color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 14px', textDecoration: 'none', background: '#fff' }}>
                {monthLabel(nextMonthKey)} →
              </a>
            )}
            <a href={ap('/market-report')} style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
              All Reports →
            </a>
          </div>
        </div>

        <div className="container" style={{ padding: '40px var(--container-padding) 96px' }}>
          {nbBadge && (
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 22px', marginBottom: 24, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ background: nbBadge.bg, color: nbBadge.color, padding: '5px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                {nbBadge.label}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                {subareaName} real estate market conditions for {labelFull}
              </span>
            </div>
          )}

          {nbStats.length > 0 && <StatGrid items={nbStats} />}

          {reports.length > 0 && (
            <section style={{ marginTop: 40 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 16 }}>
                {subareaName} Market Trend — All Property Types
              </h2>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={th}>Month</th>
                      <th style={{ ...th, textAlign: 'right' }}>Sold</th>
                      <th style={{ ...th, textAlign: 'right' }}>Avg Sold Price</th>
                      <th style={{ ...th, textAlign: 'right' }}>Avg DOM</th>
                      <th style={{ ...th, textAlign: 'right' }}>Avg $/sqft</th>
                      <th style={{ ...th, textAlign: 'center' }}>Market</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...reports].sort((a, b) => b.month.localeCompare(a.month)).map(p => {
                      const rowBadge = p.active != null
                        ? monthlyMarketBadge(p.active, p.sold)
                        : monthlyMarketBadgeByDom(p.avg_dom)
                      const [ry, rm] = p.month.split('-')
                      return (
                        <tr key={p.month} style={{ borderBottom: '1px solid var(--border)', background: p.month === monthKey ? 'var(--off-white)' : '#fff' }}>
                          <td style={{ ...td, fontWeight: p.month === monthKey ? 800 : 400 }}>
                            <a href={ap(`/market-report/${ry}/${rm}/${segment}`)} style={{ color: p.month === monthKey ? 'var(--primary-bg)' : 'var(--accent)', textDecoration: 'none', fontWeight: p.month === monthKey ? 800 : 600 }}>
                              {monthLabelFull(p.month)}
                            </a>
                          </td>
                          <td style={{ ...td, textAlign: 'right' }}>{p.sold.toLocaleString()}</td>
                          <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{p.avg_price > 0 ? formatPriceFull(p.avg_price) : '—'}</td>
                          <td style={{ ...td, textAlign: 'right' }}>{p.avg_dom > 0 ? `${p.avg_dom}d` : '—'}</td>
                          <td style={{ ...td, textAlign: 'right' }}>{p.avg_ppsf ? `$${Math.round(p.avg_ppsf).toLocaleString('en-CA')}` : '—'}</td>
                          <td style={{ ...td, textAlign: 'center' }}>
                            {rowBadge ? (
                              <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: rowBadge.bg, color: rowBadge.color }}>
                                {rowBadge.label}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section style={{ marginTop: 36 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 12 }}>
              {subareaName} by Property Type — {labelFull}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {typeLinks.map(l => (
                <a key={l.href} href={l.href} style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 16px', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}>
                  {l.label}
                </a>
              ))}
            </div>
          </section>

          {nbFaqItems.length > 0 && (
            <section style={{ marginTop: 44 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 16 }}>
                Frequently Asked Questions — {subareaName}
              </h2>
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                {nbFaqItems.map((faq, i) => (
                  <details key={i} style={{ borderBottom: i < nbFaqItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
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
          )}

          {recentNbMonths.length > 1 && (
            <section style={{ marginTop: 44, background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '24px 26px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary-bg)', marginBottom: 14 }}>Recent {subareaName} Reports</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {recentNbMonths.map(p => (
                  <a key={p.month} href={nbMonthPath(p.month)} style={{ background: p.month === monthKey ? 'var(--primary-bg)' : 'var(--off-white)', color: p.month === monthKey ? '#fff' : 'var(--text)', border: '1px solid var(--border)', padding: '7px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
                    {monthLabelFull(p.month)}
                  </a>
                ))}
              </div>
            </section>
          )}

          <div style={{ marginTop: 40, background: 'var(--primary-bg)', borderRadius: 12, padding: '32px', textAlign: 'center' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
              What does the {labelFull} {subareaName} market mean for you?
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 22, maxWidth: 460, margin: '0 auto 22px' }}>
              {agent.name.split(' ')[0]} can explain what these numbers mean for your specific situation in {subareaName}.
            </p>
            <a href={ap('/contact?reason=market')} style={{ display: 'inline-block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '13px 30px', borderRadius: 6, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none' }}>
              Get a Market Briefing
            </a>
          </div>
        </div>

        <StickyConversionBar
          contactHref={ap('/contact?reason=valuation')}
          areaLabel={areaLabel}
          agentFirstName={agent.name.split(' ')[0]}
          marketCondition={nbBadge?.label ?? 'Active'}
        />
        <style>{`details summary::-webkit-details-marker { display: none } details[open] summary span:last-child { transform: rotate(45deg); display: inline-block }`}</style>
      </div>
    )
  }

  const typeLabel = TYPE_SLUG_TO_LABEL[segment]!
  const typeSingular = TYPE_SLUG_TO_SINGULAR[segment]!
  const field = TYPE_SLUG_TO_FIELD[segment]!

  const [agent, report, neighbourhoods] = await Promise.all([
    getAgent(slug),
    getMarketReport(slug),
    getNeighbourhoods(slug),
  ])
  if (!agent) notFound()

  const areaLabel = buildAreaLabel(neighbourhoods)

  const typeRow = report.by_type.find(r => r.type === apiType) ?? null

  const typeTrend: MonthlyTrendPoint[] = (report.monthly_trend_by_type ?? [])
    .filter(p => {
      const val = p[field as keyof typeof p] as number | null
      return val !== null && val !== undefined && val > 0
    })
    .map(p => ({
      month: p.month,
      sold: (p[`${field}_sold` as keyof typeof p] as number | null) ?? 0,
      avg_price: (p[field as keyof typeof p] as number | null) ?? 0,
      avg_dom: (p[`${field}_dom` as keyof typeof p] as number | null) ?? 0,
      avg_ppsf: (p[`${field}_ppsf` as keyof typeof p] as number | null) ?? 0,
    }))

  const allMonths = typeTrend.map(p => p.month).sort()
  const monthData = typeTrend.find(p => p.month === monthKey) ?? null
  const currentIdx = allMonths.indexOf(monthKey)
  const prevMonthKey = currentIdx > 0 ? allMonths[currentIdx - 1] : null
  const nextMonthKey = currentIdx >= 0 && currentIdx < allMonths.length - 1 ? allMonths[currentIdx + 1] : null
  const prevMonthData = prevMonthKey ? typeTrend.find(p => p.month === prevMonthKey) ?? null : null

  const summary: MarketSummary = typeRow ?? {
    active: 0,
    sold_30d: monthData?.sold ?? 0,
    avg_sold_price: monthData?.avg_price ?? 0,
    avg_dom: monthData?.avg_dom ?? 0,
    absorption_rate: 0,
    market_type: 'balanced',
  }

  const badge = marketBadge(summary.market_type)
  const absorbBadge = absorptionBadge(summary)

  const stats = monthData && monthData.avg_price > 0 ? [
    { label: `${typeSingular}s Sold`, value: monthData.sold.toLocaleString() },
    { label: 'Avg Sold Price', value: formatPrice(monthData.avg_price) },
    { label: 'Avg Days on Market', value: `${monthData.avg_dom}d` },
    { label: 'Avg $/sqft', value: monthData.avg_ppsf ? `$${Math.round(monthData.avg_ppsf).toLocaleString('en-CA')}` : '—' },
  ] : typeRow ? [
    { label: `${typeSingular}s Sold (30d)`, value: typeRow.sold_30d.toLocaleString() },
    { label: 'Avg Sold Price', value: formatPrice(typeRow.avg_sold_price) },
    { label: 'Avg Days on Market', value: `${typeRow.avg_dom}d` },
    { label: 'Active Inventory', value: typeRow.active.toLocaleString() },
  ] : []

  function monthPath(m: string, t?: string) {
    const [y, mo] = m.split('-')
    return ap(`/market-report/${y}/${mo}${t ? `/${t}` : ''}`)
  }

  const faqPerformance = {
    q: `How did the ${areaLabel} ${typeLabel.toLowerCase()} market perform in ${labelFull}?`,
    a: monthData && monthData.avg_price > 0
      ? `In ${labelFull}, ${monthData.sold} ${typeLabel.toLowerCase()} sold in ${areaLabel} at an average price of ${formatPriceFull(monthData.avg_price)}, with ${typeLabel.toLowerCase()} spending an average of ${monthData.avg_dom} days on the market${monthData.avg_ppsf ? ` at $${Math.round(monthData.avg_ppsf).toLocaleString('en-CA')} per square foot` : ''}. ${summary.market_type === 'strong-sellers' || summary.market_type === 'sellers' ? 'Demand remained strong with limited supply.' : summary.market_type === 'buyers' ? 'Buyers had more choice and negotiating leverage.' : 'Conditions were balanced between buyers and sellers.'}`
      : `${labelFull} ${typeLabel.toLowerCase()} data for ${areaLabel} is being compiled. Check back soon, or view the current market report for the latest data.`,
  }

  const faqBuyers = {
    q: `Is it a good time to buy a ${typeSingular.toLowerCase()} in ${areaLabel}?`,
    a: `The ${typeLabel.toLowerCase()} segment in ${areaLabel} is currently a ${badge.label.toLowerCase()}.${typeRow && typeRow.avg_sold_price > 0 ? ` The average sold price for ${typeLabel.toLowerCase()} is ${formatPriceFull(typeRow.avg_sold_price)}.` : ''} Whether now is the right time depends on your personal timeline and budget. A well-informed local agent can identify current value opportunities and help structure a competitive offer in today's ${typeLabel.toLowerCase()} market.`,
  }

  const faqSellers = {
    q: `What does the ${labelFull} market mean for ${typeSingular.toLowerCase()} sellers in ${areaLabel}?`,
    a: summary.market_type === 'strong-sellers' || summary.market_type === 'sellers'
      ? `${typeLabel} sellers in ${areaLabel} during ${labelFull} benefited from tight supply and motivated buyers. Well-presented, properly priced ${typeLabel.toLowerCase()} attracted strong activity. A local CMA ensures your list price is calibrated to current sold data.`
      : summary.market_type === 'buyers'
      ? `In ${labelFull}, ${typeLabel.toLowerCase()} sellers faced more competition with increased supply. Pricing accurately and investing in presentation were the key differentiators for a timely sale.`
      : `${labelFull} offered ${areaLabel} ${typeLabel.toLowerCase()} sellers a stable window — demand was steady and well-priced properties sold in a reasonable timeframe.`,
  }

  const faqAbsorption = absorbBadge ? {
    q: `What is the absorption rate for ${typeLabel.toLowerCase()} in ${areaLabel}?`,
    a: absorptionFaqAnswer(`${areaLabel} ${typeLabel.toLowerCase()}`, absorbBadge.months, summary.market_type),
  } : null

  const faqPrevMonth = prevMonthData && monthData && monthData.avg_price > 0 && prevMonthData.avg_price > 0 ? {
    q: `How did ${labelFull} compare to ${monthLabelFull(prevMonthKey!)} for ${typeLabel.toLowerCase()} in ${areaLabel}?`,
    a: (() => {
      const soldDiff = monthData.sold - prevMonthData.sold
      const soldPct = prevMonthData.sold > 0 ? Math.abs(Math.round((soldDiff / prevMonthData.sold) * 100)) : 0
      const priceDiff = monthData.avg_price - prevMonthData.avg_price
      const pricePct = prevMonthData.avg_price > 0 ? Math.abs(Math.round((priceDiff / prevMonthData.avg_price) * 100)) : 0
      const soldTrend = soldDiff > 0 ? `up ${soldPct}%` : soldDiff < 0 ? `down ${soldPct}%` : 'unchanged'
      const priceTrend = priceDiff > 0 ? `up ${pricePct}% to ${formatPriceFull(monthData.avg_price)}` : priceDiff < 0 ? `down ${pricePct}% to ${formatPriceFull(monthData.avg_price)}` : `steady at ${formatPriceFull(monthData.avg_price)}`
      return `Compared to ${monthLabelFull(prevMonthKey!)}, ${typeLabel.toLowerCase()} sales in ${areaLabel} were ${soldTrend} (${prevMonthData.sold} vs ${monthData.sold} sold) and the average sold price was ${priceTrend}.`
    })(),
  } : null

  const faqItems = [
    faqPerformance,
    ...(faqAbsorption ? [faqAbsorption] : []),
    faqBuyers,
    faqSellers,
    ...(faqPrevMonth ? [faqPrevMonth] : []),
  ]

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: ap('/') },
      { '@type': 'ListItem', position: 2, name: 'Market Report', item: ap('/market-report') },
      { '@type': 'ListItem', position: 3, name: labelFull, item: ap(`/market-report/${year}/${month}`) },
      { '@type': 'ListItem', position: 4, name: typeLabel, item: ap(`/market-report/${year}/${month}/${segment}`) },
    ],
  }

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${labelFull} ${typeLabel} Market Report — ${areaLabel}`,
    description: `${labelFull} ${typeLabel.toLowerCase()} sales volume, average sold price, days on market and market conditions for ${areaLabel}.`,
    datePublished: `${year}-${month.padStart(2, '0')}-01`,
    author: { '@type': 'RealEstateAgent', name: agent.name },
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  const datasetJsonLd = typeTrend.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${areaLabel} ${typeLabel} 24-Month Market Trend`,
    description: `24-month MLS® ${typeLabel.toLowerCase()} sales data for ${areaLabel} including units sold, average sold price, average days on market, and average price per square foot.`,
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Month', description: 'Reporting month in YYYY-MM format' },
      { '@type': 'PropertyValue', name: `${typeSingular}s Sold`, description: 'Number of MLS® transactions closed' },
      { '@type': 'PropertyValue', name: 'Average Sold Price', description: `Mean sold price for ${typeLabel.toLowerCase()} in CAD` },
      { '@type': 'PropertyValue', name: 'Average Days on Market', description: 'Mean number of days from list date to accepted offer' },
    ],
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'text/csv',
      description: `month,${typeLabel.toLowerCase()}_sold,avg_sold_price,avg_dom,avg_ppsf\n` +
        [...typeTrend].sort((a, b) => a.month.localeCompare(b.month)).map(p =>
          `${p.month},${p.sold},${Math.round(p.avg_price)},${p.avg_dom},${p.avg_ppsf ? Math.round(p.avg_ppsf) : ''}`
        ).join('\n'),
    },
  } : null

  const otherTypes = Object.entries(TYPE_SLUG_TO_LABEL)
    .filter(([s]) => s !== segment)
    .map(([s, lbl]) => ({ slug: s, label: lbl }))

  const recentMonths = [...typeTrend].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6)

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      {datasetJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }} />
      )}

      {/* Hero */}
      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <a href={ap('/market-report')} style={{ color: '#888', textDecoration: 'none' }}>Market Report</a>
            <span>›</span>
            <a href={ap(`/market-report/${year}/${month}`)} style={{ color: '#888', textDecoration: 'none' }}>{labelFull}</a>
            <span>›</span>
            <span>{typeLabel}</span>
          </div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>{typeLabel} Market Report</div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(26px,3.8vw,44px)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', margin: 0 }}>
            {labelFull} {typeLabel} Market — {areaLabel}
          </h1>
          <p style={{ color: '#555', marginTop: 14, fontSize: 15, marginBottom: 20, maxWidth: 680, lineHeight: 1.7 }}>
            {monthData && monthData.avg_price > 0
              ? `The ${areaLabel} ${typeLabel.toLowerCase()} market recorded ${monthData.sold} sales in ${labelFull} at an average sold price of ${formatPriceFull(monthData.avg_price)}. This report covers sales volume, pricing, and days on market for ${typeLabel.toLowerCase()} specifically.`
              : `${typeLabel} market data for ${areaLabel} — ${labelFull}. Tracking sales volume, average sold price, days on market, and market conditions for ${typeLabel.toLowerCase()} specifically.`
            }
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <a href={ap(`/market-report/${year}/${month}`)} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
              ← All Types
            </a>
            {otherTypes.map(t => (
              <a key={t.slug} href={ap(`/market-report/${year}/${month}/${t.slug}`)} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}>
                {t.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Month nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
        <div className="container" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {prevMonthKey && (
            <a href={monthPath(prevMonthKey, segment)} style={{ fontSize: 13, color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 14px', textDecoration: 'none', background: '#fff' }}>
              ← {monthLabel(prevMonthKey)}
            </a>
          )}
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-bg)', margin: '0 4px' }}>{label}</span>
          {nextMonthKey && (
            <a href={monthPath(nextMonthKey, segment)} style={{ fontSize: 13, color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 14px', textDecoration: 'none', background: '#fff' }}>
              {monthLabel(nextMonthKey)} →
            </a>
          )}
          <a href={ap('/market-report')} style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            All Reports →
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="container" style={{ padding: '40px var(--container-padding) 96px' }}>

        {typeRow && (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 22px', marginBottom: 24, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ background: badge.bg, color: badge.color, padding: '5px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
              {badge.label}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{marketVerdict(typeRow, `${areaLabel} ${typeLabel.toLowerCase()}`)}</span>
          </div>
        )}

        {stats.length > 0 && <StatGrid items={stats} />}

        {monthData && monthData.avg_price > 0 && (
          <section style={{ marginTop: 36 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 16 }}>{labelFull} {typeLabel} Snapshot</h2>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '12px 28px' }}>
                {[
                  [`${typeSingular}s Sold`, monthData.sold.toLocaleString()],
                  ['Avg Sold Price', formatPriceFull(monthData.avg_price)],
                  ['Avg Days on Market', `${monthData.avg_dom} days`],
                  ...(monthData.avg_ppsf ? [['Avg Price per ft²', `$${Math.round(monthData.avg_ppsf).toLocaleString('en-CA')}`]] : []),
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10, fontSize: 14 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ color: 'var(--text)', fontWeight: 700, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {typeTrend.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 16 }}>
              {typeLabel} Market Trend — {areaLabel}
            </h2>
            <MarketTypeTrendChart trend={[...typeTrend].sort((a, b) => a.month.localeCompare(b.month)).slice(-24)} />
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 580 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={th}>Month</th>
                    <th style={{ ...th, textAlign: 'right' }}>Sold</th>
                    <th style={{ ...th, textAlign: 'right' }}>Avg Sold Price</th>
                    <th style={{ ...th, textAlign: 'right' }}>Avg DOM</th>
                    <th style={{ ...th, textAlign: 'right' }}>Avg $/sqft</th>
                    <th style={{ ...th, textAlign: 'center' }}>Market</th>
                  </tr>
                </thead>
                <tbody>
                  {[...typeTrend].sort((a, b) => b.month.localeCompare(a.month)).map(p => {
                    const badge = monthlyMarketBadgeByDom(p.avg_dom)
                    return (
                      <tr
                        key={p.month}
                        style={{ borderBottom: '1px solid var(--border)', background: p.month === monthKey ? 'var(--off-white)' : '#fff' }}
                      >
                        <td style={{ ...td, fontWeight: p.month === monthKey ? 800 : 400 }}>
                          <a href={monthPath(p.month, segment)} style={{ color: p.month === monthKey ? 'var(--primary-bg)' : 'var(--accent)', textDecoration: 'none', fontWeight: p.month === monthKey ? 800 : 600 }}>
                            {monthLabelFull(p.month)}
                          </a>
                        </td>
                        <td style={{ ...td, textAlign: 'right' }}>{p.sold.toLocaleString()}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{p.avg_price > 0 ? formatPriceFull(p.avg_price) : '—'}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{p.avg_dom > 0 ? `${p.avg_dom}d` : '—'}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{p.avg_ppsf ? `$${Math.round(p.avg_ppsf).toLocaleString('en-CA')}` : '—'}</td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          {badge ? (
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              background: badge.bg,
                              color: badge.color,
                              whiteSpace: 'nowrap',
                            }}>
                              {badge.label}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {faqItems.length > 0 && (
          <section style={{ marginTop: 44 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 16 }}>
              Frequently Asked Questions — {areaLabel} {typeLabel}
            </h2>
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
              {faqItems.map((faq, i) => (
                <details key={i} style={{ borderBottom: i < faqItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
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
        )}

        <section style={{ marginTop: 44, background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '24px 26px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary-bg)', marginBottom: 14 }}>Explore {typeLabel} Reports</div>

          {recentMonths.length > 1 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Recent Months</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {recentMonths.map(p => (
                  <a
                    key={p.month}
                    href={monthPath(p.month, segment)}
                    style={{ background: p.month === monthKey ? 'var(--primary-bg)' : 'var(--off-white)', color: p.month === monthKey ? '#fff' : 'var(--text)', border: '1px solid var(--border)', padding: '7px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none', fontWeight: 600 }}
                  >
                    {monthLabelFull(p.month)}
                  </a>
                ))}
              </div>
            </>
          )}

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Related Pages</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: `${labelFull} Full Report (All Types)`, href: ap(`/market-report/${year}/${month}`) },
              ...otherTypes.map(t => ({ label: `${labelFull} ${t.label} Report`, href: ap(`/market-report/${year}/${month}/${t.slug}`) })),
              { label: `${typeLabel} Market Overview`, href: ap('/market') },
              { label: `${typeLabel} for Sale`, href: ap('/homes-for-sale') },
            ].map(l => (
              <a key={l.href} href={l.href} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}>
                {l.label}
              </a>
            ))}
          </div>
        </section>

        <div style={{ marginTop: 40, background: 'var(--primary-bg)', borderRadius: 12, padding: '32px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
            What does the {labelFull} {typeLabel.toLowerCase()} market mean for you?
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 22, maxWidth: 460, margin: '0 auto 22px' }}>
            {agent.name.split(' ')[0]} can explain what these numbers mean for your specific situation — whether you&apos;re buying or selling {typeLabel.toLowerCase()} in {areaLabel}.
          </p>
          <a href={ap('/contact?reason=market')} style={{ display: 'inline-block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '13px 30px', borderRadius: 6, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none' }}>
            Get a Market Briefing
          </a>
        </div>
      </div>

      <StickyConversionBar
        contactHref={ap('/contact?reason=valuation')}
        areaLabel={areaLabel}
        agentFirstName={agent.name.split(' ')[0]}
        marketCondition={badge.label}
      />

      <style>{`
        details summary::-webkit-details-marker { display: none }
        details[open] summary span:last-child { transform: rotate(45deg); display: inline-block }
      `}</style>
    </div>
  )
}
