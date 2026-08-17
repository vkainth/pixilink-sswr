'use client'

import { useState } from 'react'
import { apiPath } from '@/lib/admin-api-path'

const P = {
  primary: '#23a9e1', primaryLight: '#e0f2fe',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', success: '#22c55e', successLight: '#dcfce7',
  warning: '#f59e0b', warningLight: '#fffbeb',
  error: '#ef4444',
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 13px', border: `1px solid ${P.border}`,
  borderRadius: 7, fontSize: 13, color: P.text, background: P.white,
  boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: P.muted,
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4,
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'inline-flex', alignItems: 'center', width: 44, height: 24,
        borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s',
        padding: '0 3px', justifyContent: on ? 'flex-end' : 'flex-start',
        background: on ? P.primary : P.border,
      }}
    >
      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
  )
}

interface Props {
  agentId: number
  agentName: string
  initialGa4Id: string
  initialFbPixelId: string
  initialFubEnabled: boolean
  initialGhlEnabled: boolean
  initialGhlApiKeySet: boolean
  initialGhlLocationIdSet: boolean
  initialLoftyEnabled: boolean
  initialLoftyApiKeySet: boolean
}

export default function AgentIntegrationsClient({
  agentId, agentName,
  initialGa4Id, initialFbPixelId,
  initialFubEnabled, initialGhlEnabled, initialGhlApiKeySet, initialGhlLocationIdSet,
  initialLoftyEnabled, initialLoftyApiKeySet,
}: Props) {
  const [ga4Id, setGa4Id] = useState(initialGa4Id)
  const [fbPixelId, setFbPixelId] = useState(initialFbPixelId)

  const [fubEnabled, setFubEnabled] = useState(initialFubEnabled)
  const [fubApiKey, setFubApiKey] = useState('')
  const [fubApiKeySet, setFubApiKeySet] = useState(false)

  const [ghlEnabled, setGhlEnabled] = useState(initialGhlEnabled)
  const [ghlApiKey, setGhlApiKey] = useState('')
  const [ghlLocationId, setGhlLocationId] = useState('')
  const [ghlApiKeySet, setGhlApiKeySet] = useState(initialGhlApiKeySet)
  const [ghlLocationIdSet, setGhlLocationIdSet] = useState(initialGhlLocationIdSet)

  const [loftyEnabled, setLoftyEnabled] = useState(initialLoftyEnabled)
  const [loftyApiKey, setLoftyApiKey] = useState('')
  const [loftyApiKeySet, setLoftyApiKeySet] = useState(initialLoftyApiKeySet)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [testingGhl, setTestingGhl] = useState(false)
  const [ghlTestResult, setGhlTestResult] = useState<{ ok: boolean; status?: number; body?: unknown; reason?: string } | null>(null)

  async function handleTestGhl() {
    setTestingGhl(true)
    setGhlTestResult(null)
    try {
      const res = await fetch(apiPath(`/api/admin/agents/${agentId}/test-ghl`), { method: 'POST' })
      const data = await res.json().catch(() => ({ ok: false, reason: 'invalid_response' }))
      setGhlTestResult(data)
    } catch {
      setGhlTestResult({ ok: false, reason: 'network_error' })
    } finally {
      setTestingGhl(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(apiPath(`/api/admin/agents/${agentId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ga4_id: ga4Id || null,
          fb_pixel_id: fbPixelId || null,
          fub_enabled: fubEnabled,
          fub_api_key: fubApiKey || undefined,
          ghl_enabled: ghlEnabled,
          ghl_api_key: ghlApiKey || undefined,
          ghl_location_id: ghlLocationId || undefined,
          lofty_enabled: loftyEnabled,
          lofty_api_key: loftyApiKey || undefined,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        if (ghlApiKey)   { setGhlApiKeySet(true);   setGhlApiKey('') }
        if (ghlLocationId) { setGhlLocationIdSet(true); setGhlLocationId('') }
        if (fubApiKey)   { setFubApiKeySet(true);   setFubApiKey('') }
        if (loftyApiKey) { setLoftyApiKeySet(true); setLoftyApiKey('') }
      } else {
        const data = await res.json().catch(() => ({}))
        setError((data as Record<string, string>).error || 'Save failed')
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Integrations</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>Analytics and CRM connections for {agentName}&apos;s site.</p>
      </div>

      <div style={{ padding: '24px 32px 60px' }}>
        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fee2e2', borderRadius: 8, fontSize: 12, color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* Analytics */}
        <div style={{ fontSize: 11, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Analytics</div>
        <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📊</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: P.text }}>Google Analytics 4</div>
              <div style={{ fontSize: 12, color: P.muted }}>Per-agent GA4 property override. If empty, the platform default is used.</div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${P.border}`, padding: '20px 24px', background: '#fafcff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={lbl}>GA4 Measurement ID</label>
                <input style={inp} value={ga4Id} onChange={e => setGa4Id(e.target.value)} placeholder="G-XXXXXXXXXX" />
              </div>
              <div>
                <label style={lbl}>Facebook Pixel ID</label>
                <input style={inp} value={fbPixelId} onChange={e => setFbPixelId(e.target.value)} placeholder="123456789012345" />
              </div>
            </div>
          </div>
        </div>

        {/* CRM */}
        <div style={{ fontSize: 11, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, marginTop: 28 }}>CRM & Lead Routing</div>

        {/* Follow Up Boss */}
        <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🏹</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: P.text }}>Follow Up Boss</div>
              <div style={{ fontSize: 12, color: P.muted }}>Route leads from this agent&apos;s site directly into FUB.</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <Toggle on={fubEnabled} onToggle={() => setFubEnabled(v => !v)} />
            </div>
          </div>
          {fubEnabled && (
            <div style={{ borderTop: `1px solid ${P.border}`, padding: '20px 24px', background: '#fafcff' }}>
              <label style={lbl}>FUB API Key</label>
              <input
                type="password"
                style={inp}
                value={fubApiKey}
                onChange={e => setFubApiKey(e.target.value)}
                placeholder={fubApiKeySet ? 'Leave blank to keep existing key' : 'Paste FUB API key'}
              />
              {fubApiKeySet && !fubApiKey && (
                <div style={{ fontSize: 11, color: '#15803d', marginTop: 4 }}>✓ Key stored — leave blank to keep it</div>
              )}
            </div>
          )}
        </div>

        {/* GoHighLevel */}
        <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🚀</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: P.text }}>GoHighLevel</div>
              <div style={{ fontSize: 12, color: P.muted }}>Inject GHL chat widget and tracking into this agent&apos;s site.</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <Toggle on={ghlEnabled} onToggle={() => setGhlEnabled(v => !v)} />
            </div>
          </div>
          {ghlEnabled && (
            <div style={{ borderTop: `1px solid ${P.border}`, padding: '20px 24px', background: '#fafcff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={lbl}>GHL API Key</label>
                  <input
                    type="password"
                    style={inp}
                    value={ghlApiKey}
                    onChange={e => setGhlApiKey(e.target.value)}
                    placeholder={ghlApiKeySet ? 'Leave blank to keep existing key' : 'Paste GHL API key'}
                    autoComplete="new-password"
                  />
                  {ghlApiKeySet && !ghlApiKey && (
                    <div style={{ fontSize: 11, color: '#15803d', marginTop: 4 }}>✓ Key stored — leave blank to keep it</div>
                  )}
                  {!ghlApiKeySet && !ghlApiKey && (
                    <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>GHL → Settings → API Keys</div>
                  )}
                </div>
                <div>
                  <label style={lbl}>GHL Location ID</label>
                  <input
                    style={inp}
                    value={ghlLocationId}
                    onChange={e => setGhlLocationId(e.target.value)}
                    placeholder={ghlLocationIdSet ? 'Leave blank to keep existing ID' : 'e.g. sXtfzm19xAptl4QPr8lx'}
                    autoComplete="off"
                  />
                  {ghlLocationIdSet && !ghlLocationId && (
                    <div style={{ fontSize: 11, color: '#15803d', marginTop: 4 }}>✓ Location ID stored — leave blank to keep it</div>
                  )}
                  {!ghlLocationIdSet && !ghlLocationId && (
                    <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>GHL → Settings → Business Profile → Location ID</div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div style={{ borderTop: `1px solid ${P.border}`, padding: '14px 24px', background: '#fafcff', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              onClick={handleTestGhl}
              disabled={!ghlEnabled || (!ghlApiKeySet && !ghlApiKey) || testingGhl}
              title={!ghlEnabled || (!ghlApiKeySet && !ghlApiKey) ? 'GHL not configured' : undefined}
              style={{
                padding: '7px 16px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                border: `1px solid ${ghlEnabled && (ghlApiKeySet || ghlApiKey) ? P.primary : P.border}`,
                borderRadius: 7, cursor: ghlEnabled && (ghlApiKeySet || ghlApiKey) && !testingGhl ? 'pointer' : 'not-allowed',
                background: ghlEnabled && (ghlApiKeySet || ghlApiKey) ? P.primaryLight : P.bg,
                color: ghlEnabled && (ghlApiKeySet || ghlApiKey) ? P.primary : P.muted,
                opacity: testingGhl ? 0.7 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {testingGhl ? '⏳ Sending…' : ghlEnabled && (ghlApiKeySet || ghlApiKey) ? '🚀 Send test lead to GHL' : 'GHL not configured'}
            </button>
            {ghlTestResult && (
              <div style={{
                flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: 7, fontSize: 12,
                background: ghlTestResult.ok ? P.successLight : '#fee2e2',
                color: ghlTestResult.ok ? '#15803d' : '#dc2626',
                border: `1px solid ${ghlTestResult.ok ? '#86efac' : '#fca5a5'}`,
              }}>
                {ghlTestResult.ok
                  ? `✓ Success (HTTP ${ghlTestResult.status}) — contact created in GHL`
                  : ghlTestResult.reason === 'not_configured'
                    ? '✗ GHL is not configured — enable it and save an API key first'
                    : `✗ Failed (HTTP ${ghlTestResult.status ?? '—'}) — ${JSON.stringify(ghlTestResult.body ?? ghlTestResult.reason)}`
                }
              </div>
            )}
          </div>
        </div>

        {/* Lofty CRM */}
        <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🌿</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: P.text }}>Lofty CRM</div>
              <div style={{ fontSize: 12, color: P.muted }}>Route leads from this agent&apos;s site into Lofty (formerly Chime).</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <Toggle on={loftyEnabled} onToggle={() => setLoftyEnabled(v => !v)} />
            </div>
          </div>
          {loftyEnabled && (
            <div style={{ borderTop: `1px solid ${P.border}`, padding: '20px 24px', background: '#fafcff' }}>
              <label style={lbl}>Lofty API Key</label>
              <input
                type="password"
                style={inp}
                value={loftyApiKey}
                onChange={e => setLoftyApiKey(e.target.value)}
                placeholder={loftyApiKeySet ? 'Leave blank to keep existing key' : 'Paste Lofty API key'}
                autoComplete="new-password"
              />
              {loftyApiKeySet && !loftyApiKey && (
                <div style={{ fontSize: 11, color: '#15803d', marginTop: 4 }}>✓ Key stored — leave blank to keep it</div>
              )}
              {!loftyApiKeySet && !loftyApiKey && (
                <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>Lofty → Settings → API & Integrations → API Key</div>
              )}
            </div>
          )}
        </div>

        {/* Save */}
        <div style={{ paddingTop: 8 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '9px 20px',
              background: saved ? P.success : P.primary,
              color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600,
              cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>

        {/* Coming soon */}
        <div style={{ fontSize: 11, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, marginTop: 36 }}>Coming Soon</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[['⚡', 'Zapier', 'Connect leads to 5,000+ apps.'], ['💬', 'Twilio SMS', 'Instant SMS alerts on new leads.'], ['🗓', 'Calendly', 'Auto-book showings into calendar.']].map(([logo, name, desc]) => (
            <div key={name} style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 10, padding: '16px 18px', opacity: 0.7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{logo}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: P.text }}>{name}</span>
                <span style={{ background: P.bg, color: P.muted, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Soon</span>
              </div>
              <div style={{ fontSize: 12, color: P.muted }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
