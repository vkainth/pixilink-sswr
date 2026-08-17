'use client'

import { useEffect, useState } from 'react'

export default function WelcomeToast() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const flag = sessionStorage.getItem('pxl_just_authed')
    if (flag === '1') {
      sessionStorage.removeItem('pxl_just_authed')
      setVisible(true)
      const t = setTimeout(() => setVisible(false), 5000)
      return () => clearTimeout(t)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pxl-welcome-toast"
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: '#16a34a',
        color: '#fff',
        borderRadius: 10,
        padding: '14px 22px',
        fontSize: 14,
        fontWeight: 700,
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        whiteSpace: 'nowrap',
        animation: 'pxl-fadein 0.25s ease',
      }}
    >
      <span style={{ fontSize: 18 }}>✓</span>
      <span>Welcome — you can now see sold prices.</span>
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        style={{
          marginLeft: 8,
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.75)',
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
          padding: 0,
          fontFamily: 'inherit',
        }}
      >
        ×
      </button>
      <style>{`
        @keyframes pxl-fadein {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @media (max-width: 900px) {
          .pxl-welcome-toast {
            bottom: 80px !important;
          }
        }
      `}</style>
    </div>
  )
}
