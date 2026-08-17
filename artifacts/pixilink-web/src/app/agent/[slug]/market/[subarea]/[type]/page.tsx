import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getNeighbourhoodDetail, getNeighbourhoodReports, getNeighbourhoodSold, getPriceMatrix, agentCanonicalBase, resolveAgentPrefix } from '@/lib/api'
import { formatPrice, formatPriceFull } from '@/lib/types'
import { marketBadge, absorptionBadge, absorptionFaqAnswer, monthLabel } from '@/lib/market'
import NeighbourhoodChartsClient from '@/components/NeighbourhoodChartsClient'
import PriceMatrixGrid from '@/components/PriceMatrixGrid'
import QuickAnswerBox from '@/components/QuickAnswerBox'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { PriceMatrix, MonthlyTrendPoint } from '@/lib/types'


interface Props {
  params: Promise<{ slug: string; subarea: string; type: string }>
}

export const revalidate = 300

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

function normalizeSubareaSlug(s: string): string {
  return s.replace(/-+$/, '')
}

/** Derive year-over-year price change from a monthly trend array (needs ≥13 data points). */
function computeYoY(trend: MonthlyTrendPoint[]): { pct: number; direction: 'up' | 'down' | 'flat' } | null {
  if (trend.length < 13) return null
  const sorted = [...trend].sort((a, b) => a.month.localeCompare(b.month))
  const latest = sorted[sorted.length - 1]
  const yearAgo = sorted[sorted.length - 13]
  if (!latest.avg_price || !yearAgo.avg_price || yearAgo.avg_price <= 0) return null
  const pct = ((latest.avg_price - yearAgo.avg_price) / yearAgo.avg_price) * 100
  const direction: 'up' | 'down' | 'flat' = pct > 1 ? 'up' : pct < -1 ? 'down' : 'flat'
  return { pct, direction }
}

function matchesType(listingType: string | null | undefined, apiType: string): boolean {
  if (!listingType) return false
  const t = listingType.toLowerCase()
  if (apiType === 'Apartment') return t.includes('apartment') || t.includes('condo')
  if (apiType === 'Townhouse') return t.includes('townhouse') || t.includes('row')
  if (apiType === 'House') return t.includes('house') || t.includes('detach') || t.includes('single')
  if (apiType === 'Duplex') return t === 'duplex' || t === 'half duplex' || t.startsWith('duplex')
  return false
}

/** Filter a PriceMatrix to only include rows matching the given API type. */
function filterMatrixToType(matrix: PriceMatrix, apiType: string): PriceMatrix {
  const normMap: Record<string, string[]> = {
    Apartment: ['apartment', 'condo'],
    Townhouse: ['townhouse', 'row', 'town'],
    House: ['house', 'detach', 'single'],
    Duplex: ['duplex'],
  }
  const keywords = normMap[apiType] ?? []
  return {
    ...matrix,
    rows: matrix.rows.filter(r => {
      const t = r.type.toLowerCase()
      return keywords.some(kw => t.includes(kw))
    }),
  }
}

/** Build 2–3 editorial sentences for this type in this subarea. */
function buildTypeInsight(
  w: import('@/lib/types').NeighbourhoodWidget,
  name: string,
  city: string,
  typeLabel: string,
  typeSingular: string,
): string {
  const badge = marketBadge(w.market_type)
  const absorb = absorptionBadge(w)
  const sentences: string[] = []

  // 1. Market condition + price
  const priceClause = w.avg_sold_price > 0
    ? ` — the average sold price is ${formatPriceFull(w.avg_sold_price)} based on MLS® sales over the past 30 days`
    : ''
  sentences.push(`${typeLabel} in ${name} are currently in a ${badge.label.toLowerCase()}${priceClause}.`)

  // 2. Supply / buyer profile
  if (absorb) {
    if (absorb.months < 4) {
      sentences.push(`With only ${absorb.months.toFixed(1)} months of supply, ${typeLabel.toLowerCase()} here are in high demand — buyers should act quickly on new listings and come prepared with financing in place.`)
    } else if (absorb.months <= 6) {
      sentences.push(`At ${absorb.months.toFixed(1)} months of supply, the ${typeLabel.toLowerCase()} segment in ${name} is balanced, giving buyers reasonable time to compare options and negotiate.`)
    } else {
      sentences.push(`At ${absorb.months.toFixed(1)} months of supply, buyers searching for ${typeLabel.toLowerCase()} in ${name} have meaningful selection and room to negotiate on price and terms.`)
    }
  } else if (w.avg_dom > 0) {
    sentences.push(`${typeLabel} here are selling in an average of ${w.avg_dom} days on market.`)
  }

  // 3. CTA
  sentences.push(`Browse active ${typeLabel.toLowerCase()} listings in ${name}, or speak with a local ${city} agent for a personalised assessment based on your budget and goals.`)

  return sentences.join(' ')
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', padding: '11px 14px', whiteSpace: 'nowrap',
}
const tdStyle: React.CSSProperties = { fontSize: 13, color: 'var(--text)', padding: '12px 14px', whiteSpace: 'nowrap' }

