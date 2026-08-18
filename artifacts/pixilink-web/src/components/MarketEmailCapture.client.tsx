'use client'

import { useState } from 'react'

interface Props {
  slug: string
  currentMonthLabel: string
}

export default function MarketEmailCapture({ slug, currentMonthLabel }: Props) {
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Market Report Subscriber',
          email,
          message: `Please send me the ${currentMonthLabel} market report for ${slug}.`,
          agent_slug: slug,
          form_type: 'market_subscribe',
          source: 'market-report-email-capture',
          website_url: hp || undefined,
        }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        setError('Something went wrong. Please try again.')
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
        padding: '18px 22px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 18 }}>✓</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#15803d' }}>You&apos;re on the list!</div>
          <div style={{ fontSize: 13, color: '#166534' }}>We&apos;ll send you {currentMonthLabel}&apos;s report as soon as it&apos;s ready.</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media (max-width: 639px) {
          .mec-card { padding: 12px 14px !important; }
          .mec-subtitle { display: none !important; }
          .mec-input-wrap { flex-direction: column !important; width: 100% !important; }
          .mec-input { min-width: 0 !important; width: 100% !important; box-sizing: border-box !important; }
          .mec-button { width: 100% !important; }
        }
      `}</style>
      <form onSubmit={handleSubmit} className="mec-card" style={{
        background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
        padding: '18px 22px', marginBottom: 28,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <input type="text" name="website_url" value={hp} onChange={e => setHp(e.target.value)} style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-bg)', marginBottom: 2 }}>
            Get {currentMonthLabel}&apos;s report delivered to your inbox
          </div>
          <div className="mec-subtitle" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Monthly market data, straight to you — no spam, unsubscribe any time.
          </div>
        </div>
        <div className="mec-input-wrap" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="email"
            required
            placeholder="Your email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="mec-input"
            style={{
              padding: '9px 14px', border: '1px solid var(--border)', borderRadius: 6,
              fontSize: 13, background: '#fff', color: 'var(--text)', fontFamily: 'inherit',
              minWidth: 220,
            }}
          />
          <button
            type="submit"
            disabled={busy}
            className="mec-button"
            style={{
              background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', border: 'none',
              padding: '9px 20px', borderRadius: 6, fontWeight: 700, fontSize: 13,
              cursor: busy ? 'default' : 'pointer', whiteSpace: 'nowrap',
              opacity: busy ? 0.7 : 1, fontFamily: 'inherit',
            }}
          >
            {busy ? 'Sending…' : 'Send Me the Report'}
          </button>
        </div>
        {error && <div style={{ width: '100%', fontSize: 12, color: '#dc2626' }}>{error}</div>}
      </form>
    </>
  )
}
