'use client'

import { useState } from 'react'
import type { AdminAgent } from '@/lib/admin-api'
import { apiPath } from '@/lib/admin-api-path'

const P = {
  primary: '#23a9e1', primaryLight: '#e0f2fe',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', success: '#22c55e', successLight: '#dcfce7',
  warning: '#f59e0b', warningLight: '#fffbeb',
}

const FEATURES = [
  { key: 'market_intelligence', label: 'Market Intelligence', desc: 'Market report and stats pages in agent nav and site', icon: '📈' },
  { key: 'school_catchments',   label: 'School Catchments',   desc: 'Auto-generated SEO pages showing school zones per building', icon: '🏫' },
  { key: 'lifestyle_seo',       label: 'Lifestyle SEO Pages', desc: 'Bedroom/type/lifestyle-based search landing pages', icon: '🏡' },
  { key: 'amenities_widget',    label: 'Amenities Widget',    desc: 'Walk score, nearby schools, transit, and parks widget', icon: '🗺' },
]

const statusColor: Record<string, { bg: string; text: string }> = {
  active:    { bg: P.successLight, text: '#166534' },
  trialing:  { bg: P.warningLight, text: '#92400e' },
  pending:   { bg: '#f1f5f9',      text: P.muted },
  inactive:  { bg: '#f1f5f9',      text: P.muted },
  suspended: { bg: '#fee2e2',      text: '#dc2626' },
}

type FlagMap = Record<number, Record<string, boolean>>
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  agents: AdminAgent[]
}

export default function FlagGrid({ agents }: Props) {
  const [flags, setFlags] = useState<FlagMap>(() => {
    const map: FlagMap = {}
    for (const a of agents) {
      map[a.id] = { ...a.features }
    }
    return map
  })
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function toggle(agentId: number, key: string) {
    setSaveState('idle')
    setFlags(f => ({ ...f, [agentId]: { ...f[agentId], [key]: !f[agentId]?.[key] } }))
  }

  async function handleSave() {
    setSaveState('saving')
    setErrorMsg(null)
    try {
      const results = await Promise.all(
        agents.map(a =>
          fetch(apiPath('/api/admin/agent-features'), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId: a.id, features: flags[a.id] ?? {} }),
          }).then(r => r.ok ? null : r.json().then(e => `Agent ${a.id}: ${JSON.stringify(e)}`))
        )
      )
      const errors = results.filter(Boolean)
      if (errors.length > 0) {
        setSaveState('error')
        setErrorMsg(errors.join('; '))
      } else {
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 3000)
      }
    } catch (e) {
      setSaveState('error')
      setErrorMsg(String(e))
    }
  }

  return (
    <div>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Feature Flags</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>Control which optional features are enabled per agent. Changes take effect after saving.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveState === 'saving'}
          style={{
            padding: '8px 18px',
            background: saveState === 'saved' ? P.success : saveState === 'error' ? '#dc2626' : P.primary,
            color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600,
            cursor: saveState === 'saving' ? 'default' : 'pointer', fontFamily: 'inherit',
            opacity: saveState === 'saving' ? 0.7 : 1,
          }}
        >
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved!' : saveState === 'error' ? '✗ Error' : 'Save Changes'}
        </button>
      </div>

      <div style={{ padding: '20px 32px' }}>
        {errorMsg && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fee2e2', borderRadius: 8, fontSize: 12, color: '#dc2626' }}>
            Save failed: {errorMsg}
          </div>
        )}

        <div style={{ background: P.white, borderRadius: 10, border: `1px solid ${P.border}`, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {FEATURES.map(f => (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: P.text }}>{f.label}</div>
                <div style={{ fontSize: 11, color: P.muted }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: P.bg }}>
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: P.muted, borderBottom: `1px solid ${P.border}` }}>Agent</th>
                {FEATURES.map(f => (
                  <th key={f.key} style={{ padding: '12px 14px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: P.muted, borderBottom: `1px solid ${P.border}` }}>
                    <div>{f.icon}</div>
                    <div style={{ fontSize: 10, marginTop: 2, maxWidth: 100 }}>{f.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((a, ai) => {
                const sc = statusColor[a.status] ?? statusColor.pending
                return (
                  <tr key={a.id} style={{ borderBottom: ai < agents.length - 1 ? `1px solid ${P.border}` : 'none' }}>
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: P.text, marginBottom: 4 }}>{a.name}</div>
                      <span style={{ background: sc.bg, color: sc.text, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{a.status}</span>
                    </td>
                    {FEATURES.map(f => {
                      const enabled = flags[a.id]?.[f.key] ?? false
                      return (
                        <td key={f.key} style={{ padding: '16px 14px', textAlign: 'center' }}>
                          <div
                            onClick={() => toggle(a.id, f.key)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', width: 44, height: 24,
                              borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s',
                              padding: '0 3px', justifyContent: enabled ? 'flex-end' : 'flex-start',
                              background: enabled ? P.primary : P.border,
                            }}
                          >
                            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                          </div>
                          <div style={{ fontSize: 10, color: enabled ? P.success : P.muted, marginTop: 4, fontWeight: 600 }}>
                            {enabled ? 'ON' : 'OFF'}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {agents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: P.muted, fontSize: 14 }}>
            No agents found.
          </div>
        )}

        <div style={{ marginTop: 14, padding: '12px 16px', background: P.warningLight, borderRadius: 8, fontSize: 12, color: '#92400e' }}>
          ⚠️ <strong>market_intelligence</strong> gates the Market Reports and Market Stats nav links and pages. All other flags are saved but not yet wired to pages.
        </div>
      </div>
    </div>
  )
}
