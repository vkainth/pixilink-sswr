'use client'

import { useState } from 'react'
import type { AgentProfile } from '@/lib/types'
import { imgUrl } from '@/lib/types'

export type SidebarMode = 'contact' | 'showing' | 'valuation' | 'eval'

interface CoAgent {
  name: string
  photo: string
  phone: string
}

interface Props {
  agent: AgentProfile
  mode?: SidebarMode
  listingAddress?: string
  listingCity?: string
  coAgents?: CoAgent[]
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  border: '1px solid var(--border)', borderRadius: 6, marginBottom: 10,
  fontSize: 13, background: '#fff', color: 'var(--text)', boxSizing: 'border-box',
  fontFamily: 'inherit',
}

export default function AgentSidebar({ agent, mode = 'contact', listingAddress, listingCity, coAgents }: Props) {
  const [step, setStep] = useState(1)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '', agree: false })
  const [property, setProperty] = useState({ unit: '', address: listingAddress ?? '', city: listingCity ?? '' })
  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 400) : null
  const firstName = agent.name.split(' ')[0]
  const isDual = !!(coAgents && coAgents.length > 0)
  const coAgent = isDual ? coAgents![0] : null

  async function handleSubmit() {
    if (mode === 'eval' || mode === 'valuation') {
      setSubmitting(true)
      setSubmitError('')
      try {
        const propertyAddress = [property.unit && `${property.unit} –`, property.address, property.city].filter(Boolean).join(' ')
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_slug: agent.slug,
            name: form.name,
            phone: form.phone,
            email: form.email || undefined,
            message: `Home evaluation request for ${propertyAddress}`,
            form_type: 'home_evaluation',
            property_address: propertyAddress,
            listing_address: propertyAddress,
            source_url: typeof window !== 'undefined' ? window.location.href : '',
          }),
        })
        if (res.ok) {
          setSent(true)
        } else {
          setSubmitError('Something went wrong. Please try again or call us directly.')
        }
      } catch {
        setSubmitError('Something went wrong. Please try again or call us directly.')
      } finally {
        setSubmitting(false)
      }
      return
    }

    // Contact / showing mode
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_slug: agent.slug,
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          message: form.message || undefined,
          form_type: mode === 'showing' ? 'showing' : 'contact',
          listing_address: listingAddress || undefined,
          source_url: typeof window !== 'undefined' ? window.location.href : '',
        }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        setSubmitError('Something went wrong. Please try again or call us directly.')
      }
    } catch {
      setSubmitError('Something went wrong. Please try again or call us directly.')
    } finally {
      setSubmitting(false)
    }
  }

  if (mode === 'eval' || mode === 'valuation') {
    return (
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', position: 'sticky', top: 'calc(var(--nav-height) + 20px)' }}>
        {/* Agent card header — brand background, matches RequestShowingWidget */}
        <div style={{ background: 'var(--brand-bg)', padding: '14px 20px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isDual && coAgent ? (
                /* Dual-agent: two overlapping circles */
                <div style={{ position: 'relative', width: 72, height: 42, flexShrink: 0 }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, width: 42, height: 42, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.28)', overflow: 'hidden', zIndex: 2, background: 'rgba(255,255,255,0.15)' }}>
                    {photoSrc ? (
                      <img src={photoSrc} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${agent.photo_focal_x ?? 50}% ${agent.photo_focal_y ?? 20}%` }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>{agent.name.charAt(0)}</div>
                    )}
                  </div>
                  <div style={{ position: 'absolute', left: 28, top: 0, width: 42, height: 42, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.28)', overflow: 'hidden', zIndex: 1, background: 'rgba(255,255,255,0.15)' }}>
                    <img src={imgUrl(coAgent.photo, 400)} alt={coAgent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 0%' }} />
                  </div>
                </div>
              ) : (
                /* Single agent */
                photoSrc ? (
                  <img src={photoSrc} alt={agent.name}
                    style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 20%', border: '2px solid rgba(255,255,255,0.28)', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                    {agent.name.charAt(0)}
                  </div>
                )
              )}
              <div>
                <div style={{ fontSize: isDual ? 12 : 13, fontWeight: 700, color: '#ffffff' }}>
                  {isDual && coAgent ? `${agent.name} & ${coAgent.name}` : agent.name}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)' }}>{agent.brokerage}</div>
                {isDual && coAgent ? (
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    <a href={`tel:${agent.phone}`} style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>{agent.phone}</a>
                    {coAgent.phone && (
                      <a href={`tel:${coAgent.phone}`} style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>{coAgent.phone}</a>
                    )}
                  </div>
                ) : (
                  <a href={`tel:${agent.phone}`} style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>{agent.phone}</a>
                )}
              </div>
            </div>
            {/* BUILDING SPECIALIST badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.12)', border: '0.5px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 10, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.03em', flexShrink: 0, whiteSpace: 'nowrap' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', flexShrink: 0 }} />
              BUILDING SPECIALIST
            </div>
          </div>
          <div style={{ color: '#ffffff', fontSize: '1rem', fontWeight: 600, lineHeight: 1.25, marginBottom: 2 }}>Free Home Evaluation</div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11.5 }}>No obligation · Based on actual sold data</div>
          {/* Step progress bars */}
          <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
            {[1, 2].map(s => (
              <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= s ? '#ffffff' : 'rgba(255,255,255,0.2)', transition: 'background 0.2s' }} />
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 22px' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#eaf6ef', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 20 }}>✓</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>Evaluation requested!</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>{firstName} will follow up within a few hours with a detailed evaluation for your unit.</div>
            </div>
          ) : step === 1 ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111', marginBottom: 4 }}>Your property</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Enter the unit details — we&apos;ll pull the comparable sales for this building.</div>
              <input placeholder="Unit number (e.g. 302)" value={property.unit} onChange={e => setProperty(p => ({ ...p, unit: e.target.value }))} style={inp} />
              <input placeholder="Street address" value={property.address} onChange={e => setProperty(p => ({ ...p, address: e.target.value }))} style={inp} />
              <input placeholder="City" value={property.city} onChange={e => setProperty(p => ({ ...p, city: e.target.value }))} style={{ ...inp, marginBottom: 20 }} />
              <button onClick={() => setStep(2)} disabled={!property.address || !property.city}
                style={{ width: '100%', background: 'var(--brand-accent)', color: 'var(--brand-text)', border: 'none', padding: 13, borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: property.address && property.city ? 1 : 0.5 }}>
                Continue →
              </button>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111', marginBottom: 4 }}>Where should we reach you?</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{firstName} follows up within a few hours with your evaluation.</div>
              <input placeholder="Full name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inp} />
              <input placeholder="Phone number" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={inp} />
              <input placeholder="Email address" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={{ ...inp, marginBottom: 16 }} />
              {submitError && (
                <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{submitError}</div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(1)} disabled={submitting} style={{ flex: 1, background: '#f5f5f5', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: 13, borderRadius: 6, cursor: 'pointer' }}>← Back</button>
                <button onClick={handleSubmit} disabled={!form.name || !form.phone || submitting}
                  style={{ flex: 2, background: 'var(--brand-accent)', color: 'var(--brand-text)', border: 'none', padding: 13, borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer', opacity: form.name && form.phone && !submitting ? 1 : 0.5 }}>
                  {submitting ? 'Sending…' : 'Submit Request ✓'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
      {/* Agent header */}
      <div style={{ background: '#fff', borderTop: '3px solid var(--brand-accent)', padding: '20px 20px 16px', display: 'flex', gap: 14, alignItems: 'center' }}>
        {photoSrc && (
          <img src={photoSrc} alt={agent.name}
            style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 20%', border: '2.5px solid var(--brand-accent)', flexShrink: 0 }} />
        )}
        <div>
          <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15 }}>{agent.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: 0.5, marginBottom: 2 }}>{agent.brokerage}</div>
        </div>
      </div>

      <div style={{ padding: '18px 20px' }}>
        {listingAddress && (
          <div style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            📍 {listingAddress}
          </div>
        )}

        {sent ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Message sent!</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{firstName} will be in touch within a few hours.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>
              {mode === 'showing' ? 'Book a Showing' : 'Ask a Question'}
            </div>
            <input placeholder="Your name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inp} />
            <input placeholder="Phone number" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={inp} />
            <input placeholder="Email (optional)" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inp} />
            <textarea placeholder="Your message..." value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              rows={3} style={{ ...inp, resize: 'vertical', marginBottom: 12 }} />
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.agree} onChange={e => setForm(p => ({ ...p, agree: e.target.checked }))}
                style={{ marginTop: 2, accentColor: 'var(--brand-accent)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                I agree to the <a href="/terms" style={{ color: 'var(--brand-accent)' }}>Terms & Conditions</a> and consent to receive communications from {agent.name} {agent.brokerage}.
              </span>
            </label>
            {submitError && (
              <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{submitError}</div>
            )}
            <button onClick={handleSubmit} disabled={!form.name || !form.phone || !form.agree || submitting}
              style={{ width: '100%', background: 'var(--brand-accent)', color: 'var(--brand-text)', border: 'none', padding: 13, borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: submitting ? 'not-allowed' : 'pointer', opacity: form.name && form.phone && form.agree && !submitting ? 1 : 0.5 }}>
              {submitting ? 'Sending…' : mode === 'showing' ? 'Request a Showing' : 'Send Message'}
            </button>
          </>
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
