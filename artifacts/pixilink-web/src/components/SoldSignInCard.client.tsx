'use client'

import type { AgentProfile } from '@/lib/types'
import { imgUrl } from '@/lib/types'

interface Props {
  agent: AgentProfile
  slug: string
  agentPrefix?: string
  subarea: string | null
  returnTo: string
  mls: string
  nextStepUrl?: string
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export default function SoldSignInCard({ agent, slug, agentPrefix, subarea, returnTo, mls, nextStepUrl }: Props) {
  const prefix = agentPrefix ?? `/agent/${slug}`
  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 400) : null
  const firstName = agent.name.split(' ')[0]

  function recordClick(dest: 'register' | 'login') {
    try {
      fetch('/api/sold-gate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: dest, agent_slug: slug, mls, subarea }),
        keepalive: true,
      }).catch(() => {})
    } catch {
    }
  }

  function navigate(dest: 'register' | 'login') {
    sessionStorage.setItem('pxl_return_to', returnTo)
    sessionStorage.setItem('pxl_just_authed', '1')
    recordClick(dest)

    const href = `${prefix}/${dest}`
    const eventName = dest === 'register' ? 'sold_gate_register_click' : 'sold_gate_login_click'

    if (typeof window.gtag === 'function') {
      let navigated = false
      const go = () => {
        if (!navigated) { navigated = true; window.location.href = href }
      }
      window.gtag('event', eventName, {
        mls,
        subarea: subarea ?? undefined,
        event_callback: go,
      })
      setTimeout(go, 500)
    } else {
      window.location.href = href
    }
  }

  return (
    <div style={{ background: 'var(--primary-bg)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Agent header */}
      <div style={{ padding: '18px 20px 16px' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.28)', overflow: 'hidden', flexShrink: 0 }}>
            {photoSrc ? (
              <img src={photoSrc} alt={agent.name} width={56} height={56} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 22 }}>
                {agent.name.charAt(0)}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#ffffff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{agent.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginBottom: 4 }}>{agent.brokerage}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>Usually responds quickly</span>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 -20px 16px' }} />

        {/* Lock badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '3px 12px', fontSize: 11, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.04em', marginBottom: 10 }}>
          🔒 Sold Price Locked
        </div>

        {nextStepUrl ? (
          <>
            <div style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 6, lineHeight: 1.25 }}>
              One more step
            </div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12.5, lineHeight: 1.65, marginBottom: 18 }}>
              You&apos;re already signed in — just complete your registration to see what this home sold for
              {subarea ? ` and browse all sold prices in ${subarea}` : ''}.
            </div>
            <a
              href={nextStepUrl}
              style={{ display: 'block', width: '100%', background: '#fff', color: '#111', border: 'none', borderRadius: 7, padding: '13px 0', fontWeight: 800, fontSize: 14, textDecoration: 'none', fontFamily: 'inherit', marginBottom: 14, letterSpacing: 0.2, textAlign: 'center', boxSizing: 'border-box' }}>
              Complete your registration →
            </a>
          </>
        ) : (
          <>
            <div style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 6, lineHeight: 1.25 }}>
              Unlock the Sold Price
            </div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12.5, lineHeight: 1.65, marginBottom: 18 }}>
              Sign in free to see what this home sold for
              {subarea ? ` and browse all sold prices in ${subarea}` : ''}.
            </div>

            {/* Primary CTA */}
            <button
              onClick={() => navigate('register')}
              style={{ display: 'block', width: '100%', background: '#fff', color: '#111', border: 'none', borderRadius: 7, padding: '13px 0', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10, letterSpacing: 0.2 }}>
              Create free account →
            </button>

            {/* Secondary link */}
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <button
                onClick={() => navigate('login')}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                Already have an account?{' '}
                <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>Sign in</span>
              </button>
            </div>
          </>
        )}

        {/* Social proof */}
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 14px', fontSize: 11.5, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 1.5, marginBottom: 14 }}>
          Join 4,800+ buyers already using {firstName}&apos;s sold data
        </div>

        {/* Phone tertiary */}
        <a href={`tel:${agent.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'rgba(255,255,255,0.85)', fontSize: 12, textDecoration: 'none' }}>
          📞 <span style={{ textDecoration: 'underline' }}>{agent.phone}</span>
        </a>
      </div>
    </div>
  )
}
