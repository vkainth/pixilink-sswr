import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getMarketReport, getNeighbourhoods, resolveAgentPrefix } from '@/lib/api'
import PageQuickLinks from '@/components/PageQuickLinks'
import { formatPrice, formatPriceFull, getCoAgents } from '@/lib/types'
import { marketBadge, marketVerdict, monthLabel, monthLabelFull, absorptionFaqAnswer, absorptionBadge, normalizeCity, monthlyMarketBadge } from '@/lib/market'
import StatGrid from '@/components/StatGrid'
import RandysTake from '@/components/RandysTake'
import AskRandyForm from '@/components/AskRandyForm'
import AgentBrandingBand from '@/components/AgentBrandingBand'
import MarketChartsClient from '@/components/MarketChartsClient'
import TrendTableClient from '@/components/TrendTableClient'
import StickyConversionBar from '@/components/StickyConversionBar'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { NeighbourhoodSummary, MarketType } from '@/lib/types'


interface Props {
  params: Promise<{ slug: string; year: string; month: string }>
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
  const { slug, year, month } = await params
  const monthKey = `${year}-${month.padStart(2, '0')}`
  const labelFull = monthLabelFull(monthKey)
  const [agent, neighbourhoods, report] = await Promise.all([
    getAgent(slug),
    getNeighbourhoods(slug),
    getMarketReport(slug).catch(() => null),
  ])
  const area = buildAreaLabel(neighbourhoods)
  const agentName = agent?.name || 'Your Local Agent'
  const title = `${labelFull} Real Estate Market Report — ${area} | ${agentName}`

  const monthData = report?.monthly_trend?.find(p => p.month === monthKey) ?? null
  let description: string
  if (monthData) {
    const soldStr = monthData.sold.toLocaleString()
    const priceStr = formatPrice(monthData.avg_price)
    description = `${labelFull} real estate market report for ${area}: ${soldStr} homes sold at an average price of ${priceStr}. Sales volume, pricing trends, days on market, and local market conditions.`
  } else {
    description = `${labelFull} real estate market report for ${area} — homes sold, average sold price, days on market, and market conditions from ${agentName}.`
  }

  // Clamp description to 155 chars
  if (description.length > 155) {
    description = description.slice(0, 152) + '...'
  }

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
const captionStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-muted)', textAlign: 'left',
  padding: '10px 14px 8px', fontStyle: 'italic', captionSide: 'top',
}

