'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { clientAgentPrefix } from '@/lib/api'

interface Props {
  mlsNo: string
  isLoggedIn: boolean
}

/**
 * Wrapper exported so the page can import it without a manual Suspense.
 * useSearchParams() inside requires a Suspense boundary (Next.js 15).
 */
export default function ListingAlertButton(props: Props) {
  return (
    <Suspense fallback={null}>
      <ListingAlertButtonInner {...props} />
    </Suspense>
  )
}

function ListingAlertButtonInner({ mlsNo, isLoggedIn }: Props) {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = params?.slug as string || ''
  const agentPrefix = clientAgentPrefix(slug)

  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(isLoggedIn)
  const [pending, setPending] = useState(false)

  const subscribe = useCallback(async () => {
    if (pending) return
    setPending(true)
    try {
      const res = await fetch(`/api/user/listing-alerts/${encodeURIComponent(slug)}/${encodeURIComponent(mlsNo)}`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) setSubscribed(true)
    } catch {
      // silent
    } finally {
      setPending(false)
    }
  }, [slug, mlsNo, pending])

  const unsubscribe = useCallback(async () => {
    if (pending) return
    setPending(true)
    setSubscribed(false)
    try {
      await fetch(`/api/user/listing-alerts/${encodeURIComponent(slug)}/${encodeURIComponent(mlsNo)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
    } catch {
      setSubscribed(true) // revert on error
    } finally {
      setPending(false)
    }
  }, [slug, mlsNo, pending])

  // On mount: fetch subscription state, then auto-subscribe if ?subscribe=1
  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetch(`/api/user/listing-alerts/${encodeURIComponent(slug)}/${encodeURIComponent(mlsNo)}`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then(r => (r.ok ? r.json() : { subscribed: false }))
      .then((data: { subscribed: boolean }) => {
        if (cancelled) return
        setSubscribed(Boolean(data.subscribed))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [isLoggedIn, slug, mlsNo])

  // Auto-subscribe when ?subscribe=1 is in the URL (post sign-in redirect)
  useEffect(() => {
    if (!isLoggedIn || loading) return
    if (searchParams.get('subscribe') === '1' && !subscribed) {
      subscribe().then(() => {
        // Clean the subscribe param from the URL
        const url = new URL(window.location.href)
        url.searchParams.delete('subscribe')
        router.replace(url.pathname + (url.search ? url.search : ''), { scroll: false })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, loading])

  function handleClick() {
    if (!isLoggedIn) {
      const returnPath = encodeURIComponent(window.location.pathname + '?subscribe=1')
      window.location.href = `${agentPrefix}/sign-in?return_to=${returnPath}`
      return
    }
    if (subscribed) {
      unsubscribe()
    } else {
      subscribe()
    }
  }

  if (loading) return null

  const active = subscribed
  return (
    <button
      onClick={handleClick}
      disabled={pending}
      title={active ? 'Turn off price alerts' : 'Get price alerts for this listing'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: active ? 'var(--primary-bg)' : 'transparent',
        border: `1.5px solid ${active ? 'var(--primary-bg)' : 'var(--border)'}`,
        color: active ? '#fff' : 'var(--text-muted)',
        borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700,
        cursor: pending ? 'default' : 'pointer', letterSpacing: 0.3,
        transition: 'all 0.15s',
        opacity: pending ? 0.7 : 1,
      }}
      onMouseEnter={e => {
        if (!active && !pending) {
          e.currentTarget.style.borderColor = 'var(--primary-bg)'
          e.currentTarget.style.color = 'var(--primary-bg)'
        }
      }}
      onMouseLeave={e => {
        if (!active && !pending) {
          e.currentTarget.style.borderColor = 'var(--border, #e5e7eb)'
          e.currentTarget.style.color = 'var(--text-muted, #6b7280)'
        }
      }}
    >
      {/* Bell icon */}
      <svg width="13" height="13" viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      {active ? 'Alerts on' : (isLoggedIn ? 'Get alerts' : 'Get price alerts')}
    </button>
  )
}
