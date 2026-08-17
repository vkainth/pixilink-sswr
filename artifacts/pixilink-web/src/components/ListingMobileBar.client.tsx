'use client'

import { useState, useEffect } from 'react'
import type { AgentProfile } from '@/lib/types'
import { imgUrl, getCoAgents } from '@/lib/types'
import RequestShowingWidget from './RequestShowingWidget.client'

interface Props {
  agent: AgentProfile
  address: string
  price: string
  mlsNum?: string
  isSold?: boolean
  isLoggedIn?: boolean
  slug?: string
  agentPrefix?: string
  returnTo?: string
}

export default function ListingMobileBar({ agent, address, price, mlsNum, isSold, isLoggedIn, slug, agentPrefix, returnTo }: Props) {
  const [open, setOpen] = useState(false)
  const prefix = agentPrefix ?? `/agent/${slug}`

  const showSoldGate = isSold && !isLoggedIn

  const headshotSrc = agent.headshot_path
    ? `/api/resize-img?src=${encodeURIComponent(agent.headshot_path)}&w=72`
    : (agent.photo_path ? imgUrl(agent.photo_path, 400) : null)
  const firstName = agent.name.split(' ')[0]
  const coAgents = getCoAgents(agent)
  const isDualAgent = coAgents.length > 0
  const displayFirstName = isDualAgent
    ? `${firstName} & ${coAgents[0].name.split(' ')[0]}`
    : firstName

  function navigateToSignIn(dest: 'register' | 'login') {
    if (returnTo && typeof window !== 'undefined') {
      sessionStorage.setItem('pxl_return_to', returnTo)
    }
    window.location.href = `${prefix}/${dest}`
  }

  useEffect(() => {
    if (!open) { document.body.style.overflow = ''; return }
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open])

  const agentIdentity = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
      {headshotSrc ? (
        <img
          src={headshotSrc}
          alt={agent.name}
          style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 15%', border: '2px solid rgba(var(--brand-overlay-rgb),0.35)', flexShrink: 0 }}
        />
      ) : (
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(var(--brand-overlay-rgb),0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: 'var(--brand-text)', flexShrink: 0 }}>
          {agent.name.charAt(0)}
        </div>
      )}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-text)', whiteSpace: 'nowrap' }}>
        {displayFirstName}
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        .lmb-bar { display: none; }
        @media (max-width: 900px) { .lmb-bar { display: flex; } }
      `}</style>

      {/* Sold sign-in bar */}
      {showSoldGate && !open && (
        <div className="lmb-bar"
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 600, background: 'var(--brand-bg)', borderTop: '3px solid var(--brand-accent)', padding: '10px 14px', gap: 10, alignItems: 'center', boxShadow: '0 -4px 20px rgba(0,0,0,0.2)' }}>
          {agentIdentity}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.85)', marginBottom: 2, fontWeight: 700 }}>
              🔒 Sold Price Locked
            </div>
            <div style={{ color: 'rgba(var(--brand-overlay-rgb),0.65)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{address}</div>
          </div>
          <button
            onClick={() => navigateToSignIn('register')}
            style={{ background: '#fff', color: '#111', border: 'none', padding: '10px 14px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Unlock Price
          </button>
          <button
            onClick={() => navigateToSignIn('login')}
            style={{ background: 'transparent', color: 'var(--brand-text)', border: '1px solid rgba(var(--brand-overlay-rgb),0.35)', padding: '10px 10px', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Sign in
          </button>
        </div>
      )}

      {/* Standard booking bar */}
      {!showSoldGate && !open && (
        <div className="lmb-bar"
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 600, background: 'var(--brand-bg)', borderTop: '3px solid var(--brand-accent)', padding: '10px 14px', gap: 10, alignItems: 'center', boxShadow: '0 -4px 20px rgba(0,0,0,0.2)' }}>
          {agentIdentity}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--brand-text)', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{price}</div>
            <div style={{ color: 'rgba(var(--brand-overlay-rgb),0.65)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{address}</div>
          </div>
          <button onClick={() => setOpen(true)} style={{ background: '#fff', color: '#111', border: '1px solid rgba(0,0,0,0.15)', padding: '10px 16px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
            Book Showing
          </button>
          <a href={`tel:${agent.phone}`}
            aria-label={`Call ${agent.name}: ${agent.phone}`}
            title={agent.phone}
            style={{ background: 'transparent', color: 'var(--brand-text)', border: '1px solid rgba(var(--brand-overlay-rgb),0.35)', padding: '10px 11px', borderRadius: 6, fontWeight: 600, fontSize: 16, textDecoration: 'none', flexShrink: 0, lineHeight: 1 }}>
            📞
          </a>
        </div>
      )}

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 700 }} />
          <div role="dialog" aria-modal="true" aria-label="Request a showing"
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 800, background: 'var(--off-white)', borderRadius: '16px 16px 0 0', padding: '0 0 32px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 -8px 32px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px 12px' }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>Request a Showing</div>
              <button onClick={() => setOpen(false)} aria-label="Close" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '50%', width: 32, height: 32, fontSize: 18, lineHeight: 1, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            <div style={{ padding: '0 18px' }}>
              <RequestShowingWidget agent={agent} address={address} price={price} mlsNum={mlsNum} coAgents={coAgents} />
            </div>
          </div>
        </>
      )}
    </>
  )
}
