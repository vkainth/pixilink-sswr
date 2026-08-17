'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { authFetch, nextStepPath, consumeReturnTo } from '@/lib/auth-client'
import AuthSplitLayout from '@/components/AuthSplitLayout'
import type { AgentProfile } from '@/lib/types'

const STEPS = [
  { state: 'done' as const },
  { state: 'active' as const },
]

function getErrorMsg(data: Record<string, unknown>): string {
  if (data.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors as Record<string, string[]>)[0]
    if (Array.isArray(first) && first[0]) return first[0]
  }
  return (data.message as string) || (data.error as string) || 'Something went wrong.'
}

function OtpFormInner({ agent, slug, agentPrefix }: { agent: AgentProfile; slug: string; agentPrefix?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') || 'your phone'
  const prefix = agentPrefix ?? `/agent/${slug}`

  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  function handleChange(i: number, val: string) {
    const v = val.replace(/\D/g, '').slice(0, 1)
    const next = [...digits]
    next[i] = v
    setDigits(next)
    if (v && i < 5) refs.current[i + 1]?.focus()
    if (v && i === 5) {
      submitCode([...next])
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = pasted.split('').concat(['', '', '', '', '', '']).slice(0, 6)
    setDigits(next)
    if (pasted.length === 6) submitCode(next)
    else refs.current[pasted.length]?.focus()
  }

  async function submitCode(codeDigits: string[]) {
    const code = codeDigits.join('')
    if (code.length < 6) return
    setError('')
    setVerifying(true)
    try {
      const res = await authFetch('/api/auth/phone-verify', {
        method: 'POST',
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.locked) {
          setLocked(true)
          const mins = data.locked_seconds ? Math.ceil(data.locked_seconds / 60) : 10
          setError(`Too many failed attempts. Please wait ${mins} minute${mins === 1 ? '' : 's'} before trying again.`)
        } else {
          setError(getErrorMsg(data))
        }
        setDigits(['', '', '', '', '', ''])
        setTimeout(() => refs.current[0]?.focus(), 50)
        return
      }
      const next = data.next_step === 'done'
        ? consumeReturnTo(prefix)
        : nextStepPath(slug, data.next_step, prefix)
      router.push(next)
    } catch {
      setError('Unable to verify code. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  async function handleResend() {
    if (resending || countdown > 0) return
    setResending(true)
    setError('')
    try {
      const res = await authFetch('/api/auth/phone-send', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(getErrorMsg(data)); return }
      setCountdown(60)
      setDigits(['', '', '', '', '', ''])
      setTimeout(() => refs.current[0]?.focus(), 50)
    } catch {
      setError('Unable to resend. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthSplitLayout agent={agent} steps={STEPS} stepLabel="Step 2 of 2 — Enter Code">
      <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2 }}>
        Enter the code
      </h1>
      <p style={{ margin: '0 0 8px', color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>
        Sent to <strong style={{ color: '#374151' }}>{phone}</strong>
        {' · '}
        <a href={`${prefix}/verify-phone?change=1`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>Change</a>
      </p>
      <p style={{ margin: '0 0 24px', color: '#9ca3af', fontSize: 12 }}>Enter the 6-digit code from your SMS</p>

      {error && (
        <div style={{ background: locked ? '#fef3c7' : '#fff0f0', border: `1px solid ${locked ? '#fbbf24' : '#fca5a5'}`, borderRadius: 7, padding: '10px 14px', marginBottom: 16, color: locked ? '#92400e' : '#c0392b', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* 6-box OTP input */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'center' }} onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => { refs.current[i] = el }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]"
            maxLength={1}
            value={d}
            disabled={verifying || locked}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            style={{
              width: 52, height: 62, textAlign: 'center', fontSize: 24, fontWeight: 700,
              border: `2px solid ${d ? 'var(--accent)' : '#e5e7eb'}`,
              borderRadius: 8, outline: 'none', background: verifying || locked ? '#f3f4f6' : '#fff',
              color: '#1a1a1a', caretColor: 'var(--accent)', transition: 'border-color 0.15s',
            }}
          />
        ))}
      </div>

      {verifying && (
        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Verifying…</p>
      )}

      {!locked && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <button onClick={handleResend} disabled={resending || countdown > 0}
            style={{ background: 'none', border: 'none', color: countdown > 0 ? '#9ca3af' : 'var(--accent)', fontSize: 13, cursor: countdown > 0 ? 'default' : 'pointer', padding: 0, fontWeight: 600 }}>
            {resending ? 'Sending…' : countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
          </button>
        </div>
      )}

      {locked && (
        <a href={`${prefix}/verify-phone?change=1`} style={{ display: 'block', textAlign: 'center', color: 'var(--accent)', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 16 }}>
          ← Try a different phone number
        </a>
      )}
    </AuthSplitLayout>
  )
}

export default function OtpForm({ agent, slug, agentPrefix }: { agent: AgentProfile; slug: string; agentPrefix?: string }) {
  return (
    <Suspense>
      <OtpFormInner agent={agent} slug={slug} agentPrefix={agentPrefix} />
    </Suspense>
  )
}
