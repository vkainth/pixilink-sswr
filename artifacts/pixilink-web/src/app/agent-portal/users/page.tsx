'use client'

import { useState } from 'react'

const P = {
  primary: '#23a9e1', primaryLight: '#e0f2fe',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', success: '#22c55e', successLight: '#dcfce7',
  error: '#ef4444', errorLight: '#fef2f2',
}

interface PortalUser { id: number; name: string; email: string; role: 'owner' | 'editor' | 'viewer'; lastLogin: string; status: 'active' | 'pending' }

const INITIAL: PortalUser[] = [
  { id: 1, name: 'Randy Dyck', email: 'randy@randydyck.com', role: 'owner', lastLogin: 'Today, 9:14am', status: 'active' },
  { id: 2, name: 'Hani Faraj', email: 'hani@randydyck.com', role: 'editor', lastLogin: 'May 26, 2:30pm', status: 'active' },
  { id: 3, name: 'Sandra Lee', email: 'sandra@randydyck.com', role: 'viewer', lastLogin: 'Pending invite', status: 'pending' },
]

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', editor: 'Editor', viewer: 'Viewer',
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  owner: { bg: P.primaryLight, text: P.primary },
  editor: { bg: '#f0fdf4', text: '#166534' },
  viewer: { bg: '#f1f5f9', text: P.muted },
}

export default function AgentPortalUsersPage() {
  const [users, setUsers] = useState<PortalUser[]>(INITIAL)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null)

  function sendInvite() {
    if (!inviteEmail.trim()) return
    const newUser: PortalUser = { id: Date.now(), name: inviteEmail.split('@')[0], email: inviteEmail, role: inviteRole, lastLogin: 'Pending invite', status: 'pending' }
    setUsers(u => [...u, newUser])
    setInviteEmail('')
    setShowInvite(false)
  }

  function removeUser(id: number) { setUsers(u => u.filter(x => x.id !== id)); setConfirmRemove(null) }

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: `1px solid ${P.border}`, borderRadius: 7, fontSize: 13, color: P.text, boxSizing: 'border-box', background: P.white, fontFamily: 'inherit', outline: 'none' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: P.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }

  return (
    <>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Portal Users</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>Manage who has access to this agent portal.</p>
        </div>
        <button onClick={() => setShowInvite(true)} style={{ padding: '8px 18px', background: P.primary, color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Invite User</button>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {/* Roles legend */}
        <div style={{ background: P.white, borderRadius: 10, border: `1px solid ${P.border}`, padding: '14px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: P.text, marginBottom: 10 }}>Access Levels</div>
          <div style={{ display: 'flex', gap: 28 }}>
            {[
              ['Owner', 'Full access — can manage all portal settings, users, and billing'],
              ['Editor', 'Can update profile, listings, team, and leads'],
              ['Viewer', 'Read-only access to dashboard and leads'],
            ].map(([role, desc]) => (
              <div key={role} style={{ flex: 1 }}>
                <span style={{ ...ROLE_COLORS[role.toLowerCase()], padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, ...{ background: ROLE_COLORS[role.toLowerCase()].bg, color: ROLE_COLORS[role.toLowerCase()].text } }}>{role}</span>
                <div style={{ fontSize: 11, color: P.muted, marginTop: 5, lineHeight: 1.4 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Users table */}
        <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: P.bg }}>
                {['Name', 'Email', 'Role', 'Last Login', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: P.muted, borderBottom: `1px solid ${P.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const rc = ROLE_COLORS[u.role]
                return (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? `1px solid ${P.border}` : 'none' }}>
                    <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 600, color: P.text }}>{u.name}</td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: P.primary }}>{u.email}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ background: rc.bg, color: rc.text, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{ROLE_LABELS[u.role]}</span>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 12, color: P.muted }}>{u.lastLogin}</td>
                    <td style={{ padding: '13px 16px' }}>
                      {u.status === 'active'
                        ? <span style={{ background: '#f0fdf4', color: '#166534', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>✓ Active</span>
                        : <span style={{ background: '#fffbeb', color: '#92400e', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>⏳ Pending</span>}
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                      {u.role !== 'owner' && (
                        <button onClick={() => setConfirmRemove(u.id)} style={{ padding: '5px 10px', background: P.errorLight, color: P.error, border: 'none', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Remove</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: P.white, borderRadius: 14, width: 460, padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: P.text }}>Invite Portal User</div>
              <button onClick={() => setShowInvite(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: P.muted }}>✕</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Email Address</label>
              <input type="email" style={inp} value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@example.com" />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={lbl}>Access Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'editor' | 'viewer')}
                style={{ ...inp }}>
                <option value="editor">Editor — can update profile, listings, team, leads</option>
                <option value="viewer">Viewer — read-only access</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowInvite(false)} style={{ padding: '8px 16px', background: P.white, border: `1px solid ${P.border}`, borderRadius: 7, fontSize: 12, fontWeight: 600, color: P.text, cursor: 'pointer' }}>Cancel</button>
              <button onClick={sendInvite} disabled={!inviteEmail.trim()} style={{ padding: '8px 18px', background: inviteEmail.trim() ? P.primary : '#7ab3e0', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: inviteEmail.trim() ? 'pointer' : 'not-allowed' }}>Send Invite</button>
            </div>
          </div>
        </div>
      )}

      {/* Remove confirm */}
      {confirmRemove !== null && (() => {
        const u = users.find(x => x.id === confirmRemove)!
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: P.white, borderRadius: 12, width: 380, padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: P.error, marginBottom: 8 }}>Remove {u.name}?</div>
              <div style={{ fontSize: 13, color: P.muted, marginBottom: 20 }}>They will lose access to this portal immediately.</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmRemove(null)} style={{ padding: '8px 16px', background: P.white, border: `1px solid ${P.border}`, borderRadius: 7, fontSize: 12, fontWeight: 600, color: P.text, cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => removeUser(u.id)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, background: P.error, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer' }}>Remove</button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
