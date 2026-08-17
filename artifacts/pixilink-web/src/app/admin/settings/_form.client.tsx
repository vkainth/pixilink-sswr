'use client'

import { useState } from 'react'
import { apiPath } from '@/lib/admin-api-path'

interface Props {
  initialGlobalNoindex: boolean
}

export default function PlatformSettingsForm({ initialGlobalNoindex }: Props) {
  const [globalNoindex, setGlobalNoindex] = useState(initialGlobalNoindex)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(apiPath('/api/admin/platform-settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ global_noindex: globalNoindex }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Platform settings saved.' })
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error — please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section style={{
      background: '#fff', borderRadius: 8, border: '1px solid #dfe1e6',
    }}>
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid #f4f5f7',
        fontSize: 13, fontWeight: 600, color: '#172b4d',
      }}>
        Search Engine Indexing
      </div>
      <div style={{ padding: 20 }}>
        {message && (
          <div style={{
            background: message.type === 'success' ? '#e3fcef' : '#ffebe6',
            color: message.type === 'success' ? '#006644' : '#bf2600',
            padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13,
          }}>
            {message.text}
          </div>
        )}

        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          cursor: 'pointer', marginBottom: 20,
        }}>
          <div style={{ position: 'relative', flexShrink: 0, marginTop: 2 }}>
            <input
              type="checkbox"
              checked={globalNoindex}
              onChange={(e) => setGlobalNoindex(e.target.checked)}
              style={{ display: 'none' }}
            />
            <div
              onClick={() => setGlobalNoindex((v) => !v)}
              style={{
                width: 40, height: 22, borderRadius: 11,
                background: globalNoindex ? '#dc2626' : '#cbd5e1',
                transition: 'background 0.2s', cursor: 'pointer', position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: globalNoindex ? 21 : 3,
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#172b4d', marginBottom: 3 }}>
              Block all search indexing (global noindex)
            </div>
            <div style={{ fontSize: 12, color: '#5e6c84', lineHeight: 1.5 }}>
              When enabled, adds <code style={{ background: '#f4f5f7', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace', fontSize: 11 }}>noindex, nofollow</code> to
              every page on the platform — agent sites, sign-in, admin shell, and all other routes.
              This overrides per-agent SEO noindex settings. Use as a kill switch to block all
              indexing site-wide immediately.
            </div>
            {globalNoindex && (
              <div style={{
                marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 4, padding: '4px 10px', fontSize: 11, color: '#b91c1c', fontWeight: 600,
              }}>
                ⚠ Active — entire platform is blocked from indexing
              </div>
            )}
          </div>
        </label>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: '#0052cc', color: '#fff', border: 'none', borderRadius: 5,
            padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1, fontFamily: 'inherit',
          }}
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </section>
  )
}
