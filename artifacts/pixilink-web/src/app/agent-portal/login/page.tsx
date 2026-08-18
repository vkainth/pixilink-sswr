'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const P = {
  primary: '#23a9e1',
  sidebarBg: '#0f172a',
  border: '#e2e8f0',
  error: '#ef4444',
  errorLight: '#fef2f2',
  muted: '#64748b',
  text: '#1e293b',
}

export default function AgentPortalLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/agent-portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        router.push('/agent-portal/dashboard')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Invalid email or password')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 13px', border: `1px solid ${P.border}`,
    borderRadius: 7, fontSize: 14, color: P.text, background: '#fff',
    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{
      minHeight: '100vh', background: P.sidebarBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ width: 400 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36, justifyContent: 'center' }}>
          <div style={{ width: 38, height: 38, background: P.primary, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 22 }}>P</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 22, letterSpacing: -0.5 }}>pixilink</span>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, padding: '36px 32px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: P.text }}>Agent Portal</h1>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: P.muted }}>Sign in to manage your site and leads.</p>

          {error && (
            <div style={{ background: P.errorLight, color: P.error, padding: '11px 14px', borderRadius: 7, marginBottom: 18, fontSize: 13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: P.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Email
              </label>
              <input
                type="email"
                style={inp}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: P.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Password
              </label>
              <input
                type="password"
                style={inp}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', background: loading ? '#7ab3e0' : P.primary,
                color: '#fff', border: 'none', borderRadius: 8, fontSize: 14,
                fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${P.border}`, textAlign: 'center', fontSize: 12, color: P.muted }}>
            Staff admin?{' '}
            <a href="/admin/login" style={{ color: P.primary, fontWeight: 600 }}>Admin login →</a>
          </div>
        </div>
      </div>
    </div>
  )
}
