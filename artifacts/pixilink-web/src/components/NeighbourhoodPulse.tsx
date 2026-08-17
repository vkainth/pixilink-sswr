import { formatPrice } from '@/lib/types'
import type { NeighbourhoodPulse, MonthlyTrendPoint } from '@/lib/types'

interface Props {
  pulse: NeighbourhoodPulse
  name: string
  monthlyTrend?: MonthlyTrendPoint[]
}

const TYPE_LABEL: Record<string, string> = {
  Apartment: 'Condos',
  Townhouse: 'Townhouses',
  House: 'Houses',
}

function typeLabel(t: string): string {
  return TYPE_LABEL[t] ?? t
}

function priceMomentum(trend: MonthlyTrendPoint[]): number | null {
  if (trend.length < 4) return null
  const recent = trend.slice(-3)
  const baseline = trend[trend.length - 4]
  if (!baseline || baseline.avg_price <= 0) return null
  const recentAvg = recent.reduce((s, r) => s + r.avg_price, 0) / recent.length
  if (recentAvg <= 0) return null
  return ((recentAvg - baseline.avg_price) / baseline.avg_price) * 100
}

function generateInsights(
  pulse: NeighbourhoodPulse,
  name: string,
  monthlyTrend: MonthlyTrendPoint[] = [],
): string[] {
  const insights: string[] = []
  const { by_type, age_buckets, activity_score } = pulse

  const typed = [...by_type].filter(t => t.count_90d > 0)

  // 1. Fastest-selling type
  const eligible = typed.filter(t => t.count_90d > 1 && t.avg_dom_90d > 0)
  if (eligible.length > 0) {
    const fastest = eligible.reduce((a, b) => a.avg_dom_90d < b.avg_dom_90d ? a : b)
    const others = eligible.filter(t => t.type !== fastest.type)
    if (others.length > 0) {
      insights.push(
        `${typeLabel(fastest.type)} are selling fastest in ${name}, with an average of ${fastest.avg_dom_90d} day${fastest.avg_dom_90d === 1 ? '' : 's'} on market over the past 90 days.`
      )
    } else {
      insights.push(
        `Homes in ${name} are selling in an average of ${fastest.avg_dom_90d} day${fastest.avg_dom_90d === 1 ? '' : 's'} on market over the past 90 days.`
      )
    }
  }

  // 2. New-build share if > 30%
  const { new_pct, est_pct, est_count } = age_buckets
  const totalAgeCount = age_buckets.new_count + age_buckets.mid_count + est_count
  if (totalAgeCount > 0 && new_pct > 30) {
    insights.push(
      `${new_pct}% of recent sales in ${name} were properties built in 2015 or later, reflecting continued development and new construction activity in the area.`
    )
  }

  // 3. Established-home share if > 50% pre-2000
  if (totalAgeCount > 0 && est_pct > 50) {
    insights.push(
      `More than half of recent sales (${est_pct}%) were established homes built before 2000, indicating a mature neighbourhood with well-rooted character.`
    )
  }

  // 4. Market tempo from activity_score
  if (activity_score >= 8) {
    insights.push(
      `${name} is showing high demand — the market is moving quickly and well-priced homes are attracting strong interest.`
    )
  } else if (activity_score >= 6) {
    insights.push(
      `Market activity in ${name} is solid. Properties are moving at a healthy pace with consistent buyer demand.`
    )
  } else if (activity_score <= 3) {
    insights.push(
      `The ${name} market is relatively quiet right now, giving buyers more time to evaluate their options and negotiate conditions.`
    )
  } else {
    insights.push(
      `The ${name} market is at a measured pace — conditions are balanced between buyers and sellers.`
    )
  }

  // 5. Price momentum if >= 3% move over last 3 months
  const momentum = priceMomentum(monthlyTrend)
  if (momentum !== null && Math.abs(momentum) >= 3) {
    if (momentum > 0) {
      insights.push(
        `Average sold prices in ${name} have risen approximately ${Math.round(momentum)}% over the past three months, pointing to upward price pressure.`
      )
    } else {
      insights.push(
        `Average sold prices in ${name} have eased approximately ${Math.round(Math.abs(momentum))}% over the past three months, offering buyers improved affordability relative to earlier in the year.`
      )
    }
  }

  return insights
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const scorePct = ((score - 1) / 9) * 100
  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '20px 24px',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Market Activity
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', lineHeight: 1 }}>
            {score}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/10</span>
          <span style={{
            background: score >= 8 ? '#fde2dd' : score >= 6 ? '#dcfce7' : score <= 3 ? '#dbeafe' : '#e5e7eb',
            color: score >= 8 ? '#c0341a' : score >= 6 ? '#15803d' : score <= 3 ? '#1d4ed8' : '#374151',
            padding: '3px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
          }}>
            {label}
          </span>
        </div>
      </div>
      <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${scorePct}%`,
          background: score >= 8 ? '#ef4444' : score >= 5 ? '#f59e0b' : '#22c55e',
          borderRadius: 4,
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Quiet</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Moderate</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Active</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>High Demand</span>
      </div>
    </div>
  )
}

export default function NeighbourhoodPulse({ pulse, name, monthlyTrend = [] }: Props) {
  const { activity_score, activity_label, by_type, age_buckets } = pulse
  const typed = by_type.filter(t => t.count_90d > 0)
  const totalSold90d = typed.reduce((s, t) => s + t.count_90d, 0)

  const { new_pct, mid_pct, est_pct } = age_buckets
  const totalAgeCount = age_buckets.new_count + age_buckets.mid_count + age_buckets.est_count
  const hasAgeBuckets = totalAgeCount > 0

  // ── Low-volume fallback: simplified single-card view ───────────────
  if (typed.length === 0 || totalSold90d < 3) {
    return (
      <div style={{ marginBottom: 44 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          Neighbourhood Pulse
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, marginTop: 0 }}>
          Based on 90-day sold data
        </p>
        <ScoreBar score={activity_score} label={activity_label} />
        <div style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '18px 22px',
          fontSize: 14,
          color: 'var(--text-muted)',
          lineHeight: 1.7,
        }}>
          Sales volume over the past 90 days is too low to show a meaningful type or age breakdown for {name}. Check back as new sales are recorded — the full Pulse analysis will appear automatically once sufficient data is available.
        </div>
      </div>
    )
  }

  // ── Full view ──────────────────────────────────────────────────────
  const mostSalesType = typed.reduce((a, b) => a.count_90d >= b.count_90d ? a : b)
  const eligibleForDom = typed.filter(t => t.count_90d > 1 && t.avg_dom_90d > 0)
  const fastestType = eligibleForDom.length > 0
    ? eligibleForDom.reduce((a, b) => a.avg_dom_90d <= b.avg_dom_90d ? a : b)
    : null
  const eligibleForPpsf = typed.filter(t => t.count_90d > 1 && t.avg_ppsf_90d > 0)
  const bestValueType = eligibleForPpsf.length > 0
    ? eligibleForPpsf.reduce((a, b) => a.avg_ppsf_90d <= b.avg_ppsf_90d ? a : b)
    : null

  const insights = generateInsights(pulse, name, monthlyTrend)

  return (
    <div style={{ marginBottom: 44 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
        Neighbourhood Pulse
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, marginTop: 0 }}>
        Based on 90-day sold data
      </p>

      {/* ── Activity Score Bar ─────────────────────────────────────── */}
      <ScoreBar score={activity_score} label={activity_label} />

      {/* ── 90-Day Type Cards ──────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(typed.length, 3)}, 1fr)`,
        gap: 14,
        marginBottom: 20,
      }} className="pulse-type-grid">
        {typed.map(t => {
          const isMostSales = t.type === mostSalesType.type
          const isFastest = fastestType && t.type === fastestType.type
          const isBestValue = bestValueType && t.type === bestValueType.type
          const badges = [
            isMostSales && 'Most Sales',
            isFastest && 'Fastest Selling',
            isBestValue && 'Best Value (price/sqft)',
          ].filter(Boolean) as string[]

          return (
            <div key={t.type} style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '18px 20px',
            }}>
              {badges.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                  {badges.map(badge => {
                    const badgeStyle =
                      badge === 'Most Sales'
                        ? { background: '#dbeafe', color: '#1d4ed8' }
                        : badge === 'Fastest Selling'
                        ? { background: '#fef3c7', color: '#b45309' }
                        : { background: '#dcfce7', color: '#15803d' }
                    return (
                      <span key={badge} style={{
                        ...badgeStyle,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: 20,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}>
                        {badge}
                      </span>
                    )
                  })}
                </div>
              )}
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 14 }}>
                {typeLabel(t.type)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 8px' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Sales (90d)
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                    {t.count_90d}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Avg DOM
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                    {t.avg_dom_90d > 0 ? `${t.avg_dom_90d}d` : '—'}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Avg Sold Price
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                    {t.avg_sold_price_90d > 0 ? formatPrice(t.avg_sold_price_90d) : '—'}
                  </div>
                </div>
              </div>
              {t.avg_ppsf_90d > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  {formatPrice(t.avg_ppsf_90d)}/sqft avg
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Housing Age Strip ──────────────────────────────────────── */}
      {hasAgeBuckets && (
        <div style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '18px 20px',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
            Housing Age — Recent Sales
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `${new_pct || 1}fr ${mid_pct || 1}fr ${est_pct || 1}fr`,
            height: 10,
            borderRadius: 5,
            overflow: 'hidden',
            gap: 2,
            marginBottom: 10,
          }}>
            <div style={{ background: 'var(--accent)', borderRadius: '5px 0 0 5px' }} />
            <div style={{ background: '#93c5fd' }} />
            <div style={{ background: '#d1d5db', borderRadius: '0 5px 5px 0' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
            {[
              { label: 'New Builds', sub: '2015+', pct: new_pct, color: 'var(--accent)' },
              { label: 'Mid-Era', sub: '2000–2014', pct: mid_pct, color: '#93c5fd' },
              { label: 'Established', sub: 'Pre-2000', pct: est_pct, color: '#d1d5db' },
            ].map(({ label, sub, pct, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <div style={{ width: 10, height: 10, background: color, borderRadius: 2, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{pct}%</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Insight Statements ────────────────────────────────────── */}
      {insights.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {insights.map((text, i) => (
            <div key={i} style={{
              borderLeft: '3px solid var(--accent)',
              paddingLeft: 14,
              paddingTop: 4,
              paddingBottom: 4,
              fontSize: 14,
              color: 'var(--text)',
              lineHeight: 1.65,
            }}>
              {text}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .pulse-type-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 641px) and (max-width: 900px) {
          .pulse-type-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}
