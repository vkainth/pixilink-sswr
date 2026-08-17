'use client'

import { useState } from 'react'
import type { AgentProfile } from '@/lib/types'

interface Props {
  agent: AgentProfile
  areaLabel: string
  agentSlug: string
}

const inp: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--border)',
  borderRadius: 6,
  marginBottom: 10,
  fontSize: 13,
  background: '#fff',
  color: 'var(--text)',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

export default function AskRandyForm({ agent, areaLabel, agentSlug }: Props) {
  const firstName = agent.name.split(' ')[0]
  const defaultMsg = `Hi ${firstName}, I have a question about ${areaLabel} real estate.`

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: defaultMsg,
    agree: false,
  })
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [hp, setHp] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.message || !form.agree) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          message: form.message,
          agent_slug: agentSlug,
          source: 'market-report-ask-randy',
          form_type: 'ask',
          source_url: typeof window !== 'undefined' ? window.location.href : '',
          website_url: hp || undefined,
        }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        setError('Something went wrong — please try calling directly.')
      }
    } catch {
      setError('Something went wrong — please try calling directly.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      marginTop: 40,
    }}>
      <div style={{
        background: '#fff',
        borderTop: '3px solid var(--cta-primary)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>✉️</span>
        <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15 }}>
          Ask {firstName} a Question
        </span>
      </div>

      <div style={{ padding: '20px 22px' }}>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 38, marginBottom: 10, color: 'var(--accent)' }}>✓</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>
              Message sent!
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {firstName} will be in touch soon.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input type="text" name="website_url" value={hp} onChange={e => setHp(e.target.value)} style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.55 }}>
              Have a question about the {areaLabel} market? Send {firstName} a message below.
            </div>

            <input
              placeholder="Your name *"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              style={inp}
              required
            />
            <input
              placeholder="Email address *"
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              style={inp}
              required
            />
            <input
              placeholder="Phone (optional)"
              type="tel"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              style={inp}
            />
            <textarea
              value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              rows={3}
              style={{ ...inp, resize: 'vertical', marginBottom: 12 }}
              required
            />

            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 14, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.agree}
                onChange={e => setForm(p => ({ ...p, agree: e.target.checked }))}
                style={{ marginTop: 2, accentColor: 'var(--accent)' }}
                required
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                I consent to receive communications from {agent.name}, {agent.brokerage}.
              </span>
            </label>

            {error && (
              <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={busy || !form.name || !form.email || !form.message || !form.agree}
              style={{
                width: '100%',
                background: 'var(--cta-primary)',
                color: 'var(--cta-primary-text)',
                border: 'none',
                padding: '12px 0',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                letterSpacing: '0.03em',
                opacity: (form.name && form.email && form.message && form.agree && !busy) ? 1 : 0.55,
              }}
            >
              {busy ? 'Sending…' : `Send Message to ${firstName}`}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
