'use client'
import dynamic from 'next/dynamic'
import type { TickerItem } from './ResidencitySoldTicker.client'
import type { ZoneMonthly } from './ResidencityBarChart.client'
import type { TrendsData } from './ResidencityTrendPanels.client'

const HeatmapDyn      = dynamic(() => import('./ResidencityHeatmap.client'),     { ssr: false })
const TickerDyn       = dynamic(() => import('./ResidencitySoldTicker.client'),   { ssr: false })
const BarChartDyn     = dynamic(() => import('./ResidencityBarChart.client'),     { ssr: false })
const TrendPanelsDyn  = dynamic(() => import('./ResidencityTrendPanels.client'),  { ssr: false })
const AreaSearchDyn   = dynamic(() => import('./ResidencityAreaSearch.client'),   { ssr: false })
const CompareDyn      = dynamic(() => import('./ResidencityCompare.client'),      { ssr: false })
const EmailSignupDyn  = dynamic(() => import('./ResidencityEmailSignup.client'),  { ssr: false })

export function ResidencityHeatmapWidget({ fullscreen }: { fullscreen?: boolean }) {
  return <HeatmapDyn fullscreen={fullscreen} />
}

export function ResidencityTickerWidget({ items }: { items?: TickerItem[] }) {
  return <TickerDyn items={items} />
}

export function ResidencityBarChartWidget({ zones }: { zones: ZoneMonthly[] }) {
  return <BarChartDyn zones={zones} />
}

export function ResidencityTrendPanelsWidget({ days, onTrendsLoaded }: { days?: number; onTrendsLoaded?: (data: TrendsData) => void }) {
  return <TrendPanelsDyn days={days} onTrendsLoaded={onTrendsLoaded} />
}

export function ResidencityAreaSearchWidget({ trends, days }: { trends: TrendsData | null; days?: number }) {
  return <AreaSearchDyn trends={trends} days={days} />
}

export function ResidencityCompareWidget({ trends, days }: { trends: TrendsData | null; days?: number }) {
  return <CompareDyn trends={trends} days={days} />
}

export function ResidencityEmailSignupWidget() {
  return <EmailSignupDyn />
}
