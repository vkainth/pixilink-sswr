'use client'

import { useState } from 'react'
import type { AgentProfile } from '@/lib/types'
import { imgUrl } from '@/lib/types'

interface Props {
  agent: AgentProfile
  neighbourhood?: string
  onDone?: () => void
  formType?: string
  formTitle?: string
  formBadge?: string
  /** Extra fields merged into the /api/contact POST body — e.g. ad attribution (utm/gclid/fbclid). */
  extraFields?: Record<string, string | undefined>
}

const inp: React.CSSProperties = {
  width: '100%',
  padding: '11px 12px',
  border: '1px solid var(--border)',
  borderRadius: 6,
  fontSize: 13,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  background: '#fff',
  color: 'var(--text)',
  outline: 'none',
  marginBottom: 10,
}

export default function W2HomeEvaluation({
  agent,
  neighbourhood = 'Your Neighbourhood',
  onDone,
  formType = 'w2',
  formTitle,
  formBadge,
  extraFields,
}: Props) {
  const [step, setStep] = useState(1)
  const [addr, setAddr] = useState({ address: '', city: '', unit: '' })
  const [name, setName] = useState({ first: '', last: '' })
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [hp, setHp] = useState('')

  const firstName = agent.name.split(' ')[0]
  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 400) : null

  const isBuyer = formType === 'buyer'

  const reasons = isBuyer
    ? [
        'Looking to buy soon (0–3 months)',
        'Exploring the market',
        'Need pre-approval advice',
        'Relocating to the area',
        'Other',
      ]
    : [
        'Thinking of selling',
        'Curious about my home\'s value',
        'Reviewing finances / refinancing',
        'Estate / separation purposes',
        'Other',
      ]

  const stepHeadings = isBuyer
    ? [
        'Where are you looking to buy?',
        "What's your name?",
        'Best number to reach you?',
        'Where should we send info?',
      ]
    : [
        "What's your property address?",
        "What's your name?",
        'Best number to reach you?',
        'Where should we send your valuation?',
      ]

  const stepSubs = isBuyer
    ? [
        'Let us know your target area and budget range.',
        `So ${firstName} knows how to address your inquiry.`,
        `${firstName} will call or text you within a few hours.`,
        `Optional — we'll call you. Add email to receive listings by email too.`,
      ]
    : [
        'Your address lets us research recent local sales for an accurate comparison.',
        'So we know how to address your valuation report.',
        `${firstName} will call or text you with your valuation within 24–48 hours.`,
        'Optional email — we\'ll call you with the results. Add email for a PDF copy too.',
      ]

  const resolvedTitle = formTitle ?? `What's Your ${neighbourhood} Home Worth?`
  const resolvedBadge = formBadge ?? 'FREE VALUATION'
  const doneTitle = isBuyer ? 'Inquiry sent!' : 'Valuation request sent!'
  const doneBody = isBuyer
    ? `${firstName} will review your details and reach out within a few hours.`
    : `${firstName} will review your property details and get back to you within 24–48 hours.`
  const submitLabel = isBuyer ? 'Send My Inquiry ✓' : 'Get My Free Valuation ✓'

  if (done) {
    return (
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: 32, textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#eaf6ef', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 22, color: '#059669' }}>✓</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 8 }}>{doneTitle}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>{doneBody}</div>
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <input type="text" name="website_url" value={hp} onChange={e => setHp(e.target.value)} style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div style={{ background: 'var(--brand-bg)', padding: '14px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {photoSrc ? (
              <img src={photoSrc} alt={agent.name} style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.28)', objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{agent.name.charAt(0)}</div>
            )}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{agent.name}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.85)' }}>{agent.brokerage}</div>
              <a href={`tel:${agent.phone}`} style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontWeight: 500 }}>{agent.phone}</a>
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(247,148,29,0.15)', border: '0.5px solid rgba(247,148,29,0.4)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.03em', flexShrink: 0 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />
            {resolvedBadge}
          </div>
        </div>
        <div style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 500, lineHeight: 1.25, marginBottom: 2 }}>
          {resolvedTitle}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11.5 }}>
          {isBuyer ? 'Free · No pressure · Quick response' : 'Free · No obligation · Results in 24–48 hours'}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= s ? '#ffffff' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s' }} />
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{stepHeadings[step - 1]}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>{stepSubs[step - 1]}</div>

        {step === 1 && (
          <>
            {isBuyer ? (
              <>
                <input placeholder="Target area (e.g. Coquitlam, Port Moody)" value={addr.address} onChange={e => setAddr(p => ({ ...p, address: e.target.value }))} style={inp} />
                <input placeholder="Budget range (e.g. $700k–$900k)" value={addr.city} onChange={e => setAddr(p => ({ ...p, city: e.target.value }))} style={inp} />
              </>
            ) : (
              <>
                <input placeholder="e.g. 310 Salter Street" value={addr.address} onChange={e => setAddr(p => ({ ...p, address: e.target.value }))} style={inp} />
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 16 }}>
                  <input placeholder="City" value={addr.city} onChange={e => setAddr(p => ({ ...p, city: e.target.value }))} style={{ padding: '11px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff' }} />
                  <input placeholder="Unit (opt)" value={addr.unit} onChange={e => setAddr(p => ({ ...p, unit: e.target.value }))} style={{ padding: '11px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff' }} />
                </div>
              </>
            )}
            <button onClick={() => setStep(2)} disabled={!addr.address || !addr.city}
              style={{ width: '100%', background: '#16a34a', color: '#ffffff', border: 'none', padding: 13, borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: addr.address && addr.city ? 1 : 0.5, fontFamily: 'inherit' }}>
              Continue →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <input placeholder="First name" value={name.first} onChange={e => setName(p => ({ ...p, first: e.target.value }))} style={{ padding: '11px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff' }} />
              <input placeholder="Last name" value={name.last} onChange={e => setName(p => ({ ...p, last: e.target.value }))} style={{ padding: '11px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, background: 'var(--off-white)', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: 13, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
              <button onClick={() => setStep(3)} disabled={!name.first || !name.last}
                style={{ flex: 2, background: '#16a34a', color: '#ffffff', border: 'none', padding: 13, borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: name.first && name.last ? 1 : 0.5, fontFamily: 'inherit' }}>
                Continue →
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <input placeholder="(604) 000-0000" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              style={{ ...inp }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, background: 'var(--off-white)', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: 13, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
              <button onClick={() => setStep(4)} disabled={!phone}
                style={{ flex: 2, background: '#16a34a', color: '#ffffff', border: 'none', padding: 13, borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: phone ? 1 : 0.5, fontFamily: 'inherit' }}>
                Continue →
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div style={{ background: 'var(--off-white)', padding: '10px 14px', borderRadius: 6, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              {isBuyer
                ? `${addr.address} · ${addr.city}`
                : `${addr.unit ? `${addr.unit} – ` : ''}${addr.address}, ${addr.city}`}
            </div>
            <input placeholder={isBuyer ? 'Email (optional — for listing alerts)' : 'Email (optional — for PDF copy)'} type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
            <select value={reason} onChange={e => setReason(e.target.value)}
              style={{ width: '100%', padding: '11px 12px', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 20, fontSize: 13, background: '#fff', color: reason ? 'var(--text)' : 'var(--text-muted)', fontFamily: 'inherit' }}>
              <option value="">{isBuyer ? 'What stage are you at? (optional)' : 'Why are you getting a valuation? (optional)'}</option>
              {reasons.map(r => <option key={r}>{r}</option>)}
            </select>
            {submitError && (
              <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{submitError}</div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(3)} style={{ flex: 1, background: 'var(--off-white)', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: 13, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
              <button
                disabled={submitting || !name.first.trim()}
                onClick={async () => {
                  const fullName = `${name.first} ${name.last}`.trim()
                  if (!fullName) {
                    setSubmitError('Please go back and enter your name.')
                    return
                  }
                  setSubmitting(true)
                  setSubmitError('')
                  try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/contact`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        agent_slug: agent.slug,
                        name: `${name.first} ${name.last}`.trim(),
                        first_name: name.first,
                        last_name: name.last,
                        phone,
                        email: email || undefined,
                        message: isBuyer
                          ? `Buyer inquiry: looking in ${addr.address}, budget ${addr.city}`
                          : `Home valuation request for ${addr.unit ? `${addr.unit} – ` : ''}${addr.address}, ${addr.city}`,
                        form_type: formType,
                        property_address: isBuyer ? undefined : `${addr.unit ? `${addr.unit} – ` : ''}${addr.address}, ${addr.city}`,
                        valuation_reason: reason || undefined,
                        source_url: typeof window !== 'undefined' ? window.location.href : '',
                        website_url: hp || undefined,
                        ...extraFields,
                      }),
                    })
                    if (res.ok) {
                      setDone(true)
                      onDone?.()
                    } else {
                      setSubmitError('Something went wrong. Please try again or call us directly.')
                    }
                  } catch {
                    setSubmitError('Something went wrong. Please try again or call us directly.')
                  } finally {
                    setSubmitting(false)
                  }
                }}
                style={{ flex: 2, background: '#16a34a', color: '#ffffff', border: 'none', padding: 13, borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: (submitting || !name.first.trim()) ? 'not-allowed' : 'pointer', opacity: (submitting || !name.first.trim()) ? 0.5 : 1, fontFamily: 'inherit' }}>
                {submitting ? 'Sending…' : submitLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
