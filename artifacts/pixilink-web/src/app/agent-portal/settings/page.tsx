'use client'

import { useState } from 'react'

const P = {
  primary: '#23a9e1', primaryLight: '#e0f2fe',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', success: '#22c55e', successLight: '#dcfce7',
  warning: '#f59e0b', warningLight: '#fffbeb',
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{ width: 40, height: 22, borderRadius: 11, background: on ? P.primary : '#cbd5e1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 22px', borderBottom: `1px solid ${P.border}`, fontSize: 13, fontWeight: 700, color: P.text }}>{title}</div>
      <div style={{ padding: '20px 22px' }}>{children}</div>
    </div>
  )
}

export default function AgentPortalSettingsPage() {
  const [notifEmail, setNotifEmail] = useState('randy@randydyck.com')
  const [notifPhone, setNotifPhone] = useState('604-807-4366')
  const [emailW1, setEmailW1] = useState(true)
  const [emailW2, setEmailW2] = useState(true)
  const [emailW3, setEmailW3] = useState(true)
  const [smsW1, setSmsW1] = useState(true)
  const [smsW2, setSmsW2] = useState(false)
  const [saved, setSaved] = useState(false)

  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: `1px solid ${P.border}`, borderRadius: 7, fontSize: 13, color: P.text, boxSizing: 'border-box', background: P.white, outline: 'none', fontFamily: 'inherit' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: P.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }

  function ToggleRow({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: () => void }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${P.border}` }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{label}</div>
          {desc && <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>{desc}</div>}
        </div>
        <Toggle on={value} onChange={onChange} />
      </div>
    )
  }

  return (
    <>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Settings</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>Lead notification preferences and site configuration.</p>
        </div>
        <button onClick={save} style={{ padding: '8px 18px', background: saved ? P.success : P.primary, color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 720 }}>
        <Section title="Lead Notifications">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div>
              <label style={lbl}>Notification Email</label>
              <input type="email" style={inp} value={notifEmail} onChange={e => setNotifEmail(e.target.value)} />
              <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>Lead emails and alerts go here</div>
            </div>
            <div>
              <label style={lbl}>Notification Phone (SMS)</label>
              <input style={inp} value={notifPhone} onChange={e => setNotifPhone(e.target.value)} />
              <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>For SMS lead alerts (if enabled)</div>
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: P.text, marginBottom: 8 }}>Email Notifications</div>
          <ToggleRow label="W1 Showing Requests" desc="Email me when someone requests a showing" value={emailW1} onChange={() => setEmailW1(v => !v)} />
          <ToggleRow label="W2 Home Evaluation Requests" desc="Email me on home eval inquiries" value={emailW2} onChange={() => setEmailW2(v => !v)} />
          <ToggleRow label="W3 Pre-Qualification Inquiries" desc="Email me on mortgage pre-qual forms" value={emailW3} onChange={() => setEmailW3(v => !v)} />
          <div style={{ fontSize: 12, fontWeight: 700, color: P.text, marginTop: 18, marginBottom: 8 }}>SMS Notifications</div>
          <ToggleRow label="W1 Showing Requests → SMS" desc="Instant text alert on showing requests" value={smsW1} onChange={() => setSmsW1(v => !v)} />
          <ToggleRow label="W2 Home Eval → SMS" value={smsW2} onChange={() => setSmsW2(v => !v)} />
        </Section>

        <Section title="Site Domain">
          <div>
            <label style={lbl}>Custom Domain</label>
            <input style={inp} value="randydyck.com" readOnly />
            <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>Domain changes must be made by a Pixilink admin. Contact <a href="mailto:support@pixilink.ca" style={{ color: P.primary }}>support@pixilink.ca</a>.</div>
          </div>
          <div style={{ marginTop: 14, padding: '12px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 12, color: '#166534' }}>
            ✓ Domain is active and pointing correctly
          </div>
        </Section>

        <Section title="Password">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={lbl}>New Password</label>
              <input type="password" style={inp} placeholder="Enter new password" />
            </div>
            <div>
              <label style={lbl}>Confirm Password</label>
              <input type="password" style={inp} placeholder="Confirm new password" />
            </div>
          </div>
          <button style={{ marginTop: 12, padding: '8px 16px', background: P.bg, border: `1px solid ${P.border}`, borderRadius: 7, fontSize: 12, fontWeight: 600, color: P.text, cursor: 'pointer' }}>Update Password</button>
        </Section>
      </div>
    </>
  )
}
