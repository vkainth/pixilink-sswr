'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { authFetch } from '@/lib/auth-client'
import { regionSlugForAgent, resolveAgentPrefix } from '@/lib/api'

function getErrorMsg(data: Record<string, unknown>): string {
  if (data.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors as Record<string, string[]>)[0]
    if (Array.isArray(first) && first[0]) return first[0]
  }
  return (data.message as string) || (data.error as string) || 'Something went wrong.'
}

export default function ForgotPasswordPage() {
  const params = useParams()
  const slug = params.slug as string
  const prefix = resolveAgentPrefix(slug, null)

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email, agent_slug: slug }),
      })
      const data = await res.json()
      if (!res.ok) { setError(getErrorMsg(data)); return }
      setSent(true)
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: '40px', maxWidth: 440, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📬</div>
            <h2 style={{ margin: '0 0 12px', fontSize: 22, color: '#1a1a1a' }}>Check your email</h2>
            <p style={{ color: '#666', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
              If an account with that email exists, we sent a password reset link. Check your inbox and spam folder.
            </p>
            <a href={`${prefix}/sign-in`}
              style={{ display: 'inline-block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', textDecoration: 'none', borderRadius: 7, padding: '12px 28px', fontWeight: 700, fontSize: 14 }}>
              Back to Sign In
            </a>
          </div>
        ) : (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, color: '#1a1a1a' }}>Forgot your password?</h2>
            <p style={{ margin: '0 0 28px', color: '#666', fontSize: 14, lineHeight: 1.6 }}>
              Enter your email and we'll send you a link to reset your password.
            </p>

            {error && (
              <div style={{ background: '#fff0f0', border: '1px solid #fca5a5', borderRadius: 7, padding: '10px 14px', marginBottom: 18, color: '#c0392b', fontSize: 13 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#444', letterSpacing: 0.3, marginBottom: 6, display: 'block' }}>Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e0ddd8', borderRadius: 7, fontSize: 14, color: '#1a1a1a', background: '#faf9f7', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button type="submit" disabled={loading}
                style={{ background: loading ? '#ccc' : 'var(--cta-primary)', color: 'var(--cta-primary-text)', border: 'none', borderRadius: 7, padding: '13px 0', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', width: '100%', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
              <a href={`${prefix}/sign-in`}
                style={{ textAlign: 'center', color: '#888', fontSize: 13, textDecoration: 'none', marginTop: 4 }}>
                ← Back to Sign In
              </a>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
