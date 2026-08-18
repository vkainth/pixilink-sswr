'use client'

import { useEffect, useState } from 'react'

interface Props {
  contactHref: string
  areaLabel: string
  agentFirstName: string
  marketCondition?: string
}

const STORAGE_KEY = 'pixilink_sticky_bar_dismissed'

export default function StickyConversionBar({ contactHref, areaLabel, agentFirstName, marketCondition = "Buyer's Market" }: Props) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === '1') {
      setDismissed(true)
      return
    }
    function onScroll() {
      if (window.scrollY > 400) setVisible(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function dismiss() {
    setDismissed(true)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, '1')
    }
  }

  if (dismissed || !visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        background: '#fff',
        borderTop: '3px solid var(--brand-accent)',
        minHeight: 64,
        display: 'flex',
        alignItems: 'center',
        padding: '10px 16px',
        gap: 12,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.10)',
        flexWrap: 'wrap',
      }}
    >
      {/* Market badge + label */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
        <span style={{
          background: 'var(--brand-accent)',
          color: '#fff',
          fontSize: 10,
          fontWeight: 800,
          padding: '3px 9px',
          borderRadius: 20,
          whiteSpace: 'nowrap',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          {marketCondition}
        </span>
        <span style={{
          color: '#374151',
          fontSize: 13,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          Free Home Valuation — {areaLabel}
        </span>
      </div>

      {/* CTA button */}
      <a
        href={contactHref}
        style={{
          background: 'var(--cta-primary)',
          color: 'var(--cta-primary-text)',
          padding: '10px 20px',
          borderRadius: 6,
          fontWeight: 700,
          fontSize: 13,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          letterSpacing: '0.03em',
        }}
      >
        Talk to {agentFirstName}
      </a>

      {/* Dismiss button */}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          background: 'none',
          border: 'none',
          color: '#9ca3af',
          fontSize: 20,
          cursor: 'pointer',
          padding: '4px 6px',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}
