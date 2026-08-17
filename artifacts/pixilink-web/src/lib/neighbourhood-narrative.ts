import type { MonthlyTrendPoint } from './types'
import { formatPriceFull } from './types'

function avg(values: number[]): number {
  const valid = values.filter(v => v > 0)
  if (!valid.length) return 0
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

function pctChange(from: number, to: number): number {
  if (from <= 0) return 0
  return ((to - from) / from) * 100
}

function directionWord(pct: number): string {
  if (pct > 8) return 'significantly higher'
  if (pct > 3) return 'higher'
  if (pct > 0) return 'slightly higher'
  if (pct < -8) return 'significantly lower'
  if (pct < -3) return 'lower'
  if (pct < 0) return 'slightly lower'
  return 'relatively flat'
}

export function deriveTrendNarrative(
  trend: MonthlyTrendPoint[],
  name: string,
): string {
  const sorted = [...trend].sort((a, b) => a.month.localeCompare(b.month))
  if (sorted.length < 6) return ''

  const half = Math.floor(sorted.length / 2)
  const earlier = sorted.slice(0, half)
  const recent = sorted.slice(half)

  const earlierAvgPrice = avg(earlier.map(p => p.avg_price))
  const recentAvgPrice = avg(recent.map(p => p.avg_price))
  const pricePct = pctChange(earlierAvgPrice, recentAvgPrice)
  const pricePctAbs = Math.abs(pricePct)
  const priceDir = directionWord(pricePct)

  const earlierSold = earlier.reduce((s, p) => s + p.sold, 0)
  const recentSold = recent.reduce((s, p) => s + p.sold, 0)
  const volumePct = pctChange(earlierSold, recentSold)

  const latestDom = recent.filter(p => p.avg_dom > 0).slice(-3)
  const avgDom = latestDom.length > 0 ? avg(latestDom.map(p => p.avg_dom)) : 0

  const latestActive = recent.map(p => p.active ?? 0).filter(v => v > 0)
  const latestSold = recent.map(p => p.sold).filter(v => v > 0)

  const latestAbsorption =
    latestSold.length > 0 && latestActive.length > 0
      ? avg(latestSold) / avg(latestActive)
      : null

  const sentences: string[] = []

  if (recentAvgPrice > 0 && earlierAvgPrice > 0) {
    const recentPriceStr = formatPriceFull(recentAvgPrice)
    sentences.push(
      `Over the past 24 months, the average sold price in ${name} has trended ${priceDir}` +
      (pricePctAbs >= 1 ? ` — a ${pricePctAbs.toFixed(1)}% shift — ` : ', ') +
      `with the most recent period averaging ${recentPriceStr}.`
    )
  }

  if (recentSold > 0 && earlierSold > 0) {
    if (volumePct > 10) {
      sentences.push(`Sales activity has been picking up: ${recentSold} homes sold in the latter half of the period compared to ${earlierSold} in the first half, pointing to a busier market.`)
    } else if (volumePct < -10) {
      sentences.push(`Sales volume has eased over the period: ${recentSold} homes sold recently versus ${earlierSold} earlier, suggesting buyers are taking a more measured approach.`)
    } else {
      sentences.push(`Sales volume has remained relatively steady, with ${recentSold} homes sold recently and ${earlierSold} in the earlier part of the period.`)
    }
  }

  if (avgDom > 0) {
    if (avgDom <= 14) {
      sentences.push(`Homes are selling quickly — an average of just ${Math.round(avgDom)} days on market — a sign of strong buyer demand in ${name}.`)
    } else if (avgDom <= 30) {
      sentences.push(`Homes in ${name} are spending an average of ${Math.round(avgDom)} days on market, indicating a balanced pace where well-priced properties move efficiently.`)
    } else {
      sentences.push(`With an average of ${Math.round(avgDom)} days on market, buyers have more time to consider their options, favouring careful negotiation over rush decisions.`)
    }
  }

  if (latestAbsorption !== null) {
    const moSupply = (1 / latestAbsorption).toFixed(1)
    if (latestAbsorption > 0.25) {
      sentences.push(`Current absorption suggests a seller-leaning market, with inventory moving at a brisk pace — roughly ${moSupply} months of supply.`)
    } else if (latestAbsorption > 0.15) {
      sentences.push(`Conditions appear balanced, with approximately ${moSupply} months of supply — neither buyers nor sellers hold a strong advantage.`)
    } else {
      sentences.push(`With about ${moSupply} months of supply, ${name} currently leans toward a buyer's market, giving purchasers more room to negotiate.`)
    }
  } else {
    if (pricePct > 3) {
      sentences.push(`Rising prices over the period suggest sellers retain the upper hand — buyers looking in ${name} should be prepared to act decisively on well-priced homes.`)
    } else if (pricePct < -3) {
      sentences.push(`Softening prices over the period give buyers more negotiating room than in prior years — worth factoring into your offer strategy.`)
    } else {
      sentences.push(`Price stability over the period reflects a balanced market in ${name}, where fair offers tend to be met with reasonable seller expectations.`)
    }
  }

  return sentences.join(' ')
}
