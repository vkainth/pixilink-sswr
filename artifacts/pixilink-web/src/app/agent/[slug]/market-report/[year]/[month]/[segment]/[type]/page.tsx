import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getNeighbourhoods, getNeighbourhoodDetail, getNeighbourhoodReports, resolveAgentPrefix } from '@/lib/api'
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
} from '@/lib/market'
import StatGrid from '@/components/StatGrid'
import StickyConversionBar from '@/components/StickyConversionBar'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { NeighbourhoodSummary } from '@/lib/types'


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

interface Props {
  params: Promise<{ slug: string; year: string; month: string; segment: string; type: string }>
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
  const { slug, year, month, segment, type } = await params
  if (!TYPE_SLUG_TO_API[type]) return { title: 'Market Report' }
  const typeLabel = TYPE_SLUG_TO_LABEL[type]!
  const monthKey = `${year}-${month.padStart(2, '0')}`
  const labelFull = monthLabelFull(monthKey)
  const apiType = TYPE_SLUG_TO_API[type]!

  const [agent, detail, neighbourhoods] = await Promise.all([
    getAgent(slug),
    getNeighbourhoodDetail(slug, segment, apiType),
    getNeighbourhoods(slug),
  ])

  const area = buildAreaLabel(neighbourhoods)
  const agentName = agent?.name || 'Your Local Agent'
  const subareaName = detail?.name ?? segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const title = `${labelFull} ${subareaName} ${typeLabel} Market Report — ${area} | ${agentName}`

