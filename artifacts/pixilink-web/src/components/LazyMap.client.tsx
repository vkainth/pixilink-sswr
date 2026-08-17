'use client'

import { useState } from 'react'

interface Props {
  src: string
  title: string
  address: string
  city: string
  subarea?: string | null
  mapsHref: string
}

export default function LazyMap({ src, title, address, city, subarea, mapsHref }: Props) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ position: 'relative', height: 320, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loaded ? (
          <iframe
            src={src}
            width="100%"
            height="320"
            style={{ display: 'block', border: 'none', position: 'absolute', inset: 0 }}
            referrerPolicy="no-referrer-when-downgrade"
            title={title}
          />
        ) : (
          <button
            type="button"
            onClick={() => setLoaded(true)}
            aria-label={`Load map for ${title}`}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer',
              font: 'inherit', padding: 0,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Click to load map</span>
          </button>
        )}
      </div>
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>📍</span>
        <span style={{ fontSize: 13, color: 'var(--text)' }}>
          {address}, {city}{subarea ? `, ${subarea}` : ''}, BC
        </span>
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          Open in Google Maps →
        </a>
      </div>
    </div>
  )
}
