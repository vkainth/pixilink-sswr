'use client'

import { useEffect, useState } from 'react'

interface Props {
  slug: string
  mls: string
  isLoggedIn: boolean
  agentPrefix?: string
  subarea: string | null
  /** Other recent sales in the same building — the reason to sign up, not just this one price. */
  buildingSoldCount?: number
  buildingName?: string | null
  returnTo: string
}

/**
 * Deliberately NOT shown on arrival. Google demotes mobile pages that cover their
 * content with an interstitial as soon as it loads, and organic search is exactly
 * where these sold pages get their visitors — an on-arrival popup would trade the
 * traffic for the conversion. So this waits for a signal that the visitor is
 * actually reading: scrolling past the fold, or dwelling ~15s.
 */
const SCROLL_TRIGGER_PX = 600
const DWELL_MS = 15000

const SESSION_KEY = 'pxl_sold_prompt_shown'
const LOCAL_KEY = 'pxl_sold_prompt_last'
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000 // 3 days

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export default function SoldUnlockPrompt({
  slug, mls, isLoggedIn, agentPrefix, subarea,
  buildingSoldCount = 0, buildingName, returnTo,
}: Props) {
  const [open, setOpen] = useState(false)
  const prefix = agentPrefix ?? `/agent/${slug}`

  useEffect(() => {
    if (isLoggedIn) return
    if (sessionStorage.getItem(SESSION_KEY)) return
    const last = Number(localStorage.getItem(LOCAL_KEY) || 0)
    if (last && Date.now() - last < COOLDOWN_MS) return

    let done = false
    const fire = () => {
      if (done) return
      done = true
      sessionStorage.setItem(SESSION_KEY, '1')
      localStorage.setItem(LOCAL_KEY, String(Date.now()))
      setOpen(true)
      cleanup()
      // Impression. Without a denominator a gate's conversion rate is unknowable,
      // and today only register/login are recorded anywhere.
      fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/sold-gate-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'prompt_impression', agent_slug: slug, mls, subarea }),
        keepalive: true,
      }).catch(() => {})
    }

    const onScroll = () => { if (window.scrollY > SCROLL_TRIGGER_PX) fire() }
    const timer = window.setTimeout(fire, DWELL_MS)
    window.addEventListener('scroll', onScroll, { passive: true })
    function cleanup() {
      window.clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
    return cleanup
  }, [isLoggedIn, slug, mls, subarea])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function dismiss() {
    setOpen(false)
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/sold-gate-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'prompt_dismiss', agent_slug: slug, mls, subarea }),
      keepalive: true,
    }).catch(() => {})
  }

  function navigate(dest: 'register' | 'login') {
    sessionStorage.setItem('pxl_return_to', returnTo)
    sessionStorage.setItem('pxl_just_authed', '1')
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/sold-gate-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: dest, agent_slug: slug, mls, subarea }),
      keepalive: true,
    }).catch(() => {})

    // Also carry the destination as a query param: the gates that only write
    // sessionStorage lose it on the already-authed redirect and in magic-link mail.
    const href = `${prefix}/${dest}?return_to=${encodeURIComponent(returnTo)}`
    const eventName = dest === 'register' ? 'sold_gate_register_click' : 'sold_gate_login_click'
    if (typeof window.gtag === 'function') {
      let navigated = false
      // 500ms failsafe so a blocked or slow gtag can never trap the visitor.
      const go = () => { if (!navigated) { navigated = true; window.location.href = href } }
      window.gtag('event', eventName, { mls, subarea: subarea ?? undefined, event_callback: go })
      setTimeout(go, 500)
    } else {
      window.location.href = href
    }
  }

  if (!open) return null

  const others = buildingSoldCount > 0
    ? `Plus ${buildingSoldCount} other recent sale${buildingSoldCount === 1 ? '' : 's'}${buildingName ? ` at ${buildingName}` : ' in this building'}.`
    : 'Plus every other recent sale in the area.'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="See what this home sold for"
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        className="agent-popup"
        onClick={e => e.stopPropagation()}
        style={{ position: 'relative', maxWidth: 420, width: '100%', padding: '30px 26px', textAlign: 'center', borderRadius: 12 }}
      >
        <button
          onClick={dismiss}
          aria-label="Close"
          style={{
            position: 'absolute', top: 10, right: 12, background: 'none', border: 'none',
            color: 'var(--popup-text)', opacity: 0.6, fontSize: 22, lineHeight: 1, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          ×
        </button>

        <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--popup-text)', marginBottom: 8 }}>
          See what this home sold for
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--popup-text)', opacity: 0.85, lineHeight: 1.6, marginBottom: 22 }}>
          {others} Free account — takes about 10 seconds.
        </div>

        <button
          onClick={() => navigate('register')}
          style={{
            width: '100%', background: 'var(--popup-cta)', color: 'var(--popup-cta-text)', border: 'none',
            borderRadius: 7, padding: '13px 0', fontWeight: 700, fontSize: 14.5, cursor: 'pointer',
            fontFamily: 'inherit', marginBottom: 10,
          }}
        >
          Create free account →
        </button>
        <button
          onClick={() => navigate('login')}
          style={{
            width: '100%', background: 'none', color: 'var(--popup-text)', opacity: 0.85,
            border: 'none', padding: '6px 0', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            textDecoration: 'underline',
          }}
        >
          Already have an account? Sign in
        </button>
      </div>
    </div>
  )
}
