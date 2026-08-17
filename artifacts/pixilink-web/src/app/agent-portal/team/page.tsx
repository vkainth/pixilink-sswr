'use client'

import { useState } from 'react'

const P = {
  primary: '#23a9e1', primaryLight: '#e0f2fe',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', success: '#22c55e', successLight: '#dcfce7',
  warning: '#f59e0b', warningLight: '#fffbeb',
  error: '#ef4444', errorLight: '#fef2f2',
}

interface Member { id: number; name: string; title: string; brokerage: string; mlsId: string; email: string; phone: string; bio: string; status: 'active' | 'paused'; initials: string }

const INITIAL: Member[] = [
  { id: 1, name: 'Hani Faraj', title: 'REALTOR®', brokerage: 'RE/MAX Crest Realty', mlsId: 'FFARHA', email: 'hani@randydyck.com', phone: '604-555-0182', bio: 'Hani specializes in South Surrey and White Rock condos, with 8 years helping buyers find the perfect home.', status: 'active', initials: 'HF' },
  { id: 2, name: 'Sandra Lee', title: "Buyer's Agent", brokerage: 'RE/MAX Crest Realty', mlsId: 'FLEESA', email: 'sandra@randydyck.com', phone: '604-555-0231', bio: 'Sandra focuses on first-time buyers and investment properties throughout the Fraser Valley.', status: 'active', initials: 'SL' },
  { id: 3, name: 'Mike Torres', title: 'Listing Specialist', brokerage: 'RE/MAX Crest Realty', mlsId: 'FTORMI', email: 'mike@randydyck.com', phone: '604-555-0319', bio: 'Mike brings 12 years of listing expertise with a track record of selling homes above asking price.', status: 'paused', initials: 'MT' },
]

const EMPTY = { name: '', title: 'REALTOR®', brokerage: 'RE/MAX Crest Realty', mlsId: '', email: '', phone: '', bio: '' }

