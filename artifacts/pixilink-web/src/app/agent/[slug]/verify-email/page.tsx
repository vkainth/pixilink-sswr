'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { authFetch, nextStepPath } from '@/lib/auth-client'
import { clientAgentPrefix } from '@/lib/api'

function VerifyEmailInner() {
  const params = useParams()
  const slug = params.slug as string
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefix = clientAgentPrefix(slug)

  const [status, setStatus] = useState<'pending' | 'verified' | 'error'>('pending')
  const [message, setMessage] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkVerified = useCallback(async () => {
    try {
      const res = await authFetch('/api/auth/check-verified')
      if (!res.ok) return
      const data = await res.json()
      if (data.verified) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setStatus('verified')
        setTimeout(() => router.push(nextStepPath(slug, data.next_step, prefix)), 1500)
      }
    } catch {
      // ignore polling errors
    }
  }, [slug, router, prefix])

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      authFetch('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }).then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          setStatus('verified')
          setTimeout(() => router.push(nextStepPath(slug, data.next_step, prefix)), 1500)
        } else {
          setMessage(data.error || 'Verification failed. Please try resending the email.')
        }
      }).catch(() => {
        setMessage('Verification failed. Please try resending the email.')
      })
    }
  }, [searchParams, slug, router, prefix])

  useEffect(() => {
    pollingRef.current = setInterval(checkVerified, 3000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [checkVerified])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function handleResend() {
    if (resending || countdown > 0) return
    setResending(true)
    try {
      await authFetch('/api/auth/email-resend', {
        method: 'POST',
        body: JSON.stringify({ agent_slug: slug }),
      })
      setResent(true)
      setCountdown(60)
    } catch {
      // silent
    } finally {
      setResending(false)
    }
  }

  const accentColor = 'var(--accent)'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', background: 'var(--primary-bg)' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Progress bar — 3 steps */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {[{ s: 'done' }, { s: 'active' }, { s: 'inactive' }].map((seg, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: seg.s === 'done' ? accentColor : seg.s === 'active' ? '#3b82f6' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 28 }}>
          Step 2 of 3 — Verify Email
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '48px 44px', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', textAlign: 'center' }}>
          {status === 'verified' ? (
            <>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(var(--accent-rgb, 201 169 110),0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 20px' }}>✅</div>
              <h2 style={{ margin: '0 0 10px', color: '#1a1a1a', fontSize: 24, fontWeight: 800 }}>Email verified!</h2>
              <p style={{ color: '#6b7280', fontSize: 15, margin: 0 }}>Redirecting you now…</p>
            </>
          ) : (
            <>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 20px' }}>📬</div>
              <h2 style={{ margin: '0 0 10px', color: '#1a1a1a', fontSize: 24, fontWeight: 800 }}>Check your email</h2>
              <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.6, margin: '0 0 28px', maxWidth: 340, marginLeft: 'auto', marginRight: 'auto' }}>
                We sent a verification link to your email address. Click the link to continue — this page updates automatically.
              </p>

              {message && (
                <div style={{ background: '#fff0f0', border: '1px solid #fca5a5', borderRadius: 7, padding: '10px 14px', marginBottom: 20, color: '#c0392b', fontSize: 13 }}>
                  {message}
                </div>
              )}
              {resent && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 7, padding: '10px 14px', marginBottom: 20, color: '#15803d', fontSize: 13 }}>
                  Verification email resent. Check your inbox and spam folder.
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
                <button onClick={checkVerified}
                  style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', border: 'none', borderRadius: 7, padding: '13px 0', fontWeight: 800, fontSize: 15, cursor: 'pointer', width: '100%', letterSpacing: 0.2 }}>
                  I&apos;ve verified my email
                </button>
                <button onClick={handleResend} disabled={resending || countdown > 0}
                  style={{ background: 'transparent', color: '#6b7280', border: '1.5px solid #e5e7eb', borderRadius: 7, padding: '12px 0', fontWeight: 600, fontSize: 14, cursor: resending || countdown > 0 ? 'default' : 'pointer', width: '100%', opacity: resending || countdown > 0 ? 0.6 : 1 }}>
                  {resending ? 'Resending…' : countdown > 0 ? `Resend in ${countdown}s` : resent ? 'Resend again' : 'Resend verification email'}
                </button>
              </div>

              <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: 'pxlpulse 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Waiting for verification…</span>
              </div>
              <style>{`@keyframes pxlpulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>

              <div style={{ marginTop: 16 }}>
                <a href={`${prefix}/register`} style={{ color: '#9ca3af', fontSize: 12, textDecoration: 'none' }}>
                  ← Wrong email? Go back
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  )
}
