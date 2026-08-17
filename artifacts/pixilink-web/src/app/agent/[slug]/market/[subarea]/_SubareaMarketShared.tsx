/**
 * Shared server-side logic for the subarea market pages.
 *
 * Consumed by:
 *   • [subarea]/page.tsx          — "latest" view (selectedMonth from searchParams, may be null)
 *   • [subarea]/m/[month]/page.tsx — path-based historical month view (selectedMonth from params)
 *
 * Do NOT add 'use client' here — this module is pure RSC.
 */
import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import {
  getAgent, getNeighbourhoodDetail, getNeighbourhoodReports,
  getNeighbourhoodSold, getPriceMatrix, agentCanonicalBase, resolveAgentPrefix,
} from '@/lib/api'
import { normalizeToSubareaSlug } from '../../homes-for-sale/subareaUtils'
import { formatPrice, formatPriceFull } from '@/lib/types'
import { marketBadge, absorptionBadge, absorptionFaqAnswer, monthLabel, monthLabelFull } from '@/lib/market'
import NeighbourhoodChartsClient from '@/components/NeighbourhoodChartsClient'
import MonthSelectorBar from '@/components/MonthSelectorBar'
import PriceMatrixGrid from '@/components/PriceMatrixGrid'
import PropertyTypeBarChart from '@/components/PropertyTypeBarChart.client'
import QuickAnswerBox from '@/components/QuickAnswerBox'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { NeighbourhoodTypeSection, MarketReportTypeRow, MonthlyTrendPoint } from '@/lib/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_SLUG_MAP: Record<string, string> = {
  Apartment: 'condos',
  Townhouse: 'townhouses',
  House: 'houses',
  Duplex: 'duplexes',
}
const TYPE_LABEL_MAP: Record<string, string> = {
  Apartment: 'Condos',
  Townhouse: 'Townhouses',
  House: 'Houses',
  Duplex: 'Duplexes',
}

export function normalizeSubareaSlug(s: string): string {
  return s.replace(/-+$/, '')
}

// ── Table cell styles ─────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', padding: '11px 14px', whiteSpace: 'nowrap',
}
const tdStyle: React.CSSProperties = { fontSize: 13, color: 'var(--text)', padding: '12px 14px', whiteSpace: 'nowrap' }

// ── Helper functions ──────────────────────────────────────────────────────────

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

function humanTypeLabel(t: string): string {
  return TYPE_LABEL_MAP[t] ?? t
}

/** Map NeighbourhoodTypeSection[] → MarketReportTypeRow[] for chart components. */
function byTypeToReportRows(byType: NeighbourhoodTypeSection[]): MarketReportTypeRow[] {
  return byType.map(s => ({
    type: humanTypeLabel(s.type),
    avg_sold_price: s.widget.avg_sold_price,
    sold_30d: s.widget.sold_30d,
    active: s.widget.active,
    avg_dom: s.widget.avg_dom,
    absorption_rate: s.widget.absorption_rate,
    market_type: s.widget.market_type,
  }))
}

/** Build 3–5 editorial sentences from live subarea data. */
function buildSubareaInsight(
  w: import('@/lib/types').NeighbourhoodWidget,
  byType: NeighbourhoodTypeSection[],
  name: string,
  city: string,
): string {
  const badge = marketBadge(w.market_type)
  const absorb = absorptionBadge(w)
  const sentences: string[] = []

  const priceClause = w.avg_sold_price > 0
    ? `, with an average sold price of ${formatPriceFull(w.avg_sold_price)} across all property types over the past 30 days`
    : ''
  sentences.push(`${name} is currently a ${badge.label.toLowerCase()}${priceClause}.`)

  if (absorb) {
    if (absorb.months < 4) {
      sentences.push(`With only ${absorb.months.toFixed(1)} months of supply, well-priced homes are moving quickly — buyers should be prepared to act decisively.`)
    } else if (absorb.months <= 6) {
      sentences.push(`At ${absorb.months.toFixed(1)} months of supply, conditions are balanced, giving buyers reasonable time to evaluate their options without the pressure of a fully heated market.`)
    } else {
      sentences.push(`At ${absorb.months.toFixed(1)} months of supply, buyers in ${name} have more selection and meaningful negotiating room compared to a typical seller's market.`)
    }
  }

  if (byType.length >= 2) {
    const types = byType.map(s => humanTypeLabel(s.type).toLowerCase()).join(', ')
    sentences.push(`${name} offers a mix of property types including ${types} — condos and townhouses are popular for lower-maintenance living, while detached homes attract families seeking more space and a private yard.`)
  }

  if (w.avg_dom > 0) {
    sentences.push(`Homes here are selling in an average of ${w.avg_dom} days on market.`)
  }

  sentences.push(`Browse active listings in ${name} below, or speak with a local ${city} agent for a personalised market assessment based on your needs.`)

  return sentences.join(' ')
}

