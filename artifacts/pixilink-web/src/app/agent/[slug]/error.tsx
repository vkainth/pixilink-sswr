'use client'

import { useEffect } from 'react'

/**
 * Shared error boundary for the entire agent/[slug] route tree. Its main job
 * is to catch TransientBackendError thrown by getListings() for subarea-
 * scoped queries (the long-tail subarea x type x bed-count combo pages, e.g.
 * /condos-for-sale/brookswood/2-bedrooms) when the backend is slow/unavailable.
 *
 * This intentionally renders a retriable error instead of ever falling back to
 * fabricated placeholder listings for a specific area — a transient 500 here
 * is far better than Google indexing fake MLS numbers/addresses for hundreds
 * of subarea URLs.
 */
export default function AgentSectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Agent page render error:', error)
  }, [error])

  return (
    <div
      style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: '64px 24px',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
        We couldn&apos;t load these listings
      </h1>
      <p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: 24 }}>
        This is a temporary hiccup, not a sign there are no listings here.
        Please try again in a moment.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          appearance: 'none',
          border: 'none',
          background: 'var(--brand-bg, #111111)',
          color: 'var(--brand-text, #ffffff)',
          fontWeight: 600,
          fontSize: 15,
          padding: '12px 28px',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  )
}
