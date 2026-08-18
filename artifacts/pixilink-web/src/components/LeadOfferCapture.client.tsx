'use client'

import { useState } from 'react'

export type LeadOfferType =
  | 'weekly_deals'
  | 'price_drop'
  | 'building_sold'
  | 'neighbour_sold'
  | 'school_catchment'
  | 'building_valuation'

interface Props {
  slug: string
  offerType: LeadOfferType
  /** Area, building, or school name this offer is scoped to — stored as offer_context on the lead. */
  offerContext: string
  title: string
  subtitle?: string
  buttonLabel?: string
  successMessage?: string
  /** Tint the card with the agent's brand accent so it reads as a distinct offer, not another neutral row. */
  accent?: boolean
}

export default function LeadOfferCapture({
  slug,
  offerType,
  offerContext,
  title,
  subtitle,
  buttonLabel = 'Sign Me Up',
  successMessage = "You're on the list! We'll be in touch soon.",
  accent = false,
}: Props) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [hp, setHp] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          agent_slug: slug,
          form_type: offerType,
          offer_context: offerContext,
          source_url: `lead-offer:${offerType}`,
          website_url: hp || undefined,
        }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div style={{
        background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10,
        padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 18 }}>✓</span>
        <div style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>{successMessage}</div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media (max-width: 639px) {
          .loc-card { padding: 12px 14px !important; }
          .loc-subtitle { display: none !important; }
          .loc-input-wrap { flex-direction: column !important; width: 100% !important; }
          .loc-input { min-width: 0 !important; width: 100% !important; box-sizing: border-box !important; }
          .loc-button { width: 100% !important; }
        }
      `}</style>
      <form onSubmit={handleSubmit} className="loc-card" style={{
        background: accent ? 'rgba(var(--brand-accent-rgb),0.06)' : '#fff',
        border: accent ? '1px solid rgba(var(--brand-accent-rgb),0.35)' : '1px solid var(--border)',
        borderRadius: 10,
        padding: '18px 22px',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <input type="text" name="website_url" value={hp} onChange={e => setHp(e.target.value)} style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-bg)', marginBottom: 2 }}>
            {title}
          </div>
          {subtitle && (
            <div className="loc-subtitle" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {subtitle}
            </div>
          )}
        </div>
        <div className="loc-input-wrap" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="email"
            required
            placeholder="Your email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="loc-input"
            style={{
              padding: '9px 14px', border: '1px solid var(--border)', borderRadius: 6,
              fontSize: 13, background: '#fff', color: 'var(--text)', fontFamily: 'inherit',
              minWidth: 220,
            }}
          />
          <button
            type="submit"
            disabled={busy}
            className="loc-button"
            style={{
              background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', border: 'none',
              padding: '9px 20px', borderRadius: 6, fontWeight: 700, fontSize: 13,
              cursor: busy ? 'default' : 'pointer', whiteSpace: 'nowrap',
              opacity: busy ? 0.7 : 1, fontFamily: 'inherit',
            }}
          >
            {busy ? 'Sending…' : buttonLabel}
          </button>
        </div>
        {error && <div style={{ width: '100%', fontSize: 12, color: '#dc2626' }}>{error}</div>}
      </form>
    </>
  )
}
