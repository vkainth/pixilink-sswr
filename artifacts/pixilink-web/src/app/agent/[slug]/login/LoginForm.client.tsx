'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthSplitLayout from '@/components/AuthSplitLayout'
import type { AgentProfile } from '@/lib/types'

const STEPS = [
  { state: 'done' as const },
  { state: 'done' as const },
  { state: 'done' as const },
]

function getErrorMsg(data: Record<string, unknown>): string {
  if (data.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors as Record<string, string[]>)[0]
    if (Array.isArray(first) && first[0]) return first[0]
  }
  return (data.message as string) || (data.error as string) || 'Something went wrong.'
}

export default function LoginForm({ agent, slug, agentPrefix }: { agent: AgentProfile; slug: string; agentPrefix?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefix = agentPrefix ?? `/agent/${slug}`

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const prefill = searchParams.get('email')
    if (prefill) setEmail(decodeURIComponent(prefill))
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const returnTo = searchParams.get('return_to') || ''
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/auth/send-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, agent_slug: slug, return_to: returnTo }),
      })
      const data = await res.json()
      if (!res.ok) { setError(getErrorMsg(data)); return }
      router.push(`${prefix}/magic-link-sent?email=${encodeURIComponent(email)}`)
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthSplitLayout agent={agent} steps={STEPS} stepLabel="Welcome back">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>Check your inbox</h1>
          <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, margin: '0 0 8px' }}>
            We sent a sign-in link to
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: '0 0 20px' }}>{email}</p>
          <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6 }}>
            The link expires in 15 minutes. Check spam if you don&apos;t see it.
          </p>
        </div>
      </AuthSplitLayout>
    )
  }

  return (
    <AuthSplitLayout agent={agent} steps={STEPS} stepLabel="Welcome back">
      <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2 }}>
        Sign in
      </h1>
      <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: 14 }}>
        We&apos;ll email you a secure sign-in link — no password needed.
      </p>

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #fca5a5', borderRadius: 7, padding: '10px 14px', marginBottom: 16, color: '#c0392b', fontSize: 13 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Email Address</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" autoComplete="email" style={inputStyle} />
        </div>

        <button type="submit" disabled={loading}
          style={{ background: loading ? '#ccc' : 'var(--cta-primary)', color: 'var(--cta-primary-text)', border: 'none', borderRadius: 7, padding: '13px 0', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', width: '100%', letterSpacing: 0.2, opacity: loading ? 0.7 : 1, marginTop: 4 }}>
          {loading ? 'Sending…' : 'Send Sign-In Link →'}
        </button>
      </form>

      <div style={{ marginTop: 20, borderTop: '1px solid #f3f4f6', paddingTop: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
          Don&apos;t have an account?{' '}
          <a href={`${prefix}/register`} style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Create free account</a>
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
