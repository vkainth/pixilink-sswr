'use client'
import { useEffect, useState } from 'react'
import BuildingComparisonTable from './BuildingComparisonTable'
import type { AgentListing } from '@/lib/types'
import { nextStepPath } from '@/lib/auth-client'

interface Props {
  rows: AgentListing[]
  accentColor: string
  primaryBg: string
  totalCount: number
  slug?: string
  agentPrefix?: string
}

type AuthState = 'loading' | 'done' | 'partial' | 'guest'

export default function SoldGate({ rows, accentColor, primaryBg, totalCount, slug, agentPrefix }: Props) {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [nextUrl, setNextUrl] = useState('')

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
    fetch(`${basePath}/api/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((d: { user?: { id?: string | number; next_step?: string } | null } | null) => {
        if (!d?.user?.id) { setAuthState('guest'); return }
        if (d.user.next_step === 'done') { setAuthState('done'); return }
        setNextUrl(nextStepPath(slug ?? '', d.user.next_step ?? '', agentPrefix))
        setAuthState('partial')
      })
      .catch(() => setAuthState('guest'))
  }, [slug, agentPrefix])

  const isLoggedIn = authState === 'done'

  return (
    <>
      <BuildingComparisonTable rows={rows} sold isLoggedIn={isLoggedIn} slug={slug} agentPrefix={agentPrefix} />
      {authState === 'partial' && (
        <div style={{
          background: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
          border: `1px solid ${accentColor}`,
          borderRadius: 8,
          padding: '14px 20px',
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <span style={{ fontSize: 14, color: 'var(--text)' }}>
            Complete your registration to unlock all {totalCount} sold prices.
          </span>
          <a href={nextUrl}
            style={{
              background: 'var(--cta-primary)',
              color: 'var(--cta-primary-text)',
              textDecoration: 'none',
              padding: '8px 20px',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 13,
              whiteSpace: 'nowrap',
            }}>
            Complete Registration →
          </a>
        </div>
      )}
      {authState === 'guest' && (
        <div style={{
          background: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
          border: `1px solid ${accentColor}`,
          borderRadius: 8,
          padding: '14px 20px',
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <span style={{ fontSize: 14, color: 'var(--text)' }}>
            Sign in to unlock all {totalCount} sold prices — free.
          </span>
          <a href={agentPrefix ? `${agentPrefix}/sign-in` : (slug ? `/agent/${slug}/sign-in` : '/sign-in')}
            style={{
              background: 'var(--cta-primary)',
              color: 'var(--cta-primary-text)',
              textDecoration: 'none',
              padding: '8px 20px',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 13,
              whiteSpace: 'nowrap',
            }}>
            Sign In
          </a>
        </div>
      )}
    </>
  )
}
