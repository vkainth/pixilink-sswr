const P = {
  primary: '#23a9e1', primaryLight: '#e0f2fe',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0',
}

const MOCK_EVENTS = [
  { id: 1, actor: 'admin@pixilink.com', action: 'Agent updated', target: 'Randy Dyck', detail: 'theme_color → #111111', at: '2026-06-08T14:32:00Z' },
  { id: 2, actor: 'admin@pixilink.com', action: 'Feature flag saved', target: 'Randy Dyck', detail: 'market_intelligence: true', at: '2026-06-08T13:10:00Z' },
  { id: 3, actor: 'admin@pixilink.com', action: 'Agent created', target: 'Cindy Oering', detail: 'slug: cindy', at: '2026-06-07T11:00:00Z' },
  { id: 4, actor: 'admin@pixilink.com', action: 'Agent updated', target: 'Cindy Oering', detail: 'custom_domain → cindyoering.com', at: '2026-06-07T11:22:00Z' },
  { id: 5, actor: 'admin@pixilink.com', action: 'Feature flag saved', target: 'Cindy Oering', detail: 'school_catchments: true', at: '2026-06-06T09:45:00Z' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function AuditLogPage() {
  return (
    <div>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Audit Log</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>
          Platform-wide record of admin actions. Full server-side logging coming soon.
        </p>
      </div>

      <div style={{ padding: '24px 32px' }}>
        <div style={{ marginBottom: 16, padding: '12px 16px', background: P.primaryLight, borderRadius: 8, fontSize: 12, color: '#0369a1' }}>
          ℹ️ Showing recent mock events. Full audit log with server-side persistence is on the roadmap.
        </div>

        <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: P.bg }}>
                {['Time', 'Actor', 'Action', 'Target', 'Detail'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: P.muted, borderBottom: `1px solid ${P.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_EVENTS.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: i < MOCK_EVENTS.length - 1 ? `1px solid ${P.border}` : 'none' }}>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: P.muted, whiteSpace: 'nowrap' }}>{formatDate(e.at)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: P.text }}>{e.actor}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: P.text }}>{e.action}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: P.primary, fontWeight: 500 }}>{e.target}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: P.muted, fontFamily: 'monospace' }}>{e.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
