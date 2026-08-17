import type { MarketSummary } from '@/lib/types'
import { formatPriceFull } from '@/lib/types'
import type { AgentProfile } from '@/lib/types'
import { imgUrl } from '@/lib/types'

interface MonthPoint {
  month: string
  sold: number
  avg_price: number
  avg_dom: number
  avg_ppsf?: number | null
}

interface Props {
  agent: AgentProfile
  overall: MarketSummary
  monthData: MonthPoint | null
  areaLabel: string
  monthLabel: string
  prevMonthData?: MonthPoint | null
}

function buildTake(
  overall: MarketSummary,
  monthData: MonthPoint | null,
  areaLabel: string,
  label: string,
  prevMonthData?: MonthPoint | null,
): string {
  const mt = overall.market_type ?? 'balanced'
  const dom = monthData?.avg_dom ?? overall.avg_dom ?? null
  const avgPrice = monthData?.avg_price ?? overall.avg_sold_price ?? null
  const prevPrice = prevMonthData?.avg_price ?? null

  const priceDelta = avgPrice && prevPrice
    ? Math.round(((avgPrice - prevPrice) / prevPrice) * 100)
    : null

  let sentence1 = ''
  if (mt === 'strong-sellers') {
    sentence1 = `${areaLabel} was firmly in seller's market territory in ${label} — demand outpaced supply and well-priced homes were moving quickly.`
  } else if (mt === 'sellers') {
    sentence1 = `${areaLabel} leaned seller-favourable in ${label}, with active listings absorbed at a healthy pace and limited room to negotiate.`
  } else if (mt === 'buyers') {
    sentence1 = `${areaLabel} showed buyer-friendly conditions in ${label} — there was more supply than usual, giving buyers extra time and negotiating leverage.`
  } else {
    sentence1 = `${areaLabel} held balanced conditions in ${label}, with neither buyers nor sellers holding a clear edge.`
  }

  let sentence2 = ''
  if (avgPrice) {
    if (priceDelta !== null && Math.abs(priceDelta) >= 2) {
      const dir = priceDelta > 0 ? 'up' : 'down'
      sentence2 = ` The average sold price came in at ${formatPriceFull(avgPrice)}, ${dir} ${Math.abs(priceDelta)}% from the prior month — ${priceDelta > 0 ? 'a sign that demand is holding firm' : 'reflecting some softening in buyer competition'}.`
    } else {
      sentence2 = ` The average sold price was ${formatPriceFull(avgPrice)}, staying relatively stable versus the prior month.`
    }
  }

  let sentence3 = ''
  if (dom && dom > 0) {
    if (dom <= 14) {
      sentence3 = ` With homes selling in an average of just ${dom} days, buyers who hesitate risk missing out — acting fast and coming in prepared is the strategy I recommend right now.`
    } else if (dom <= 30) {
      sentence3 = ` Homes averaged ${dom} days on market, which means there's still opportunity if you're ready to move decisively.`
    } else {
      sentence3 = ` At ${dom} average days on market, sellers need realistic pricing — buyers have the time to compare options and push back on overpriced homes.`
    }
  }

  return sentence1 + sentence2 + sentence3
}

export default function RandysTake({ agent, overall, monthData, areaLabel, monthLabel: label, prevMonthData }: Props) {
  const take = buildTake(overall, monthData, areaLabel, label, prevMonthData)
  const firstName = agent.name.split(' ')[0]
  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 400) : null

  return (
    <div style={{
      display: 'flex',
      gap: 18,
      background: '#fff',
      border: '1px solid var(--border)',
      borderLeft: '4px solid var(--primary-bg)',
      borderRadius: 10,
      padding: '20px 22px',
      marginTop: 28,
      alignItems: 'flex-start',
    }}>
      <div style={{ flexShrink: 0 }}>
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={agent.name}
            style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 20%', border: '2px solid var(--accent)' }}
          />
        ) : (
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--primary-bg)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--accent)', fontWeight: 700, fontSize: 22,
          }}>
            {agent.name.charAt(0)}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>
          {firstName}&apos;s Market Take
        </div>
        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.75, margin: 0 }}>
          {take}
        </p>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          — {agent.name}, {agent.brokerage}
        </div>
      </div>
    </div>
  )
}