export default function AgentPortalTeamPage() {
  const [members, setMembers] = useState<Member[]>(INITIAL)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null)

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: `1px solid ${P.border}`, borderRadius: 7, fontSize: 13, color: P.text, boxSizing: 'border-box', background: P.white, fontFamily: 'inherit', outline: 'none' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: P.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }

  function openAdd() { setEditingId(null); setForm(EMPTY); setShowModal(true) }
  function openEdit(m: Member) { setEditingId(m.id); setForm({ name: m.name, title: m.title, brokerage: m.brokerage, mlsId: m.mlsId, email: m.email, phone: m.phone, bio: m.bio }); setShowModal(true) }
  function togglePause(id: number) { setMembers(ms => ms.map(m => m.id === id ? { ...m, status: m.status === 'active' ? 'paused' : 'active' } : m)) }
  function removeMember(id: number) { setMembers(ms => ms.filter(m => m.id !== id)); setConfirmRemove(null) }

  function saveModal() {
    if (editingId !== null) {
      setMembers(ms => ms.map(m => m.id === editingId ? { ...m, ...form } : m))
    } else {
      const initials = form.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
      setMembers(ms => [...ms, { id: Date.now(), ...form, status: 'active', initials }])
    }
    setShowModal(false)
  }

  const active = members.filter(m => m.status === 'active').length
  const paused = members.filter(m => m.status === 'paused').length

  return (
    <>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>My Team</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>Manage who appears on your public team page.</p>
        </div>
        <button onClick={openAdd} style={{ padding: '8px 18px', background: P.primary, color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add Team Member</button>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {/* Stats strip */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          {[['Active Members', active, P.success], ['Paused', paused, P.warning], ['Team Page', 'Live ✓', P.primary]].map(([label, val, color]) => (
            <div key={String(label)} style={{ background: P.white, borderRadius: 10, padding: '14px 20px', border: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: String(color) }}>{val}</div>
              <div style={{ fontSize: 12, color: P.muted, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 20px', fontSize: 12, color: '#78350f', display: 'flex', alignItems: 'center', gap: 8 }}>
            📸 Photos are resized to 400×400 px on upload.
          </div>
        </div>

        {/* Member list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {members.map(m => (
            <div key={m.id} style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 18, opacity: m.status === 'paused' ? 0.75 : 1 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: m.status === 'paused' ? P.border : P.primaryLight, border: `3px solid ${m.status === 'paused' ? P.border : P.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: m.status === 'paused' ? P.muted : P.primary, flexShrink: 0 }}>
                {m.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: P.text }}>{m.name}</div>
                  <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: m.status === 'active' ? '#f0fdf4' : '#fffbeb', color: m.status === 'active' ? '#166534' : '#92400e' }}>
                    {m.status === 'active' ? '✓ Active' : '⏸ Paused'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: P.muted, marginBottom: 6 }}>{m.title} · {m.brokerage}{m.mlsId ? ` · MLS: ${m.mlsId}` : ''}</div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: P.muted }}>
                  <span>✉ {m.email}</span>
                  <span>📞 {m.phone}</span>
                </div>
                {m.bio && <div style={{ fontSize: 12, color: P.muted, marginTop: 6, lineHeight: 1.5, maxWidth: 600 }}>{m.bio.slice(0, 100)}{m.bio.length > 100 ? '…' : ''}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => openEdit(m)} style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: P.bg, border: `1px solid ${P.border}`, borderRadius: 7, cursor: 'pointer', color: P.text }}>✎ Edit</button>
                <button onClick={() => togglePause(m.id)} style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: m.status === 'active' ? '#fffbeb' : '#f0fdf4', border: `1px solid ${m.status === 'active' ? '#fde68a' : '#86efac'}`, borderRadius: 7, cursor: 'pointer', color: m.status === 'active' ? '#92400e' : '#166534' }}>
                  {m.status === 'active' ? '⏸ Pause' : '▶ Restore'}
                </button>
                <button onClick={() => setConfirmRemove(m.id)} style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: P.errorLight, border: '1px solid #fca5a5', borderRadius: 7, cursor: 'pointer', color: P.error }}>✕</button>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: P.muted }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>No team members yet</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Add your first team member to activate your public team page.</div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: P.white, borderRadius: 14, width: 620, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '22px 28px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: P.text }}>{editingId ? 'Edit Team Member' : 'Add Team Member'}</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: P.muted }}>✕</button>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                {([['Full Name', 'name'], ['Title / Role', 'title'], ['Brokerage', 'brokerage'], ['MLS Agent ID', 'mlsId'], ['Email', 'email'], ['Phone', 'phone']] as const).map(([label, key]) => (
                  <div key={key}>
                    <label style={lbl}>{label}</label>
                    <input style={inp} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={label} />
                  </div>
                ))}
              </div>
              <div>
                <label style={lbl}>Bio</label>
                <textarea style={{ ...inp, height: 80, resize: 'vertical' }} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Short bio shown on the team page (2–3 sentences)" />
              </div>
            </div>
            <div style={{ padding: '16px 28px', borderTop: `1px solid ${P.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: P.white, border: `1px solid ${P.border}`, borderRadius: 7, fontSize: 12, fontWeight: 600, color: P.text, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveModal} style={{ padding: '8px 16px', background: P.primary, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{editingId ? 'Save Changes' : 'Add to Team'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Remove confirm */}
      {confirmRemove !== null && (() => {
        const m = members.find(x => x.id === confirmRemove)!
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: P.white, borderRadius: 12, width: 420, padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: P.error, marginBottom: 8 }}>Remove {m.name}?</div>
              <div style={{ fontSize: 13, color: P.muted, marginBottom: 20, lineHeight: 1.6 }}>This permanently removes them from your team roster.</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmRemove(null)} style={{ padding: '8px 16px', background: P.white, border: `1px solid ${P.border}`, borderRadius: 7, fontSize: 12, fontWeight: 600, color: P.text, cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => removeMember(m.id)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, background: P.error, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer' }}>Remove</button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
