import { listAgents } from '@/lib/admin-api'
import type { AdminAgent } from '@/lib/admin-api'
import { agentSitemapUrl } from '@/lib/sitemap-utils'

export const dynamic = 'force-dynamic'

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'active' ? 'badge-active' : status === 'suspended' ? 'badge-suspended' : 'badge-inactive'
  return <span className={`badge ${cls}`}>{status}</span>
}

export default async function AgentsPage() {
  let agents: AdminAgent[] = []
  let fetchError = false
  try {
    agents = await listAgents()
  } catch {
    fetchError = true
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1180 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#172b4d' }}>Agents</h1>
          <p style={{ fontSize: 13, color: '#7b8fa0', marginTop: 3 }}>
            {agents.length} agent{agents.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <a
          href="/admin/agents/new"
          style={{
            background: '#0052cc', color: '#fff', padding: '8px 18px', borderRadius: 4,
            fontWeight: 600, fontSize: 13, display: 'inline-block',
          }}
        >
          + New Agent
        </a>
      </div>

      {fetchError && (
        <div style={{
          background: '#ffebe6', color: '#bf2600', padding: '12px 16px',
          borderRadius: 6, marginBottom: 20, fontSize: 13,
        }}>
          Failed to load agents — check Laravel API connectivity.
        </div>
      )}

      {/* Table */}
      <div style={{
        background: '#fff', borderRadius: 8, border: '1px solid #dfe1e6',
        overflow: 'hidden',
      }}>
        <table>
          <thead>
            <tr style={{ background: '#f4f5f7' }}>
              {['Name', 'Slug', 'Domain', 'Status', 'Theme', 'Territories', ''].map((h) => (
                <th key={h} style={{
                  padding: '11px 16px', textAlign: 'left', fontSize: 12,
                  color: '#5e6c84', borderBottom: '1px solid #dfe1e6',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 && !fetchError && (
              <tr>
                <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: '#7b8fa0' }}>
                  No agents yet. <a href="/admin/agents/new" style={{ color: '#0052cc' }}>Create the first one.</a>
                </td>
              </tr>
            )}
            {agents.map((agent, i) => (
              <tr
                key={agent.id}
                style={{
                  borderBottom: i < agents.length - 1 ? '1px solid #f4f5f7' : 'none',
                  transition: 'background .1s',
                }}
              >
                <td style={{ padding: '13px 16px', fontWeight: 600, color: '#172b4d' }}>
                  {agent.name}
                  {agent.brokerage && (
                    <div style={{ fontSize: 11, color: '#7b8fa0', fontWeight: 400 }}>{agent.brokerage}</div>
                  )}
                </td>
                <td style={{ padding: '13px 16px', fontFamily: 'monospace', fontSize: 12, color: '#5e6c84' }}>
                  {agent.slug}
                </td>
                <td style={{ padding: '13px 16px', fontSize: 12, color: '#5e6c84' }}>
                  {agent.custom_domain ? (
                    <a href={`https://${agent.custom_domain}`} target="_blank" rel="noopener"
                       style={{ color: '#0052cc' }}>
                      {agent.custom_domain}
                    </a>
                  ) : (
                    <span style={{ color: '#c1c7d0' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '13px 16px' }}>
                  <StatusBadge status={agent.status} />
                </td>
                <td style={{ padding: '13px 16px', fontSize: 12, color: '#5e6c84' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {agent.theme_color && (
                      <span style={{
                        width: 12, height: 12, borderRadius: 2,
                        background: agent.theme_color, flexShrink: 0, display: 'inline-block',
                        border: '1px solid rgba(0,0,0,.1)',
                      }} />
                    )}
                    {agent.theme_slug || '—'}
                  </span>
                </td>
                <td style={{ padding: '13px 16px', fontSize: 11, color: '#7b8fa0' }}>
                  {agent.territories.length > 0
                    ? agent.territories.slice(0, 3).join(', ') + (agent.territories.length > 3 ? ` +${agent.territories.length - 3}` : '')
                    : <span style={{ color: '#c1c7d0' }}>—</span>}
                </td>
                <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <a
                    href={`/admin/agents/${agent.id}/manage`}
                    style={{
                      fontSize: 12, background: '#23a9e1', color: '#fff',
                      padding: '5px 12px', borderRadius: 4, fontWeight: 600, marginRight: 8,
                    }}
                  >
                    Manage Site →
                  </a>
                  <a
                    href={agentSitemapUrl(agent.custom_domain, agent.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12, background: '#f4f5f7', color: '#172b4d',
                      padding: '5px 10px', borderRadius: 4, border: '1px solid #dfe1e6', marginRight: 8,
                    }}
                  >
                    Sitemap
                  </a>
                  <a
                    href={`/admin/agents/${agent.id}/manage/settings`}
                    style={{
                      fontSize: 12, background: '#f4f5f7', color: '#172b4d',
                      padding: '5px 10px', borderRadius: 4, border: '1px solid #dfe1e6',
                    }}
                  >
                    Edit
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
