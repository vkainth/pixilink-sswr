'use client'

import { useEffect } from 'react'

export default function SoldListingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Sold listing detail render error:', error)
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
        We couldn&apos;t load this listing
      </h1>
      <p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: 24 }}>
        This is a temporary hiccup, not a missing listing. Please try again in a
        moment.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          appearance: 'none',
          border: 'none',
          background: '#14213d',
          color: '#fff',
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
