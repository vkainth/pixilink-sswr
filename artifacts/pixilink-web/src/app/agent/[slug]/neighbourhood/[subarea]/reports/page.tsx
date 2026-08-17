import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getNeighbourhoodDetail, getMarketReport, resolveAgentPrefix } from '@/lib/api'
import { formatPrice, formatPriceFull } from '@/lib/types'
import { marketBadge, monthLabel } from '@/lib/market'
import StatGrid from '@/components/StatGrid'
import MarketChart from '@/components/MarketChart'
import ContactSidebarForm from '@/components/ContactSidebarForm'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string; subarea: string }>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, subarea } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const [agent, detail] = await Promise.all([getAgent(slug), getNeighbourhoodDetail(slug, subarea)])
  const area = detail?.name || subarea.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const title = `${area} Market Reports`
  const description = `Monthly market reports for ${area} — sold prices, days on market, inventory trends and market condition analysis from ${agent?.name || 'your local agent'}.`
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

const th: React.CSSProperties = {
  textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', padding: '11px 14px', whiteSpace: 'nowrap',
}
const td: React.CSSProperties = { fontSize: 13, color: 'var(--text)', padding: '12px 14px', whiteSpace: 'nowrap' }

export default async function NeighbourhoodReportsPage({ params }: Props) {
  const { slug, subarea } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const [agent, detail, report] = await Promise.all([
    getAgent(slug),
    getNeighbourhoodDetail(slug, subarea),
    getMarketReport(slug, undefined),
  ])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const areaName = detail?.name || subarea.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const trend = detail?.monthly_trend ?? report.monthly_trend
  const widget = detail?.widget
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${areaName} Market Reports`,
    description: `Monthly market reports for ${areaName} — sold prices, days on market, inventory trends and market condition analysis from ${agent.name}.`,
    provider: { '@type': 'RealEstateAgent', name: agent.name },
  }

  const months = trend.map(p => monthLabel(p.month))
  const priceSeries = trend.map(p => Math.round(p.avg_price / 1000))
  const soldSeries = trend.map(p => p.sold)
  const domSeries = trend.map(p => p.avg_dom)

  const stats = widget ? [
    { label: 'Homes For Sale', value: widget.active.toLocaleString() },
    { label: 'Sold (30d)', value: widget.sold_30d.toLocaleString() },
    { label: 'Avg Sold Price', value: formatPrice(widget.avg_sold_price) },
    { label: 'Avg Days on Market', value: `${widget.avg_dom}d` },
  ] : []

  const badge = widget ? marketBadge(widget.market_type) : null

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Hero */}
      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
            <a href={ap('/neighbourhoods')} style={{ color: '#888', textDecoration: 'none' }}>Neighbourhoods</a>
            {' › '}
            <a href={ap(`/neighbourhood/${subarea}`)} style={{ color: '#888', textDecoration: 'none' }}>{areaName}</a>
            {' › '}<span>Reports</span>
          </div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>Market Reports</div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(24px,3.5vw,42px)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', margin: 0 }}>{areaName} Market Reports</h1>
          <p style={{ color: '#555', marginTop: 14, fontSize: 15, maxWidth: 620, lineHeight: 1.7, marginBottom: 0 }}>
            Monthly sales data, pricing trends and market condition analysis for {areaName} — updated from the latest MLS® data.
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '40px var(--container-padding) 72px' }}>
        <div className="reports-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 40, alignItems: 'start' }}>
          <div>
            {/* Market badge + stats */}
            {badge && widget && (
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ background: badge.bg, color: badge.color, padding: '5px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                  {badge.label}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                  {widget.sold_30d} homes sold in the last 30 days — absorption rate {widget.absorption_rate.toFixed(1)}%
                </span>
              </div>
            )}

            {stats.length > 0 && <StatGrid items={stats} />}

            {/* Charts */}
            {trend.length > 0 && (
              <section style={{ marginTop: 36 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 20 }}>Trend Charts</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 18 }}>
                  <MarketChart data={priceSeries} labels={months} type="line" title="Avg Sold Price ($000s)" yPrefix="$" ySuffix="K" />
                  <MarketChart data={soldSeries} labels={months} type="bar" title="Homes Sold per Month" />
                  <MarketChart data={domSeries} labels={months} type="bar" title="Avg Days on Market" color="#6b7280" ySuffix=" days" />
                </div>
              </section>
            )}

            {/* Monthly trend table */}
            {trend.length > 0 && (
              <section style={{ marginTop: 40 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 16 }}>Monthly Data Archive</h2>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--off-white)' }}>
                        <th style={th}>Month</th>
                        <th style={th}>Sold</th>
                        <th style={th}>Avg Price</th>
                        <th style={th}>Avg DOM</th>
                        <th style={th}>Avg $/sqft</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...trend].reverse().map(p => (
                        <tr key={p.month} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ ...td, fontWeight: 600 }}>{monthLabel(p.month)}</td>
                          <td style={td}>{p.sold.toLocaleString()}</td>
                          <td style={td}>{formatPriceFull(p.avg_price)}</td>
                          <td style={td}>{p.avg_dom}d</td>
                          <td style={td}>{p.avg_ppsf ? `$${Math.round(p.avg_ppsf).toLocaleString('en-CA')}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Quick links */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 22px', marginTop: 36 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Explore {areaName}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { l: 'Homes For Sale', h: ap(`/neighbourhood/${subarea}`) },
                  { l: 'Sold Homes', h: ap(`/neighbourhood/${subarea}/sold`) },
                  { l: 'Full Market Report', h: ap('/market-report') },
                  { l: 'All Neighbourhoods', h: ap('/neighbourhoods') },
                ].map(x => (
                  <a key={x.l} href={x.h} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 12px', borderRadius: 6, textDecoration: 'none', fontSize: 12 }}>{x.l}</a>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div style={{ background: 'rgba(var(--accent-rgb),0.10)', border: '1px solid var(--accent)', borderRadius: 10, padding: '16px 18px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 4 }}>Free Home Valuation</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                {agent.name.split(' ')[0]} can prepare a personalised market analysis for your {areaName} home.
              </div>
            </div>
            <ContactSidebarForm agent={agent} mode="contact" />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .reports-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
