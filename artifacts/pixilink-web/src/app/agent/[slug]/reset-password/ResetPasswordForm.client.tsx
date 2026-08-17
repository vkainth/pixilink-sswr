'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authFetch } from '@/lib/auth-client'
import AuthSplitLayout from '@/components/AuthSplitLayout'
import type { AgentProfile } from '@/lib/types'

function getErrorMsg(data: Record<string, unknown>): string {
  if (data.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors as Record<string, string[]>)[0]
    if (Array.isArray(first) && first[0]) return first[0]
  }
  return (data.message as string) || (data.error as string) || 'Something went wrong.'
}

function strengthScore(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '#e5e7eb' }
  let score = 0
  if (pwd.length >= 8)  score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' }
  if (score <= 2) return { score, label: 'Fair', color: '#f59e0b' }
  if (score <= 3) return { score, label: 'Good', color: '#3b82f6' }
  return { score, label: 'Strong', color: '#16a34a' }
}

const STEPS = [
  { state: 'done' as const },
  { state: 'done' as const },
  { state: 'done' as const },
  { state: 'done' as const },
]

function ResetPasswordFormInner({ agent, slug, agentPrefix }: { agent: AgentProfile; slug: string; agentPrefix?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefix = agentPrefix ?? `/agent/${slug}`

  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const strength = strengthScore(password)
  const confirmMismatch = confirm.length > 0 && password !== confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const res = await authFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, token, password, password_confirmation: confirm }),
      })
      const data = await res.json()
      if (!res.ok) { setError(getErrorMsg(data)); return }
      setDone(true)
      setTimeout(() => router.push(`${prefix}/login`), 2500)
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token || !email) {
    return (
      <AuthSplitLayout agent={agent} steps={STEPS} stepLabel="Reset Password">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ margin: '0 0 12px', fontSize: 20, color: '#1a1a1a', fontWeight: 800 }}>Invalid reset link</h2>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>
            This link is missing required information. Please request a new one.
          </p>
          <a href={`${prefix}/forgot-password`}
            style={{ display: 'inline-block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', textDecoration: 'none', borderRadius: 7, padding: '12px 28px', fontWeight: 800, fontSize: 14, letterSpacing: 0.2 }}>
            Request New Link
          </a>
        </div>
      </AuthSplitLayout>
    )
  }

  if (done) {
    return (
      <AuthSplitLayout agent={agent} steps={STEPS} stepLabel="Reset Password">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
          <h2 style={{ margin: '0 0 10px', fontSize: 22, color: '#1a1a1a', fontWeight: 800 }}>Password reset!</h2>
          <p style={{ color: '#6b7280', fontSize: 15 }}>Redirecting you to sign in…</p>
        </div>
      </AuthSplitLayout>
    )
  }

  return (
    <AuthSplitLayout agent={agent} steps={STEPS} stepLabel="Reset Password">
      <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2 }}>
        Set new password
      </h1>
      <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: 14 }}>
        Resetting password for <strong style={{ color: '#374151' }}>{email}</strong>
      </p>

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #fca5a5', borderRadius: 7, padding: '10px 14px', marginBottom: 18, color: '#c0392b', fontSize: 13 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>
            New Password <span style={{ color: '#9ca3af', fontWeight: 400 }}>(min. 8 characters)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input type={showPwd ? 'text' : 'password'} required value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password" placeholder="••••••••"
              style={{ ...inputStyle, paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPwd(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 12, padding: 0 }}>
              {showPwd ? 'Hide' : 'Show'}
            </button>
          </div>
          {/* Strength meter */}
          {password.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: i <= Math.min(strength.score, 4) ? strength.color : '#e5e7eb',
                    transition: 'background 0.2s',
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: strength.color, fontWeight: 600 }}>{strength.label}</div>
            </div>
          )}
        </div>
        <div>
          <label style={labelStyle}>Confirm New Password</label>
          <div style={{ position: 'relative' }}>
            <input type={showConfirm ? 'text' : 'password'} required value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password" placeholder="••••••••"
              style={{ ...inputStyle, paddingRight: 44, borderColor: confirmMismatch ? '#fca5a5' : '#e5e7eb' }} />
            <button type="button" onClick={() => setShowConfirm(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 12, padding: 0 }}>
              {showConfirm ? 'Hide' : 'Show'}
            </button>
          </div>
          {confirmMismatch && (
            <p style={{ fontSize: 11, color: '#c0392b', margin: '4px 0 0' }}>Passwords do not match</p>
          )}
        </div>
        <button type="submit" disabled={loading || confirmMismatch}
          style={{ background: loading || confirmMismatch ? '#ccc' : 'var(--cta-primary)', color: 'var(--cta-primary-text)', border: 'none', borderRadius: 7, padding: '13px 0', fontWeight: 800, fontSize: 15, cursor: loading || confirmMismatch ? 'not-allowed' : 'pointer', width: '100%', letterSpacing: 0.2, opacity: loading || confirmMismatch ? 0.7 : 1, marginTop: 4 }}>
          {loading ? 'Resetting…' : 'Reset Password →'}
        </button>
      </form>

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <a href={`${prefix}/login`} style={{ color: '#9ca3af', fontSize: 12, textDecoration: 'none' }}>
          ← Back to sign in
        </a>
      </div>
    </AuthSplitLayout>
  )
}

export default function ResetPasswordForm({ agent, slug, agentPrefix }: { agent: AgentProfile; slug: string; agentPrefix?: string }) {
  return (
    <Suspense>
      <ResetPasswordFormInner agent={agent} slug={slug} agentPrefix={agentPrefix} />
    </Suspense>
  )
}

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#374151', letterSpacing: 0.2, marginBottom: 5, display: 'block' }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 7,
  fontSize: 14, color: '#1a1a1a', background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
}
