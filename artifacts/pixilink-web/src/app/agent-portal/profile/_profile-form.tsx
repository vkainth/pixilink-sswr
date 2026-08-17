'use client'

import { useState } from 'react'
import type { AgentPortalProfile } from '@/lib/agent-portal-api'

const P = {
  primary: '#23a9e1', primaryLight: '#e0f2fe',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', success: '#22c55e', successLight: '#dcfce7',
  warning: '#f59e0b', error: '#ef4444',
}

interface Props {
  agentId: number
  profile: AgentPortalProfile | null
}

export default function ProfileForm({ agentId, profile }: Props) {
  const [form, setForm] = useState({
    name: profile?.name ?? '',
    title: profile?.title ?? '',
    brokerage: profile?.brokerage ?? '',
    phone: profile?.phone ?? '',
    bio: profile?.bio ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: `1px solid ${P.border}`,
    borderRadius: 7, fontSize: 13, color: P.text, boxSizing: 'border-box',
    background: P.white, outline: 'none', fontFamily: 'inherit',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: P.muted,
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5,
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/agent-portal/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, ...form }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Save failed. Please try again.')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Profile & Branding</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>Changes appear on your public site within 5 minutes.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {error && <span style={{ fontSize: 12, color: P.error }}>{error}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 18px',
              background: saving ? '#7ab3e0' : saved ? P.success : P.primary,
              color: '#fff', border: 'none', borderRadius: 7,
              fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 720 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Contact info */}
          <div style={{ background: P.white, borderRadius: 12, padding: '20px', border: `1px solid ${P.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: P.text, marginBottom: 14 }}>Contact Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Full Name</label>
                <input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Title / Role</label>
                <input style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. REALTOR®" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Brokerage</label>
                <input style={inp} value={form.brokerage} onChange={e => setForm(f => ({ ...f, brokerage: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Phone</label>
                <input style={inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="604-xxx-xxxx" />
              </div>
              <div>
                <label style={lbl}>Email</label>
                <input style={{ ...inp, background: P.bg, color: P.muted }} value={profile?.email ?? ''} readOnly />
                <div style={{ fontSize: 10, color: P.muted, marginTop: 3 }}>Contact admin to change email</div>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div style={{ background: P.white, borderRadius: 12, padding: '20px', border: `1px solid ${P.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: P.text, marginBottom: 4 }}>Bio</div>
            <div style={{ fontSize: 12, color: P.muted, marginBottom: 12 }}>Appears on your About page and homepage intro.</div>
            <label style={lbl}>Public Bio</label>
            <textarea
              rows={5}
              style={{ ...inp, resize: 'vertical' }}
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Write a short bio for your public profile…"
            />
            <div style={{ fontSize: 11, color: form.bio.length > 380 ? P.warning : P.muted, marginTop: 4 }}>
              {form.bio.length} characters
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