function MonthComparisonTable({ trend }: { trend: MonthlyTrendPoint[] }) {
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
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
        Month-over-Month Comparison
      </h2>
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--off-white)' }}>
              <th style={thStyle}>Metric</th>
              <th style={{ ...thStyle, color: 'var(--primary-bg)' }}>{curLabel} · Last 30 days</th>
              <th style={thStyle}>{priLabel}</th>
              <th style={thStyle}>{lyrLabel}</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Homes Sold</td>
              <td style={{ ...tdStyle, fontWeight: 800, color: 'var(--primary-bg)' }}>
                {cur.sold}{pctBadge(cur.sold, pri.sold)}
              </td>
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
              <td style={{ ...tdStyle, fontWeight: 800, color: 'var(--primary-bg)' }}>
                {cur.avg_dom}d{pctBadge(cur.avg_dom, pri.avg_dom, true)}
              </td>
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
  avgPrice: number,
  sold30d: number,
  avgDom: number,
  absorptionMonths: number | null,
  marketType: import('@/lib/types').MarketType,
  byType: NeighbourhoodTypeSection[],
  yoy: { pct: number; direction: 'up' | 'down' | 'flat' } | null,
) {
  const badge = marketBadge(marketType)
  const faqs: { q: string; a: string }[] = []

  faqs.push({
    q: `Is ${name} a buyer's or seller's market right now?`,
    a: `${name} is currently a ${badge.label.toLowerCase()}. There are ${sold30d} home${sold30d === 1 ? '' : 's'} sold in the last 30 days across all property types.${absorptionMonths ? ` The current absorption rate of ${absorptionMonths.toFixed(1)} months of supply ${absorptionMonths < 4 ? 'firmly favours sellers' : absorptionMonths <= 6 ? 'indicates a balanced market' : 'favours buyers'}.` : ''}`,
  })

  if (avgPrice > 0) {
    faqs.push({
      q: `What is the average home price in ${name}?`,
      a: `The average sold price across all property types in ${name} is currently ${formatPriceFull(avgPrice)}, based on sales over the past 30 days. Prices vary by type — condominiums start lower, while detached homes command a premium. Contact a local ${city} agent for a current, property-specific estimate.`,
    })
  }

  if (yoy !== null) {
    const condoSection = byType.find(s => s.type === 'Apartment')
    const townSection = byType.find(s => s.type === 'Townhouse')
    const houseSection = byType.find(s => s.type === 'House')
    const typeParts: string[] = []
    if (houseSection?.widget.avg_sold_price) typeParts.push(`detached houses averaging ${formatPriceFull(houseSection.widget.avg_sold_price)}`)
    if (townSection?.widget.avg_sold_price) typeParts.push(`townhouses averaging ${formatPriceFull(townSection.widget.avg_sold_price)}`)
    if (condoSection?.widget.avg_sold_price) typeParts.push(`condos averaging ${formatPriceFull(condoSection.widget.avg_sold_price)}`)
    const pctStr = `${yoy.pct >= 0 ? '+' : ''}${yoy.pct.toFixed(1)}%`
    const dirWord = yoy.direction === 'up' ? 'up' : yoy.direction === 'down' ? 'down' : 'roughly flat'
    const implication =
      yoy.direction === 'up'
        ? `This upward trend suggests continued demand in ${name} — buyers who act sooner may benefit from locking in before further appreciation.`
        : yoy.direction === 'down'
        ? `This creates an opportunity for buyers to enter the market at a lower price point than a year ago — sellers should price competitively to attract offers.`
        : `Prices have held steady, offering predictability for both buyers and sellers in ${name}.`
    faqs.push({
      q: `Have home prices come down in ${name}?`,
      a: `Overall home prices in ${name} are ${dirWord} ${Math.abs(yoy.pct).toFixed(1)}% compared to the same period last year${typeParts.length > 0 ? `, with ${typeParts.join('; ')}` : ''}. ${implication}`,
    })
    void pctStr // suppress unused warning
  }

  if (avgDom > 0) {
    faqs.push({
      q: `How long do homes stay on the market in ${name}?`,
      a: `Homes in ${name} are currently selling in an average of ${avgDom} days on market. In a seller's market, well-priced homes can attract offers within the first week of listing. In a buyer's market, buyers typically have more time to evaluate options.`,
    })
  }

  if (absorptionMonths && absorptionMonths > 0) {
    faqs.push({
      q: `What does the absorption rate mean for ${name}?`,
      a: absorptionFaqAnswer(name, absorptionMonths, marketType),
    })
  }

  const condoSection = byType.find(s => s.type === 'Apartment')
  const townSection = byType.find(s => s.type === 'Townhouse')
  const houseSection = byType.find(s => s.type === 'House')

  if (byType.length >= 2) {
    const parts: string[] = []
    if (houseSection?.widget.avg_sold_price) parts.push(`Detached houses average ${formatPriceFull(houseSection.widget.avg_sold_price)}`)
    if (townSection?.widget.avg_sold_price) parts.push(`townhouses average ${formatPriceFull(townSection.widget.avg_sold_price)}`)
    if (condoSection?.widget.avg_sold_price) parts.push(`condos average ${formatPriceFull(condoSection.widget.avg_sold_price)}`)
    if (parts.length >= 2) {
      faqs.push({
        q: `What is the average price of each property type in ${name}?`,
        a: `${parts.join('; ')}. These figures reflect sold prices over the past 30 days from MLS® records and are updated regularly.`,
      })
    }
  }

  faqs.push({
    q: `What property types are available in ${name}?`,
    a: `${name} offers a mix of ${byType.map(s => humanTypeLabel(s.type).toLowerCase()).join(', ')}. Each type suits different lifestyles — condos and townhouses are popular for lower-maintenance living, while detached homes are sought by families looking for more space and a yard.`,
  })

  faqs.push({
    q: `How can I get a home evaluation in ${name}?`,
    a: `You can request a free, no-obligation home evaluation through a local ${city} real estate agent. They will research recent comparable sales in ${name} and provide you with an accurate market valuation — typically within 24 hours.`,
  })

  return faqs
}

