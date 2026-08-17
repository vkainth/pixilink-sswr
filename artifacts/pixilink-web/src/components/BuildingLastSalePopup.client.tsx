'use client'

import { useEffect, useState } from 'react'
import { getBuildingCompellingSold } from '@/lib/api'
import type { CompellingSold } from '@/lib/api'

interface Props {
  agentSlug: string
  mls: string
  isLoggedIn: boolean
  agentPrefix?: string
}

const SESSION_KEY = 'pxl_bls_shown'
const LOCAL_KEY   = 'pxl_bls_last_shown'
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const DELAY_MS    = 8000

function formatDollars(n: number): string {
  return n.toLocaleString('en-CA', { maximumFractionDigits: 0 })
}

function computeHeadline(data: CompellingSold): string {
  const overAskingQualifies = data.over_asking >= 10000
  const domQualifies = data.days_on_market !== null && data.days_on_market <= 7

  if (overAskingQualifies && domQualifies) {
    // Prefer dollar figure unless days are very dramatic (≤3)
    if (data.days_on_market! <= 3) {
      return `Sold in ${data.days_on_market} day${data.days_on_market === 1 ? '' : 's'}!`
    }
    return `Sold $${formatDollars(data.over_asking)} over asking!`
  }
  if (overAskingQualifies) {
    return `Sold $${formatDollars(data.over_asking)} over asking!`
  }
  if (domQualifies) {
    return `Sold in ${data.days_on_market} day${data.days_on_market === 1 ? '' : 's'}!`
  }
  // Fallback (should not reach here given backend filtering, but be safe)
  return 'Hot recent sale nearby!'
}

export default function BuildingLastSalePopup({ agentSlug, mls, isLoggedIn, agentPrefix }: Props) {
  const [data, setData]         = useState<CompellingSold | null>(null)
  const [visible, setVisible]   = useState(false)

  useEffect(() => {
    // Never show for logged-in users
    if (isLoggedIn) return

    // Frequency cap — once per session
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return
    } catch { return }

    // Frequency cap — 7-day cooldown across sessions
    try {
      const last = localStorage.getItem(LOCAL_KEY)
      if (last && Date.now() - Number(last) < COOLDOWN_MS) return
    } catch { return }

    // Set timer; fetch only when it fires
    const timer = setTimeout(async () => {
      const result = await getBuildingCompellingSold(agentSlug, mls)
      if (!result) return

      try {
        sessionStorage.setItem(SESSION_KEY, '1')
        localStorage.setItem(LOCAL_KEY, String(Date.now()))
      } catch { /* ignore storage errors */ }

      setData(result)
      setVisible(true)
    }, DELAY_MS)

    return () => clearTimeout(timer)
  }, [agentSlug, mls, isLoggedIn])

  if (!visible || !data) return null

  const prefix = agentPrefix ?? ''
  const soldHref = `${prefix}/sold/${encodeURIComponent(data.mls_num)}`
  const buildingLabel = data.building_name || 'This building'
  const unitLabel = data.unit ? `Unit ${data.unit}` : 'A unit'
  const headline = computeHeadline(data)

  return (
    <div
      role="dialog"
      aria-label="Recent sale in this building"
      // agent-popup applies --popup-bg / --popup-text / --popup-accent from globals.css.
      // All agent popups/overlays must use this class (or --popup-* vars directly) —
      // never use --accent, --primary-bg, or hardcoded hex values here.
      className="agent-popup"
      style={{
        position: 'fixed',
        bottom: 'calc(var(--sticky-footer-height, 64px) + 24px)',
        right: 24,
        zIndex: 950,
        width: 'min(340px, calc(100vw - 32px))',
        borderRadius: 14,
        boxShadow: '0 8px 40px rgba(0,0,0,0.28)',
        padding: '20px 20px 20px',
        animation: 'pxl-slide-up 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
      }}
    >
      {/* Dismiss button */}
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        style={{
          position: 'absolute',
          top: 10,
          right: 12,
          background: 'transparent',
          border: 'none',
          color: 'rgba(var(--brand-overlay-rgb, 255,255,255),0.55)',
          fontSize: 18,
          lineHeight: 1,
          cursor: 'pointer',
          padding: 4,
        }}
      >
        ✕
      </button>

      {/* Header label */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--popup-accent)', marginBottom: 8 }}>
        Recent Sale Nearby
      </div>

      {/* Headline — the compelling metric */}
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--popup-text)', marginBottom: 6, paddingRight: 24, lineHeight: 1.2 }}>
        {headline}
      </div>

      {/* Sub-line: building / unit for local credibility */}
      <div style={{ fontSize: 13, color: 'rgba(var(--brand-overlay-rgb, 255,255,255),0.75)', marginBottom: 18, lineHeight: 1.5 }}>
        <span style={{ fontWeight: 700, color: 'var(--popup-text)' }}>{unitLabel}</span>
        {' · '}
        <span>{buildingLabel}</span>
      </div>

      {/* CTA — links to the sold detail page where the gate naturally prompts sign-up */}
      <a
        href={soldHref}
        style={{
          display: 'block',
          background: 'var(--popup-cta)',
          color: 'var(--popup-cta-text)',
          borderRadius: 8,
          padding: '11px 16px',
          fontWeight: 800,
          fontSize: 13,
          textDecoration: 'none',
          textAlign: 'center',
          letterSpacing: 0.2,
        }}
      >
        See what it sold for →
      </a>

      <style>{`
        @keyframes pxl-slide-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
