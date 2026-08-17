import { redirect } from 'next/navigation'
import { getAgentPortalSession } from '@/lib/agent-portal-auth'
import { getAgentPortalDashboard } from '@/lib/agent-portal-api'
import type { AgentPortalDashboard, AgentPortalLead } from '@/lib/agent-portal-api'

const P = {
  primary: '#23a9e1', primaryLight: '#e0f2fe',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', success: '#22c55e', successLight: '#dcfce7',
  warning: '#f59e0b', warningLight: '#fffbeb',
  sidebarBg: '#0f172a',
}

function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: 'blue' | 'green' | 'gray' | 'yellow' }) {
  const styles: Record<string, { bg: string; text: string }> = {
    blue:   { bg: P.primaryLight, text: P.primary },
    green:  { bg: P.successLight, text: P.success },
    yellow: { bg: P.warningLight, text: '#92400e' },
    gray:   { bg: '#f1f5f9', text: P.muted },
  }
  const s = styles[color]
  return (
    <span style={{ background: s.bg, color: s.text, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
      {children}
    </span>
  )
}

function typeColor(type: string): 'blue' | 'yellow' | 'green' | 'gray' {
  if (type === 'w1') return 'blue'
  if (type === 'w2') return 'yellow'
  if (type === 'w3') return 'green'
  return 'gray'
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays === 0) return 'Today, ' + d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday, ' + d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
  } catch {
    return iso
  }
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: P.white, borderRadius: 12, padding: '20px 22px', border: `1px solid ${P.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 11, color: P.muted }}>{sub}</div>
    </div>
  )
}

function formatBrowsingContext(lead: { listing_slug?: string | null; source?: string | null }): string | null {
  if (lead.listing_slug) return 'Listing: ' + lead.listing_slug
  const url = lead.source || ''
  if (!url) return null
  const listingMatch = url.match(/\/listing\/([^/?#]+)/)
  if (listingMatch) return 'Listing: ' + listingMatch[1]
  const buildingMatch = url.match(/\/building\/([^/?#]+)/)
  if (buildingMatch) {
    const name = buildingMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    return 'Building: ' + name
  }
  const qIdx = url.indexOf('?')
  if (qIdx !== -1) {
    const qs = new URLSearchParams(url.slice(qIdx + 1))
    const subarea = qs.get('subarea'), beds = qs.get('beds'), type = qs.get('type')
    const minP = qs.get('min_price') ? parseInt(qs.get('min_price')!) : null
    const maxP = qs.get('max_price') ? parseInt(qs.get('max_price')!) : null
    const pricePart = (minP || maxP)
      ? (minP ? '$' + Math.round(minP / 1000) + 'k' : '') + (minP && maxP ? '\u2013' : '') + (maxP ? '$' + Math.round(maxP / 1000) + 'k' : '')
      : null
    const parts = [subarea, beds ? beds + '+ bed' : null, type, pricePart].filter(Boolean) as string[]
    if (parts.length) return parts.join(' \u00b7 ')
  }
  return url.length > 50 ? url.slice(0, 47) + '\u2026' : url
}

function LeadsTable({ leads }: { leads: AgentPortalLead[] }) {
  if (leads.length === 0) {
    return (
      <div style={{ padding: '32px 22px', textAlign: 'center', color: P.muted, fontSize: 13 }}>
        No leads yet — they'll appear here when visitors fill out your contact forms.
      </div>
    )
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: P.bg }}>
          {['Name', 'Type', 'Source', 'Date', 'Status'].map(h => (
            <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: P.muted, borderBottom: `1px solid ${P.border}` }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {leads.map((l, i) => (
          <tr key={l.id} style={{ borderBottom: i < leads.length - 1 ? `1px solid ${P.border}` : 'none' }}>
            <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: P.text }}>
              {l.name || <span style={{ color: P.muted, fontStyle: 'italic' }}>Anonymous</span>}
            </td>
            <td style={{ padding: '11px 14px', fontSize: 12 }}>
              <Badge color={typeColor(l.type)}>{l.form_type_label}</Badge>
            </td>
            <td style={{ padding: '11px 14px', fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {(() => {
                const ctx = formatBrowsingContext(l)
                return ctx
                  ? <span style={{ color: P.primary, fontWeight: 500 }} title={ctx}>{ctx}</span>
                  : <span style={{ color: P.muted }}>—</span>
              })()}
            </td>
            <td style={{ padding: '11px 14px', fontSize: 12, color: P.muted, whiteSpace: 'nowrap' }}>{formatDate(l.created_at)}</td>
            <td style={{ padding: '11px 14px' }}>
              <Badge color={l.contacted ? 'green' : 'blue'}>{l.contacted ? 'Contacted' : 'New'}</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default async function AgentPortalDashboardPage() {
  const session = await getAgentPortalSession()
  if (!session) redirect('/agent-portal/login')

  const data: AgentPortalDashboard | null = await getAgentPortalDashboard(session.id)

  const isDemo = !data || data.site_mode === 'demo'
  const domain = data?.site_domain ?? session.domain ?? `${session.slug}.pixilink.ca`
  const leads = data?.recent_leads ?? []

  return (
    <>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Dashboard</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>Welcome back, {session.name}. Here&apos;s what&apos;s happening on your site.</p>
        </div>
        <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: P.primary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          View My Site ↗
        </a>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {isDemo && (
          <div style={{ background: P.warningLight, border: '1px solid #fcd34d', borderLeft: '4px solid #f59e0b', borderRadius: 10, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>⚠</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#78350f', marginBottom: 4 }}>Your site is in Demo Mode — not indexed by Google</div>
              <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
                Your site is fully functional for testing — leads, MLS data, and forms are all live — but search engines are blocked from indexing it. Contact Pixilink when you&apos;re ready to go live.
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          <StatCard label="Leads This Month"     value={String(data?.leads_this_month ?? 0)}       sub="from your site forms"           color={P.primary} />
          <StatCard label="Page Views (30d)"     value={(data?.page_views_30d ?? 0).toLocaleString()} sub="unique visits"                color={P.success} />
          <StatCard label="Active Listings"      value={String(data?.active_listings ?? 0)}         sub="via your MLS feed"              color='#111111' />
          <StatCard label="Open Houses This Week" value={String(data?.open_houses_this_week ?? 0)}   sub="scheduled this week"           color={P.warning} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}` }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: P.text }}>Recent Leads</div>
              <a href="/agent-portal/leads" style={{ fontSize: 12, color: P.primary }}>View all →</a>
            </div>
            <LeadsTable leads={leads} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: `linear-gradient(135deg, ${P.sidebarBg}, #1e3a5f)`, borderRadius: 12, padding: '20px 22px' }}>
              <div style={{ fontSize: 12, color: P.primary, fontWeight: 700, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Your Site</div>
              <div style={{ fontSize: 14, color: '#fff', fontWeight: 700, marginBottom: 4 }}>{domain}</div>
              <div style={{ fontSize: 12, color: isDemo ? '#fbbf24' : 'rgba(255,255,255,0.5)', marginBottom: 14 }}>
                {isDemo ? '⚠ Demo Mode — not indexed' : '✓ Live — indexed by Google'}
              </div>
              <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', background: P.primary, color: '#fff', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 700 }}>
                Open Site →
              </a>
            </div>

            {(data?.subscription_plan || data?.monthly_amount) && (
              <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: P.text }}>Subscription</div>
                  {data.subscription_status === 'active' && (
                    <span style={{ background: '#f0fdf4', color: '#166534', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>✓ Active</span>
                  )}
                </div>
                {data.subscription_plan && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 2 }}>{data.subscription_plan}</div>
                )}
                {data.monthly_amount && (
                  <div style={{ fontSize: 12, color: P.muted, marginBottom: 12 }}>
                    ${data.monthly_amount} / month{data.next_payment_date ? ` · next ${data.next_payment_date}` : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
