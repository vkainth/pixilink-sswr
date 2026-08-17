import { getSoldGateStats, getSoldGateStatsByDay, getPlatformSummary } from '@/lib/admin-api'
import type { SoldGateStats, SoldGateStatsByDay } from '@/lib/admin-api'

const P = {
  primary: '#23a9e1', primaryLight: '#e0f2fe',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', success: '#22c55e', warningLight: '#fffbeb',
  purple: '#8b5cf6', purpleLight: '#f5f3ff',
  orange: '#f59e0b', orangeLight: '#fffbeb',
}

// ─── Trend chart (server-rendered SVG) ───────────────────────────────────────

function SoldGateTrendChart({ data }: { data: SoldGateStatsByDay }) {
  const days = data.daily

  // Chart dimensions
  const W = 760
  const H = 140
  const padL = 32
  const padR = 12
  const padT = 10
  const padB = 28
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const maxVal = Math.max(...days.map(d => d.register + d.login), 1)
  // Round up to a neat number
  const yMax = Math.ceil(maxVal / 5) * 5 || 5

  const barGroupW = innerW / days.length
  const barPad = Math.max(1, barGroupW * 0.15)
  const barW = Math.max(2, (barGroupW - barPad * 2) / 2)

  // Y-axis labels: 0, yMax/2, yMax
  const yTicks = [0, Math.round(yMax / 2), yMax]

  function barX(i: number, which: 0 | 1) {
    const groupX = padL + i * barGroupW + barPad
    return groupX + which * (barW + 1)
  }

  function barH(val: number) {
    return (val / yMax) * innerH
  }

  function barY(val: number) {
    return padT + innerH - barH(val)
  }

  // Format date label: show only every ~5th label to avoid crowding
  function dayLabel(iso: string, i: number, total: number): string {
    if (total <= 14) {
      // show every other
      if (i % 2 !== 0) return ''
    } else {
      // show ~6 labels
      const step = Math.ceil(total / 6)
      if (i % step !== 0 && i !== total - 1) return ''
    }
    const d = new Date(iso + 'T00:00:00')
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  const totalRegister = days.reduce((s, d) => s + d.register, 0)
  const totalLogin = days.reduce((s, d) => s + d.login, 0)

  return (
    <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'hidden', marginBottom: 24 }}>
      {/* Header */}
      <div style={{ padding: '14px 22px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: P.text }}>Sold Gate — Daily Trend</div>
          <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>Register vs Sign-in clicks per day (last {data.period_days} days)</div>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: P.muted }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: P.purple, display: 'inline-block' }} />
            Register ({totalRegister})
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: P.muted }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: P.orange, display: 'inline-block' }} />
            Sign-in ({totalLogin})
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div style={{ padding: '16px 22px 12px' }}>
        {(totalRegister + totalLogin) === 0 ? (
          <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: P.muted, fontSize: 13 }}>
            No clicks recorded in this period yet.
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            style={{ display: 'block', overflow: 'visible' }}
            aria-label="Sold gate daily clicks bar chart"
          >
            {/* Y-axis gridlines + labels */}
            {yTicks.map(tick => {
              const y = padT + innerH - (tick / yMax) * innerH
              return (
                <g key={tick}>
                  <line
                    x1={padL} y1={y} x2={W - padR} y2={y}
                    stroke={P.border} strokeWidth={1} strokeDasharray={tick === 0 ? undefined : '3 3'}
                  />
                  <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={9} fill={P.muted}>{tick}</text>
                </g>
              )
            })}

            {/* Bars */}
            {days.map((d, i) => {
              const rH = barH(d.register)
              const lH = barH(d.login)
              const rY = barY(d.register)
              const lY = barY(d.login)
              const label = dayLabel(d.day, i, days.length)
              const bx0 = barX(i, 0)
              const bx1 = barX(i, 1)
              const labelX = bx0 + barW

              return (
                <g key={d.day}>
                  {/* Register bar (purple) */}
                  {d.register > 0 && (
                    <rect
                      x={bx0} y={rY} width={barW} height={rH}
                      fill={P.purple} rx={1}
                      opacity={0.85}
                    />
                  )}
                  {d.register === 0 && (
                    <rect x={bx0} y={padT + innerH - 1} width={barW} height={1} fill={P.border} />
                  )}

                  {/* Login bar (orange) */}
                  {d.login > 0 && (
                    <rect
                      x={bx1} y={lY} width={barW} height={lH}
                      fill={P.orange} rx={1}
                      opacity={0.85}
                    />
                  )}
                  {d.login === 0 && (
                    <rect x={bx1} y={padT + innerH - 1} width={barW} height={1} fill={P.border} />
                  )}

                  {/* X-axis date label */}
                  {label && (
                    <text
                      x={labelX} y={padT + innerH + 16}
                      textAnchor="middle" fontSize={9} fill={P.muted}
                    >
                      {label}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
}

function SoldGateCard({ stats }: { stats: SoldGateStats | null }) {
  const total = stats ? stats.total_register + stats.total_login : null
  const registerPct = total && stats ? Math.round((stats.total_register / total) * 100) : null
  const loginPct = total && stats ? 100 - registerPct! : null

  return (
    <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'hidden', marginBottom: 24 }}>
      <div style={{ padding: '14px 22px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: P.text }}>Sold Gate Clicks</div>
          <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>
            {stats ? `Last ${stats.period_days} days — server-side tally` : 'Server-side tally'}
          </div>
        </div>
        <div style={{ fontSize: 11, color: P.muted, background: P.bg, padding: '3px 10px', borderRadius: 20, border: `1px solid ${P.border}` }}>
          🔒 Sold price gate
        </div>
      </div>

      {stats === null ? (
        <div style={{ padding: '28px 22px', textAlign: 'center', color: P.muted, fontSize: 13 }}>
          No data yet — clicks will appear here once guests interact with the sold gate.
        </div>
      ) : (
        <div style={{ padding: '20px 22px' }}>
          {/* Summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 22 }}>
            <div style={{ background: P.bg, borderRadius: 10, padding: '14px 16px', border: `1px solid ${P.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Total Clicks</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: P.text }}>{total ?? 0}</div>
              <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>register + sign-in</div>
            </div>
            <div style={{ background: P.purpleLight, borderRadius: 10, padding: '14px 16px', border: `1px solid #ddd6fe` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: P.purple, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Register Clicks</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: P.purple }}>{stats.total_register}</div>
              <div style={{ fontSize: 11, color: P.purple, marginTop: 2, opacity: 0.7 }}>
                {registerPct !== null ? `${registerPct}% of total` : '—'}
              </div>
            </div>
            <div style={{ background: P.orangeLight, borderRadius: 10, padding: '14px 16px', border: `1px solid #fde68a` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: P.orange, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Sign-in Clicks</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: P.orange }}>{stats.total_login}</div>
              <div style={{ fontSize: 11, color: P.orange, marginTop: 2, opacity: 0.7 }}>
                {loginPct !== null ? `${loginPct}% of total` : '—'}
              </div>
            </div>
          </div>

          {/* Visual bar */}
          {total !== null && total > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: P.muted, marginBottom: 6 }}>Register vs Sign-in split</div>
              <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: P.bg }}>
                <div style={{ width: `${registerPct}%`, background: P.purple, transition: 'width 0.3s' }} />
                <div style={{ width: `${loginPct}%`, background: P.orange, transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: P.muted }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: P.purple, display: 'inline-block' }} />
                  New account ({registerPct}%)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: P.muted }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: P.orange, display: 'inline-block' }} />
                  Sign in ({loginPct}%)
                </div>
              </div>
            </div>
          )}

          {/* Per-agent breakdown */}
          {stats.by_agent.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: P.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>By Agent Site</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: P.bg }}>
                    {['Agent Slug', 'Register Clicks', 'Sign-in Clicks', 'Total'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: P.muted, borderBottom: `1px solid ${P.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.by_agent.map((a, i) => {
                    const agentTotal = a.register + a.login
                    return (
                      <tr key={a.slug} style={{ borderBottom: i < stats.by_agent.length - 1 ? `1px solid ${P.border}` : 'none' }}>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: P.text }}>
                          <code style={{ background: P.bg, padding: '2px 7px', borderRadius: 4, color: P.primary }}>{a.slug}</code>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 700, color: P.purple }}>{a.register}</td>
                        <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 700, color: P.orange }}>{a.login}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: P.text }}>{agentTotal}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, delta, dimmed }: { label: string; value: string; delta: string; dimmed?: boolean }) {
  return (
    <div style={{ background: P.white, borderRadius: 10, padding: '18px 20px', border: `1px solid ${P.border}` }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: dimmed ? P.muted : P.primary, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: P.muted }}>{delta}</div>
    </div>
  )
}

export default async function AdminAnalyticsPage() {
  const [soldGateStats, soldGateByDay, summary] = await Promise.all([
    getSoldGateStats(30).catch(() => null),
    getSoldGateStatsByDay(30).catch(() => null),
    getPlatformSummary().catch(() => null),
  ])

  const activeSites = summary?.active_agent_sites ?? null
  const totalLeads  = summary?.total_leads ?? null
  const leads30     = summary?.leads_last_30_days ?? null

  return (
    <div>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Analytics</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>Platform-wide performance across all agent sites.</p>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {/* Platform stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          <StatCard
            label="Total Page Views (30d)"
            value="—"
            delta="Connect GA4 to track"
            dimmed
          />
          <StatCard
            label="Total Leads (30d)"
            value={leads30 !== null ? leads30.toLocaleString() : '—'}
            delta={totalLeads !== null ? `${totalLeads.toLocaleString()} all-time` : 'Contact form submissions'}
          />
          <StatCard
            label="Avg Conversion Rate"
            value="—"
            delta="Requires page view tracking"
            dimmed
          />
          <StatCard
            label="Active Agent Sites"
            value={activeSites !== null ? activeSites.toLocaleString() : '—'}
            delta={activeSites === 1 ? 'southsurreywhiterock.com live' : activeSites !== null ? `${activeSites} sites live` : 'Loading…'}
          />
        </div>

        {/* Sold gate conversion card */}
        <SoldGateCard stats={soldGateStats} />

        {/* Sold gate trend chart */}
        {soldGateByDay && <SoldGateTrendChart data={soldGateByDay} />}
        {/* GA4 note */}
        <div style={{ background: P.warningLight, border: '1px solid #fde68a', borderRadius: 10, padding: '14px 20px', fontSize: 13, color: '#78350f', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>📊</span>
          <span>Detailed analytics (traffic sources, user flow, device breakdown) are available in the agent&apos;s Google Analytics 4 property. Agent GA4 ID: <code style={{ background: '#fef9c3', padding: '1px 6px', borderRadius: 3 }}>G-BCCH2024</code></span>
        </div>
      </div>
    </div>
  )
}
