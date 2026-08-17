'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { authFetch, nextStepPath } from '@/lib/auth-client'

const COUNTRY_CODES = [
  { label: '🇨🇦 Canada (+1)',       value: '+1' },
  { label: '🇺🇸 United States (+1)', value: '+1' },
  { label: '🇬🇧 UK (+44)',           value: '+44' },
  { label: '🇦🇺 Australia (+61)',     value: '+61' },
  { label: 'Other',                  value: '+' },
]

function getErrorMsg(data: Record<string, unknown>): string {
  if (data.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors as Record<string, string[]>)[0]
    if (Array.isArray(first) && first[0]) return first[0]
  }
  return (data.message as string) || (data.error as string) || 'Something went wrong.'
}

export default function CompleteProfilePage() {
  const params = useParams()
  const slug = params.slug as string
  const router = useRouter()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [countryCode, setCountryCode] = useState('+1')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!phone.trim()) { setError('Please enter your phone number.'); return }
    setLoading(true)
    try {
      const res = await authFetch('/api/auth/complete-profile', {
        method: 'POST',
        body: JSON.stringify({
          first_name:          firstName.trim(),
          last_name:           lastName.trim(),
          phone:               phone.replace(/\D/g, ''),
          phone_country_code:  countryCode,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(getErrorMsg(data)); return }
      router.push(nextStepPath(slug, data.next_step))
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const accent = 'var(--accent)'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', background: 'var(--primary-bg)' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Progress bar — 3 steps */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {[{ s: 'done' }, { s: 'active' }, { s: 'inactive' }].map((seg, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: seg.s === 'done' ? accent : seg.s === 'active' ? '#3b82f6' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 28 }}>
          Step 2 of 3 — Add Your Details
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '48px 44px', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#1a1a1a' }}>Complete your profile</h2>
          <p style={{ margin: '0 0 28px', color: '#6b7280', fontSize: 14, lineHeight: 1.6 }}>
            We need a few more details so your agent can follow up with you.
          </p>

          {error && (
            <div style={{ background: '#fff0f0', border: '1px solid #fca5a5', borderRadius: 7, padding: '10px 14px', marginBottom: 18, color: '#c0392b', fontSize: 13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>First Name</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} required style={inputStyle} placeholder="Jane" />
              </div>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} required style={inputStyle} placeholder="Doe" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                  style={{ ...inputStyle, width: 'auto', minWidth: 130, flexShrink: 0 }}>
                  {COUNTRY_CODES.map(c => (
                    <option key={c.label} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
                  style={{ ...inputStyle, flex: 1 }} placeholder="604-555-1234" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ background: loading ? '#ccc' : 'var(--cta-primary)', color: 'var(--cta-primary-text)', border: 'none', borderRadius: 7, padding: '13px 0', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', width: '100%', opacity: loading ? 0.7 : 1, marginTop: 4, letterSpacing: 0.2 }}>
              {loading ? 'Saving…' : 'Continue →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#374151', letterSpacing: 0.2, marginBottom: 6, display: 'block' }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 7,
  fontSize: 14, color: '#1a1a1a', background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
}