function MonthComparisonTable({ trend, typeLabel }: { trend: MonthlyTrendPoint[]; typeLabel: string }) {
  if (trend.length < 2) return null
  const sorted = [...trend].sort((a, b) => a.month.localeCompare(b.month))
  const cur = sorted[sorted.length - 1]
  const pri = sorted[sorted.length - 2]
  const lyr = sorted.length >= 13 ? sorted[sorted.length - 13] : null

  function pctBadge(current: number, prior: number | undefined, invertColor = false) {
    if (!prior) return null
    const pct = ((current - prior) / prior) * 100
    const positive = invertColor ? pct <= 0 : pct >= 0
    return (
      <span style={{
        display: 'inline-block', marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
        background: positive ? '#dcfce7' : '#fee2e2', color: positive ? '#15803d' : '#dc2626',
      }}>
        {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
      </span>
    )
  }

  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
        Month-over-Month Comparison — {typeLabel}
      </h2>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -8, marginBottom: 12 }}>Subarea-level trend data</p>
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--off-white)' }}>
              <th style={thStyle}>Metric</th>
              <th style={{ ...thStyle, color: 'var(--primary-bg)' }}>{monthLabel(cur.month)} · Last 30 days</th>
              <th style={thStyle}>{monthLabel(pri.month)}</th>
              <th style={thStyle}>{lyr ? monthLabel(lyr.month) + ' (LY)' : '—'}</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Homes Sold</td>
              <td style={{ ...tdStyle, fontWeight: 800, color: 'var(--primary-bg)' }}>{cur.sold}{pctBadge(cur.sold, pri.sold)}</td>
              <td style={tdStyle}>{pri.sold}</td>
              <td style={tdStyle}>{lyr ? lyr.sold : '—'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg Sold Price</td>
              <td style={{ ...tdStyle, fontWeight: 800, color: 'var(--primary-bg)' }}>
                {cur.avg_price > 0 ? formatPrice(cur.avg_price) : 'N/A'}{pctBadge(cur.avg_price, pri.avg_price)}
              </td>
              <td style={tdStyle}>{pri.avg_price > 0 ? formatPrice(pri.avg_price) : '—'}</td>
              <td style={tdStyle}>{lyr ? (lyr.avg_price > 0 ? formatPrice(lyr.avg_price) : '—') : '—'}</td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg Days on Market</td>
              <td style={{ ...tdStyle, fontWeight: 800, color: 'var(--primary-bg)' }}>{cur.avg_dom}d{pctBadge(cur.avg_dom, pri.avg_dom, true)}</td>
              <td style={tdStyle}>{pri.avg_dom}d</td>
              <td style={tdStyle}>{lyr ? `${lyr.avg_dom}d` : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

function statCard(label: string, value: string, sub?: string): React.ReactNode {
  return (
    <div key={label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function buildFaqs(
  name: string,
  city: string,
  typeLabel: string,
  typeSingular: string,
  avgPrice: number,
  sold30d: number,
  avgDom: number,
  absorptionMonths: number | null,
  marketType: import('@/lib/types').MarketType,
  yoy: { pct: number; direction: 'up' | 'down' | 'flat' } | null,
) {
  const badge = marketBadge(marketType)
  const faqs: { q: string; a: string }[] = []

  faqs.push({
    q: `Is ${name} a buyer's or seller's market for ${typeLabel.toLowerCase()} right now?`,
    a: `The ${typeLabel.toLowerCase()} segment in ${name} is currently a ${badge.label.toLowerCase()}, with ${sold30d} ${typeLabel.toLowerCase()} sold in the last 30 days.${absorptionMonths ? ` At ${absorptionMonths.toFixed(1)} months of supply, conditions ${absorptionMonths < 4 ? 'favour sellers' : absorptionMonths <= 6 ? 'are balanced' : 'favour buyers'}.` : ''}`,
  })

  if (avgPrice > 0) {
    faqs.push({
      q: `What is the average price of a ${typeSingular.toLowerCase()} in ${name}?`,
      a: `The average sold price for a ${typeSingular.toLowerCase()} in ${name} is currently ${formatPriceFull(avgPrice)}, based on MLS® sales over the past 30 days. Prices vary by size, floor level, age, and condition. Contact a local ${city} agent for a specific valuation.`,
    })
  }

  if (yoy !== null) {
    const pctStr = `${Math.abs(yoy.pct).toFixed(1)}%`
    const dirWord = yoy.direction === 'up' ? 'up' : yoy.direction === 'down' ? 'down' : 'roughly flat'
    const implication =
      yoy.direction === 'up'
        ? `This appreciation trend suggests sustained demand — buyers considering ${typeLabel.toLowerCase()} in ${name} may benefit from acting sooner rather than waiting.`
        : yoy.direction === 'down'
        ? `This softening creates a window for buyers to enter at a lower price point than a year ago. Sellers should price ${typeLabel.toLowerCase()} competitively to attract offers in the current environment.`
        : `Prices have held steady year-over-year, offering predictability for both buyers and sellers in this segment.`
    faqs.push({
      q: `Have ${typeLabel.toLowerCase()} prices come down in ${name}?`,
      a: `${typeLabel} prices in ${name} are ${dirWord} ${pctStr} compared to the same period last year${avgPrice > 0 ? `, with an average sold price of ${formatPriceFull(avgPrice)}` : ''}. ${implication}`,
    })
  }

  if (avgDom > 0) {
    faqs.push({
      q: `How long do ${typeLabel.toLowerCase()} take to sell in ${name}?`,
      a: `${typeLabel} in ${name} are currently selling in an average of ${avgDom} days on market. Well-priced properties in good condition tend to sell faster — sometimes within the first week. Properties at higher price points may take longer.`,
    })
  }

  if (absorptionMonths && absorptionMonths > 0) {
    faqs.push({
      q: `What is the absorption rate for ${typeLabel.toLowerCase()} in ${name}?`,
      a: absorptionFaqAnswer(`${name} ${typeLabel.toLowerCase()}`, absorptionMonths, marketType),
    })
  }

  faqs.push({
    q: `Is now a good time to buy a ${typeSingular.toLowerCase()} in ${name}?`,
    a: `Whether now is a good time depends on your personal situation, budget, and how long you plan to hold the property. ${name} ${typeLabel.toLowerCase()} are currently in a ${badge.label.toLowerCase()}.${avgPrice > 0 ? ` The average price is ${formatPriceFull(avgPrice)}.` : ''} Speak with a local ${city} agent to get a personalised assessment based on current listings and your goals.`,
  })

  faqs.push({
    q: `How many ${typeLabel.toLowerCase()} sold in ${name} last month?`,
    a: `${sold30d} ${typeLabel.toLowerCase()} sold in ${name} over the past 30 days. Tracking monthly sales volume is a key indicator of market demand — rising sales signal growing buyer interest, while declining volume can reflect seasonal patterns or shifting market conditions.`,
  })

  return faqs
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, subarea, type } = await params
  if (!TYPE_SLUG_TO_API[type]) return { title: 'Market Stats' }
  const typeLabel = TYPE_SLUG_TO_LABEL[type]!
  const apiType = TYPE_SLUG_TO_API[type]!
  const [agent, detail] = await Promise.all([
    getAgent(slug),
    getNeighbourhoodDetail(slug, normalizeSubareaSlug(subarea), apiType),
  ])
  if (!detail) return { title: 'Market Stats' }
  const agentName = agent?.name || 'Your Local Agent'
  const domain = agentCanonicalBase(agent)
  const title = `${detail.name} ${typeLabel} Market Report — ${detail.city}, BC | ${agentName}`
  const typeSection = detail.by_type?.find(bt => bt.type === apiType)
  const w = typeSection?.widget ?? detail.widget
  const badge = w ? marketBadge(w.market_type) : null
  // YoY omitted from meta: trend data is aggregate (not type-filtered), would be a false claim
  let description = `${typeLabel} market stats for ${detail.name}, ${detail.city}: average sold price, days on market, absorption rate, sales volume and 12-month trend. Live MLS® data updated every 5 minutes.`
  if (badge && w) {
    const priceStr = w.avg_sold_price > 0 ? ` Avg price: ${formatPrice(w.avg_sold_price)}.` : ''
    const domStr = w.avg_dom > 0 ? ` Avg ${w.avg_dom} days on market.` : ''
    const candidate = `${detail.name} ${typeLabel}: ${badge.label}.${priceStr}${domStr} Live MLS® stats updated every 5 min.`
    if (candidate.length <= 160) description = candidate
  }
  return {
    title,
    description,
    alternates: { canonical: `https://${domain}/market/${subarea}/${type}` },
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function SubareaTypeMarketPage({ params }: Props) {
  const { slug, subarea, type } = await params
  const subareaKey = normalizeSubareaSlug(subarea)
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const isDomainMode = process.env.AGENT_ROUTING_MODE === 'domain'
  const typeSegment = `${type}-for-sale`
  const listingHref = (subareaSlug?: string) =>
    isDomainMode
      ? `/${typeSegment}${subareaSlug ? `/${subareaSlug}` : ''}`
      : ap(`/${typeSegment}${subareaSlug ? `/${subareaSlug}` : ''}`)

  const apiType = TYPE_SLUG_TO_API[type]
  if (!apiType) notFound()

  const typeLabel = TYPE_SLUG_TO_LABEL[type]!
  const typeSingular = TYPE_SLUG_TO_SINGULAR[type]!

  const [agent, detail, reports, soldAll, priceMatrixFull] = await Promise.all([
    getAgent(slug),
    getNeighbourhoodDetail(slug, subareaKey, apiType),
    getNeighbourhoodReports(slug, subareaKey),
    getNeighbourhoodSold(slug, subareaKey),
    getPriceMatrix(slug, subareaKey),
  ])

  if (!agent || !detail) notFound()
  requireNotShowcase(agent)

  const soldListings = soldAll.filter(l => matchesType(l.type, apiType))
  const typeSection = detail.by_type?.find(bt => bt.type === apiType)
  // If the API returns no by_type section for this property type in this subarea,
  // serve a 404 rather than silently falling back to aggregate widget data
  // (which would be rendered under a type-specific title — a factual misrepresentation).
  if (!typeSection) notFound()
  const w = typeSection.widget
  const badge = marketBadge(w.market_type)
  const absorption = absorptionBadge(w)
  const trend = reports.length > 0 ? reports : detail.monthly_trend
  const priceMatrix = filterMatrixToType(priceMatrixFull, apiType)

  // YoY intentionally omitted for type pages: getNeighbourhoodReports is not
  // type-filtered, so computing YoY from it and labelling it "{typeLabel} prices
  // are up/down X%" would be a factually incorrect aggregate claim.
  const faqs = buildFaqs(
    detail.name,
    detail.city,
    typeLabel,
    typeSingular,
    w.avg_sold_price,
    w.sold_30d,
    w.avg_dom,
    absorption?.months ?? null,
    w.market_type,
    null,
  )

  const faqJsonLd = faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  } : null

  const speakableJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url: `https://${agentCanonicalBase(agent)}/market/${subarea}/${type}`,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.quick-answer-box', '.faq-market-condition'],
    },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: ap('/') },
      { '@type': 'ListItem', position: 2, name: 'Market', item: ap('/market') },
      { '@type': 'ListItem', position: 3, name: detail.name, item: ap(`/market/${subarea}`) },
      { '@type': 'ListItem', position: 4, name: typeLabel, item: ap(`/market/${subarea}/${type}`) },
    ],
  }

  const allTypes = Object.entries(TYPE_SLUG_TO_LABEL)
    .map(([slug, label]) => ({ slug, label, href: ap(`/market/${subarea}/${slug}`), isActive: slug === type }))

  const archiveHref = ap(`/market?tab=archive&subarea=${encodeURIComponent(subareaKey)}`)

  // Quick Answer Box lines — YoY omitted (trend data is aggregate, not type-specific)
  const quickAnswerLines: string[] = []
  if (w) {
    const qBadge = marketBadge(w.market_type)
    quickAnswerLines.push(`${detail.name} ${typeLabel} are currently in a ${qBadge.label.toLowerCase()}.`)
    if (w.avg_sold_price > 0) quickAnswerLines.push(`The average sold price last month was ${formatPriceFull(w.avg_sold_price)}.`)
    if (w.avg_dom > 0) quickAnswerLines.push(`${typeLabel} are selling in an average of ${w.avg_dom} days on market.`)
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableJsonLd) }} />

      {/* Hero */}
      <div style={{ background: '#fff', padding: '44px 0 36px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <a href={ap('/market')} style={{ color: '#888', textDecoration: 'none' }}>Market</a>
            <span>›</span>
            <a href={ap(`/market/${subarea}`)} style={{ color: '#888', textDecoration: 'none' }}>{detail.name}</a>
            <span>›</span>
            <span>{typeLabel}</span>
          </div>

          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 10 }}>
            {typeLabel} Market Report
          </div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: 400, lineHeight: 1.1, color: '#1a1a1a', marginBottom: 12, marginTop: 0 }}>
            {detail.name} {typeLabel} Market
          </h1>
          <p style={{ fontSize: 14, color: '#555', maxWidth: 560, margin: '0 0 18px', lineHeight: 1.65 }}>
            Live MLS® {typeLabel.toLowerCase()} stats for {detail.name}, {detail.city} — updated every 5 minutes.
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {badge && (
              <span style={{ background: badge.bg, color: badge.color, padding: '5px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                {badge.label}
              </span>
            )}
            {absorption && (
              <span style={{ background: absorption.bg, color: absorption.color, padding: '5px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                {absorption.months.toFixed(1)} mo supply
              </span>
            )}
            <a href={ap(`/market/${subarea}`)} style={{ background: 'var(--off-white)', color: 'var(--text)', padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', border: '1px solid var(--border)' }}>
              All Types →
            </a>
            {allTypes.map(t => t.isActive ? (
              <span key={t.slug} aria-current="page" style={{ padding: '5px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text)', borderBottom: '2px solid var(--accent, #c9a84c)', cursor: 'default' }}>
                {t.label}
              </span>
            ) : (
              <a key={t.slug} href={t.href} style={{ background: 'var(--off-white)', color: 'var(--text)', padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', border: '1px solid var(--border)' }}>
                {t.label} →
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '36px var(--container-padding) 72px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Quick Answer Box — AEO featured-snippet / AI-overview bait */}
          {quickAnswerLines.length > 0 && (
            <QuickAnswerBox lines={quickAnswerLines} badge={badge} />
          )}

          {/* Stat cards — type-specific live widget */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
            {statCard('Avg Sold Price', w.avg_sold_price > 0 ? formatPrice(w.avg_sold_price) : 'N/A')}
            {statCard(`${typeSingular}s Sold (30d)`, w.sold_30d.toLocaleString())}
            {statCard('Homes For Sale', w.active.toLocaleString())}
            {statCard('Avg Days on Market', w.avg_dom > 0 ? `${w.avg_dom}d` : 'N/A')}
            {absorption && statCard('Months of Supply', `${absorption.months.toFixed(1)} mo`, absorption.label)}
          </div>

          {/* Active listings CTA */}
          {w.active > 0 && (
            <div style={{ background: 'var(--primary-bg)', borderRadius: 10, padding: '18px 24px', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                {w.active.toLocaleString()} {typeLabel.toLowerCase()} for sale in {detail.name}
              </div>
              <a
                href={listingHref(subarea)}
                style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                View {typeLabel.toLowerCase()} →
              </a>
            </div>
          )}

          {/* Editorial prose */}
          <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px', marginBottom: 32 }}>
            <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.8, margin: 0 }}>
              {buildTypeInsight(w, detail.name, detail.city, typeLabel, typeSingular)}
            </p>
          </section>

          {/* 12-month trend chart */}
          {trend.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <h2 id="price-trend" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
                How Have {typeLabel} Prices Trended in {detail.name}?
              </h2>
              <NeighbourhoodChartsClient trend={trend} />
              <div style={{ marginTop: 12 }}>
                <a href={archiveHref} style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
                  See full monthly archive →
                </a>
              </div>
            </section>
          )}

          {/* Month-over-month comparison (subarea-level trend) */}
          {trend.length >= 2 && (
            <MonthComparisonTable trend={trend} typeLabel={typeLabel} />
          )}

          {/* Price matrix for this type */}
          {priceMatrix.rows.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <PriceMatrixGrid matrix={priceMatrix} />
            </section>
          )}

          {/* Recently Sold — address only */}
          {soldListings.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <h2 id="recently-sold" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  What Did {typeLabel} Sell for in {detail.name} Recently?
                </h2>
                <a href={ap('/sold')} style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
                  View all sold →
                </a>
              </div>
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {soldListings.slice(0, 20).map((listing, i) => (
                  <div
                    key={listing.mls_no}
                    style={{
                      padding: '13px 18px',
                      borderBottom: i < Math.min(soldListings.length, 20) - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <a
                      href={ap(`/listing/${listing.mls_no}`)}
                      style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary-bg)', textDecoration: 'none', lineHeight: 1.4 }}
                    >
                      {listing.address}
                    </a>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {typeSingular}
                    </span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
                Street addresses only. Click any address to view full details — some information requires sign-in.
              </p>
            </section>
          )}

          {soldListings.length === 0 && (
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '24px', marginBottom: 40, color: 'var(--text-muted)', fontSize: 14 }}>
              No recently sold {typeLabel.toLowerCase()} found in {detail.name} at this time.
            </div>
          )}

          {/* FAQ */}
          {faqs.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
                Frequently Asked Questions — {detail.name} {typeLabel}
              </h2>
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                {faqs.map((faq, i) => (
                  <details key={i} className={i === 0 ? 'faq-market-condition' : undefined} style={{ borderBottom: i < faqs.length - 1 ? '1px solid var(--border)' : 'none' }}>
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

          {/* Internal links */}
          <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 26px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-bg)', marginBottom: 12 }}>
              Explore more
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[
                { label: `All ${detail.name} Property Types`, href: ap(`/market/${subarea}`) },
                { label: `${detail.name} Neighbourhood Guide`, href: ap(`/neighbourhood/${subarea}`) },
                { label: `Active ${typeLabel} for Sale`, href: listingHref() },
                { label: `Recently Sold ${typeLabel}`, href: ap('/sold') },
                { label: 'Market Overview', href: ap('/market') },
                { label: 'Monthly Archive', href: archiveHref },
                ...allTypes.filter(t => !t.isActive).map(t => ({ label: `${detail.name} ${t.label} Market`, href: t.href })),
              ].map(l => (
                <a key={l.href} href={l.href} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}>
                  {l.label}
                </a>
              ))}
            </div>
          </section>

        </div>
      </div>

      <style>{`
        details summary::-webkit-details-marker { display: none }
        details[open] summary span:last-child { transform: rotate(45deg); display: inline-block }
      `}</style>
    </div>
  )
}
