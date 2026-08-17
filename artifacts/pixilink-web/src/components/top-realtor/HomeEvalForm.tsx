'use client'
import { useState } from 'react'

interface Props {
  agentSlug: string
  agentName: string
  locationName: string
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'rgba(255,255,255,0.1)',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

export default function HomeEvalForm({ agentSlug, agentName, locationName }: Props) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [hp, setHp] = useState('')

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
    try {
      const res = await fetch(`${basePath}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_slug: agentSlug,
          name: form.name,
          email: form.email,
          phone: form.phone,
          message: `Home Evaluation Request — Property Address: ${form.address}`,
          form_type: 'home_evaluation',
          source: 'home-worth',
          website_url: hp || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Network error. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.1)', borderRadius: 8,
        padding: '24px 20px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
          Request Received!
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
          {agentName} will be in touch within 24 hours with your free {locationName} home evaluation.
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
      <input type="text" name="website_url" value={hp} onChange={e => setHp(e.target.value)} style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <input
        placeholder={`Property address (e.g. 123 Main St, ${locationName})`}
        value={form.address}
        onChange={update('address')}
        required
        style={inputStyle}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <input placeholder="Your name" value={form.name} onChange={update('name')} required style={inputStyle} />
        <input placeholder="Email address" type="email" value={form.email} onChange={update('email')} required style={inputStyle} />
      </div>
      <input placeholder="Phone (optional)" value={form.phone} onChange={update('phone')} style={inputStyle} />
      {status === 'error' && (
        <div style={{ fontSize: 13, color: '#f87171', padding: '6px 10px', background: 'rgba(248,113,113,0.1)', borderRadius: 4 }}>
          {errorMsg}
        </div>
      )}
      <button
        type="submit"
        disabled={status === 'loading'}
        style={{
          background: '#fff', color: '#111',
          border: 'none', borderRadius: 6,
          padding: '12px 20px', fontSize: 15, fontWeight: 700,
          cursor: status === 'loading' ? 'wait' : 'pointer',
          opacity: status === 'loading' ? 0.7 : 1,
          marginTop: 2,
        }}
      >
        {status === 'loading' ? 'Submitting…' : 'Get My Free Home Evaluation'}
      </button>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
        Free &amp; no obligation — we respond within 24 hours
      </div>
    </form>
  )
}
