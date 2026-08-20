'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authFetch, nextStepPath, consumeReturnTo, peekReturnTo, parseSourceContext } from '@/lib/auth-client'
import AuthSplitLayout from '@/components/AuthSplitLayout'
import type { AgentProfile } from '@/lib/types'

// Three steps: form -> phone OTP -> MLS VOW terms (board compliance, always shown).
const STEPS = [
  { state: 'active' as const },
  { state: 'inactive' as const },
  { state: 'inactive' as const },
]

const COUNTRY_CODES = [
  { label: '🇨🇦 Canada (+1)',        value: '+1' },
  { label: '🇺🇸 United States (+1)', value: '+1_US' },
  { label: '🇬🇧 UK (+44)',            value: '+44' },
  { label: '🇦🇺 Australia (+61)',     value: '+61' },
  { label: 'Other',                   value: '+' },
]

function dialCode(v: string) { return v === '+1_US' ? '+1' : v }

function getErrorMsg(data: Record<string, unknown>): string {
  if (data.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors as Record<string, string[]>)[0]
    if (Array.isArray(first) && first[0]) return first[0]
  }
  return (data.message as string) || (data.error as string) || 'Something went wrong.'
}

export default function RegisterForm({ agent, slug, agentPrefix }: { agent: AgentProfile; slug: string; agentPrefix?: string }) {
  const router = useRouter()
  const prefix = agentPrefix ?? `/agent/${slug}`

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [countryCode, setCountryCode] = useState('+1')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length < 7) { setError('Please enter a valid phone number.'); return }
    setLoading(true)
    try {
      const sourceCtx = parseSourceContext(peekReturnTo())
      const res = await authFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          first_name:          firstName.trim(),
          last_name:           lastName.trim(),
          email,
          terms:               '1',
          agent_slug:          slug,
          phone:               phoneDigits,
          phone_country_code:  dialCode(countryCode),
          ...sourceCtx,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(getErrorMsg(data)); return }

      // Phone is now required — if the backend says verify_phone, auto-send the
      // OTP and jump straight to the code-entry page (skip the phone-entry page).
      if (data.next_step === 'verify_phone') {
        try {
          await authFetch('/api/auth/phone-send', { method: 'POST' })
        } catch {
          // If send fails, fall through to /verify-phone so user can retry manually.
        }
        router.push(`${prefix}/verify-phone/otp?phone=${encodeURIComponent(dialCode(countryCode) + ' ' + phone)}`)
        return
      }

      const next = data.next_step === 'done'
        ? consumeReturnTo(prefix)
        : nextStepPath(slug, data.next_step, prefix)
      router.push(next)
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout agent={agent} steps={STEPS} stepLabel="Step 1 of 3 — Create Account">
      <style>{`@media (max-width: 680px) { .auth-name-grid { grid-template-columns: 1fr !important; } }`}</style>
      <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2 }}>
        Create your free account
      </h1>
      <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>
        See sold prices, track listings &amp; more
      </p>

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #fca5a5', borderRadius: 7, padding: '10px 14px', marginBottom: 16, color: '#c0392b', fontSize: 13 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="auth-name-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>First Name</label>
            <input required value={firstName} onChange={e => setFirstName(e.target.value)}
              placeholder="Jane" autoComplete="given-name" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Last Name</label>
            <input required value={lastName} onChange={e => setLastName(e.target.value)}
              placeholder="Doe" autoComplete="family-name" style={inputStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Email Address</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" autoComplete="email" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Mobile Number</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
              style={{ ...inputStyle, width: 'auto', minWidth: 130, flexShrink: 0 }}>
              {COUNTRY_CODES.map(c => (
                <option key={c.label} value={c.value}>{c.label}</option>
              ))}
            </select>
            <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="604-555-1234" autoComplete="tel-national"
              style={{ ...inputStyle, flex: 1 }} />
          </div>
          <p style={{ margin: '5px 0 0', fontSize: 12, color: '#9ca3af', lineHeight: 1.4 }}>
            We&apos;ll send a one-time code to verify your number.
          </p>
        </div>

        <button type="submit" disabled={loading}
          style={{ background: loading ? '#ccc' : 'var(--cta-primary)', color: 'var(--cta-primary-text)', border: 'none', borderRadius: 7, padding: '13px 0', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', width: '100%', letterSpacing: 0.2, opacity: loading ? 0.7 : 1, marginTop: 4 }}>
          {loading ? 'Creating account…' : 'Create Account →'}
        </button>
      </form>

      <div style={{ marginTop: 20, borderTop: '1px solid #f3f4f6', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
          By creating an account you agree to our{' '}
          <a href={`${prefix}/terms`} target="_blank" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Terms</a>{' '}
          and{' '}
          <a href={`${prefix}/privacy`} target="_blank" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Privacy Policy</a>
        </p>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
          Already have an account?{' '}
          <a href={`${prefix}/login`} style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Sign in</a>
        </p>
      </div>
    </AuthSplitLayout>
  )
}

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#374151', letterSpacing: 0.2, marginBottom: 5, display: 'block' }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 7,
  fontSize: 14, color: '#1a1a1a', background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
}
