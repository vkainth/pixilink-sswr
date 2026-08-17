'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { apiPath } from '@/lib/admin-api-path'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(apiPath('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.name) {
          document.cookie = `admin_name=${encodeURIComponent(data.name)}; path=/; max-age=${60 * 60 * 8}`
        }
        router.push('/admin/agents')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Login failed')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: '#0d1b2a', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 8, padding: '40px 36px',
        width: 360, boxShadow: '0 4px 24px rgba(0,0,0,.4)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0d1b2a', letterSpacing: '-0.5px' }}>
            Pixilink Admin
          </div>
          <div style={{ fontSize: 13, color: '#7b8fa0', marginTop: 4 }}>Sign in to continue</div>
        </div>

        {error && (
          <div style={{
            background: '#ffebe6', color: '#bf2600', borderRadius: 4,
            padding: '10px 12px', marginBottom: 16, fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5e6c84', marginBottom: 5 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              style={{
                width: '100%', padding: '9px 12px', border: '1px solid #dfe1e6',
                borderRadius: 4, fontSize: 14, outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5e6c84', marginBottom: 5 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '9px 12px', border: '1px solid #dfe1e6',
                borderRadius: 4, fontSize: 14, outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '10px', background: loading ? '#7ab3e0' : '#0052cc',
              color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600,
              fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