// ── Exported: metadata generator ──────────────────────────────────────────────

export async function generateSubareaMetadata(
  slug: string,
  subarea: string,
  selectedMonth: string | null,
): Promise<Metadata> {
  const [agent, detail] = await Promise.all([
    getAgent(slug),
    getNeighbourhoodDetail(slug, normalizeSubareaSlug(subarea)),
  ])
  if (!detail) return { title: 'Market Stats' }
  const agentName = agent?.name || 'Your Local Agent'
  const domain = agentCanonicalBase(agent)
  const w = detail.widget
  const badge = w ? marketBadge(w.market_type) : null
  const yoy = computeYoY(detail.monthly_trend ?? [])

  const monthSuffix = selectedMonth ? ` — ${monthLabelFull(selectedMonth)}` : ''
  const title = selectedMonth
    ? `${detail.name} Real Estate Market${monthSuffix} | ${agentName}`
    : `${detail.name} Real Estate Market Report — ${detail.city}, BC | ${agentName}`

  let description = `Live MLS® market stats for ${detail.name}, ${detail.city}: average sold price, days on market, absorption rate, sales volume and 12-month trend charts. Updated every 5 minutes.`
  if (!selectedMonth && badge && w) {
    const priceStr = w.avg_sold_price > 0 ? ` Avg sold: ${formatPrice(w.avg_sold_price)}.` : ''
    const yoyStr = yoy ? ` Prices ${yoy.direction === 'up' ? 'up' : yoy.direction === 'down' ? 'down' : 'flat'} ${Math.abs(yoy.pct).toFixed(1)}% YoY.` : ''
    const candidate = `${detail.name}: ${badge.label}.${priceStr}${yoyStr} Live MLS® data updated every 5 min.`
    if (candidate.length <= 160) description = candidate
  } else if (selectedMonth) {
    description = `Historical MLS® market snapshot for ${detail.name}, ${detail.city} — ${monthLabelFull(selectedMonth)}. Average sold price, days on market, and sales volume.`
  }

  const canonical = selectedMonth
    ? `https://${domain}/market/${subarea}/m/${selectedMonth}`
    : `https://${domain}/market/${subarea}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

// ── Exported: main content component ─────────────────────────────────────────

export async function SubareaMarketContent({
  slug,
  subarea,
  selectedMonth,
}: {
  slug: string
  subarea: string
  selectedMonth: string | null
}) {
  const subareaKey = normalizeSubareaSlug(subarea)
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const [agent, detail, reports, soldListings, priceMatrix] = await Promise.all([
    getAgent(slug),
    getNeighbourhoodDetail(slug, subareaKey),
    getNeighbourhoodReports(slug, subareaKey),
    getNeighbourhoodSold(slug, subareaKey),
    getPriceMatrix(slug, subareaKey),
  ])

  if (!agent || !detail) notFound()
  requireNotShowcase(agent)

  const w = detail.widget
  const badge = w ? marketBadge(w.market_type) : null
  const absorption = w ? absorptionBadge(w) : null
  const trend = reports.length > 0 ? reports : detail.monthly_trend
  const byType: NeighbourhoodTypeSection[] = detail.by_type ?? []
  const reportRows: MarketReportTypeRow[] = byTypeToReportRows(byType)

  // Month-filtered snapshot
  const selectedTrendPoint: MonthlyTrendPoint | null = selectedMonth
    ? (trend.find(t => t.month === selectedMonth) ?? null)
    : null
  const snapshotW = selectedTrendPoint ? null : w
  // For path-based month views: 404 if the month has no data in this subarea's trend
  if (selectedMonth && !trend.find(t => t.month === selectedMonth)) notFound()

  const snapshotMonthLabel = selectedTrendPoint ? monthLabelFull(selectedTrendPoint.month) : null
  const snapshotAbsorption = selectedTrendPoint && (selectedTrendPoint.active ?? 0) > 0 && selectedTrendPoint.sold > 0
    ? selectedTrendPoint.active! / selectedTrendPoint.sold
    : null

  const yoy = computeYoY(trend)

  const faqs = w
    ? buildFaqs(
        detail.name,
        detail.city,
        w.avg_sold_price,
        w.sold_30d,
        w.avg_dom,
        absorption?.months ?? null,
        w.market_type,
        byType,
        yoy,
      )
    : []

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
    url: selectedMonth
      ? `https://${agentCanonicalBase(agent)}/market/${subarea}/m/${selectedMonth}`
      : `https://${agentCanonicalBase(agent)}/market/${subarea}`,
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
      ...(selectedMonth ? [{ '@type': 'ListItem', position: 4, name: monthLabelFull(selectedMonth), item: ap(`/market/${subarea}/m/${selectedMonth}`) }] : []),
    ],
  }

  const typeLinks = byType.filter(s => TYPE_SLUG_MAP[s.type]).map(s => ({
    label: humanTypeLabel(s.type),
    href: ap(`/market/${subarea}/${TYPE_SLUG_MAP[s.type]}`),
    widget: s.widget,
    type: s.type,
  }))

  const archiveHref = ap(`/market?tab=archive&subarea=${encodeURIComponent(subareaKey)}`)
  // Base href for MonthSelectorBar path-based links (always the clean subarea URL, no month suffix)
  const monthBaseHref = ap(`/market/${subarea}`)

  const quickAnswerLines: string[] = []
  if (w && !selectedMonth) {
    const qBadge = marketBadge(w.market_type)
    quickAnswerLines.push(`${detail.name} is currently a ${qBadge.label.toLowerCase()}.`)
    if (w.avg_sold_price > 0) quickAnswerLines.push(`The average sold price last month was ${formatPriceFull(w.avg_sold_price)}.`)
    if (yoy) {
      const dir = yoy.direction === 'up' ? 'up' : yoy.direction === 'down' ? 'down' : 'roughly flat'
      quickAnswerLines.push(`Home prices are ${dir} ${Math.abs(yoy.pct).toFixed(1)}% year-over-year.`)
    }
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
            {selectedMonth ? (
              <>
                <a href={ap(`/market/${subarea}`)} style={{ color: '#888', textDecoration: 'none' }}>{detail.name}</a>
                <span>›</span>
                <span>{monthLabelFull(selectedMonth)}</span>
              </>
            ) : (
              <span>{detail.name}</span>
            )}
          </div>

          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 10 }}>
            Market Report
          </div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: 400, lineHeight: 1.1, color: '#1a1a1a', marginBottom: 12, marginTop: 0 }}>
            {detail.name} Real Estate Market{selectedMonth ? ` — ${monthLabelFull(selectedMonth)}` : ''}
          </h1>
          <p style={{ fontSize: 14, color: '#555', maxWidth: 560, margin: '0 0 18px', lineHeight: 1.65 }}>
            {selectedMonth
              ? `Historical MLS® snapshot for ${detail.name}, ${detail.city} — ${monthLabelFull(selectedMonth)}.`
              : `Live MLS® stats and 12-month trends for ${detail.name}, ${detail.city} — updated every 5 minutes.`}
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {!selectedMonth && badge && (
              <span style={{ background: badge.bg, color: badge.color, padding: '5px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                {badge.label}
              </span>
            )}
            {!selectedMonth && absorption && (
              <span style={{ background: absorption.bg, color: absorption.color, padding: '5px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                {absorption.months.toFixed(1)} mo supply
              </span>
            )}
            {selectedMonth && (
              <span style={{ background: '#f1f5f9', color: '#475569', padding: '5px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                📅 Historical snapshot
              </span>
            )}
            {typeLinks.map(t => (
              <a key={t.type} href={t.href} style={{ background: 'var(--off-white)', color: 'var(--text)', padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                {t.label} →
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '36px var(--container-padding) 72px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {quickAnswerLines.length > 0 && (
            <QuickAnswerBox lines={quickAnswerLines} badge={badge} />
          )}

          {(snapshotW ?? selectedTrendPoint) && (
            <>
              {snapshotMonthLabel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Historical snapshot —
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-bg)' }}>{snapshotMonthLabel}</span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
                {snapshotW ? (
                  <>
                    {statCard('Avg Sold Price', snapshotW.avg_sold_price > 0 ? formatPrice(snapshotW.avg_sold_price) : 'N/A')}
                    {statCard('Homes Sold (30d)', snapshotW.sold_30d.toLocaleString())}
                    {statCard('Homes For Sale', snapshotW.active.toLocaleString())}
                    {statCard('Avg Days on Market', snapshotW.avg_dom > 0 ? `${snapshotW.avg_dom}d` : 'N/A')}
                    {absorption && statCard('Months of Supply', `${absorption.months.toFixed(1)} mo`, absorption.label)}
                  </>
                ) : selectedTrendPoint ? (
                  <>
                    {statCard('Avg Sold Price', selectedTrendPoint.avg_price > 0 ? formatPrice(selectedTrendPoint.avg_price) : 'N/A')}
                    {statCard('Homes Sold', selectedTrendPoint.sold.toLocaleString())}
                    {(selectedTrendPoint.active ?? 0) > 0 && statCard('Active Inventory', selectedTrendPoint.active!.toLocaleString())}
                    {statCard('Avg Days on Market', selectedTrendPoint.avg_dom > 0 ? `${selectedTrendPoint.avg_dom}d` : 'N/A')}
                    {snapshotAbsorption !== null && statCard('Months of Supply', `${snapshotAbsorption.toFixed(1)} mo`)}
                    {(selectedTrendPoint.avg_ppsf ?? 0) > 0 && statCard('Avg $/sqft', `$${Math.round(selectedTrendPoint.avg_ppsf)}`)}
                  </>
                ) : null}
              </div>
            </>
          )}

          {w && w.active > 0 && !selectedMonth && (
            <div style={{ background: 'var(--primary-bg)', borderRadius: 10, padding: '18px 24px', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                  {w.active.toLocaleString()} {w.active === 1 ? 'home' : 'homes'} for sale in {detail.name}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                  {byType.filter(s => s.widget.active > 0).map(s => `${s.widget.active.toLocaleString()} ${humanTypeLabel(s.type).toLowerCase()}`).join(' · ')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a
                  href={ap(`/homes-for-sale?subarea=${normalizeToSubareaSlug(subarea)}`)}
                  style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  View all listings →
                </a>
                {byType.filter(s => TYPE_SLUG_MAP[s.type] && s.widget.active > 0).map(s => (
                  <a
                    key={s.type}
                    href={ap(`/homes-for-sale?subarea=${normalizeToSubareaSlug(subarea)}&type=${s.type.toLowerCase()}`)}
                    style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', padding: '10px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.2)' }}
                  >
                    {s.widget.active} {humanTypeLabel(s.type).toLowerCase()} →
                  </a>
                ))}
              </div>
            </div>
          )}

          {w && !selectedMonth && (
            <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px', marginBottom: 32 }}>
              <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.8, margin: 0 }}>
                {buildSubareaInsight(w, byType, detail.name, detail.city)}
              </p>
            </section>
          )}

          {trend.length > 0 && (
            <MonthSelectorBar
              monthlyTrend={trend}
              selectedMonth={selectedMonth}
              archiveHref={archiveHref}
              baseHref={monthBaseHref}
            />
          )}

          {trend.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <h2 id="price-trend" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
                How Have Prices Trended in {detail.name}?
              </h2>
              <NeighbourhoodChartsClient trend={trend} />
            </section>
          )}

          {trend.length >= 2 && !selectedMonth && (
            <MonthComparisonTable trend={trend} />
          )}

          {reportRows.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <PropertyTypeBarChart byType={reportRows} />
            </section>
          )}

          {priceMatrix.rows.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <PriceMatrixGrid matrix={priceMatrix} />
            </section>
          )}

          {byType.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <h2 id="by-property-type" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
                What Does Each Property Type Cost in {detail.name}?
              </h2>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--off-white)' }}>
                      {(['Type', 'Avg Sold Price', 'Sold (30d)', 'Active', 'Avg DOM', 'Condition', ''] as const).map(h => (
                        <th key={h} style={{ padding: '11px 14px', textAlign: h === 'Type' || h === '' ? 'left' : 'right', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {byType.map((section, i) => {
                      const tb = marketBadge(section.widget.market_type)
                      const typeHref = TYPE_SLUG_MAP[section.type] ? ap(`/market/${subarea}/${TYPE_SLUG_MAP[section.type]}`) : null
                      return (
                        <tr key={section.type} style={{ borderBottom: i < byType.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <td style={{ padding: '13px 14px', fontWeight: 700, color: 'var(--primary-bg)', fontSize: 14 }}>
                            {humanTypeLabel(section.type)}
                          </td>
                          <td style={{ padding: '13px 14px', textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--primary-bg)' }}>
                            {section.widget.avg_sold_price > 0 ? formatPrice(section.widget.avg_sold_price) : '—'}
                          </td>
                          <td style={{ padding: '13px 14px', textAlign: 'right', fontSize: 13, color: 'var(--text)' }}>
                            {section.widget.sold_30d}
                          </td>
                          <td style={{ padding: '13px 14px', textAlign: 'right', fontSize: 13, color: 'var(--text)' }}>
                            {section.widget.active}
                          </td>
                          <td style={{ padding: '13px 14px', textAlign: 'right', fontSize: 13, color: 'var(--text-muted)' }}>
                            {section.widget.avg_dom > 0 ? `${section.widget.avg_dom}d` : '—'}
                          </td>
                          <td style={{ padding: '13px 14px', textAlign: 'right' }}>
                            <span style={{ background: tb.bg, color: tb.color, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {tb.label}
                            </span>
                          </td>
                          <td style={{ padding: '13px 14px', textAlign: 'left' }}>
                            {typeHref && (
                              <a href={typeHref} style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                View {humanTypeLabel(section.type)} →
                              </a>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {soldListings.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <h2 id="recently-sold" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  What Did Homes Sell for in {detail.name} Recently?
                </h2>
                <a href={ap(`/sold`)} style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
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
                      {listing.type ?? ''}
                    </span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
                Street addresses only. Click any address to view full details — some information requires sign-in.
              </p>
            </section>
          )}

          {faqs.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
                Frequently Asked Questions — {detail.name} Market
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

          <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 26px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-bg)', marginBottom: 12 }}>
              Explore {detail.name}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[
                { label: `${detail.name} Neighbourhood Guide`, href: ap(`/neighbourhood/${subarea}`) },
                { label: `Homes For Sale in ${detail.name}`, href: ap(`/homes-for-sale`) },
                { label: `Recently Sold in ${detail.name}`, href: ap(`/sold`) },
                { label: 'All Neighbourhoods', href: ap('/neighbourhoods') },
                { label: 'Market Overview', href: ap('/market') },
                { label: 'Monthly Archive', href: archiveHref },
                ...typeLinks.map(t => ({ label: `${detail.name} ${t.label} Market`, href: t.href })),
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
