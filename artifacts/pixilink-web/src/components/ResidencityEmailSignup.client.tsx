'use client'
import { useState } from 'react'

export default function ResidencityEmailSignup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/residencity/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })
      if (res.ok) {
        setStatus('success')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>You're on the list!</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>We'll send Metro Vancouver's weekly market stats to {email}.</div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 14, textAlign: 'center' }}>
        Weekly Market Report
      </div>
      <h2 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 800, color: '#fff', margin: 0, marginBottom: 10, textAlign: 'center' }}>
        Get Metro Vancouver's weekly market stats in your inbox.
      </h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: 0, marginBottom: 28, textAlign: 'center', lineHeight: 1.6 }}>
        Sold counts, avg prices, DOM, and market type — delivered every Monday.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="Your name (optional)" value={name}
          onChange={e => setName(e.target.value)}
          style={{
            flex: '1 1 160px', background: 'rgba(255,255,255,0.08)',
            border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 10,
            padding: '12px 16px', fontSize: 14, color: '#fff', outline: 'none', fontFamily: 'inherit',
          }} />
        <input
          type="email" placeholder="Your email address *" value={email}
          onChange={e => setEmail(e.target.value)} required
          style={{
            flex: '2 1 220px', background: 'rgba(255,255,255,0.08)',
            border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 10,
            padding: '12px 16px', fontSize: 14, color: '#fff', outline: 'none', fontFamily: 'inherit',
          }} />
        <button type="submit" disabled={status === 'loading' || !email}
          style={{
            flex: '0 0 auto', fontSize: 14, fontWeight: 700, padding: '12px 24px',
            borderRadius: 10, border: 'none', cursor: status === 'loading' ? 'wait' : 'pointer',
            background: '#c9a84c', color: '#14213d',
            opacity: !email ? 0.5 : 1, transition: 'opacity 0.15s',
          }}>
          {status === 'loading' ? 'Subscribing…' : 'Subscribe →'}
        </button>
      </div>
      {status === 'error' && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#f87171', textAlign: 'center' }}>
          Something went wrong. Please try again.
        </div>
      )}
    </form>
  )
}
