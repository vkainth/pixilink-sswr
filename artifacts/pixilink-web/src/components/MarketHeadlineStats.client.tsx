'use client'

import type { MonthlyTrendPoint } from '@/lib/types'
import { formatPrice } from '@/lib/types'
import StatGrid, { type StatItem } from './StatGrid'

// Market-page-scoped no-data fallback: show "N/A" instead of the shared "Contact".
function mPrice(p: number | null | undefined): string {
  return p ? formatPrice(p) : 'N/A'
}

interface Props {
  trend: MonthlyTrendPoint[]
  subareaParam?: string | null
  isSubarea: boolean
  /** Base "last 30 days" headline values. */
  soldCount: number
  avgSoldPrice: number | null
  avgDom: number | null
  activeInventory: number
  ltsRatio: string | null
  absorptionMonths: number | null
  /** Whether the API returned a non-null avg_dom for the base (no-month) state. */
  hasBaseDom: boolean
}

export default function MarketHeadlineStats({
  trend: _trend,
  subareaParam: _subareaParam,
  isSubarea,
  soldCount,
  avgSoldPrice,
  avgDom,
  activeInventory,
  ltsRatio,
  absorptionMonths,
  hasBaseDom,
}: Props) {
  const periodSub = 'last 30 days'

  const kpis: StatItem[] = isSubarea
    ? [
        { label: 'Homes Sold', value: soldCount.toLocaleString(), sub: periodSub },
        { label: 'Avg Sold Price', value: mPrice(avgSoldPrice), sub: `${periodSub} · sold properties` },
        { label: 'Avg Days on Market', value: `${avgDom}d`, sub: `${periodSub} · listed to sold` },
        { label: 'Active Inventory', value: activeInventory.toLocaleString(), sub: 'live MLS · updated every 5 min' },
        ...(absorptionMonths != null ? [{ label: 'Months of Supply', value: `${absorptionMonths.toFixed(1)} mo`, sub: 'current absorption rate' } as StatItem] : []),
      ]
    : [
        { label: 'Homes Sold', value: soldCount.toLocaleString(), sub: periodSub },
        { label: 'Avg Sold Price', value: mPrice(avgSoldPrice), sub: `${periodSub} · sold properties` },
        ...(ltsRatio ? [{ label: 'List-to-Sale', value: ltsRatio, sub: 'avg negotiation gap · last 30 days' } as StatItem] : []),
        ...(hasBaseDom ? [{ label: 'Avg Days on Market', value: `${avgDom}d`, sub: `${periodSub} · listed to sold` } as StatItem] : []),
        { label: 'Active Inventory', value: activeInventory.toLocaleString(), sub: 'live MLS · updated every 5 min' },
        ...(absorptionMonths != null ? [{ label: 'Months of Supply', value: `${absorptionMonths.toFixed(1)} mo`, sub: 'current absorption rate' } as StatItem] : []),
      ]

  return <StatGrid items={kpis} columns={Math.min(kpis.length, 6)} />
}
