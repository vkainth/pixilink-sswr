'use client'

import { useEffect, useState } from 'react'

const P = {
  primary: '#23a9e1',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', success: '#22c55e', successBg: '#dcfce7',
  error: '#ef4444', errorBg: '#fee2e2',
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: `1px solid ${P.border}`,
  borderRadius: 7, fontSize: 13, color: P.text, background: P.white,
  boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: P.muted,
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4,
}

interface Integrations {
  ga4_id: string | null
  fub_enabled: boolean
  ghl_enabled: boolean
  lofty_enabled: boolean
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 42, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s',
        background: on ? P.primary : P.border, display: 'flex', alignItems: 'center',
        padding: '0 3px', justifyContent: on ? 'flex-end' : 'flex-start', flexShrink: 0,
      }}
    >
      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
  )
}

function IntegrationCard({
  emoji, title, description, active, children,
}: {
  emoji: string; title: string; description: string; active?: boolean; children: React.ReactNode
}) {
  return (
    <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 24px' }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          {emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: P.text }}>{title}</div>
          <div style={{ fontSize: 12, color: P.muted }}>{description}</div>
        </div>
        {active !== undefined && (
          <span style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: active ? P.successBg : P.bg,
            color: active ? '#166534' : P.muted,
          }}>
            {active ? '● Active' : '○ Inactive'}
          </span>
        )}
      </div>
      <div style={{ borderTop: `1px solid ${P.border}`, padding: '20px 24px', background: '#fafcff' }}>
        {children}
      </div>
    </div>
  )
}

export default function AgentPortalIntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integrations>({ ga4_id: null, fub_enabled: false, ghl_enabled: false, lofty_enabled: false })
  const [ga4Id, setGa4Id] = useState('')
  const [fubEnabled, setFubEnabled] = useState(false)
  const [fubApiKey, setFubApiKey] = useState('')
  const [ghlEnabled, setGhlEnabled] = useState(false)
  const [ghlApiKey, setGhlApiKey] = useState('')
  const [loftyEnabled, setLoftyEnabled] = useState(false)
  const [loftyApiKey, setLoftyApiKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/agent-portal/integrations`)
      .then(r => r.json())
      .then((data: Integrations) => {
        setIntegrations(data)
        setGa4Id(data.ga4_id ?? '')
        setFubEnabled(data.fub_enabled)
        setGhlEnabled(data.ghl_enabled)
        setLoftyEnabled(data.lofty_enabled)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/agent-portal/integrations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ga4_id: ga4Id || null,
          fub_enabled: fubEnabled,
          fub_api_key: fubApiKey || undefined,
          ghl_enabled: ghlEnabled,
          ghl_api_key: ghlApiKey || undefined,
          lofty_enabled: loftyEnabled,
          lofty_api_key: loftyApiKey || undefined,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setIntegrations(updated)
        setFubApiKey('')
        setGhlApiKey('')
        setLoftyApiKey('')
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } else {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error || 'Save failed. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '60px 32px', textAlign: 'center', color: P.muted }}>Loading…</div>
    )
  }

  return (
    <>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Integrations</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>Connect analytics and CRM tools to your site.</p>
      </div>

      <div style={{ padding: '24px 32px 60px', maxWidth: 740 }}>
        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: P.errorBg, borderRadius: 8, fontSize: 12, color: P.error }}>
            {error}
          </div>
        )}

        <IntegrationCard
          emoji="📊"
          title="Google Analytics 4"
          description="Auto-injected into every page of your site."
          active={!!(integrations.ga4_id)}
        >
          <div>
            <label style={lbl}>GA4 Measurement ID</label>
            <input
              style={inp}
              value={ga4Id}
              onChange={e => setGa4Id(e.target.value)}
              placeholder="G-XXXXXXXXXX"
            />
            <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>
              Found in Google Analytics → Admin → Data Streams.
            </div>
          </div>
        </IntegrationCard>

        <IntegrationCard
          emoji="🏹"
          title="Follow Up Boss"
          description="Route leads from your site directly into FUB."
          active={integrations.fub_enabled}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: fubEnabled ? 14 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>Enable Follow Up Boss</div>
            <Toggle on={fubEnabled} onChange={() => setFubEnabled(v => !v)} />
          </div>
          {fubEnabled && (
            <div>
              <label style={lbl}>FUB API Key</label>
              <input
                type="password"
                style={inp}
                value={fubApiKey}
                onChange={e => setFubApiKey(e.target.value)}
                placeholder="Leave blank to keep existing key"
                autoComplete="new-password"
              />
              <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>
                Found in FUB → Admin → API → Your Keys.
              </div>
            </div>
          )}
        </IntegrationCard>

        <IntegrationCard
          emoji="🚀"
          title="GoHighLevel"
          description="Inject the GHL chat widget and tracking into your site."
          active={integrations.ghl_enabled}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: ghlEnabled ? 14 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>Enable GoHighLevel</div>
            <Toggle on={ghlEnabled} onChange={() => setGhlEnabled(v => !v)} />
          </div>
          {ghlEnabled && (
            <div>
              <label style={lbl}>GHL Location ID</label>
              <input
                type="password"
                style={inp}
                value={ghlApiKey}
                onChange={e => setGhlApiKey(e.target.value)}
                placeholder="Leave blank to keep existing key"
                autoComplete="new-password"
              />
              <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>
                Found in GHL → Settings → Business Profile → Location ID.
              </div>
            </div>
          )}
        </IntegrationCard>

        <IntegrationCard
          emoji="🏡"
          title="Lofty CRM"
          description="Send new leads automatically into your Lofty account."
          active={integrations.lofty_enabled}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: loftyEnabled ? 14 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>Enable Lofty CRM</div>
            <Toggle on={loftyEnabled} onChange={() => setLoftyEnabled(v => !v)} />
          </div>
          {loftyEnabled && (
            <div>
              <label style={lbl}>Lofty API Key</label>
              <input
                type="password"
                style={inp}
                value={loftyApiKey}
                onChange={e => setLoftyApiKey(e.target.value)}
                placeholder="Leave blank to keep existing key"
                autoComplete="new-password"
              />
              <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>
                Found in Lofty → Settings → Integrations → API Key.
              </div>
            </div>
          )}
        </IntegrationCard>

        <div style={{ paddingTop: 8 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '9px 20px', background: saved ? P.success : P.primary,
              color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600,
              cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
              opacity: saving ? 0.7 : 1, transition: 'background 0.2s',
            }}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Integrations'}
          </button>
        </div>
      </div>
    </>
  )
}
