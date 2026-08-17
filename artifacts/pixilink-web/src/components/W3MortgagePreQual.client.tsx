'use client'

import { useState } from 'react'
import type { AgentProfile } from '@/lib/types'
import { imgUrl } from '@/lib/types'

const LARAVEL_BASE = process.env.NEXT_PUBLIC_LARAVEL_URL || 'https://bccondosandhomes.com'

interface Props {
  agent: AgentProfile
}

const sel: React.CSSProperties = {
  width: '100%',
  padding: '11px 12px',
  border: '1px solid var(--border)',
  borderRadius: 6,
  fontSize: 13,
  background: '#fff',
  color: 'var(--text)',
  marginBottom: 10,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

function OptionBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 16px',
      border: `1.5px solid ${active ? 'var(--brand-accent)' : 'var(--border)'}`,
      background: active ? 'color-mix(in srgb, var(--brand-accent) 12%, transparent)' : '#fff',
      color: active ? 'var(--text)' : 'var(--text-muted)',
      borderRadius: 6,
      fontSize: 13,
      cursor: 'pointer',
      fontWeight: active ? 600 : 400,
      textAlign: 'left',
      fontFamily: 'inherit',
    }}>
      {children}
    </button>
  )
}

export default function W3MortgagePreQual({ agent }: Props) {
  const [flow, setFlow] = useState<'qualify' | 'refinance'>('qualify')
  const [step, setStep] = useState(1)

  const [priceRange, setPriceRange] = useState('')
  const [down, setDown] = useState('')
  const [propType, setPropType] = useState('')
  const [income, setIncome] = useState('')
  const [employment, setEmployment] = useState('')
  const [credit, setCredit] = useState('')

  const [homeValue, setHomeValue] = useState('')
  const [mortgageBalance, setMortgageBalance] = useState('')
  const [refCity, setRefCity] = useState('')
  const [refGoal, setRefGoal] = useState('')
  const [timeline, setTimeline] = useState('')
  const [refIncome, setRefIncome] = useState('')
  const [refEmployment, setRefEmployment] = useState('')
  const [refCredit, setRefCredit] = useState('')

  const [form, setForm] = useState({ first: '', last: '', phone: '', email: '' })
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [hp, setHp] = useState('')

  const firstName = agent.name.split(' ')[0]
  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 400) : null

  const switchFlow = (f: 'qualify' | 'refinance') => {
    setFlow(f); setStep(1)
    setPriceRange(''); setDown(''); setPropType(''); setIncome(''); setEmployment(''); setCredit('')
    setHomeValue(''); setMortgageBalance(''); setRefCity(''); setRefGoal('')
    setTimeline(''); setRefIncome(''); setRefEmployment(''); setRefCredit('')
  }

  const prevStep = () => setStep(s => Math.max(1, s - 1))
  const backBtn: React.CSSProperties = { flex: 1, background: 'var(--off-white)', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: 13, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }
  const nextBtn = (enabled: boolean): React.CSSProperties => ({ flex: 2, background: '#16a34a', color: '#ffffff', border: 'none', padding: 13, borderRadius: 6, fontWeight: 700, cursor: 'pointer', opacity: enabled ? 1 : 0.5, fontFamily: 'inherit' })

  if (done) {
    return (
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: 32, textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#eaf6ef', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 22, color: '#059669' }}>✓</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>Request received!</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
          {firstName} will connect you with a specialist within 6 hours during business hours.
        </div>
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.12)', border: '0.5px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.03em', flexShrink: 0 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />
            MORTGAGE HELP
          </div>
        </div>
        <div style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 500, lineHeight: 1.25, marginBottom: 2 }}>Mortgage Pre-Qualification</div>
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11.5 }}>Free · Confidential · Response within 6 hrs</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {(['qualify', 'refinance'] as const).map(f => (
            <button key={f} onClick={() => switchFlow(f)}
              style={{ flex: 1, padding: '7px 10px', border: 'none', borderRadius: 5, background: flow === f ? '#fff' : 'rgba(255,255,255,0.1)', color: flow === f ? 'var(--brand-bg)' : 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: flow === f ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
              {f === 'qualify' ? 'Pre-Qualification' : 'Refinance / HELOC'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= s ? '#ffffff' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s' }} />
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {flow === 'qualify' && (<>
          {step === 1 && (<>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>About your purchase</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Rough estimates are fine — we match you to the right lender.</div>
            <select value={priceRange} onChange={e => setPriceRange(e.target.value)} style={sel}>
              <option value="">Purchase price range</option>
              {['Under $400,000', '$400,000–$600,000', '$600,000–$800,000', '$800,000–$1,000,000', '$1,000,000–$1,500,000', 'Over $1,500,000'].map(v => <option key={v}>{v}</option>)}
            </select>
            <select value={down} onChange={e => setDown(e.target.value)} style={sel}>
              <option value="">Down payment</option>
              {['Less than 5%', '5%–9%', '10%–19%', '20% or more', 'Not sure yet'].map(v => <option key={v}>{v}</option>)}
            </select>
            <button onClick={() => setStep(2)} disabled={!priceRange || !down}
              style={{ width: '100%', background: '#16a34a', color: '#ffffff', border: 'none', padding: 13, borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: priceRange && down ? 1 : 0.5, fontFamily: 'inherit' }}>
              Continue →
            </button>
          </>)}
          {step === 2 && (<>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16 }}>What type of property?</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
              {['Detached Home', 'Condo', 'Apartment', 'Townhouse', 'Investment'].map(v => (
                <OptionBtn key={v} active={propType === v} onClick={() => setPropType(v)}>{v}</OptionBtn>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={prevStep} style={backBtn}>← Back</button>
              <button onClick={() => setStep(3)} disabled={!propType} style={nextBtn(!!propType)}>Continue →</button>
            </div>
          </>)}
          {step === 3 && (<>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>Your financial picture</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Kept confidential. Used to identify your best-fit lenders.</div>
            <select value={income} onChange={e => setIncome(e.target.value)} style={sel}>
              <option value="">Annual household income</option>
              {['Under $60,000', '$60,000–$100,000', '$100,000–$150,000', '$150,000–$200,000', 'Over $200,000'].map(v => <option key={v}>{v}</option>)}
            </select>
            <select value={employment} onChange={e => setEmployment(e.target.value)} style={sel}>
              <option value="">Employment status</option>
              {['Employed (Salaried)', 'Self-Employed', 'Contract / Freelance', 'Retired', 'Other'].map(v => <option key={v}>{v}</option>)}
            </select>
            <select value={credit} onChange={e => setCredit(e.target.value)} style={sel}>
              <option value="">Credit score</option>
              {['Excellent (740+)', 'Good (700–739)', 'Fair (640–699)', 'Below 640', 'Not sure'].map(v => <option key={v}>{v}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={prevStep} style={backBtn}>← Back</button>
              <button onClick={() => setStep(4)} disabled={!income || !employment || !credit} style={nextBtn(!!(income && employment && credit))}>Continue →</button>
            </div>
          </>)}
        </>)}

        {flow === 'refinance' && (<>
          {step === 1 && (<>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>About your current property</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>We use this to estimate your available equity and rate options.</div>
            <select value={homeValue} onChange={e => setHomeValue(e.target.value)} style={sel}>
              <option value="">Estimated home value</option>
              {['Under $400,000', '$400,000–$700,000', '$700,000–$1,000,000', '$1,000,000–$1,500,000', 'Over $1,500,000'].map(v => <option key={v}>{v}</option>)}
            </select>
            <select value={mortgageBalance} onChange={e => setMortgageBalance(e.target.value)} style={sel}>
              <option value="">Remaining mortgage balance</option>
              {['Under $200,000', '$200,000–$400,000', '$400,000–$600,000', 'Over $600,000'].map(v => <option key={v}>{v}</option>)}
            </select>
            <select value={refCity} onChange={e => setRefCity(e.target.value)} style={sel}>
              <option value="">City / neighbourhood</option>
              {['Vancouver', 'Burnaby', 'Richmond', 'Surrey', 'Coquitlam', 'Port Moody', 'Port Coquitlam', 'New Westminster', 'Langley', 'Abbotsford', 'South Surrey', 'White Rock', 'Other'].map(v => <option key={v}>{v}</option>)}
            </select>
            <button onClick={() => setStep(2)} disabled={!homeValue || !mortgageBalance}
              style={{ width: '100%', background: '#16a34a', color: '#ffffff', border: 'none', padding: 13, borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: homeValue && mortgageBalance ? 1 : 0.5, fontFamily: 'inherit' }}>
              Continue →
            </button>
          </>)}
          {step === 2 && (<>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>Your refinance goal</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Select your primary reason — we tailor lender options accordingly.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Lower My Rate', sub: 'Reduce monthly payments' },
                { label: 'Access Equity', sub: 'Cash out for renos, investment' },
                { label: 'Shorter Term', sub: 'Pay off faster' },
                { label: 'Consolidate Debt', sub: 'Roll debts into mortgage' },
              ].map(({ label, sub }) => (
                <button key={label} onClick={() => setRefGoal(label)}
                  style={{ padding: '10px 16px', border: `1.5px solid ${refGoal === label ? 'var(--brand-accent)' : 'var(--border)'}`, background: refGoal === label ? 'color-mix(in srgb, var(--brand-accent) 12%, transparent)' : '#fff', color: 'var(--text)', borderRadius: 6, fontSize: 13, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontWeight: 700 }}>{label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</span>
                </button>
              ))}
            </div>
            <select value={timeline} onChange={e => setTimeline(e.target.value)} style={sel}>
              <option value="">When are you looking to refinance?</option>
              {['ASAP — my renewal is coming up', 'Within 3 months', '3–6 months', 'Just exploring options'].map(v => <option key={v}>{v}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={prevStep} style={backBtn}>← Back</button>
              <button onClick={() => setStep(3)} disabled={!refGoal || !timeline} style={nextBtn(!!(refGoal && timeline))}>Continue →</button>
            </div>
          </>)}
          {step === 3 && (<>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>Your financial profile</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Kept confidential — helps lenders assess your refinance options.</div>
            <select value={refIncome} onChange={e => setRefIncome(e.target.value)} style={sel}>
              <option value="">Annual household income</option>
              {['Under $60,000', '$60,000–$100,000', '$100,000–$150,000', '$150,000–$200,000', 'Over $200,000'].map(v => <option key={v}>{v}</option>)}
            </select>
            <select value={refEmployment} onChange={e => setRefEmployment(e.target.value)} style={sel}>
              <option value="">Employment status</option>
              {['Employed (Salaried)', 'Self-Employed', 'Contract / Freelance', 'Retired', 'Other'].map(v => <option key={v}>{v}</option>)}
            </select>
            <select value={refCredit} onChange={e => setRefCredit(e.target.value)} style={sel}>
              <option value="">Credit score</option>
              {['Excellent (740+)', 'Good (700–739)', 'Fair (640–699)', 'Below 640', 'Not sure'].map(v => <option key={v}>{v}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={prevStep} style={backBtn}>← Back</button>
              <button onClick={() => setStep(4)} disabled={!refIncome || !refEmployment || !refCredit} style={nextBtn(!!(refIncome && refEmployment && refCredit))}>Continue →</button>
            </div>
          </>)}
        </>)}

        {step === 4 && (<>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>Where should we reach you?</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>A specialist follows up within 6 hours during business hours.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <input placeholder="First name" value={form.first} onChange={e => setForm(p => ({ ...p, first: e.target.value }))}
              style={{ padding: '11px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff' }} />
            <input placeholder="Last name" value={form.last} onChange={e => setForm(p => ({ ...p, last: e.target.value }))}
              style={{ padding: '11px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff' }} />
          </div>
          <input placeholder="(604) 000-0000" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={sel} />
          <input placeholder="Email address" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={{ ...sel, marginBottom: 20 }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={prevStep} style={backBtn}>← Back</button>
            <button
              disabled={!form.first || !form.phone || !form.email || submitting}
              onClick={async () => {
                setSubmitting(true)
                setSubmitError('')
                const notes = flow === 'qualify'
                  ? { flow: 'qualify', price_range: priceRange, down_payment: down, property_type: propType, income, employment, credit }
                  : { flow: 'refinance', home_value: homeValue, mortgage_balance: mortgageBalance, city: refCity, goal: refGoal, timeline, income: refIncome, employment: refEmployment, credit: refCredit }
                try {
                  const res = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: `${form.first} ${form.last}`.trim(),
                      phone: form.phone,
                      email: form.email,
                      agent_slug: agent.slug,
                      form_type: 'w3',
                      source_url: typeof window !== 'undefined' ? window.location.href : '',
                      notes: JSON.stringify(notes),
                      website_url: hp || undefined,
                    }),
                  })
                  if (res.ok) {
                    setDone(true)
                  } else {
                    setSubmitError('Something went wrong. Please try again.')
                  }
                } catch {
                  setSubmitError('Something went wrong. Please try again.')
                } finally {
                  setSubmitting(false)
                }
              }}
              style={{ flex: 2, background: '#16a34a', color: '#ffffff', border: 'none', padding: 13, borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: submitting ? 'default' : 'pointer', opacity: form.first && form.phone && form.email && !submitting ? 1 : 0.5, fontFamily: 'inherit' }}>
              {submitting ? 'Submitting…' : 'Submit Request ✓'}
            </button>
          </div>
          {submitError && <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626' }}>{submitError}</div>}
        </>)}
      </div>
    </div>
  )
}
