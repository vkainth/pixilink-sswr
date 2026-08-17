'use client'

import { useState } from 'react'

const P = {
  primary: '#23a9e1', primaryLight: '#e0f2fe',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', success: '#22c55e', successLight: '#dcfce7',
  warning: '#f59e0b', warningLight: '#fffbeb',
  error: '#ef4444',
}

function Badge({ color, children }: { color: 'green' | 'yellow' | 'gray'; children: React.ReactNode }) {
  const styles = {
    green: { bg: P.successLight, text: '#166534' },
    yellow: { bg: P.warningLight, text: '#92400e' },
    gray: { bg: '#f1f5f9', text: P.muted },
  }
  const s = styles[color]
  return <span style={{ background: s.bg, color: s.text, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{children}</span>
}

function Toggle({ on, onChange, label, desc }: { on: boolean; onChange: () => void; label: string; desc?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${P.border}` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>{desc}</div>}
      </div>
      <div onClick={onChange} style={{ width: 40, height: 22, borderRadius: 11, background: on ? P.primary : '#cbd5e1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 3, left: on ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', padding: '9px 13px', border: `1px solid ${P.border}`, borderRadius: 7, fontSize: 13, color: P.text, background: P.white, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: P.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }

export default function AdminIntegrationsPage() {
  const [ga, setGa] = useState({ platformId: 'G-BCCH2024', gtmId: 'GTM-BCCH01', agentOverride: true, autoInject: true })
  const [gaSaved, setGaSaved] = useState(false)
  const [fub, setFub] = useState({ apiKey: 'fub_live_••••••••••••••••', webhookUrl: 'https://api.followupboss.com/v1/events', pipeline: 'New Leads', syncDelay: 'immediate', autoAssign: true, tagLeads: true })
  const [fubSaved, setFubSaved] = useState(false)
  const [loftyKey, setLoftyKey] = useState('')
  const [loftyId, setLoftyId] = useState('')
  const [loftySaved, setLoftySaved] = useState(false)

  function save(setter: (v: boolean) => void) { setter(true); setTimeout(() => setter(false), 2500) }

  return (
    <div>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Integrations</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>Platform-wide connections for analytics, CRM lead routing, and third-party tools.</p>
      </div>

      <div style={{ padding: '24px 32px 60px' }}>
        {/* Summary strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            ['Active Integrations', '2', '#22c55e'],
            ['Agents w/ GA4 Override', '3 / 7', P.primary],
            ['FUB Leads This Month', '148', P.text],
            ['Pending Setup', '1', P.warning],
          ].map(([label, value, color]) => (
            <div key={label} style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 11, color: P.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Analytics section */}
        <div style={{ fontSize: 11, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Analytics</div>
        <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📊</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: P.text }}>Google Analytics 4</span>
                <Badge color="green">Connected</Badge>
                <span style={{ fontSize: 11, color: P.muted, marginLeft: 4 }}>3 agents configured</span>
              </div>
              <div style={{ fontSize: 12, color: P.muted }}>Platform-wide GA4 measurement with optional per-agent property overrides.</div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${P.border}`, padding: '20px 24px', background: '#fafcff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 12 }}>Platform Default</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={lbl}>GA4 Measurement ID</label>
                    <input style={inp} value={ga.platformId} onChange={e => setGa(s => ({ ...s, platformId: e.target.value }))} placeholder="G-XXXXXXXXXX" />
                  </div>
                  <div>
                    <label style={lbl}>GTM Container ID</label>
                    <input style={inp} value={ga.gtmId} onChange={e => setGa(s => ({ ...s, gtmId: e.target.value }))} placeholder="GTM-XXXXXXX" />
                  </div>
                </div>
                <Toggle label="Allow per-agent GA4 overrides" desc="Agents can enter their own GA4 ID." on={ga.agentOverride} onChange={() => setGa(s => ({ ...s, agentOverride: !s.agentOverride }))} />
                <Toggle label="Auto-inject GA4 snippet" desc="Added to every page head automatically." on={ga.autoInject} onChange={() => setGa(s => ({ ...s, autoInject: !s.autoInject }))} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 12 }}>Agent Overrides</div>
                {[{ name: 'Randy Dyck', id: 'G-RD48291', active: true }, { name: 'Cindy Oering', id: 'G-CO77341', active: true }, { name: 'Les Twarog', id: 'G-LT99102', active: true }, { name: 'Mike Chan', id: '—', active: false }].map(a => (
                  <div key={a.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${P.border}` }}>
                    <div style={{ fontSize: 13, color: P.text, fontWeight: 500 }}>{a.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ fontSize: 11, color: a.active ? P.primary : P.muted, background: P.bg, padding: '2px 7px', borderRadius: 4 }}>{a.id}</code>
                      <Badge color={a.active ? 'green' : 'gray'}>{a.active ? 'Active' : 'Using default'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${P.border}` }}>
              <button onClick={() => save(setGaSaved)} style={{ padding: '7px 16px', background: gaSaved ? P.success : P.primary, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{gaSaved ? '✓ Saved' : 'Save Changes'}</button>
              <button style={{ padding: '7px 14px', background: P.white, border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 12, fontWeight: 600, color: P.text, cursor: 'pointer', fontFamily: 'inherit' }}>Test Connection</button>
            </div>
          </div>
        </div>

        {/* CRM section */}
        <div style={{ fontSize: 11, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, marginTop: 28 }}>CRM & Lead Routing</div>
        
        {/* FUB */}
        <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🏹</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: P.text }}>Follow Up Boss</span>
                <Badge color="green">Connected</Badge>
              </div>
              <div style={{ fontSize: 12, color: P.muted }}>Route leads from Pixilink widgets directly into FUB as new people or events.</div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${P.border}`, padding: '20px 24px', background: '#fafcff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 12 }}>API Connection</div>
                <label style={lbl}>API Key</label>
                <input type="password" style={{ ...inp, marginBottom: 10 }} value={fub.apiKey} onChange={e => setFub(s => ({ ...s, apiKey: e.target.value }))} />
                <label style={lbl}>Webhook Endpoint</label>
                <input style={{ ...inp, fontFamily: 'monospace', marginBottom: 10 }} value={fub.webhookUrl} onChange={e => setFub(s => ({ ...s, webhookUrl: e.target.value }))} />
                <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 12, color: '#166534' }}>✓ Connection verified — last ping 2 min ago</div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 12 }}>Lead Routing Rules</div>
                <label style={lbl}>Default Pipeline</label>
                <select value={fub.pipeline} onChange={e => setFub(s => ({ ...s, pipeline: e.target.value }))}
                  style={{ ...inp, marginBottom: 10 }}>
                  {['New Leads', 'Hot Leads', 'Nurture', 'Buyer Leads', 'Seller Leads'].map(p => <option key={p}>{p}</option>)}
                </select>
                <label style={lbl}>Sync Delay</label>
                <select value={fub.syncDelay} onChange={e => setFub(s => ({ ...s, syncDelay: e.target.value }))}
                  style={{ ...inp, marginBottom: 10 }}>
                  {['immediate', '5 minutes', '15 minutes', '1 hour'].map(p => <option key={p}>{p}</option>)}
                </select>
                <Toggle label="Auto-assign to listing agent" on={fub.autoAssign} onChange={() => setFub(s => ({ ...s, autoAssign: !s.autoAssign }))} />
                <Toggle label="Tag all Pixilink leads" on={fub.tagLeads} onChange={() => setFub(s => ({ ...s, tagLeads: !s.tagLeads }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${P.border}` }}>
              <button onClick={() => save(setFubSaved)} style={{ padding: '7px 16px', background: fubSaved ? P.success : P.primary, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{fubSaved ? '✓ Saved' : 'Save Changes'}</button>
              <button style={{ padding: '7px 14px', background: P.white, border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 12, fontWeight: 600, color: P.text, cursor: 'pointer', fontFamily: 'inherit' }}>Test Connection</button>
            </div>
          </div>
        </div>

        {/* Lofty */}
        <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🏠</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: P.text }}>Lofty</span>
                <Badge color="gray">Not Connected</Badge>
              </div>
              <div style={{ fontSize: 12, color: P.muted }}>Formerly Chime CRM. Sync Pixilink leads into Lofty with automatic tagging and pipeline assignment.</div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${P.border}`, padding: '20px 24px', background: '#fafcff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <label style={lbl}>API Key</label>
                <input type="password" style={{ ...inp, marginBottom: 10 }} value={loftyKey} onChange={e => setLoftyKey(e.target.value)} placeholder="lofty_..." />
                <label style={lbl}>Account ID</label>
                <input style={{ ...inp, marginBottom: 10 }} value={loftyId} onChange={e => setLoftyId(e.target.value)} placeholder="your-account-id" />
                <div style={{ padding: '12px 14px', background: P.warningLight, border: `1px solid #fde68a`, borderRadius: 8, fontSize: 12, color: '#92400e' }}>⚠ Not connected — enter your API key above to enable.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${P.border}` }}>
              <button onClick={() => save(setLoftySaved)} style={{ padding: '7px 16px', background: loftySaved ? P.success : P.primary, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{loftySaved ? '✓ Saved' : 'Save Changes'}</button>
              <button style={{ padding: '7px 14px', background: P.white, border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 12, fontWeight: 600, color: P.text, cursor: 'pointer', fontFamily: 'inherit' }}>Test Connection</button>
            </div>
          </div>
        </div>

        {/* Coming soon */}
        <div style={{ fontSize: 11, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Coming Soon</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[['⚡', 'Zapier', 'Connect leads to 5,000+ apps via Zaps.'], ['📘', 'Facebook Pixel', 'Conversion tracking for FB/Instagram ads.'], ['🏡', 'kvCORE', 'Full CRM sync with kvCORE / Inside Real Estate.'], ['💬', 'Twilio SMS', 'Instant SMS alerts to agents on new leads.'], ['🗓', 'Calendly', 'Auto-book showings into agent calendars.'], ['📧', 'Mailchimp', 'Add leads to drip campaigns automatically.']].map(([logo, name, desc]) => (
            <div key={name} style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 10, padding: '16px 18px', opacity: 0.7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{logo}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: P.text }}>{name}</span>
                <span style={{ background: '#f1f5f9', color: P.muted, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Soon</span>
              </div>
              <div style={{ fontSize: 12, color: P.muted }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
