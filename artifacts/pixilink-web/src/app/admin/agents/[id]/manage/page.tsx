import { notFound } from 'next/navigation'
import { getAgent, getAgentLeads, getPlatformSummary } from '@/lib/admin-api'
import { agentSitemapUrl } from '@/lib/sitemap-utils'

export const dynamic = 'force-dynamic'

const P = {
  primary: '#23a9e1', primaryLight: '#e0f2fe',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', success: '#22c55e', successLight: '#dcfce7',
  warning: '#f59e0b', warningLight: '#fffbeb',
}

export default async function AgentManageOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [agent, leads] = await Promise.all([
    getAgent(Number(id)),
    getAgentLeads(Number(id)).catch(() => []),
  ])

  if (!agent) notFound()

  const leads30 = leads.filter(l => {
    if (!l.created_at) return false
    const d = new Date(l.created_at)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    return d >= cutoff
  })

  const statusColor = agent.status === 'active'
    ? { bg: P.successLight, text: '#006644' }
    : agent.status === 'suspended'
      ? { bg: '#ffebe6', text: '#bf2600' }
      : { bg: P.bg, text: P.muted }

  return (
    <div>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: P.text }}>{agent.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            {agent.brokerage && (
              <span style={{ fontSize: 13, color: P.muted }}>{agent.brokerage}</span>
            )}
            <span style={{ background: statusColor.bg, color: statusColor.text, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              {agent.status}
            </span>
            {agent.theme_slug && (
              <span style={{ fontSize: 12, color: P.muted, background: P.bg, padding: '2px 8px', borderRadius: 4, border: `1px solid ${P.border}` }}>
                {agent.theme_slug}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {agent.settings?.custom_domain && (
            <a
              href={`https://${agent.settings.custom_domain}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12, color: P.primary, padding: '7px 14px',
                border: `1px solid ${P.primary}`, borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              View Site ↗
            </a>
          )}
          <a
            href={agentSitemapUrl(agent.settings?.custom_domain, agent.slug)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12, color: P.muted, padding: '7px 14px',
              border: `1px solid ${P.border}`, borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            Sitemap ↗
          </a>
          <a
            href={`/admin/agents/${id}/manage/settings`}
            style={{
              fontSize: 12, background: P.bg, color: P.text,
              padding: '7px 14px', borderRadius: 6, border: `1px solid ${P.border}`,
            }}
          >
            Edit Settings
          </a>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {/* Key stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Total Leads', value: leads.length, color: P.text, sub: 'all time' },
            { label: 'Leads (30d)', value: leads30.length, color: P.primary, sub: 'last 30 days' },
            { label: 'MLS IDs', value: agent.mls_ids?.length ?? 0, color: P.text, sub: 'registered' },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={{ background: P.white, borderRadius: 10, padding: '18px 20px', border: `1px solid ${P.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color, marginBottom: 2 }}>{value}</div>
              <div style={{ fontSize: 11, color: P.muted }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Info panels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

          {/* Contact & domain */}
          <div style={{ background: P.white, borderRadius: 10, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${P.border}`, fontSize: 12, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
              Contact & Domain
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Email', agent.email],
                ['Phone', agent.phone],
                ['Slug', agent.slug],
                ['Domain', agent.settings?.custom_domain],
                ['GA4 ID', agent.settings?.ga4_id],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={String(k)} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                  <span style={{ color: P.muted, minWidth: 70, flexShrink: 0 }}>{k}</span>
                  <span style={{ color: P.text, fontFamily: k === 'Slug' || k === 'GA4 ID' ? 'monospace' : 'inherit', fontSize: k === 'Slug' || k === 'GA4 ID' ? 12 : 13 }}>{String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Territories */}
          <div style={{ background: P.white, borderRadius: 10, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${P.border}`, fontSize: 12, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
              Territory & MLS
            </div>
            <div style={{ padding: '16px 18px' }}>
              {agent.territories.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {agent.territories.map(t => (
                    <span key={t} style={{ background: P.primaryLight, color: '#0369a1', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: P.muted, margin: '0 0 14px' }}>No territories assigned.</p>
              )}
              {agent.mls_ids && agent.mls_ids.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: P.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>MLS IDs</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {agent.mls_ids.map(m => (
                      <code key={m} style={{ background: P.bg, padding: '3px 8px', borderRadius: 4, fontSize: 12, color: P.text, border: `1px solid ${P.border}` }}>{m}</code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick nav links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { href: `/admin/agents/${id}/manage/leads`, label: 'Manage Leads', icon: '◎', desc: `${leads.length} total leads` },
            { href: `/admin/agents/${id}/manage/feature-flags`, label: 'Feature Flags', icon: '⚑', desc: 'Toggle site features on/off' },
            { href: `/admin/agents/${id}/manage/integrations`, label: 'Integrations', icon: '⬡', desc: 'GA4, CRM, and tracking setup' },
            { href: `/admin/agents/${id}/manage/analytics`, label: 'Analytics', icon: '▦', desc: 'Leads and sold gate data' },
            { href: `/admin/agents/${id}/manage/settings`, label: 'Settings', icon: '⚙', desc: 'Edit agent profile & branding' },
          ].map(({ href, label, icon, desc }) => (
            <a
              key={href}
              href={href}
              style={{
                background: P.white, border: `1px solid ${P.border}`, borderRadius: 10,
                padding: '16px 18px', display: 'block', transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: P.text }}>{label}</span>
              </div>
              <div style={{ fontSize: 12, color: P.muted }}>{desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
