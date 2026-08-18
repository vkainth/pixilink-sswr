'use client'

import { useState } from 'react'
import type { AgentProfile } from '@/lib/types'
import { imgUrl } from '@/lib/types'

interface CoAgent {
  name: string
  photo: string
  phone: string
}

interface Props {
  agent: AgentProfile
  address: string
  price: string
  mlsNum?: string
  variant?: 'showing' | 'find-similar'
  subarea?: string
  coAgents?: CoAgent[]
}

export default function RequestShowingWidget({ agent, address, price, mlsNum, variant = 'showing', subarea, coAgents }: Props) {
  const [step, setStep] = useState(1)
  const [time, setTime] = useState('')
  const [realtor, setRealtor] = useState('')
  const [approved, setApproved] = useState('')
  const [form, setForm] = useState({ first: '', last: '', phone: '', email: '' })
  const [hp, setHp] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 400) : null
  const firstName = agent.name.split(' ')[0]
  const isFindSimilar = variant === 'find-similar'
  const areaLabel = subarea || 'the Area'
  const isDual = coAgents && coAgents.length > 0
  const coAgent = isDual ? coAgents![0] : null

  async function handleSubmit() {
    if (hp) return
    setError('')
    setSubmitting(true)
    try {
      const message = isFindSimilar
        ? `Interested in finding similar homes to ${address}${subarea ? ` in ${subarea}` : ''}.`
        : `Showing request — preferred time: ${time}; has agent: ${realtor}; financing: ${approved}.`
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${form.first} ${form.last}`.trim(),
          phone: form.phone,
          email: form.email,
          message,
          listing_address: address,
          agent_slug: agent.slug,
          form_type: 'w1',
          source_url: typeof window !== 'undefined' ? window.location.href : '',
          website_url: hp || undefined,
        }),
      })
      if (res.ok) {
        setDone(true)
      } else {
        setError('Something went wrong. Please try again or call directly.')
      }
    } catch {
      setError('Something went wrong. Please try again or call directly.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div style={{
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)',
        background: '#fff',
      }}>
        <div style={{ background: 'var(--brand-bg)', padding: '24px 24px 20px', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(var(--brand-overlay-rgb),0.15)', border: '2px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: 22, color: '#16a34a' }}>✓</div>
        </div>
        <div style={{ background: '#fff', padding: '20px 24px 24px', textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: '#1a1a1a', marginBottom: 8 }}>
            {isFindSimilar ? 'Request received!' : 'Showing request received!'}
          </div>
          <div style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
            {isFindSimilar
              ? `${form.first ? `${form.first}, we` : 'We'}'ll reach out with similar listings shortly.`
              : `${form.first ? `${form.first}, you` : 'You'}'ll hear back shortly. ${firstName} will confirm personally.`}
          </div>
          <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#6b7280' }}>
            {address} · {price}
          </div>
          <a href={`tel:${agent.phone}`} style={{ display: 'block', marginTop: 16, background: 'var(--brand-text)', color: 'var(--brand-bg)', borderRadius: 6, padding: '11px 0', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
            📞 {agent.phone}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      borderRadius: 10,
      overflow: 'hidden',
      border: '1px solid var(--border)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)',
      background: '#fff',
    }}>
      <input type="text" name="website_url" value={hp} onChange={e => setHp(e.target.value)} style={{ display: 'none' }} tabIndex={-1} autoComplete="off" aria-hidden="true" />

      {/* Agent header strip — always dark navy so white text is readable */}
      <div style={{ background: 'var(--brand-bg)', padding: '18px 20px 16px' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
          {isDual && coAgent ? (
            /* Dual-agent: two overlapping circles */
            <div style={{ position: 'relative', width: 88, height: 56, flexShrink: 0 }}>
              <div style={{ position: 'absolute', left: 0, top: 0, width: 54, height: 54, borderRadius: '50%', border: '2.5px solid rgba(var(--brand-overlay-rgb),0.28)', overflow: 'hidden', zIndex: 2, background: 'rgba(var(--brand-overlay-rgb),0.15)' }}>
                {photoSrc ? (
                  <img src={photoSrc} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${agent.photo_focal_x ?? 50}% ${agent.photo_focal_y ?? 0}%` }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-text)', fontWeight: 800, fontSize: 20 }}>{agent.name.charAt(0)}</div>
                )}
              </div>
              <div style={{ position: 'absolute', left: 34, top: 0, width: 54, height: 54, borderRadius: '50%', border: '2.5px solid rgba(var(--brand-overlay-rgb),0.28)', overflow: 'hidden', zIndex: 1, background: 'rgba(var(--brand-overlay-rgb),0.15)' }}>
                <img src={imgUrl(coAgent.photo, 400)} alt={coAgent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 0%' }} />
              </div>
            </div>
          ) : (
            /* Single agent */
            <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2.5px solid rgba(var(--brand-overlay-rgb),0.28)', overflow: 'hidden', flexShrink: 0 }}>
              {photoSrc ? (
                <img src={photoSrc} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${agent.photo_focal_x ?? 50}% ${agent.photo_focal_y ?? 0}%` }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'rgba(var(--brand-overlay-rgb),0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-text)', fontWeight: 800, fontSize: 22 }}>{agent.name.charAt(0)}</div>
              )}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--brand-text)', fontWeight: 700, fontSize: isDual ? 13 : 15, lineHeight: 1.2 }}>
              {isDual && coAgent ? `${agent.name} & ${coAgent.name}` : agent.name}
            </div>
            <div style={{ color: 'rgba(var(--brand-overlay-rgb),0.85)', fontSize: 11, marginBottom: 4 }}>{agent.brokerage}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'rgba(var(--brand-overlay-rgb),0.85)' }}>Usually responds quickly</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(var(--brand-overlay-rgb),0.85)', fontStyle: 'italic', marginBottom: 8 }}>
          {isDual ? 'We\u2019d love to show you this home' : 'I\u2019d love to show you this home'}
        </div>
        <a href={`tel:${agent.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--brand-text)', color: 'var(--brand-bg)', borderRadius: 6, padding: '9px 0', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
          📞 {agent.phone}
        </a>
      </div>

      {/* Form area */}
      <div style={{ background: '#fff', padding: '16px 20px 20px' }}>
        {isFindSimilar ? (
          <>
            <div style={{ display: 'inline-block', background: 'rgba(var(--brand-accent-rgb),0.10)', border: '1px solid rgba(var(--brand-accent-rgb),0.35)', borderRadius: 20, padding: '3px 12px', fontSize: 11, color: 'var(--text)', letterSpacing: '0.04em', marginBottom: 10 }}>
              • Find Similar Homes
            </div>
            <div style={{ color: '#1a1a1a', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Find Similar Homes in {areaLabel}</div>
            {mlsNum && <div style={{ color: '#6b7280', fontSize: 11.5, marginBottom: 16 }}>MLS® {mlsNum} · {price}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input placeholder="First name" value={form.first} onChange={e => setForm(p => ({ ...p, first: e.target.value }))} style={field} />
              <input placeholder="Last name" value={form.last} onChange={e => setForm(p => ({ ...p, last: e.target.value }))} style={field} />
            </div>
            <input placeholder="(604) 000-0000" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={{ ...field, width: '100%', boxSizing: 'border-box', marginBottom: 8 }} />
            <input placeholder="Email (optional)" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={{ ...field, width: '100%', boxSizing: 'border-box', marginBottom: 16 }} />
            {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>{error}</div>}
            <button onClick={handleSubmit} disabled={!form.first || !form.phone || submitting} style={{ ...cta(!!(form.first && form.phone) && !submitting), width: '100%' }}>
              {submitting ? 'Sending…' : 'Find Similar Homes ✓'}
            </button>
            <div style={{ fontSize: 10.5, color: '#6b7280', marginTop: 12, lineHeight: 1.5 }}>
              By submitting, you consent to be contacted by {agent.name}, {agent.brokerage}.
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'inline-block', background: 'rgba(var(--brand-accent-rgb),0.10)', border: '1px solid rgba(var(--brand-accent-rgb),0.35)', borderRadius: 20, padding: '3px 12px', fontSize: 11, color: 'var(--text)', letterSpacing: '0.04em', marginBottom: 10, fontWeight: 600 }}>
              🗓 Book a Showing
            </div>
            <div style={{ color: '#1a1a1a', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Schedule Your Private Tour</div>
            {mlsNum && <div style={{ color: '#6b7280', fontSize: 11.5, marginBottom: 6 }}>MLS® {mlsNum} · {price}</div>}
            <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 14 }}>Most buyers tour within 48 hours of inquiring</div>

            <div style={{ display: 'flex', gap: 3, margin: '14px 0 8px' }}>
              {[1, 2, 3, 4].map(s => (
                <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= s ? 'var(--brand-accent)' : '#e5e7eb', transition: 'background 0.25s' }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 14 }}>Step {step} of 4</div>

            {step === 1 && (
              <div>
                <div style={{ color: '#1a1a1a', fontWeight: 600, fontSize: 14, marginBottom: 3 }}>When would you like to visit?</div>
                <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 14 }}>Pick a window — I&apos;ll confirm the exact time.</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {[['Morning', '9am–12pm'], ['Afternoon', '12–5pm'], ['Evening', '5–7pm']].map(([label, sub]) => (
                    <button key={label} onClick={() => setTime(label)} style={{
                      padding: '12px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                      background: time === label ? 'rgba(var(--brand-accent-rgb),0.08)' : '#f9fafb',
                      border: `1.5px solid ${time === label ? 'var(--brand-accent)' : '#e5e7eb'}`,
                      color: time === label ? '#1a1a1a' : '#6b7280',
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{label}</div>
                      <div style={{ fontSize: 11, marginTop: 2, color: time === label ? '#4b5563' : '#6b7280' }}>{sub}</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setStep(2)} disabled={!time} style={cta(!!time)}>Continue →</button>
              </div>
            )}

            {step === 2 && (
              <div>
                <div style={{ color: '#1a1a1a', fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Are you working with an agent?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {[['✓ Yes, I have an agent', 'yes'], ['✗ No, not yet', 'no']].map(([label, val]) => (
                    <button key={val} onClick={() => setRealtor(val)} style={opt(realtor === val)}>{label}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setStep(1)} style={back}>← Back</button>
                  <button onClick={() => setStep(3)} disabled={!realtor} style={cta(!!realtor)}>Continue →</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div style={{ color: '#1a1a1a', fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Are you pre-approved for a mortgage?</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                  {[['✓ Yes, pre-approved', 'yes'], ['↻ In progress', 'progress'], ['✗ Not yet', 'no'], ['★ Cash purchase', 'cash']].map(([label, val]) => (
                    <button key={val} onClick={() => setApproved(val)} style={opt(approved === val)}>{label}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setStep(2)} style={back}>← Back</button>
                  <button onClick={() => setStep(4)} disabled={!approved} style={cta(!!approved)}>Continue →</button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <div style={{ color: '#1a1a1a', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Last step — how do we reach you?</div>
                <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 16 }}>{firstName} will call or text to confirm.</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <input placeholder="First name" value={form.first} onChange={e => setForm(p => ({ ...p, first: e.target.value }))} style={field} />
                  <input placeholder="Last name" value={form.last} onChange={e => setForm(p => ({ ...p, last: e.target.value }))} style={field} />
                </div>
                <input placeholder="(604) 000-0000" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={{ ...field, width: '100%', boxSizing: 'border-box', marginBottom: 8 }} />
                <input placeholder="Email (optional)" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={{ ...field, width: '100%', boxSizing: 'border-box', marginBottom: 16 }} />
                {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>{error}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setStep(3)} style={back}>← Back</button>
                  <button onClick={handleSubmit} disabled={!form.first || !form.phone || submitting} style={cta(!!(form.first && form.phone) && !submitting)}>
                    {submitting ? 'Sending…' : 'Send Request ✓'}
                  </button>
                </div>
                <div style={{ fontSize: 10.5, color: '#6b7280', marginTop: 12, lineHeight: 1.5 }}>
                  By submitting, you consent to be contacted by {agent.name}, {agent.brokerage}.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const cta = (active: boolean): React.CSSProperties => ({
  flex: 1, width: '100%',
  background: active ? 'var(--brand-accent)' : '#e5e7eb',
  color: active ? 'var(--brand-text)' : '#6b7280',
  border: 'none', padding: '13px', borderRadius: 7,
  fontWeight: 700, fontSize: 14, cursor: active ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
})
const back: React.CSSProperties = {
  flex: '0 0 auto', background: '#f3f4f6', color: '#6b7280', border: 'none',
  padding: '13px 18px', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer',
}
const opt = (active: boolean): React.CSSProperties => ({
  padding: '13px 16px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
  background: active ? 'rgba(var(--brand-accent-rgb),0.08)' : '#f9fafb',
  border: `1.5px solid ${active ? 'var(--brand-accent)' : '#e5e7eb'}`,
  color: active ? '#1a1a1a' : '#6b7280', fontWeight: active ? 700 : 400, fontSize: 14,
  fontFamily: 'inherit',
})
const field: React.CSSProperties = {
  padding: '11px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13,
  background: '#fff', color: '#1a1a1a', fontFamily: 'inherit', outline: 'none',
}
