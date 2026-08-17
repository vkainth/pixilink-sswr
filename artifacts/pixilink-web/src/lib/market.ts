import type { MarketType, MarketSummary } from './types'
import { formatPriceFull } from './types'

export interface MarketBadge {
  label: string
  bg: string
  color: string
}

export function marketBadge(t: MarketType | null | undefined): MarketBadge {
  switch (t) {
    case 'strong-sellers':
      return { label: "Strong Seller's Market", bg: '#fde2dd', color: '#c0341a' }
    case 'sellers':
      return { label: "Seller's Market", bg: '#fde9c8', color: '#b45309' }
    case 'buyers':
      return { label: "Buyer's Market", bg: '#dbeafe', color: '#1d4ed8' }
    case 'balanced':
    default:
      return { label: 'Balanced Market', bg: '#e5e7eb', color: '#374151' }
  }
}

export interface AbsorptionBadge {
  months: number
  label: string
  bg: string
  color: string
}

/**
 * Returns absorption rate badge info from a MarketSummary.
 * absorption_rate = months of inventory (active ÷ sold_30d).
 * Thresholds are SALR-equivalent:
 *   ≤ 5 mo   → Seller's  (SALR ≥ 20%)
 *   5–8.33   → Balanced  (SALR 12–20%)
 *   > 8.33   → Buyer's   (SALR < 12%)
 */
export function absorptionBadge(s: MarketSummary): AbsorptionBadge | null {
  const rate = s.absorption_rate
  if (rate == null || rate <= 0) return null
  const months = rate
  if (months <= 5) {
    return { months, label: "Seller's", bg: '#dcfce7', color: '#15803d' }
  } else if (months <= 8.33) {
    return { months, label: 'Balanced', bg: '#fef9c3', color: '#b45309' }
  } else {
    return { months, label: "Buyer's", bg: '#fee2e2', color: '#dc2626' }
  }
}

/** Returns a 2–3 sentence FAQ answer explaining what the SALR means. */
export function absorptionFaqAnswer(area: string, months: number, marketType: MarketType | null | undefined): string {
  const salr = months > 0 ? (1 / months * 100).toFixed(1) : '0'
  if (marketType === 'strong-sellers' || marketType === 'sellers') {
    return `${area} has a sales-to-active listings ratio (SALR) of ${salr}%, well above the 20% threshold that defines a seller's market. At this pace, active listings are absorbed quickly, often resulting in multiple offers and sale prices near or above asking. If you're thinking of selling, current conditions are very favourable.`
  } else if (marketType === 'buyers') {
    return `${area} has a sales-to-active listings ratio (SALR) of ${salr}%, below the 12% threshold that defines a buyer's market. There are more homes available relative to demand, giving buyers more time to consider their options and more room to negotiate on price and conditions. Sellers may need to price competitively to attract offers.`
  } else {
    return `${area} has a sales-to-active listings ratio (SALR) of ${salr}%, sitting in balanced market territory (12–20%). Neither buyers nor sellers hold a strong advantage — homes are selling at a measured pace and sale prices tend to land close to the asking price.`
  }
}

/** Build a plain-language verdict sentence from a market summary. Uses only provided fields. */
export function marketVerdict(s: MarketSummary, area: string): string {
  const badge = marketBadge(s.market_type)
  const lead = `${area} is currently a ${badge.label.toLowerCase()}`
  const parts: string[] = []
  if (s.absorption_rate != null && s.absorption_rate > 0) {
    const salr = (1 / s.absorption_rate * 100).toFixed(1)
    parts.push(`${salr}% sales-to-active listings ratio`)
  }
  if (s.avg_dom != null && s.avg_dom > 0) parts.push(`homes selling in an average of ${s.avg_dom} days`)
  if (s.avg_sold_price) parts.push(`at an average sold price of ${formatPriceFull(s.avg_sold_price)}`)
  if (parts.length) {
    const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
    const rest = parts.slice(1)
    if (rest.length) {
      return `${lead}. ${first} — ${rest.join(', ')} — well-priced properties are attracting strong demand.`
    }
    return `${lead}, with ${first}.`
  }
  if (s.sold_30d) return `${lead}, with ${s.sold_30d} home${s.sold_30d === 1 ? '' : 's'} sold in the last 30 days.`
  return `${lead}.`
}

/**
 * Compute a market badge for a single monthly trend row using SALR.
 *   SALR = (sold ÷ active) × 100
 *   ≥ 20% → Seller's
 *   12–20% → Balanced
 *   < 12% → Buyer's
 * Returns null when data is insufficient (active undefined/0 or sold is 0).
 */
export function monthlyMarketBadge(active: number | null | undefined, sold: number | null | undefined): MarketBadge | null {
  if (active == null || active === 0 || sold == null || sold === 0) return null
  const salr = (sold / active) * 100
  if (salr >= 20) {
    return { label: "Seller's", bg: '#dcfce7', color: '#15803d' }
  } else if (salr >= 12) {
    return { label: 'Balanced', bg: '#fef9c3', color: '#b45309' }
  } else {
    return { label: "Buyer's", bg: '#dbeafe', color: '#1d4ed8' }
  }
}

/**
 * Returns a market condition badge derived from avg DOM.
 * Calibrated for South Surrey / White Rock market:
 *   < 20 days  → Seller's  (extremely fast — rarely seen)
 *   20–35 days → Balanced  (moderate pace)
 *   > 35 days  → Buyer's   (slow market — buyers have choices)
 * Returns null when avgDom is 0 or missing.
 */
export function monthlyMarketBadgeByDom(avgDom: number | null | undefined): MarketBadge | null {
  if (!avgDom || avgDom <= 0) return null
  if (avgDom < 20) {
    return { label: "Seller's", bg: '#dcfce7', color: '#15803d' }
  } else if (avgDom <= 35) {
    return { label: 'Balanced', bg: '#fef9c3', color: '#b45309' }
  } else {
    return { label: "Buyer's", bg: '#dbeafe', color: '#1d4ed8' }
  }
}

/** Absorption rate expressed as SALR %, when meaningful. */
export function absorptionLabel(rate: number | null | undefined): string | null {
  if (rate == null || rate <= 0) return null
  const salr = (1 / rate * 100).toFixed(1)
  return `${salr}% SALR`
}

/** Turn a "YYYY-MM" (or freeform) month string into a short label like "May". */
export function monthLabel(m: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(m)
  if (match) {
    const d = new Date(Number(match[1]), Number(match[2]) - 1, 1)
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-CA', { month: 'short' })
  }
  return m
}

/** Normalize MLS city codes to display names (e.g. "Surrey" → "South Surrey"). */
export function normalizeCity(city: string): string {
  if (city === 'Surrey') return 'South Surrey'
  return city
}

/** Turn a "YYYY-MM" string into a full label like "October 2024". */
export function monthLabelFull(m: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(m)
  if (match) {
    const d = new Date(Number(match[1]), Number(match[2]) - 1, 1)
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
  }
  return m
}
