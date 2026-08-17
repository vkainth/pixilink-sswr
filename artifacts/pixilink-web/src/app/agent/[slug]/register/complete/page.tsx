'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { clientAgentPrefix } from '@/lib/api'

export default function RegisterCompletePage() {
  const params = useParams()
  const slug = params.slug as string
  const router = useRouter()
  const prefix = clientAgentPrefix(slug)
  const [returnTo, setReturnTo] = useState<string | null>(null)
  const [animDone, setAnimDone] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('pxl_return_to')
    if (stored) {
      sessionStorage.removeItem('pxl_return_to')
      setReturnTo(stored)
    }
    const t = setTimeout(() => setAnimDone(true), 600)
    return () => clearTimeout(t)
  }, [])

  function handleContinue() {
    router.push(returnTo || prefix || '/')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', background: 'var(--primary-bg)' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '60px 52px', maxWidth: 480, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', textAlign: 'center' }}>
        {/* Checkmark animation */}
        <div style={{
          width: 84, height: 84, borderRadius: '50%', margin: '0 auto 28px',
          background: 'rgba(var(--accent-rgb, 201 169 110), 0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '3px solid var(--accent)',
          transform: animDone ? 'scale(1)' : 'scale(0.5)',
          opacity: animDone ? 1 : 0,
          transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease',
        }}>
          <svg viewBox="0 0 52 52" width="38" height="38" style={{ stroke: 'var(--accent)', fill: 'none', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
            <polyline points="14,27 22,35 38,18" style={{
              strokeDasharray: 40,
              strokeDashoffset: animDone ? 0 : 40,
              transition: 'stroke-dashoffset 0.5s ease 0.3s',
            }} />
          </svg>
        </div>

        <h1 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 900, color: '#1a1a1a', lineHeight: 1.2 }}>
          You&apos;re all set!
        </h1>
        <p style={{ color: '#6b7280', fontSize: 16, lineHeight: 1.6, margin: '0 0 32px' }}>
          You now have full access to sold prices, listing history, and market data.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={handleContinue}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 0', fontWeight: 800, fontSize: 16, cursor: 'pointer', width: '100%', letterSpacing: 0.2 }}>
            Continue browsing →
          </button>
          <a href={`${prefix}/sold`}
            style={{ background: 'transparent', color: '#6b7280', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '13px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer', width: '100%', textDecoration: 'none', display: 'block' }}>
            Browse sold listings
          </a>
        </div>
      </div>
    </div>
  )
}
