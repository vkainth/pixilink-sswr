'use client'

import { useState } from 'react'
import type { AdminAgent } from '@/lib/admin-api'
import { apiPath } from '@/lib/admin-api-path'

const HERO_STYLE_OPTIONS: { value: string; label: string; desc: string }[] = [
  { value: 'split',               label: 'Split',              desc: 'Charcoal text left / portrait right — current default' },
  { value: 'fullbleed-cinematic', label: 'Full-bleed Cinematic', desc: 'Photo fills the frame; text anchored bottom-left over a dark overlay' },
  { value: 'editorial-stack',     label: 'Editorial Stack',    desc: 'Full-width photo strip on top, charcoal content band below' },
]

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

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  agent: AdminAgent
}

export default function AgentFlagGrid({ agent }: Props) {
  const [flags, setFlags] = useState<Record<string, boolean>>({ ...agent.features })
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isShowcase = agent.settings?.site_config?.layout_preset === 'showcase'
  const [heroStyle, setHeroStyle] = useState<string>(
    (agent.settings?.site_config?.showcase_hero_style as string | undefined) ?? 'split'
  )
  const [heroSaveState, setHeroSaveState] = useState<SaveState>('idle')
  const [heroErrorMsg, setHeroErrorMsg] = useState<string | null>(null)

  function toggle(key: string) {
    setSaveState('idle')
    setFlags(f => ({ ...f, [key]: !f[key] }))
  }

  async function handleHeroStyleSave() {
    setHeroSaveState('saving')
    setHeroErrorMsg(null)
    try {
      const res = await fetch(apiPath(`/api/admin/agents/${agent.id}/site-config`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showcase_hero_style: heroStyle }),
      })
      if (res.ok) {
        setHeroSaveState('saved')
        setTimeout(() => setHeroSaveState('idle'), 3000)
      } else {
        const data = await res.json().catch(() => ({}))
        setHeroSaveState('error')
        setHeroErrorMsg((data as { error?: string }).error || 'Save failed')
      }
    } catch (e) {
      setHeroSaveState('error')
      setHeroErrorMsg(String(e))
    }
  }

  async function handleSave() {
    setSaveState('saving')
    setErrorMsg(null)
    try {
      const res = await fetch(apiPath('/api/admin/agent-features'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, features: flags }),
      })
      if (res.ok) {
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 3000)
      } else {
        const data = await res.json().catch(() => ({}))
        setSaveState('error')
        setErrorMsg(data.error || 'Save failed')
      }
    } catch (e) {
      setSaveState('error')
      setErrorMsg(String(e))
    }
  }

  const statusColor = agent.status === 'active'
    ? { bg: P.successLight, text: '#166534' }
    : agent.status === 'suspended'
      ? { bg: '#fee2e2', text: '#dc2626' }
      : { bg: P.bg, text: P.muted }

  return (
    <div>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Feature Flags</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>
            Control which optional features are enabled for {agent.name}. Changes take effect after saving.
          </p>
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

        {/* Agent info strip */}
        <div style={{ background: P.white, borderRadius: 10, border: `1px solid ${P.border}`, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 36, height: 36, background: P.primary, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 16, flexShrink: 0 }}>
            {agent.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: P.text }}>{agent.name}</div>
            <span style={{ background: statusColor.bg, color: statusColor.text, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{agent.status}</span>
          </div>
          {agent.settings?.custom_domain && (
            <div style={{ marginLeft: 'auto', fontSize: 12, color: P.muted }}>
              <a href={`https://${agent.settings.custom_domain}`} target="_blank" rel="noopener" style={{ color: P.primary }}>
                {agent.settings.custom_domain} ↗
              </a>
            </div>
          )}
        </div>

        {/* Feature toggles */}
        <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
          {FEATURES.map((f, i) => {
            const enabled = flags[f.key] ?? false
            return (
              <div
                key={f.key}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 22px',
                  borderBottom: i < FEATURES.length - 1 ? `1px solid ${P.border}` : 'none',
                  background: enabled ? '#fafeff' : P.white,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{f.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: P.text, marginBottom: 3 }}>{f.label}</div>
                    <div style={{ fontSize: 12, color: P.muted }}>{f.desc}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: enabled ? P.success : P.muted }}>
                    {enabled ? 'ON' : 'OFF'}
                  </span>
                  <div
                    onClick={() => toggle(f.key)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', width: 48, height: 26,
                      borderRadius: 13, cursor: 'pointer', transition: 'background 0.2s',
                      padding: '0 3px', justifyContent: enabled ? 'flex-end' : 'flex-start',
                      background: enabled ? P.primary : P.border,
                    }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 14, padding: '12px 16px', background: P.warningLight, borderRadius: 8, fontSize: 12, color: '#92400e' }}>
          ⚠️ <strong>market_intelligence</strong> gates the Market Reports and Market Stats nav links and pages. All other flags are saved but not yet wired to pages.
        </div>

        {/* Hero Design — Showcase preset only */}
        {isShowcase && (
          <div style={{ marginTop: 28, background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: P.text }}>🎨 Hero Design</div>
                <div style={{ fontSize: 12, color: P.muted, marginTop: 2 }}>Choose the showcase homepage hero layout</div>
              </div>
              <button
                onClick={handleHeroStyleSave}
                disabled={heroSaveState === 'saving'}
                style={{
                  padding: '7px 16px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                  background: heroSaveState === 'saved' ? '#22c55e' : heroSaveState === 'error' ? '#dc2626' : P.primary,
                  color: '#fff', opacity: heroSaveState === 'saving' ? 0.7 : 1,
                }}
              >
                {heroSaveState === 'saving' ? 'Saving…' : heroSaveState === 'saved' ? '✓ Saved!' : heroSaveState === 'error' ? '✗ Error' : 'Save'}
              </button>
            </div>
            {heroErrorMsg && (
              <div style={{ padding: '10px 22px', background: '#fee2e2', fontSize: 12, color: '#dc2626' }}>
                {heroErrorMsg}
              </div>
            )}
            {HERO_STYLE_OPTIONS.map((opt, i) => (
              <label
                key={opt.value}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 22px', cursor: 'pointer',
                  borderBottom: i < HERO_STYLE_OPTIONS.length - 1 ? `1px solid ${P.border}` : 'none',
                  background: heroStyle === opt.value ? P.primaryLight : P.white,
                }}
              >
                <input
                  type="radio"
                  name="hero_style"
                  value={opt.value}
                  checked={heroStyle === opt.value}
                  onChange={() => { setHeroStyle(opt.value); setHeroSaveState('idle') }}
                  style={{ marginTop: 3, accentColor: P.primary, flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: heroStyle === opt.value ? 700 : 500, color: P.text }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: P.muted, marginTop: 2 }}>{opt.desc}</div>
                </div>
              </label>
            ))}
            <div style={{ padding: '10px 22px', background: '#f8fafc', fontSize: 11, color: P.muted, borderTop: `1px solid ${P.border}` }}>
              ℹ️ Changes take effect after the next site deploy. Refresh the page to confirm after saving.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
