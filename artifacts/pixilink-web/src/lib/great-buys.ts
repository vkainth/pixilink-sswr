import type { AgentListing } from './types'

const LOT_SIZE_TYPES = new Set(['House', 'Half Duplex', 'Duplex'])

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export interface GreatBuy {
  listing: AgentListing
  discountPct: number
  reason: string
}

export function detectGreatBuys(
  listings: AgentListing[],
  maxResults = 3,
): GreatBuy[] {
  const active = listings.filter(l => l.status === 'Active')

  const byType = new Map<string, AgentListing[]>()
  for (const l of active) {
    const t = l.type || 'Other'
    if (!byType.has(t)) byType.set(t, [])
    byType.get(t)!.push(l)
  }

  const deals: GreatBuy[] = []

  for (const [type, group] of byType) {
    const withSqft = group.filter(l => l.sqft > 0 && l.list_price > 0)
    if (withSqft.length < 3) continue

    const ppsf = withSqft.map(l => l.list_price / l.sqft)
    const medianPpsf = median(ppsf)
    if (medianPpsf <= 0) continue

    const needsLotCheck = LOT_SIZE_TYPES.has(type)
    let medianLotSize = 0
    if (needsLotCheck) {
      const withLot = withSqft.filter(l => Number(l.lot_size) > 0)
      if (withLot.length > 0) {
        medianLotSize = median(withLot.map(l => Number(l.lot_size)))
      }
    }

    for (const listing of withSqft) {
      const listingPpsf = listing.list_price / listing.sqft
      const discountPct = (medianPpsf - listingPpsf) / medianPpsf

      if (discountPct < 0.12) continue

      if (needsLotCheck) {
        const lot = Number(listing.lot_size)
        const hasValidLot = lot > 0 && !isNaN(lot)
        if (!hasValidLot) continue
        if (medianLotSize > 0 && lot < medianLotSize * 0.6) continue
      }

      const pct = Math.round(discountPct * 100)
      const typeLabel =
        type === 'Apartment' ? 'condos'
        : type === 'Townhouse' ? 'townhouses'
        : type === 'House' ? 'houses'
        : type.toLowerCase() + 's'

      const parts: string[] = [`${pct}% below avg $/sqft for ${typeLabel}`]
      if (listing.year_built) parts.push(`Built ${listing.year_built}`)
      parts.push(`${listing.beds} bd/${listing.baths % 1 === 0 ? listing.baths.toFixed(0) : listing.baths.toFixed(1)} ba`)

      deals.push({
        listing,
        discountPct,
        reason: parts.join(' · '),
      })
    }
  }

  return deals
    .sort((a, b) => b.discountPct - a.discountPct)
    .slice(0, maxResults)
}
