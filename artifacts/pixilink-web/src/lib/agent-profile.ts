import type { AgentListing, AgentFaq } from './types'
import { formatPriceFull } from './types'

function neighbourhood(l: AgentListing): string {
  return (l.subarea ?? l.city) || 'Unknown'
}

/**
 * Returns the top N neighbourhoods by sold count using subarea ?? city.
 * Returns [] when solds is empty.
 */
export function topNeighbourhoods(solds: AgentListing[], n = 3): string[] {
  if (solds.length === 0) return []
  const counts: Record<string, number> = {}
  for (const l of solds) {
    const key = neighbourhood(l)
    counts[key] = (counts[key] ?? 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k)
}

/**
 * Returns { min, max } of sold_price across all solds.
 * Returns null when fewer than 3 solds have a valid sold_price.
 */
export function priceRange(solds: AgentListing[]): { min: number; max: number } | null {
  const prices = solds
    .map(l => l.sold_price)
    .filter((p): p is number => typeof p === 'number' && p > 0)
  if (prices.length < 3) return null
  return { min: Math.min(...prices), max: Math.max(...prices) }
}

/**
 * Returns the top 1–2 property types by sold volume.
 * The second type is included only when it has at least half the count of the top type.
 * Returns [] when fewer than 3 solds.
 */
export function propertyTypeMix(solds: AgentListing[]): string[] {
  if (solds.length < 3) return []
  const counts: Record<string, number> = {}
  for (const l of solds) {
    const t = l.type ?? 'Other'
    counts[t] = (counts[t] ?? 0) + 1
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (sorted.length === 0) return []
  const top = sorted[0]
  const result = [top[0]]
  if (sorted[1] && sorted[1][1] >= top[1] / 2) result.push(sorted[1][0])
  return result
}

/**
 * Returns the list-to-sold ratio for the most recent N solds that have both
 * list_price > 0 and sold_price > 0. Returns null when fewer than 3 qualifying
 * pairs are found in that slice.
 *
 * Example: lastNListToSoldRatio(solds, 5) → { ratio: 97.2, count: 5 }
 */
export function lastNListToSoldRatio(solds: AgentListing[], n: number): { ratio: number; count: number } | null {
  const pairs = solds
    .filter(l => typeof l.sold_price === 'number' && l.sold_price > 0 && l.list_price > 0)
    .slice(0, n)
  if (pairs.length < 3) return null
  const sum = pairs.reduce((acc, l) => acc + (l.sold_price! / l.list_price) * 100, 0)
  return { ratio: Math.round((sum / pairs.length) * 10) / 10, count: pairs.length }
}

/**
 * Returns the average list-to-sold ratio as a percentage (e.g. 98.5).
 * Returns null when fewer than 3 solds have both list_price and sold_price.
 */
export function listToSoldRatio(solds: AgentListing[]): number | null {
  const pairs = solds.filter(l => l.sold_price != null && l.list_price > 0)
  if (pairs.length < 3) return null
  const sum = pairs.reduce((acc, l) => acc + (l.sold_price! / l.list_price) * 100, 0)
  return Math.round((sum / pairs.length) * 10) / 10
}

/**
 * Returns the number of years the agent has been active, derived from the
 * earliest sold_date or list_date in the solds array. Returns null when no
 * date fields are available.
 */
export function yearsActive(solds: AgentListing[]): number | null {
  const years = solds
    .map(l => l.sold_date ?? l.list_date)
    .filter((d): d is string => !!d)
    .map(d => new Date(d).getFullYear())
    .filter(y => !isNaN(y) && y > 1990)
  if (years.length === 0) return null
  return new Date().getFullYear() - Math.min(...years)
}

/**
 * Builds a human-readable specialization sentence from sold data.
 * Returns null when there are fewer than 3 solds (insufficient data).
 *
 * Example:
 *   "Recent sales span White Rock, Morgan Creek and South Surrey, from $780K to
 *    $1.85M, closing at an average of 98.5% of list price across 12 sales."
 */
export function buildSpecializationLine(solds: AgentListing[]): string | null {
  if (solds.length < 3) return null
  const areas = topNeighbourhoods(solds, 3)
  const range = priceRange(solds)
  if (areas.length === 0 || !range) return null

  const areaStr =
    areas.length > 1
      ? `${areas.slice(0, -1).join(', ')} and ${areas[areas.length - 1]}`
      : areas[0]

  const ratio = listToSoldRatio(solds)
  const n = solds.filter(l => l.sold_price != null && l.sold_price > 0).length || solds.length

  const ratioStr = ratio != null ? `, closing at an average of ${ratio}% of list price` : ''
  const nStr = n > 1 ? ` across ${n} sales` : ''

  return `Recent sales span ${areaStr}, from ${formatPriceFull(range.min)} to ${formatPriceFull(range.max)}${ratioStr}${nStr}.`
}

/**
 * Returns a human-readable list of the top markets ("South Surrey & White Rock"
 * or just "White Rock"). Useful for meta descriptions and schema areaServed.
 * Falls back to an empty string when there are no solds.
 */
export function primaryMarkets(solds: AgentListing[], n = 3): string {
  const areas = topNeighbourhoods(solds, n)
  if (areas.length === 0) return ''
  if (areas.length === 1) return areas[0]
  return `${areas.slice(0, -1).join(', ')} & ${areas[areas.length - 1]}`
}

/**
 * Generates FAQ Q&A pairs from sold data.
 * Each question is only emitted when the underlying data is sufficient:
 *   - Areas question:       ≥ 1 sold
 *   - Price range question: ≥ 3 solds with sold_price
 *   - Property type:        ≥ 3 solds
 *   - List-to-sold ratio:   ≥ 5 solds with both prices
 *
 * Returns an empty array — never placeholder questions — when data is thin.
 */
export function buildSoldFaqs(solds: AgentListing[], agentName: string): AgentFaq[] {
  const firstName = agentName.split(' ')[0]
  const faqs: AgentFaq[] = []
  let order = 0

  const areas = topNeighbourhoods(solds, 3)
  if (areas.length > 0) {
    const areaStr =
      areas.length > 1
        ? `${areas.slice(0, -1).join(', ')} and ${areas[areas.length - 1]}`
        : areas[0]
    faqs.push({
      question: `What areas does ${firstName} specialize in?`,
      answer: `${firstName} has recent sales in ${areaStr}. ${areas.length > 1 ? 'These neighbourhoods represent the highest concentration of completed transactions.' : 'This neighbourhood represents the highest concentration of completed transactions.'}`,
      sort_order: order++,
    })
  }

  const range = priceRange(solds)
  if (range) {
    faqs.push({
      question: `What price range has ${firstName} sold homes in?`,
      answer: `${firstName}'s recent sold listings range from ${formatPriceFull(range.min)} to ${formatPriceFull(range.max)}, covering a broad spectrum of the local market.`,
      sort_order: order++,
    })
  }

  const types = propertyTypeMix(solds)
  if (types.length > 0) {
    const typeStr = types.join(' and ')
    const n = solds.length
    faqs.push({
      question: `What types of properties does ${firstName} focus on?`,
      answer: `${firstName}'s track record is strongest in ${typeStr} properties, based on ${n} recent ${n === 1 ? 'sale' : 'sales'}.`,
      sort_order: order++,
    })
  }

  const pairsCount = solds.filter(l => l.sold_price != null && l.list_price > 0).length
  const ratio = listToSoldRatio(solds)
  if (ratio != null && pairsCount >= 5) {
    const above = ratio >= 100
    faqs.push({
      question: `How does ${firstName}'s list-to-sold ratio compare?`,
      answer: `${firstName}'s recent sales closed at an average of ${ratio}% of list price${above ? ', meaning most homes sold at or above asking' : ', indicating competitive, well-negotiated transactions'}. This is based on ${pairsCount} closed transactions.`,
      sort_order: order++,
    })
  }

  return faqs
}
