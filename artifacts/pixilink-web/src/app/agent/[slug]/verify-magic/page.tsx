'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { regionSlugForAgent, resolveAgentPrefix } from '@/lib/api'

function VerifyMagicInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = params.slug as string
  const prefix = resolveAgentPrefix(slug, null)

  const [status, setStatus] = useState<'verifying' | 'error'>('verifying')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    const returnTo = searchParams.get('return_to')

    if (!token) {
      setErrorMsg('Invalid sign-in link — no token found.')
      setStatus('error')
      return
    }

    fetch('/api/auth/verify-magic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, agent_slug: slug }),
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) {
          setErrorMsg(data.error || 'This link has expired or already been used. Please request a new one.')
          setStatus('error')
          return
        }
        // Success — redirect
        const next = data.next_step === 'done' || !data.next_step
          ? (returnTo || prefix)
          : nextStepPath(slug, data.next_step, prefix)
        router.replace(next)
      })
      .catch(() => {
        setErrorMsg('Unable to connect. Please try again.')
        setStatus('error')
      })
  }, [searchParams, slug, router, prefix])

  if (status === 'verifying') {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 42, marginBottom: 16 }}>🔐</div>
          <p style={{ fontSize: 16, color: '#6b7280' }}>Signing you in…</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
        <div style={{ fontSize: 42, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: '0 0 12px' }}>
          Sign-in link invalid
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, margin: '0 0 24px' }}>
          {errorMsg}
        </p>
        <a
          href={`${prefix}/login`}
          style={{
            display: 'inline-block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)',
            padding: '12px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none',
          }}
        >
          Request a new link
        </a>
      </div>
    </div>
  )
}

function nextStepPath(slug: string, step: string, agentPrefix: string): string {
  const map: Record<string, string> = {
    verify_email:    `${agentPrefix}/verify-email`,
    verify_phone:    `${agentPrefix}/verify-phone`,
    complete_profile: `${agentPrefix}/complete-profile`,
    accept_terms:    `${agentPrefix}/accept-terms`,
  }
  return map[step] ?? agentPrefix
}

export default function VerifyMagicPage() {
  return (
    <Suspense>
      <VerifyMagicInner />
    </Suspense>
  )
}
