'use client'

import type {
  MarketBreakdownDecade,
  MarketBreakdownLevels,
  MarketBreakdownLotSize,
  MarketBreakdownBathroom,
  MarketBreakdown,
} from '@/lib/types'
import { formatPriceFull } from '@/lib/types'

interface Props {
  breakdown: MarketBreakdown
  areaLabel: string
}

const sectionHeadStyle: React.CSSProperties = {
  fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 6px',
}
const sectionSubStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-muted)', margin: '0 0 18px',
}
const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 24px',
}
const ACCENT = '#c9a84c'
const DOM_COLOR = '#6b7280'

function SoldBadge({ count }: { count: number }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, background: 'var(--off-white)',
      border: '1px solid var(--border)', color: 'var(--text-muted)',
      borderRadius: 10, padding: '2px 7px', marginLeft: 8, whiteSpace: 'nowrap',
    }}>
      {count} sold
    </span>
  )
}

function HBar({ label, price, maxPrice, count, dom }: {
  label: string; price: number; maxPrice: number; count: number; dom: number
}) {
  const pct = maxPrice > 0 ? Math.round((price / maxPrice) * 100) : 0
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600, color: 'var(--text)', minWidth: 0 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          <SoldBadge count={count} />
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
          {dom > 0 && <span style={{ fontSize: 11, color: DOM_COLOR, whiteSpace: 'nowrap' }}>{dom}d</span>}
          <span style={{ fontWeight: 800, color: ACCENT, fontSize: 13, whiteSpace: 'nowrap' }}>
            {formatPriceFull(price)}
          </span>
        </div>
      </div>
      <div style={{ height: 9, background: 'var(--off-white)', borderRadius: 5, border: '1px solid var(--border)' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${ACCENT}, #e8c97d)`,
          borderRadius: 5, transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

/** SVG dual-series line chart: avg sold price (gold) + avg DOM (gray), normalized independently */
function DecadeLineChart({ data, areaLabel }: { data: MarketBreakdownDecade[]; areaLabel: string }) {
  if (data.length < 2) return null

  // Compute insight
  const withPrice = data.filter(d => d.avg_sold_price > 0)
  const maxPriceDec = withPrice.reduce((a, b) => a.avg_sold_price > b.avg_sold_price ? a : b, withPrice[0])
  const withDom = data.filter(d => d.avg_dom > 0)
  const fastestDec = withDom.length > 0
    ? withDom.reduce((a, b) => a.avg_dom < b.avg_dom ? a : b, withDom[0])
    : null

  const newest = data[data.length - 1]
  const oldest = data[0]
  const priceDelta = oldest.avg_sold_price > 0
    ? Math.round(((newest.avg_sold_price - oldest.avg_sold_price) / oldest.avg_sold_price) * 100)
    : null

  // SVG layout
  const W = 560, H = 210
  const padL = 12, padR = 12, padT = 36, padB = 40
  const cW = W - padL - padR
  const cH = H - padT - padB
  const n = data.length

  const prices = data.map(d => d.avg_sold_price)
  const doms = data.map(d => d.avg_dom || 0)

  const minP = Math.min(...prices), maxP = Math.max(...prices)
  const validDoms = doms.filter(Boolean)
  const minD = validDoms.length ? Math.min(...validDoms) : 0
  const maxD = validDoms.length ? Math.max(...validDoms) : 1
  const rangeP = maxP - minP || 1
  const rangeD = maxD - minD || 1

  const xOf = (i: number) => padL + (i / (n - 1)) * cW
  const yOfP = (p: number) => padT + (1 - (p - minP) / rangeP) * cH
  const yOfD = (d: number) => padT + (1 - (d - minD) / rangeD) * cH

  const pricePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOfP(d.avg_sold_price).toFixed(1)}`).join(' ')
  const domPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOfD(d.avg_dom || minD).toFixed(1)}`).join(' ')

  return (
    <section style={{ marginTop: 44 }}>
      <h2 style={sectionHeadStyle}>Age of Home — Does Year Built Affect Price?</h2>
      <p style={sectionSubStyle}>Avg Sold Price &amp; Days on Market by Year Built · Last 30 Days · Sold Properties</p>

      {(priceDelta !== null || fastestDec) && (
        <div style={{
          background: '#f9f6ee', border: '1px solid #e8d9a0',
          borderRadius: 8, padding: '11px 16px', marginBottom: 18,
          fontSize: 13, color: '#78580a', lineHeight: 1.6,
        }}>
          <strong>Insight:</strong>{' '}
          {maxPriceDec && <>
            {maxPriceDec.decade} homes command the highest avg price at {formatPriceFull(maxPriceDec.avg_sold_price)} in {areaLabel}.{' '}
          </>}
          {fastestDec && <>
            {fastestDec.decade} homes sell the fastest — avg {fastestDec.avg_dom} days on market.
          </>}
          {priceDelta !== null && Math.abs(priceDelta) > 3 && <>
            {' '}Prices {priceDelta > 0 ? 'rose' : 'fell'} {Math.abs(priceDelta)}% from {oldest.decade} to {newest.decade}.
          </>}
        </div>
      )}

      <div style={cardStyle}>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 12, fontSize: 12, fontWeight: 600 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" /></svg>
            Avg Sold Price
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: DOM_COLOR }}>
            <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke={DOM_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 3" /></svg>
            Avg Days on Market
          </span>
        </div>

        {/* SVG line chart */}
        <div style={{ overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', minWidth: 280 }}>
            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1].map(t => (
              <line
                key={t}
                x1={padL} y1={padT + t * cH}
                x2={W - padR} y2={padT + t * cH}
                stroke="#e5e7eb" strokeWidth="1"
              />
            ))}

            {/* Price line */}
            <path d={pricePath} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {/* DOM dashed line */}
            <path d={domPath} fill="none" stroke={DOM_COLOR} strokeWidth="2" strokeDasharray="6 4" strokeLinejoin="round" strokeLinecap="round" />

            {/* Price dots + labels */}
            {data.map((d, i) => {
              const x = xOf(i), yP = yOfP(d.avg_sold_price)
              const isFirst = i === 0, isLast = i === n - 1
              const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle'
              return (
                <g key={`p-${i}`}>
                  <circle cx={x.toFixed(1)} cy={yP.toFixed(1)} r="5" fill={ACCENT} stroke="#fff" strokeWidth="2" />
                  <text
                    x={x.toFixed(1)} y={(yP - 10).toFixed(1)}
                    textAnchor={anchor} fontSize="10" fontWeight="700" fill={ACCENT}
                  >
                    {formatPriceFull(d.avg_sold_price)}
                  </text>
                </g>
              )
            })}

            {/* DOM dots + labels */}
            {data.map((d, i) => {
              const x = xOf(i), yD = yOfD(d.avg_dom || minD)
              const isFirst = i === 0, isLast = i === n - 1
              const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle'
              return (
                <g key={`d-${i}`}>
                  <circle cx={x.toFixed(1)} cy={yD.toFixed(1)} r="4" fill="#fff" stroke={DOM_COLOR} strokeWidth="2" />
                  {d.avg_dom > 0 && (
                    <text
                      x={x.toFixed(1)} y={(yD + 16).toFixed(1)}
                      textAnchor={anchor} fontSize="9.5" fill={DOM_COLOR} fontWeight="600"
                    >
                      {d.avg_dom}d
                    </text>
                  )}
                </g>
              )
            })}

            {/* X-axis decade labels */}
            {data.map((d, i) => {
              const x = xOf(i)
              const isFirst = i === 0, isLast = i === n - 1
              const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle'
              return (
                <text
                  key={`x-${i}`}
                  x={x.toFixed(1)} y={(H - 8).toFixed(1)}
                  textAnchor={anchor} fontSize="11" fill="#374151" fontWeight="600"
                >
                  {d.decade}
                </text>
              )
            })}
          </svg>
        </div>

        {/* Sold count row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10.5, color: 'var(--text-muted)' }}>
          {data.map(d => (
            <span key={d.decade}>{d.sold_30d} sold</span>
          ))}
        </div>
      </div>
    </section>
  )
}

function LevelsChart({ data }: { data: MarketBreakdownLevels[] }) {
  if (data.length === 0) return null
  const maxPrice = Math.max(...data.map(d => d.avg_sold_price))
  return (
    <section style={{ marginTop: 44 }}>
      <h2 style={sectionHeadStyle}>Storey Count</h2>
      <p style={sectionSubStyle}>Avg Sold Price by Storeys · Detached Houses · Last 30 Days · Sold Properties</p>
      <div style={cardStyle}>
        {data.map(d => (
          <HBar key={d.levels} label={d.levels} price={d.avg_sold_price} maxPrice={maxPrice} count={d.sold_30d} dom={d.avg_dom} />
        ))}
      </div>
    </section>
  )
}

function LotSizeChart({ data }: { data: MarketBreakdownLotSize[] }) {
  if (data.length === 0) return null
  const maxPrice = Math.max(...data.map(d => d.avg_sold_price))

  const sorted = [...data].sort((a, b) => a.avg_sold_price - b.avg_sold_price)
  const smallest = sorted[0]
  const largest = sorted[sorted.length - 1]
  const premium = smallest && largest && smallest.avg_sold_price > 0
    ? Math.round(((largest.avg_sold_price - smallest.avg_sold_price) / smallest.avg_sold_price) * 100)
    : null

  return (
    <section style={{ marginTop: 44 }}>
      <h2 style={sectionHeadStyle}>Lot Size</h2>
      <p style={sectionSubStyle}>How Lot Size Affects Price · Detached Houses · Last 30 Days · Sold Properties</p>

      {premium !== null && premium > 5 && largest && smallest && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 8, padding: '11px 16px', marginBottom: 18,
          fontSize: 13, color: '#15803d', lineHeight: 1.5,
        }}>
          <strong>Insight:</strong>{' '}
          Homes on larger lots (8,000+ sqft) command a {premium}% price premium vs. the smallest lots — averaging {formatPriceFull(largest.avg_sold_price)} vs. {formatPriceFull(smallest.avg_sold_price)}.
        </div>
      )}

      <div style={cardStyle}>
        {data.map(d => (
          <HBar key={d.band} label={d.band} price={d.avg_sold_price} maxPrice={maxPrice} count={d.sold_30d} dom={d.avg_dom} />
        ))}
      </div>
    </section>
  )
}

function BathroomChart({ data }: { data: MarketBreakdownBathroom[] }) {
  if (data.length === 0) return null
  const maxPrice = Math.max(...data.map(d => d.avg_sold_price))
  return (
    <section style={{ marginTop: 44 }}>
      <h2 style={sectionHeadStyle}>By Bathroom Count</h2>
      <p style={sectionSubStyle}>Avg Sold Price by Bathrooms · Last 30 Days · Sold Properties</p>
      <div style={cardStyle}>
        {data.map(d => (
          <HBar
            key={d.baths}
            label={`${d.baths} bath${d.baths !== 1 ? 's' : ''}`}
            price={d.avg_sold_price}
            maxPrice={maxPrice}
            count={d.sold_30d}
            dom={d.avg_dom}
          />
        ))}
      </div>
    </section>
  )
}

export default function MarketBreakdownCharts({ breakdown, areaLabel }: Props) {
  const hasSomething =
    breakdown.by_decade.length > 0 ||
    breakdown.by_levels.length > 0 ||
    breakdown.by_lot_size.length > 0 ||
    breakdown.by_bathroom.length > 0

  if (!hasSomething) return null

  return (
    <div style={{ marginTop: 56 }}>
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 4 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', margin: 0 }}>
          Deep Breakdown
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 0' }}>
          Age, bathrooms, storeys, and lot size — how each factor shapes the sale price in {areaLabel}.
        </p>
      </div>

      <DecadeLineChart data={breakdown.by_decade} areaLabel={areaLabel} />
      <BathroomChart data={breakdown.by_bathroom} />
      <LevelsChart data={breakdown.by_levels} />
      <LotSizeChart data={breakdown.by_lot_size} />
    </div>
  )
}
