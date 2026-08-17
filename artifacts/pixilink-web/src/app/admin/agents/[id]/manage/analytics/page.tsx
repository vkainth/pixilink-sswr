import { notFound } from 'next/navigation'
import { getAgent, getSoldGateStats, getSoldGateStatsByDay, getAgentLeads } from '@/lib/admin-api'

export const dynamic = 'force-dynamic'

const P = {
  primary: '#23a9e1', primaryLight: '#e0f2fe',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', success: '#22c55e',
  purple: '#8b5cf6', purpleLight: '#f5f3ff',
  orange: '#f59e0b', orangeLight: '#fffbeb',
}

export default async function AgentManageAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [agent, leads, soldGateStats] = await Promise.all([
    getAgent(Number(id)),
    getAgentLeads(Number(id)).catch(() => []),
    getSoldGateStats(30).catch(() => null),
  ])

  if (!agent) notFound()

  const leads30 = leads.filter(l => {
    if (!l.created_at) return false
    const d = new Date(l.created_at)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    return d >= cutoff
  })

  const agentSoldGate = soldGateStats?.by_agent?.find(a => a.slug === agent.slug) ?? null
  const gateTotal = agentSoldGate ? agentSoldGate.register + agentSoldGate.login : null
  const registerPct = gateTotal && agentSoldGate ? Math.round((agentSoldGate.register / gateTotal) * 100) : null
  const loginPct = registerPct !== null ? 100 - registerPct : null

  return (
    <div>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Analytics</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>Performance data for {agent.name}&apos;s site.</p>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {/* Lead stats */}
        <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: 2 }}>Leads</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Total Leads', value: leads.length, sub: 'all time' },
            { label: 'Leads (30d)', value: leads30.length, sub: 'last 30 days' },
            { label: 'W1 Showing', value: leads.filter(l => l.form_type_label === 'W1 Showing').length, sub: '' },
            { label: 'W2 Home Eval', value: leads.filter(l => l.form_type_label === 'W2 Home Eval').length, sub: '' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: P.white, borderRadius: 10, padding: '18px 20px', border: `1px solid ${P.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: P.primary, marginBottom: 2 }}>{value}</div>
              {sub && <div style={{ fontSize: 11, color: P.muted }}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* Sold gate */}
        <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: 2 }}>Sold Gate</div>
        <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '14px 22px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text }}>Sold Gate Clicks</div>
              <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>Register vs sign-in clicks on {agent.name}&apos;s site (last 30 days)</div>
            </div>
            <div style={{ fontSize: 11, color: P.muted, background: P.bg, padding: '3px 10px', borderRadius: 20, border: `1px solid ${P.border}` }}>
              🔒 Sold price gate
            </div>
          </div>

          {agentSoldGate === null || gateTotal === 0 ? (
            <div style={{ padding: '28px 22px', textAlign: 'center', color: P.muted, fontSize: 13 }}>
              {soldGateStats === null
                ? 'Could not load sold gate data — check API connectivity.'
                : 'No sold gate clicks recorded for this agent yet.'}
            </div>
          ) : (
            <div style={{ padding: '20px 22px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
                <div style={{ background: P.bg, borderRadius: 10, padding: '14px 16px', border: `1px solid ${P.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Total Clicks</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: P.text }}>{gateTotal}</div>
                  <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>register + sign-in</div>
                </div>
                <div style={{ background: P.purpleLight, borderRadius: 10, padding: '14px 16px', border: '1px solid #ddd6fe' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: P.purple, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Register Clicks</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: P.purple }}>{agentSoldGate!.register}</div>
                  <div style={{ fontSize: 11, color: P.purple, marginTop: 2, opacity: 0.7 }}>{registerPct !== null ? `${registerPct}% of total` : '—'}</div>
                </div>
                <div style={{ background: P.orangeLight, borderRadius: 10, padding: '14px 16px', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: P.orange, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Sign-in Clicks</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: P.orange }}>{agentSoldGate!.login}</div>
                  <div style={{ fontSize: 11, color: P.orange, marginTop: 2, opacity: 0.7 }}>{loginPct !== null ? `${loginPct}% of total` : '—'}</div>
                </div>
              </div>
              {gateTotal !== null && gateTotal > 0 && (
                <div>
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
            </div>
          )}
        </div>

        {/* GA4 note */}
        {agent.settings?.ga4_id && (
          <div style={{ background: P.orangeLight, border: '1px solid #fde68a', borderRadius: 10, padding: '14px 20px', fontSize: 13, color: '#78350f', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>📊</span>
            <span>Detailed analytics (traffic, device, user flow) are in this agent&apos;s GA4 property: <code style={{ background: '#fef9c3', padding: '1px 6px', borderRadius: 3 }}>{agent.settings.ga4_id}</code></span>
          </div>
        )}
        {!agent.settings?.ga4_id && (
          <div style={{ background: P.bg, border: `1px solid ${P.border}`, borderRadius: 10, padding: '14px 20px', fontSize: 13, color: P.muted, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>📊</span>
            <span>No GA4 ID configured for this agent. <a href={`/admin/agents/${id}/manage/settings`} style={{ color: P.primary }}>Add one in Settings →</a></span>
          </div>
        )}
      </div>
    </div>
  )
}
