'use client'

import type { AgentProfile } from '@/lib/types'

interface ProgressStep {
  state: 'done' | 'active' | 'inactive'
}

interface Props {
  agent: AgentProfile
  steps: ProgressStep[]
  stepLabel: string
  children: React.ReactNode
}

const LARAVEL_PUB = process.env.NEXT_PUBLIC_LARAVEL_URL || 'https://bccondosandhomes.com'

function agentPhotoUrl(path: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${LARAVEL_PUB}/storage/${path.replace(/^\/?(storage\/)?/, '')}`
}

export default function AuthSplitLayout({ agent, steps, stepLabel, children }: Props) {
  const photo = agentPhotoUrl(agent.photo_path)
  const domain = agent.settings?.custom_domain || 'southsurreywhiterock.com'
  const accentColor = agent.theme_color || '#111111'
  const bgColor = agent.primary_bg_color || '#111111'

  const trustBullets = [
    'Full access to sold prices & MLS data',
    'Free — no credit card required',
    'Your data is private and secure',
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', background: '#0f1923' }}>
      <div className="auth-split-grid" style={{ width: '100%', maxWidth: 900, display: 'grid', gridTemplateColumns: '300px 1fr', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
        {/* ── LEFT PANEL ── */}
        <div className="auth-split-left" style={{ background: bgColor, padding: '40px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Agent photo */}
          <div style={{ width: 100, height: 100, borderRadius: '50%', border: `3px solid ${accentColor}`, overflow: 'hidden', marginBottom: 16, flexShrink: 0, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {photo ? (
              <img src={photo} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 32, fontWeight: 700, color: accentColor }}>
                {agent.name.charAt(0)}
              </span>
            )}
          </div>

          {/* Agent name + brokerage */}
          <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>{agent.name}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 20, lineHeight: 1.4 }}>{agent.brokerage}</div>

          {/* Phone pill */}
          {agent.phone && (
            <a href={`tel:${agent.phone}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 20, padding: '7px 14px', fontSize: 12, color: 'rgba(255,255,255,0.8)', textDecoration: 'none', marginBottom: 8, letterSpacing: 0.2 }}>
              <span>📞</span> {agent.phone}
            </a>
          )}
          {agent.phone && (
            <a href={`sms:${agent.phone}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 20, padding: '7px 14px', fontSize: 12, color: 'rgba(255,255,255,0.8)', textDecoration: 'none', marginBottom: 28, letterSpacing: 0.2 }}>
              <span>💬</span> Send SMS
            </a>
          )}

          {/* Trust bullets */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {trustBullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left' }}>
                <span style={{ color: accentColor, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{b}</span>
              </div>
            ))}
          </div>

          {/* Domain */}
          <div style={{ marginTop: 'auto', paddingTop: 28, fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.3 }}>{domain}</div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="auth-split-right" style={{ background: '#fff', padding: '40px 44px', display: 'flex', flexDirection: 'column' }}>
          {/* Progress bar */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {steps.map((s, i) => (
                <div key={i} style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: s.state === 'done' ? accentColor : s.state === 'active' ? accentColor : '#e5e7eb',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {stepLabel}
            </div>
          </div>

          {children}
        </div>
      </div>

      {/* Mobile: collapse left panel */}
      <style>{`
        @media (max-width: 680px) {
          .auth-split-grid { grid-template-columns: 1fr !important; }
          .auth-split-left { display: none !important; }
          .auth-split-right { padding: 28px 20px !important; }
        }
      `}</style>
    </div>
  )
}
