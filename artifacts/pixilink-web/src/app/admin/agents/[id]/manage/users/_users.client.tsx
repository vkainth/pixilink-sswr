'use client'

import { useState } from 'react'
import type { AgentUsersResponse, AgentSiteUser } from '@/lib/admin-api'

const P = {
  primary: '#23a9e1', primaryLight: '#e0f2fe',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', success: '#22c55e', successLight: '#dcfce7',
  purple: '#7c3aed', purpleLight: '#ede9fe',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })
}

function VerifiedBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700,
      background: ok ? P.successLight : P.bg,
      color: ok ? '#166534' : P.muted,
      border: `1px solid ${ok ? '#bbf7d0' : P.border}`,
      whiteSpace: 'nowrap',
    }}>
      {ok ? '✓' : '·'} {label}
    </span>
  )
}

function exportCsv(users: AgentSiteUser[], agentName: string) {
  const rows = [
    ['ID', 'Name', 'Email', 'Phone', 'Email Verified', 'Phone Verified', 'Auth Method', 'Registered'],
    ...users.map(u => [
      u.id,
      u.name || '—',
      u.email,
      u.phone || '',
      u.email_verified ? 'Yes' : 'No',
      u.phone_verified ? 'Yes' : 'No',
      u.google_linked ? 'Google' : 'Email',
      formatDate(u.created_at),
    ]),
  ]
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `users-${agentName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  data: AgentUsersResponse
}

export default function AgentUsersClient({ data }: Props) {
  const { users, agent_name } = data

  const [authFilter, setAuthFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = users
    .filter(u => {
      if (authFilter === 'google') return u.google_linked
      if (authFilter === 'email') return !u.google_linked
      return true
    })
    .filter(u => {
      if (!search) return true
      const q = search.toLowerCase()
      return [u.name, u.email, u.phone].some(v => v?.toLowerCase().includes(q))
    })

  return (
    <>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={{ background: P.white, borderRadius: 10, padding: '16px 18px', border: `1px solid ${P.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Total Users</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: P.primary }}>{users.length}</div>
        </div>
        <div style={{ background: P.white, borderRadius: 10, padding: '16px 18px', border: `1px solid ${P.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Email Verified</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: P.success }}>{users.filter(u => u.email_verified).length}</div>
        </div>
        <div style={{ background: P.white, borderRadius: 10, padding: '16px 18px', border: `1px solid ${P.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Google Auth</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: P.purple }}>{users.filter(u => u.google_linked).length}</div>
        </div>
        <div style={{ background: P.white, borderRadius: 10, padding: '16px 18px', border: `1px solid ${P.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Phone Verified</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: P.success }}>{users.filter(u => u.phone_verified).length}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, overflow: 'hidden' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'email', label: 'Email' },
            { key: 'google', label: 'Google' },
          ].map(t => (
            <button key={t.key} onClick={() => setAuthFilter(t.key)} style={{
              padding: '7px 14px', border: 'none',
              background: authFilter === t.key ? P.primary : 'transparent',
              color: authFilter === t.key ? '#fff' : P.muted,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              borderRight: `1px solid ${P.border}`,
            }}>
              {t.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, phone…"
          style={{ padding: '7px 14px', border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 13, width: 220, outline: 'none', fontFamily: 'inherit', color: P.text }}
        />
        <button
          onClick={() => exportCsv(filtered, agent_name)}
          style={{ padding: '7px 14px', background: P.white, border: `1px solid ${P.border}`, borderRadius: 7, fontSize: 12, fontWeight: 600, color: P.text, cursor: 'pointer', marginLeft: 'auto' }}
        >
          ⬇ Export CSV
        </button>
        <span style={{ fontSize: 12, color: P.muted }}>
          {filtered.length} of {users.length} users
        </span>
      </div>

      {/* Table */}
      <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: P.bg }}>
              {['Registered', 'Name', 'Email', 'Phone', 'Status', 'Auth'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: P.muted, borderBottom: `1px solid ${P.border}`, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: P.muted, fontSize: 14 }}>
                  {users.length === 0
                    ? 'No users have registered on this agent site yet.'
                    : 'No users match the current filters.'}
                </td>
              </tr>
            ) : filtered.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${P.border}` : 'none' }}>
                <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 11, color: P.muted }}>{formatDate(u.created_at)}</span>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: P.text }}>{u.name || '—'}</span>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <a href={`mailto:${u.email}`} style={{ fontSize: 12, color: P.primary }}>{u.email}</a>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: 12, color: P.muted }}>{u.phone || '—'}</span>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <VerifiedBadge ok={u.email_verified} label="Email" />
                    <VerifiedBadge ok={u.phone_verified} label="Phone" />
                  </div>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: u.google_linked ? P.purpleLight : P.primaryLight,
                    color: u.google_linked ? P.purple : P.primary,
                    border: `1px solid ${u.google_linked ? '#ddd6fe' : '#bae6fd'}`,
                  }}>
                    {u.google_linked ? 'Google' : 'Email'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
