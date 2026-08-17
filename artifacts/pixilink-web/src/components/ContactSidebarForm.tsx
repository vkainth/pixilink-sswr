'use client'

import { useState } from 'react'
import type { AgentProfile } from '@/lib/types'
import { imgUrl } from '@/lib/types'

interface CoAgent {
  name: string
  title: string
  phone: string
  email: string
  bio: string
  photo: string
}

interface Props {
  agent: AgentProfile
  listingAddress?: string
  mode?: 'contact' | 'showing' | 'valuation' | 'buyer' | 'seller'
  coAgents?: CoAgent[]
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6,
  marginBottom: 10, fontSize: 13, background: '#fff', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit',
}

export default function ContactSidebarForm({ agent, listingAddress, mode = 'contact', coAgents }: Props) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '', agree: false })
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [hp, setHp] = useState('')
  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 400) : null
  const firstName = agent.name.split(' ')[0]

  const isDualAgent = !!coAgents && coAgents.length > 0
  const coAgent = isDualAgent ? coAgents![0] : null
  const coFirstName = coAgent?.name.split(' ')[0] ?? ''
  const displayNames = isDualAgent ? `${firstName} & ${coFirstName}` : firstName
  const consentNames = isDualAgent && coAgent
    ? `${agent.name} and ${coAgent.name}, ${agent.brokerage}`
    : `${agent.name}, ${agent.brokerage}`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.phone || !form.agree) return
    try {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : null
      const { parseSourceContext } = await import('@/lib/auth-client')
      const sourceCtx = parseSourceContext(currentPath)
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          listing_address: listingAddress,
          agent_slug:      agent.slug,
          form_type:       'contact',
          source_url:      typeof window !== 'undefined' ? window.location.href : '',
          ...sourceCtx,
          website_url:     hp || undefined,
        }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        setError('Something went wrong. Please try calling directly.')
      }
    } catch {
      setError('Something went wrong. Please try calling directly.')
    }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', position: 'sticky', top: 'calc(var(--nav-height) + 20px)' }}>
      <div style={{ background: '#fff', borderTop: '3px solid var(--cta-primary)', padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'center' }}>
        {isDualAgent && coAgent ? (
          /* Dual-agent: overlapping circles */
          <div style={{ display: 'flex', flexShrink: 0 }}>
            {photoSrc ? (
              <img src={photoSrc} alt={agent.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '2px solid #fff', boxShadow: '0 0 0 2px var(--cta-primary)', flexShrink: 0, position: 'relative', zIndex: 2 }} />
            ) : (
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--cta-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cta-primary-text)', fontWeight: 700, fontSize: 20, flexShrink: 0, border: '2px solid #fff', position: 'relative', zIndex: 2 }}>
                {agent.name.charAt(0)}
              </div>
            )}
            <img src={imgUrl(coAgent.photo, 400)} alt={coAgent.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '2px solid #fff', boxShadow: '0 0 0 2px var(--cta-primary)', flexShrink: 0, marginLeft: -16, position: 'relative', zIndex: 1 }} />
          </div>
        ) : photoSrc ? (
          <img src={photoSrc} alt={agent.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '2px solid var(--cta-primary)', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--cta-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cta-primary-text)', fontWeight: 700, fontSize: 20, flexShrink: 0 }}>
            {agent.name.charAt(0)}
          </div>
        )}
        <div>
          <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>
            {isDualAgent ? displayNames : agent.name}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: 0.5 }}>{agent.brokerage}</div>
        </div>
      </div>
      <div style={{ padding: '18px 20px' }}>
        {listingAddress && (
          <div style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            📍 {listingAddress}
          </div>
        )}
        {sent ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Message sent!</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{displayNames} will be in touch shortly.</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input type="text" name="website_url" value={hp} onChange={e => setHp(e.target.value)} style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>
              {mode === 'showing' ? 'Request a Showing'
                : mode === 'valuation' ? 'Request a Free CMA'
                : mode === 'buyer' ? 'Connect with a Buyer\'s Agent'
                : mode === 'seller' ? 'Get a Free Home Evaluation'
                : 'Ask a Question'}
            </div>
            <input placeholder="Your name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inp} required />
            <input placeholder="Phone number *" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={inp} required />
            <input placeholder="Email (optional)" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inp} />
            <textarea placeholder="Your message..." value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={3} style={{ ...inp, resize: 'vertical', marginBottom: 12 }} />
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.agree} onChange={e => setForm(p => ({ ...p, agree: e.target.checked }))} style={{ marginTop: 2, accentColor: 'var(--brand-accent)' }} required />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                I consent to receive communications from {consentNames}.
              </span>
            </label>
            {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>{error}</div>}
            <button type="submit" disabled={!form.name || !form.phone || !form.agree}
              style={{ width: '100%', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', border: 'none', padding: 13, borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: form.name && form.phone && form.agree ? 1 : 0.5 }}>
              {mode === 'showing' ? 'Request Showing'
                : mode === 'valuation' ? 'Request Free CMA'
                : mode === 'buyer' ? 'Connect with Agent'
                : mode === 'seller' ? 'Get Free Evaluation'
                : 'Send Message'}
            </button>
          </form>
        )}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 14 }}>
          <a href={`tel:${agent.phone}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
            📞 {agent.phone}
          </a>
        </div>
      </div>
    </div>
  )
}