  const w = detail?.widget
  let description: string
  if (w && w.avg_sold_price > 0) {
    description = `${labelFull} ${typeLabel.toLowerCase()} market report for ${subareaName}: avg sold price ${formatPrice(w.avg_sold_price)}, ${w.sold_30d} sold in 30 days, ${w.avg_dom} days on market. Live MLS® data.`
  } else {
    description = `${labelFull} ${typeLabel.toLowerCase()} market report for ${subareaName} — sales volume, average sold price, days on market, and market conditions from ${agentName}.`
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

export default async function SubareaTypeMonthlyReportPage({ params }: Props) {
  const { slug, year, month, segment, type } = await params

  const apiType = TYPE_SLUG_TO_API[type]
  if (!apiType) notFound()

  const typeLabel = TYPE_SLUG_TO_LABEL[type]!
  const typeSingular = TYPE_SLUG_TO_SINGULAR[type]!

  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const monthKey = `${year}-${month.padStart(2, '0')}`
  const label = monthLabel(monthKey)
  const labelFull = monthLabelFull(monthKey)

  const [agent, detail, reports, neighbourhoods] = await Promise.all([
    getAgent(slug),
    getNeighbourhoodDetail(slug, segment, apiType),
    getNeighbourhoodReports(slug, segment),
    getNeighbourhoods(slug),
  ])

  if (!agent) notFound()
  requireNotShowcase(agent)
  if (!detail) notFound()

  const areaLabel = buildAreaLabel(neighbourhoods)
  const subareaName = detail.name

  const w = detail.widget
  const badge = w ? marketBadge(w.market_type) : null
  const absorbBadge = w ? absorptionBadge(w) : null

  const allMonths = reports.map(p => p.month).sort()
  const monthData = reports.find(p => p.month === monthKey) ?? null
  const currentIdx = allMonths.indexOf(monthKey)
  const prevMonthKey = currentIdx > 0 ? allMonths[currentIdx - 1] : null
  const nextMonthKey = currentIdx >= 0 && currentIdx < allMonths.length - 1 ? allMonths[currentIdx + 1] : null
  const prevMonthData = prevMonthKey ? reports.find(p => p.month === prevMonthKey) ?? null : null

  const stats = w && w.avg_sold_price > 0 ? [
    { label: `${typeSingular}s Sold (30d)`, value: w.sold_30d.toLocaleString() },
    { label: 'Avg Sold Price', value: formatPrice(w.avg_sold_price) },
    { label: 'Avg Days on Market', value: `${w.avg_dom}d` },
    { label: 'Homes For Sale', value: w.active.toLocaleString() },
  ] : monthData ? [
    { label: 'All Types Sold', value: monthData.sold.toLocaleString() },
    { label: 'Avg Sold Price', value: formatPrice(monthData.avg_price) },
    { label: 'Avg Days on Market', value: `${monthData.avg_dom}d` },
    { label: 'Avg $/sqft', value: monthData.avg_ppsf ? `$${Math.round(monthData.avg_ppsf).toLocaleString('en-CA')}` : '—' },
  ] : []

  function monthPath(m: string) {
    const [y, mo] = m.split('-')
    return ap(`/market-report/${y}/${mo}/${segment}/${type}`)
  }

  const faqPerformance = {
    q: `How did the ${subareaName} ${typeLabel.toLowerCase()} market perform in ${labelFull}?`,
    a: w && w.avg_sold_price > 0
      ? `The ${subareaName} ${typeLabel.toLowerCase()} market currently shows ${w.sold_30d} units sold in the last 30 days at an average price of ${formatPriceFull(w.avg_sold_price)}, with an average of ${w.avg_dom} days on market. ${w.market_type === 'strong-sellers' || w.market_type === 'sellers' ? `Demand is strong with limited supply.` : w.market_type === 'buyers' ? `Buyers have more choice and negotiating leverage.` : `Conditions are balanced.`} This data reflects the most recent 30-day MLS® activity.`
      : `${labelFull} ${typeLabel.toLowerCase()} data for ${subareaName} is being compiled. Check back soon or view the full ${subareaName} market report.`,
  }

  const faqPricing = w && w.avg_sold_price > 0 ? {
    q: `What is the average price of a ${typeSingular.toLowerCase()} in ${subareaName}?`,
    a: `The average sold price for a ${typeSingular.toLowerCase()} in ${subareaName} is currently ${formatPriceFull(w.avg_sold_price)}, based on MLS® sales over the past 30 days. Prices vary by size, floor, age, and condition. Contact a local agent for a property-specific valuation.`,
  } : null

  const faqDom = w && w.avg_dom > 0 ? {
    q: `How long do ${typeLabel.toLowerCase()} take to sell in ${subareaName}?`,
    a: `${typeLabel} in ${subareaName} are currently selling in an average of ${w.avg_dom} days on market. Well-priced properties in good condition tend to sell faster — sometimes within days of listing. Properties at higher price points may take longer.`,
  } : null

  const faqAbsorption = absorbBadge ? {
    q: `What is the absorption rate for ${typeLabel.toLowerCase()} in ${subareaName}?`,
    a: absorptionFaqAnswer(`${subareaName} ${typeLabel.toLowerCase()}`, absorbBadge.months, w!.market_type),
  } : null

  const faqBuyers = {
    q: `Is it a good time to buy a ${typeSingular.toLowerCase()} in ${subareaName}?`,
    a: `${subareaName} ${typeLabel.toLowerCase()} ${badge ? `are currently in a ${badge.label.toLowerCase()}` : 'market conditions vary'}.${w && w.avg_sold_price > 0 ? ` The average price is ${formatPriceFull(w.avg_sold_price)}.` : ''} Whether now is the right time depends on your personal timeline, budget, and goals. A knowledgeable local agent can help you assess current opportunities.`,
  }

  const faqMonthly = monthData ? {
    q: `How did the overall ${subareaName} market perform in ${labelFull}?`,
    a: `In ${labelFull}, the ${subareaName} real estate market (all property types) recorded ${monthData.sold} sales at an average price of ${formatPriceFull(monthData.avg_price)}, with properties averaging ${monthData.avg_dom} days on market${monthData.avg_ppsf ? ` at $${Math.round(monthData.avg_ppsf).toLocaleString('en-CA')} per square foot` : ''}.`,
  } : null

  const faqPrevMonth = prevMonthData && monthData ? {
    q: `How did ${subareaName} compare in ${labelFull} vs. ${monthLabelFull(prevMonthKey!)}?`,
    a: (() => {
      const soldDiff = monthData.sold - prevMonthData.sold
      const soldPct = prevMonthData.sold > 0 ? Math.abs(Math.round((soldDiff / prevMonthData.sold) * 100)) : 0
      const priceDiff = monthData.avg_price - prevMonthData.avg_price
      const pricePct = prevMonthData.avg_price > 0 ? Math.abs(Math.round((priceDiff / prevMonthData.avg_price) * 100)) : 0
      const soldTrend = soldDiff > 0 ? `up ${soldPct}%` : soldDiff < 0 ? `down ${soldPct}%` : 'unchanged'
      const priceTrend = priceDiff > 0 ? `up ${pricePct}% to ${formatPriceFull(monthData.avg_price)}` : priceDiff < 0 ? `down ${pricePct}% to ${formatPriceFull(monthData.avg_price)}` : `steady at ${formatPriceFull(monthData.avg_price)}`
      return `Compared to ${monthLabelFull(prevMonthKey!)}, overall ${subareaName} sales volume was ${soldTrend} (${prevMonthData.sold} vs ${monthData.sold} homes sold) and the average sold price was ${priceTrend}.`
    })(),
  } : null

  const faqItems = [
    faqPerformance,
    ...(faqPricing ? [faqPricing] : []),
    ...(faqDom ? [faqDom] : []),
    ...(faqAbsorption ? [faqAbsorption] : []),
    faqBuyers,
    ...(faqMonthly ? [faqMonthly] : []),
    ...(faqPrevMonth ? [faqPrevMonth] : []),
  ]

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: ap('/') },
      { '@type': 'ListItem', position: 2, name: 'Market Report', item: ap('/market-report') },
      { '@type': 'ListItem', position: 3, name: labelFull, item: ap(`/market-report/${year}/${month}`) },
      { '@type': 'ListItem', position: 4, name: subareaName, item: ap(`/market/${segment}`) },
      { '@type': 'ListItem', position: 5, name: typeLabel, item: ap(`/market-report/${year}/${month}/${segment}/${type}`) },
    ],
  }

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${labelFull} ${subareaName} ${typeLabel} Market Report — ${areaLabel}`,
    description: `${labelFull} ${typeLabel.toLowerCase()} sales volume, average sold price, days on market and market conditions for ${subareaName}, ${detail.city}.`,
    datePublished: `${year}-${month.padStart(2, '0')}-01`,
    author: { '@type': 'RealEstateAgent', name: agent.name },
    about: {
      '@type': 'Place',
      name: subareaName,
      address: { '@type': 'PostalAddress', addressLocality: detail.city, addressRegion: 'BC', addressCountry: 'CA' },
    },
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

  const datasetJsonLd = reports.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${subareaName} 24-Month Real Estate Market Trend`,
    description: `24-month MLS® sales data for ${subareaName}, ${detail.city} including homes sold, average sold price, average days on market, and average price per square foot.`,
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Month', description: 'Reporting month in YYYY-MM format' },
      { '@type': 'PropertyValue', name: 'Homes Sold', description: 'Number of MLS® transactions closed' },
      { '@type': 'PropertyValue', name: 'Average Sold Price', description: 'Mean sold price in CAD' },
      { '@type': 'PropertyValue', name: 'Average Days on Market', description: 'Mean days from list date to accepted offer' },
    ],
  } : null

  const otherTypes = Object.entries(TYPE_SLUG_TO_LABEL)
    .filter(([s]) => s !== type)
    .map(([s, lbl]) => ({ slug: s, label: lbl }))

  const recentMonths = [...reports].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6)

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
            <a href={ap(`/market/${segment}`)} style={{ color: '#888', textDecoration: 'none' }}>{subareaName}</a>
            <span>›</span>
            <span>{typeLabel}</span>
          </div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>
            {typeLabel} Market Report
          </div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(26px,3.8vw,44px)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', margin: 0 }}>
            {labelFull} {subareaName} {typeLabel} Market
          </h1>
          <p style={{ color: '#555', marginTop: 14, fontSize: 15, marginBottom: 20, maxWidth: 680, lineHeight: 1.7 }}>
            {w && w.avg_sold_price > 0
              ? `${typeLabel} market data for ${subareaName}, ${detail.city} — ${labelFull}. Average sold price ${formatPriceFull(w.avg_sold_price)}, ${w.sold_30d} sold in 30 days, ${w.avg_dom} avg days on market.`
              : `${typeLabel} market data for ${subareaName}, ${detail.city} — covering sales volume, pricing, and days on market for ${labelFull}.`
            }
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {badge && (
              <span style={{ background: badge.bg, color: badge.color, padding: '5px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                {badge.label}
              </span>
            )}
            {absorbBadge && (
              <span style={{ background: absorbBadge.bg, color: absorbBadge.color, padding: '5px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                {absorbBadge.months.toFixed(1)} mo supply
              </span>
            )}
            <a href={ap(`/market-report/${year}/${month}`)} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}>
              ← {labelFull} Full Report
            </a>
            <a href={ap(`/market/${segment}/${type}`)} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}>
              {subareaName} {typeLabel} (Live) →
            </a>
          </div>
        </div>
      </div>

      {/* Month nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
        <div className="container" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {prevMonthKey && (
            <a href={monthPath(prevMonthKey)} style={{ fontSize: 13, color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 14px', textDecoration: 'none', background: '#fff' }}>
              ← {monthLabel(prevMonthKey)}
            </a>
          )}
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-bg)', margin: '0 4px' }}>{label}</span>
          {nextMonthKey && (
            <a href={monthPath(nextMonthKey)} style={{ fontSize: 13, color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 14px', textDecoration: 'none', background: '#fff' }}>
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

        {w && (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 22px', marginBottom: 24, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            {badge && (
              <span style={{ background: badge.bg, color: badge.color, padding: '5px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                {badge.label}
              </span>
            )}
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{marketVerdict(w, `${subareaName} ${typeLabel.toLowerCase()}`)}</span>
          </div>
        )}

        {stats.length > 0 && <StatGrid items={stats} />}

        {w && w.avg_sold_price > 0 && (
          <section style={{ marginTop: 36 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 16 }}>
              Current {subareaName} {typeLabel} Stats
            </h2>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 24px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, marginTop: 0 }}>
                Live MLS® data updated every 5 minutes. Most recent 30-day rolling window.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '12px 28px' }}>
                {[
                  [`${typeSingular}s Sold (30d)`, w.sold_30d.toLocaleString()],
                  ['Avg Sold Price', formatPriceFull(w.avg_sold_price)],
                  ['Homes For Sale', w.active.toLocaleString()],
                  ['Avg Days on Market', `${w.avg_dom} days`],
                  ...(absorbBadge ? [['Months of Supply', `${absorbBadge.months.toFixed(1)} mo`]] : []),
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

        {monthData && (
          <section style={{ marginTop: 36 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 8 }}>
              {labelFull} {subareaName} Market Snapshot
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, marginTop: 0 }}>
              All property types — historical MLS® data for {subareaName} in {labelFull}.
            </p>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '12px 28px' }}>
                {[
                  ['All Types Sold', monthData.sold.toLocaleString()],
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

        {recentMonths.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 16 }}>
              {subareaName} Monthly Market Trend
            </h2>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
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
                  {recentMonths.map(p => {
                    const mktBadge = monthlyMarketBadge(p.active, p.sold)
                    return (
                      <tr
                        key={p.month}
                        style={{ borderBottom: '1px solid var(--border)', background: p.month === monthKey ? 'var(--off-white)' : '#fff' }}
                      >
                        <td style={{ ...td, fontWeight: p.month === monthKey ? 800 : 400 }}>
                          <a href={monthPath(p.month)} style={{ color: p.month === monthKey ? 'var(--primary-bg)' : 'var(--accent)', textDecoration: 'none', fontWeight: p.month === monthKey ? 800 : 600 }}>
                            {monthLabelFull(p.month)}
                          </a>
                        </td>
                        <td style={{ ...td, textAlign: 'right' }}>{p.sold.toLocaleString()}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{p.avg_price > 0 ? formatPriceFull(p.avg_price) : '—'}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{p.avg_dom > 0 ? `${p.avg_dom}d` : '—'}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{p.avg_ppsf ? `$${Math.round(p.avg_ppsf).toLocaleString('en-CA')}` : '—'}</td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          {mktBadge ? (
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              background: mktBadge.bg,
                              color: mktBadge.color,
                              whiteSpace: 'nowrap',
                            }}>
                              {mktBadge.label}
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
              Frequently Asked Questions — {subareaName} {typeLabel}
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
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary-bg)', marginBottom: 14 }}>Explore More</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: `${labelFull} Full Report`, href: ap(`/market-report/${year}/${month}`) },
              { label: `${labelFull} ${typeLabel} (Territory-Wide)`, href: ap(`/market-report/${year}/${month}/${type}`) },
              { label: `${subareaName} ${typeLabel} Market (Live)`, href: ap(`/market/${segment}/${type}`) },
              { label: `${subareaName} All Property Types`, href: ap(`/market/${segment}`) },
              { label: `${subareaName} Neighbourhood Guide`, href: ap(`/neighbourhood/${segment}`) },
              ...otherTypes.map(t => ({ label: `${labelFull} ${subareaName} ${t.label}`, href: ap(`/market-report/${year}/${month}/${segment}/${t.slug}`) })),
            ].map(l => (
              <a key={l.href} href={l.href} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}>
                {l.label}
              </a>
            ))}
          </div>
        </section>

        <div style={{ marginTop: 40, background: 'var(--primary-bg)', borderRadius: 12, padding: '32px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
            What does the {subareaName} {typeLabel.toLowerCase()} market mean for you?
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 22, maxWidth: 460, margin: '0 auto 22px' }}>
            {agent.name.split(' ')[0]} specialises in {subareaName} real estate and can give you a personalised view of the {typeLabel.toLowerCase()} market.
          </p>
          <a href={ap('/contact?reason=market')} style={{ display: 'inline-block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '13px 30px', borderRadius: 6, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none' }}>
            Get a Market Briefing
          </a>
        </div>
      </div>

      <StickyConversionBar
        contactHref={ap('/contact?reason=valuation')}
        areaLabel={subareaName}
        agentFirstName={agent.name.split(' ')[0]}
        marketCondition={badge?.label ?? 'Balanced Market'}
      />

      <style>{`
        details summary::-webkit-details-marker { display: none }
        details[open] summary span:last-child { transform: rotate(45deg); display: inline-block }
      `}</style>
    </div>
  )
}