export default async function MonthlyMarketReportPage({ params }: Props) {
  const { slug, year, month } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const monthKey = `${year}-${month.padStart(2, '0')}`
  const label = monthLabel(monthKey)
  const labelFull = monthLabelFull(monthKey)

  const [agent, report, neighbourhoods] = await Promise.all([
    getAgent(slug),
    getMarketReport(slug),
    getNeighbourhoods(slug),
  ])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const areaLabel = buildAreaLabel(neighbourhoods)
  const allMonths = report.monthly_trend.map(p => p.month).sort()
  const currentIdx = allMonths.indexOf(monthKey)
  const monthData = report.monthly_trend.find(p => p.month === monthKey) ?? null
  const prevMonthKey = currentIdx > 0 ? allMonths[currentIdx - 1] : null
  const prevMonthData = prevMonthKey ? report.monthly_trend.find(p => p.month === prevMonthKey) ?? null : null
  const o = report.overall

  // Derive market type from the historical month's SALR (sold ÷ active × 100)
  // rather than o.market_type which reflects today's live stats.
  const monthSalr = (monthData?.active && monthData?.sold && monthData.active > 0)
    ? (monthData.sold / monthData.active) * 100
    : null
  const monthMarketType: MarketType = monthSalr != null
    ? (monthSalr > 20 ? 'sellers' : monthSalr >= 12 ? 'balanced' : 'buyers')
    : o.market_type

  const badge = monthlyMarketBadge(monthData?.active, monthData?.sold) ?? marketBadge(o.market_type)
  const absorbBadge = absorptionBadge(o)

  const currentMonthShort = new Date(Number(year), Number(month.padStart(2, '0')) - 1, 1)
    .toLocaleDateString('en-CA', { month: 'short' })

  const stats = monthData ? [
    { label: 'Homes Sold', value: monthData.sold.toLocaleString() },
    { label: 'Avg Sold Price', value: formatPrice(monthData.avg_price) },
    { label: 'Avg Days on Market', value: `${monthData.avg_dom}d` },
    { label: 'Avg $/sqft', value: monthData.avg_ppsf ? `$${Math.round(monthData.avg_ppsf).toLocaleString('en-CA')}` : '—' },
  ] : [
    { label: 'Homes Sold (30d)', value: o.sold_30d.toLocaleString() },
    { label: 'Avg Sold Price', value: formatPrice(o.avg_sold_price) },
    { label: 'Avg Days on Market', value: `${o.avg_dom}d` },
    { label: 'Active Inventory', value: o.active.toLocaleString() },
  ]

  const prevMonth = currentIdx > 0 ? allMonths[currentIdx - 1] : null
  const nextMonth = currentIdx >= 0 && currentIdx < allMonths.length - 1 ? allMonths[currentIdx + 1] : null

  function monthPath(m: string) {
    const [y, mo] = m.split('-')
    return ap(`/market-report/${y}/${mo}`)
  }

  // ── FAQ items ──────────────────────────────────────────────────────────────

  const faqPerformance = {
    q: `How did the ${areaLabel} real estate market perform in ${labelFull}?`,
    a: monthData
      ? `In ${labelFull}, ${monthData.sold} homes sold in ${areaLabel} at an average price of ${formatPriceFull(monthData.avg_price)}, with properties spending an average of ${monthData.avg_dom} days on the market${monthData.avg_ppsf ? ` at $${Math.round(monthData.avg_ppsf).toLocaleString('en-CA')} per square foot` : ''}. ${monthMarketType === 'strong-sellers' || monthMarketType === 'sellers' ? 'Seller-favourable conditions kept inventory lean and prices firm.' : monthMarketType === 'buyers' ? 'Increased supply gave buyers more options and negotiating leverage.' : 'Conditions were roughly balanced between buyers and sellers.'}`
      : `${labelFull} market data is being compiled. Check back soon for full results, or view the current market report for the latest ${areaLabel} sales data.`,
  }

  const faqAbsorption = absorbBadge ? {
    q: `What does the absorption rate mean for ${areaLabel} in ${labelFull}?`,
    a: absorptionFaqAnswer(areaLabel, absorbBadge.months, monthMarketType),
  } : null

  const faqBuyers = {
    q: `What does the ${labelFull} market mean for buyers in ${areaLabel}?`,
    a: monthMarketType === 'strong-sellers' || monthMarketType === 'sellers'
      ? `For buyers in ${areaLabel} during ${labelFull}, competition was elevated with lean inventory and limited time to make decisions. Preparing a strong pre-approval and working with a knowledgeable local agent helped buyers move quickly and structure competitive offers. Focusing on realistic must-haves over wish-lists also improved success rates in this environment.`
      : monthMarketType === 'buyers'
      ? `Buyers in ${areaLabel} during ${labelFull} were in a favourable position, with more listings to choose from and less pressure to bid over asking. This is an opportunity to take time, conduct thorough due diligence, and negotiate on price, conditions, and possession dates. A good agent can help identify motivated sellers and well-priced properties.`
      : `${labelFull} presented ${areaLabel} buyers with a balanced environment — enough selection to find the right home without the pressure of a full seller's market. Financing approvals and thoughtful offers at or near list price remained effective strategies for securing a home.`,
  }

  const faqSellers = {
    q: `What does the ${labelFull} market mean for sellers in ${areaLabel}?`,
    a: monthMarketType === 'strong-sellers' || monthMarketType === 'sellers'
      ? `Sellers in ${areaLabel} during ${labelFull} benefited from strong demand, tight inventory, and motivated buyers. Well-prepared, properly priced homes attracted multiple showings and, in many cases, multiple offers. Timing and pricing strategy still mattered — overpriced listings stalled even in this market. A local comparative market analysis (CMA) helped sellers set the right list price.`
      : monthMarketType === 'buyers'
      ? `In ${labelFull}, ${areaLabel} sellers faced a more challenging environment with more competing listings and buyers who were less urgently motivated. Pricing sharply and investing in presentation (staging, professional photography) were key differentiators. Sellers who priced to market saw reasonable activity; those who held firm above market value saw extended days on market.`
      : `${labelFull} offered ${areaLabel} sellers a stable window — demand was steady and well-priced homes sold in a reasonable timeframe. Setting a realistic asking price based on recent comparable sales and presenting the home well remained the most effective approach.`,
  }

  const faqPrevMonth = prevMonthData && monthData ? {
    q: `How did ${labelFull} compare to ${monthLabelFull(prevMonthKey!)} in ${areaLabel}?`,
    a: (() => {
      const soldDiff = monthData.sold - prevMonthData.sold
      const soldPct = prevMonthData.sold > 0 ? Math.abs(Math.round((soldDiff / prevMonthData.sold) * 100)) : 0
      const priceDiff = monthData.avg_price - prevMonthData.avg_price
      const pricePct = prevMonthData.avg_price > 0 ? Math.abs(Math.round((priceDiff / prevMonthData.avg_price) * 100)) : 0
      const soldTrend = soldDiff > 0 ? `up ${soldPct}%` : soldDiff < 0 ? `down ${soldPct}%` : 'unchanged'
      const priceTrend = priceDiff > 0 ? `up ${pricePct}% to ${formatPriceFull(monthData.avg_price)}` : priceDiff < 0 ? `down ${pricePct}% to ${formatPriceFull(monthData.avg_price)}` : `steady at ${formatPriceFull(monthData.avg_price)}`
      return `Compared to ${monthLabelFull(prevMonthKey!)}, sales volume in ${areaLabel} was ${soldTrend} (${prevMonthData.sold} vs ${monthData.sold} homes sold) and the average sold price was ${priceTrend}. Days on market ${monthData.avg_dom > prevMonthData.avg_dom ? `increased from ${prevMonthData.avg_dom} to ${monthData.avg_dom} days` : monthData.avg_dom < prevMonthData.avg_dom ? `decreased from ${prevMonthData.avg_dom} to ${monthData.avg_dom} days` : `held steady at ${monthData.avg_dom} days`}.`
    })(),
  } : null

  const faqItems = [
    faqPerformance,
    ...(faqAbsorption ? [faqAbsorption] : []),
    faqBuyers,
    faqSellers,
    ...(faqPrevMonth ? [faqPrevMonth] : []),
  ]

  // ── JSON-LD ────────────────────────────────────────────────────────────────

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: ap('/') },
      { '@type': 'ListItem', position: 2, name: 'Market Report', item: ap('/market-report') },
      { '@type': 'ListItem', position: 3, name: labelFull, item: ap(`/market-report/${year}/${month}`) },
    ],
  }

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${labelFull} Real Estate Market Report — ${areaLabel}`,
    description: `${labelFull} sales volume, avg prices, days on market and market conditions for ${areaLabel}.`,
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

  const datasetJsonLd = report.monthly_trend.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${areaLabel} 24-Month Real Estate Market Trend`,
    description: `24-month MLS® sales data for ${areaLabel} including homes sold, average sold price, average days on market, and average price per square foot. Filterable by property type: condos, townhouses, and houses.`,
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Month', description: 'Reporting month in YYYY-MM format' },
      { '@type': 'PropertyValue', name: 'Homes Sold', description: 'Number of MLS® transactions closed' },
      { '@type': 'PropertyValue', name: 'Average Sold Price', description: 'Mean sold price across all property types in CAD' },
      { '@type': 'PropertyValue', name: 'Average Days on Market', description: 'Mean number of days from list date to accepted offer' },
      { '@type': 'PropertyValue', name: 'Average Price per Sq Ft', description: 'Mean sold price per square foot in CAD' },
    ],
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'text/csv',
      description: `month,homes_sold,avg_sold_price,avg_dom,avg_ppsf\n` +
        [...report.monthly_trend].sort((a, b) => a.month.localeCompare(b.month)).map(p =>
          `${p.month},${p.sold},${Math.round(p.avg_price)},${p.avg_dom},${p.avg_ppsf ? Math.round(p.avg_ppsf) : ''}`
        ).join('\n'),
    },
  } : null

  const firstName = agent.name.split(' ')[0]
  const marketConditionLabel = badge.label

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
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
            <a href={ap('/market-report')} style={{ color: '#888', textDecoration: 'none' }}>Market Report</a>
            {' › '}<span>{labelFull}</span>
          </div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>Monthly Archive</div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(26px,3.8vw,44px)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', margin: 0 }}>
            {labelFull} Market Report — {areaLabel}
          </h1>
          <p style={{ color: '#555', marginTop: 14, fontSize: 15, marginBottom: 0, maxWidth: 680, lineHeight: 1.7 }}>
            {monthData
              ? `The ${areaLabel} real estate market recorded ${monthData.sold} homes sold in ${labelFull} at an average sold price of ${formatPriceFull(monthData.avg_price)}. This report covers sales volume, average sold price, days on market, and overall market conditions to help buyers and sellers understand ${labelFull} trends.`
              : `This report covers the ${areaLabel} real estate market for ${labelFull} — tracking homes sold, average sold price, days on market, and market conditions. Use this data to understand local pricing trends and make more informed real estate decisions.`
            }
          </p>
        </div>
      </div>

      {/* Month nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
        <div className="container" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {prevMonth && (
            <a href={monthPath(prevMonth)} style={{ fontSize: 13, color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 14px', textDecoration: 'none', background: '#fff' }}>
              ← {monthLabel(prevMonth)}
            </a>
          )}
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-bg)', margin: '0 4px' }}>{label}</span>
          {nextMonth && (
            <a href={monthPath(nextMonth)} style={{ fontSize: 13, color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 14px', textDecoration: 'none', background: '#fff' }}>
              {monthLabel(nextMonth)} →
            </a>
          )}
          <a href={ap('/market-report')} style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            All Reports →
          </a>
        </div>
      </div>

      {/* ── Section 1: Snapshot stats (before branding band) ── */}
      <div className="container" style={{ padding: '40px var(--container-padding) 0' }}>

        {/* Verdict */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 22px', marginBottom: 24, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ background: badge.bg, color: badge.color, padding: '5px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
            {badge.label}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{marketVerdict(o, areaLabel)}</span>
        </div>

        <StatGrid items={stats} />

        {/* Randy's Take commentary box */}
        <RandysTake
          agent={agent}
          overall={o}
          monthData={monthData}
          areaLabel={areaLabel}
          monthLabel={labelFull}
          prevMonthData={prevMonthData}
        />

        {/* Monthly snapshot detail */}
        {monthData && (
          <section style={{ marginTop: 36 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 16 }}>{labelFull} Snapshot</h2>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '12px 28px' }}>
                {[
                  ['Homes Sold', monthData.sold.toLocaleString()],
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

        {/* Interactive Charts — above the fold before branding band */}
        <MarketChartsClient
          monthly_trend={report.monthly_trend}
          by_type={report.by_type}
          currentMonth={currentMonthShort}
        />
      </div>

      {/* ── Full-bleed Agent Branding Band ── */}
      <AgentBrandingBand
        agent={agent}
        ctaHref={ap('/contact?reason=cma')}
        coAgents={getCoAgents(agent)}
      />

      {/* ── Section 2: Data tables + lead forms ── */}
      <div className="container" style={{ padding: '0 var(--container-padding) 96px' }}>

        {/* By property type */}
        {report.by_type.length > 0 && (
          <section style={{ marginTop: 36 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 16 }}>By Property Type (Current Period)</h2>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                <caption style={captionStyle}>
                  {areaLabel} real estate sales by property type — {labelFull}. Includes homes sold, average sold price, days on market, active listings, and market type.
                </caption>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={th}>Type</th>
                    <th style={th}>Sold (30d)</th>
                    <th style={th}>Avg Sold Price</th>
                    <th style={th}>Avg DOM</th>
                    <th style={th}>Active</th>
                    <th style={th}>Market</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_type.map(row => {
                    const b = marketBadge(row.market_type)
                    return (
                      <tr key={row.type} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ ...td, fontWeight: 700 }}>{row.type}</td>
                        <td style={td}>{row.sold_30d.toLocaleString()}</td>
                        <td style={{ ...td, fontWeight: 700 }}>{formatPriceFull(row.avg_sold_price)}</td>
                        <td style={td}>{row.avg_dom}d</td>
                        <td style={td}>{row.active.toLocaleString()}</td>
                        <td style={td}>
                          <span style={{ background: b.bg, color: b.color, padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                            {b.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Trend table with property type toggle */}
        {report.monthly_trend.length > 0 && (
          <TrendTableClient
            monthly_trend={report.monthly_trend}
            monthly_trend_by_type={report.monthly_trend_by_type}
            monthKey={monthKey}
            slug={slug}
            agentPrefix={agentPrefix}
            areaLabel={areaLabel}
            labelFull={labelFull}
          />
        )}

        {/* By property type */}
        <section style={{ marginTop: 44 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 8 }}>View by Property Type</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16, marginTop: 0 }}>
            Drill into {labelFull} market data for a specific property type — each page includes type-filtered stats, trend data, and FAQs.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { slug: 'condos', label: 'Condos', icon: '🏢' },
              { slug: 'townhouses', label: 'Townhouses', icon: '🏘️' },
              { slug: 'houses', label: 'Houses', icon: '🏡' },
              { slug: 'duplexes', label: 'Duplexes', icon: '🏠' },
            ].map(t => {
              const typeRow = report.by_type.find(r =>
                t.slug === 'condos' ? r.type === 'Apartment'
                : t.slug === 'townhouses' ? r.type === 'Townhouse'
                : t.slug === 'duplexes' ? r.type === 'Duplex'
                : r.type === 'House'
              )
              return (
                <a
                  key={t.slug}
                  href={ap(`/market-report/${year}/${month}/${t.slug}`)}
                  style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', textDecoration: 'none', display: 'block' }}
                >
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{t.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 4 }}>{labelFull} {t.label}</div>
                  {typeRow && typeRow.avg_sold_price > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Avg {formatPrice(typeRow.avg_sold_price)} · {typeRow.sold_30d} sold
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginTop: 8 }}>View {t.label} report →</div>
                </a>
              )
            })}
          </div>
        </section>

        {/* More Reports — inline, above FAQ */}
        {report.monthly_trend.length > 0 && (
          <section style={{ marginTop: 44 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 16 }}>More Reports</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {report.monthly_trend.slice(-6).reverse().map(p => (
                <a
                  key={p.month}
                  href={monthPath(p.month)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: p.month === monthKey ? 'rgba(var(--accent-rgb),0.08)' : '#fff',
                    border: `1px solid ${p.month === monthKey ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 8,
                    padding: '10px 14px',
                    textDecoration: 'none',
                    fontSize: 13,
                    color: p.month === monthKey ? 'var(--accent)' : 'var(--text)',
                    fontWeight: p.month === monthKey ? 700 : 500,
                  }}
                >
                  <span>{monthLabel(p.month)}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.sold} sold</span>
                </a>
              ))}
            </div>
            <a href={ap('/market-report')} style={{ display: 'inline-block', fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', marginTop: 12 }}>
              View all reports →
            </a>
          </section>
        )}

        {/* FAQ */}
        <section style={{ marginTop: 44 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 16 }}>
            {labelFull} — Frequently Asked
          </h2>
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {faqItems.map((item, i) => (
              <details key={i} style={{ borderBottom: i < faqItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <summary style={{ padding: '16px 20px', fontSize: 14, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', background: '#fff', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span>{item.q}</span>
                  <span style={{ color: 'var(--accent)', fontSize: 20, flexShrink: 0, lineHeight: 1 }}>+</span>
                </summary>
                <div style={{ padding: '0 20px 18px', background: 'var(--off-white)', fontSize: 14, color: 'var(--text)', lineHeight: 1.8 }}>
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Testimonial pull-quote */}
        <blockquote style={{
          margin: '40px 0 0',
          padding: '24px 28px',
          background: 'var(--off-white)',
          borderLeft: '4px solid var(--accent)',
          borderRadius: 10,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: 12, left: 18,
            fontSize: 56, lineHeight: 1, color: 'var(--accent)', opacity: 0.22,
            fontFamily: 'Georgia, serif', pointerEvents: 'none', userSelect: 'none',
          }}>&ldquo;</div>
          <p style={{
            fontSize: 16, fontStyle: 'italic', color: 'var(--text)',
            lineHeight: 1.75, margin: '0 0 12px', position: 'relative', paddingLeft: 8,
          }}>
            Randy tracked the market data so closely that we felt completely confident in our offer price. He knew South Surrey inside out — the right neighbourhoods, the right buildings, the right timing. Highly recommend.
          </p>
          <footer style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, paddingLeft: 8 }}>
            — Sarah M., South Surrey buyer
          </footer>
        </blockquote>

        {/* Ask Randy inline lead form */}
        <AskRandyForm agent={agent} areaLabel={areaLabel} agentSlug={slug} />

        {/* CTA */}
        <div style={{ marginTop: 40, background: 'var(--primary-bg)', borderRadius: 12, padding: '32px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
            What does {labelFull} mean for your home?
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 22, maxWidth: 460, margin: '0 auto 22px' }}>
            {firstName} can explain what these numbers mean for your specific situation — buyer or seller.
          </p>
          <a href={ap('/contact?reason=market')} style={{ display: 'inline-block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '13px 30px', borderRadius: 6, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none' }}>
            Get a Market Briefing
          </a>
        </div>
      </div>

      {/* Sticky bottom conversion bar */}
      <StickyConversionBar
        contactHref={ap('/contact?reason=valuation')}
        areaLabel={areaLabel}
        agentFirstName={firstName}
        marketCondition={marketConditionLabel}
      />

      <PageQuickLinks slug={slug} context="market" exclude="/market-report" />
      <style>{`
        details summary::-webkit-details-marker{display:none}
        details[open] summary span:last-child{transform:rotate(45deg);display:inline-block}
      `}</style>
    </div>
  )
}
