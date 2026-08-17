'use client'

import { useState, useEffect } from 'react'

export interface PropertyView {
  listing_id: string | null
  building_slug: string | null
  address_label: string
  view_count: number
  first_viewed_at: string
  last_viewed_at: string
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  } catch {
    return iso.slice(0, 10)
  }
}

/**
 * Lazy-loaded property view history for a single user.
 * fetchUrl — full Next.js proxy URL to call, e.g.
 *   /api/admin/leads/42/property-views
 *   /api/agent-portal/leads/42/property-views
 */
export default function PropertyViewsSection({ fetchUrl }: { fetchUrl: string }) {
  const [views, setViews] = useState<PropertyView[] | null>(null)

  useEffect(() => {
    fetch(fetchUrl)
      .then(r => r.ok ? r.json() : [])
      .then((data: PropertyView[]) => setViews(Array.isArray(data) ? data : []))
      .catch(() => setViews([]))
  }, [fetchUrl])

  const P = {
    text: '#1e293b', muted: '#64748b', border: '#e2e8f0', bg: '#f8faff',
  }

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${P.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        Viewed Properties
      </div>
      {views === null && (
        <div style={{ fontSize: 12, color: P.muted }}>Loading…</div>
      )}
      {views !== null && views.length === 0 && (
        <div style={{ fontSize: 12, color: P.muted, fontStyle: 'italic' }}>No property views recorded yet.</div>
      )}
      {views !== null && views.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {views.map((v, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
              background: P.bg, borderRadius: 7, border: `1px solid ${P.border}`, fontSize: 12,
            }}>
              <span style={{ fontSize: 16 }}>{v.listing_id ? '🏠' : '🏢'}</span>
              <span style={{ fontWeight: 600, color: P.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v.address_label}
              </span>
              <span style={{ color: P.muted, whiteSpace: 'nowrap', fontSize: 11 }}>
                {v.view_count}× view{v.view_count !== 1 ? 's' : ''}
              </span>
              <span style={{ color: P.muted, whiteSpace: 'nowrap', fontSize: 11 }}>
                last {fmtDate(v.last_viewed_at)}
              </span>
              {v.listing_id && (
                <a
                  href={`/listing/${v.listing_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#23a9e1', textDecoration: 'none', fontSize: 11, fontWeight: 600 }}
                  onClick={e => e.stopPropagation()}
                >
                  View →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
