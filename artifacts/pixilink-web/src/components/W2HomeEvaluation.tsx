'use client'

import { useState } from 'react'
import type { AgentProfile } from '@/lib/types'
import { imgUrl } from '@/lib/types'

interface Props {
  agent: AgentProfile
  neighbourhood?: string
  compact?: boolean
}

export default function W2HomeEvaluation({ agent, neighbourhood = '', compact }: Props) {
  const [step, setStep] = useState(1)
  const [addr, setAddr] = useState({ address: '', city: 'Surrey', unit: '' })
  const [name, setName] = useState({ first: '', last: '' })
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const accent = agent.theme_color || '#111111'
  const navBg = agent.primary_bg_color || '#111111'
  const border = '#e2e8f0'
  const muted = '#64748b'
  const text = '#1a1a1a'
  const white = '#fff'
  const alt = '#f8f7f4'

  const inp: React.CSSProperties = {
    width: '100%', padding: '11px 12px', border: `1px solid ${border}`,
    borderRadius: 6, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none',
  }

  const reasons = ['Thinking of selling', 'Curious about my home\'s value', 'Reviewing finances / refinancing', 'Estate / separation purposes', 'Other']
  const stepHeadings = ["What's your property address?", "What's your name?", 'Best number to reach you?', 'Where should we send your valuation?']
  const stepSubs = [
    'Your address lets us research recent local sales for an accurate comparison.',
    'So we know how to address your valuation report.',
    `${agent.name.split(' ')[0]} will call or text you with your valuation within 24–48 hours.`,
    'Optional email — we\'ll call you with the results. Add email for a PDF copy too.',
  ]

  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 400) : null

  if (done) return (
    <div style={{ background: white, border: `1px solid ${border}`, borderRadius: 10, padding: 32, textAlign: 'center', fontFamily: 'inherit' }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#eaf6ef', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 24 }}>🏠</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: text, marginBottom: 8 }}>Valuation request sent!</div>
      <div style={{ color: muted, fontSize: 14, lineHeight: 1.6 }}>
        We&apos;ll review your property details and get back to you within 24–48 hours.
      </div>
    </div>
  )

  return (
    <div style={{ background: white, border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden', maxWidth: compact ? 400 : '100%', fontFamily: 'inherit' }}>
      <div style={{ background: navBg, padding: '14px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${accent}`, overflow: 'hidden', flexShrink: 0, background: '#2a2a2a' }}>
              {photoSrc && <img src={photoSrc} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '0.01em' }}>{agent.name}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.85)' }}>{agent.brokerage}</div>
              <a href={`tel:${agent.phone}`} style={{ fontSize: 11, color: accent, textDecoration: 'none', fontWeight: 500 }}>{agent.phone}</a>
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.12)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: accent, letterSpacing: '0.03em', flexShrink: 0 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: accent }} />
            FREE VALUATION
          </div>
        </div>
        <div style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 500, lineHeight: 1.25, marginBottom: 2 }}>
          {neighbourhood ? `What Is Your ${neighbourhood} Home Worth?` : 'What Is Your Home Worth?'}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11.5 }}>Free · No obligation · Results in 24–48 hours</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= s ? accent : 'rgba(255,255,255,0.15)', transition: 'background 0.2s' }} />
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: text, marginBottom: 4 }}>{stepHeadings[step - 1]}</div>
        <div style={{ fontSize: 13, color: muted, marginBottom: 18 }}>{stepSubs[step - 1]}</div>

        {step === 1 && (
          <>
            <input placeholder="e.g. 310 Salter Street" value={addr.address} onChange={e => setAddr(p => ({ ...p, address: e.target.value }))} style={{ ...inp, marginBottom: 10 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 20 }}>
              <input placeholder="City" value={addr.city} onChange={e => setAddr(p => ({ ...p, city: e.target.value }))} style={{ padding: '11px 12px', border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
              <input placeholder="Unit (opt)" value={addr.unit} onChange={e => setAddr(p => ({ ...p, unit: e.target.value }))} style={{ padding: '11px 12px', border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
            </div>
            <button onClick={() => setStep(2)} disabled={!addr.address || !addr.city}
              style={{ width: '100%', background: accent, color: navBg, border: 'none', padding: 13, borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: addr.address && addr.city ? 1 : 0.5, fontFamily: 'inherit' }}>
              Continue →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <input placeholder="First name" value={name.first} onChange={e => setName(p => ({ ...p, first: e.target.value }))} style={{ padding: '11px 12px', border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
              <input placeholder="Last name" value={name.last} onChange={e => setName(p => ({ ...p, last: e.target.value }))} style={{ padding: '11px 12px', border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, background: alt, color: muted, border: `1px solid ${border}`, padding: 13, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
              <button onClick={() => setStep(3)} disabled={!name.first || !name.last}
                style={{ flex: 2, background: accent, color: navBg, border: 'none', padding: 13, borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: name.first && name.last ? 1 : 0.5, fontFamily: 'inherit' }}>
                Continue →
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <select style={{ padding: '11px 8px', border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}><option>🇨🇦 +1</option><option>🇺🇸 +1</option></select>
              <input placeholder="(604) 000-0000" value={phone} onChange={e => setPhone(e.target.value)}
                style={{ flex: 1, padding: '11px 12px', border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, background: alt, color: muted, border: `1px solid ${border}`, padding: 13, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
              <button onClick={() => setStep(4)} disabled={!phone}
                style={{ flex: 2, background: accent, color: navBg, border: 'none', padding: 13, borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: phone ? 1 : 0.5, fontFamily: 'inherit' }}>
                Continue →
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div style={{ background: alt, padding: '10px 14px', borderRadius: 6, fontSize: 13, color: muted, marginBottom: 16 }}>
              🏠 {addr.unit ? `${addr.unit} – ` : ''}{addr.address}, {addr.city}
            </div>
            <input placeholder="Email (optional — for PDF copy)" value={email} onChange={e => setEmail(e.target.value)} style={{ ...inp, marginBottom: 10 }} />
            <select value={reason} onChange={e => setReason(e.target.value)}
              style={{ width: '100%', padding: '11px 12px', border: `1px solid ${border}`, borderRadius: 6, marginBottom: 20, fontSize: 13, background: white, color: reason ? text : muted, fontFamily: 'inherit' }}>
              <option value="">Why are you getting a valuation? (optional)</option>
              {reasons.map(r => <option key={r}>{r}</option>)}
            </select>
            {submitError && (
              <div style={{ color: '#c0392b', fontSize: 12, marginBottom: 10 }}>{submitError}</div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(3)} disabled={submitting} style={{ flex: 1, background: alt, color: muted, border: `1px solid ${border}`, padding: 13, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
              <button
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true)
                  setSubmitError('')
                  try {
                    const res = await fetch('/api/contact', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        agent_slug: agent.slug,
                        name: `${name.first} ${name.last}`.trim(),
                        phone,
                        email: email || undefined,
                        message: `Home valuation request — ${addr.unit ? `${addr.unit} – ` : ''}${addr.address}, ${addr.city}${reason ? ` — Reason: ${reason}` : ''}`,
                        form_type: 'home_evaluation',
                        property_address: `${addr.unit ? `${addr.unit} – ` : ''}${addr.address}, ${addr.city}`,
                        valuation_reason: reason || undefined,
                      }),
                    })
                    if (res.ok) {
                      setDone(true)
                    } else {
                      setSubmitError('Something went wrong. Please try calling directly.')
                    }
                  } catch {
                    setSubmitError('Something went wrong. Please try calling directly.')
                  } finally {
                    setSubmitting(false)
                  }
                }}
                style={{ flex: 2, background: accent, color: navBg, border: 'none', padding: 13, borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1, fontFamily: 'inherit' }}>
                {submitting ? 'Sending…' : 'Get My Free Valuation ✓'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
