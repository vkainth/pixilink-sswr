'use client'

import { useState, useMemo, Fragment } from 'react'
import type { AgentPortalLead } from '@/lib/agent-portal-api'
import PropertyViewsSection from '@/components/PropertyViewsSection.client'

const P = {
  primary: '#23a9e1', primaryLight: '#e0f2fe',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', success: '#22c55e', successLight: '#dcfce7',
  warning: '#f59e0b', error: '#ef4444',
}

const typeColor: Record<string, string> = {
  contact: P.primary, showing: P.primary, home_eval: P.warning,
  pre_qual: P.success, buyer: P.primary, seller: P.warning,
  weekly_deals: P.primary, price_drop: P.warning,
  building_sold: P.success, neighbour_sold: '#7c3aed', school_catchment: '#0d9488',
}
const typeBg: Record<string, string> = {
  contact: P.primaryLight, showing: P.primaryLight, home_eval: '#fffbeb',
  pre_qual: P.successLight, buyer: P.primaryLight, seller: '#fffbeb',
  weekly_deals: P.primaryLight, price_drop: '#fffbeb',
  building_sold: P.successLight, neighbour_sold: '#ede9fe', school_catchment: '#ccfbf1',
}

function formatBrowsingContext(lead: { listing_slug?: string | null; source?: string | null }): string | null {
  if (lead.listing_slug) return 'Listing: ' + lead.listing_slug

  const url = lead.source || ''
  if (!url) return null

  const listingMatch = url.match(/\/listing\/([^/?#]+)/)
  if (listingMatch) return 'Listing: ' + listingMatch[1]

  const buildingMatch = url.match(/\/building\/([^/?#]+)/)
  if (buildingMatch) {
    const name = buildingMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    return 'Building: ' + name
  }

  const qIdx = url.indexOf('?')
  if (qIdx !== -1) {
    const qs = new URLSearchParams(url.slice(qIdx + 1))
    const subarea  = qs.get('subarea')
    const beds     = qs.get('beds')
    const type     = qs.get('type')
    const minP     = qs.get('min_price') ? parseInt(qs.get('min_price')!) : null
    const maxP     = qs.get('max_price') ? parseInt(qs.get('max_price')!) : null
    const pricePart = (minP || maxP)
      ? (minP ? '$' + Math.round(minP / 1000) + 'k' : '')
        + (minP && maxP ? '\u2013' : '')
        + (maxP ? '$' + Math.round(maxP / 1000) + 'k' : '')
      : null
    const parts = [subarea, beds ? beds + '+ bed' : null, type, pricePart].filter(Boolean) as string[]
    if (parts.length) return parts.join(' \u00b7 ')
  }

  return url.length > 50 ? url.slice(0, 47) + '\u2026' : url
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

export default function LeadsTable({ leads }: { leads: AgentPortalLead[] }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [contacted, setContacted] = useState<Set<number>>(
    new Set(leads.filter(l => l.contacted).map(l => l.id))
  )
  const [expanded, setExpanded] = useState<number | null>(null)
  const [markingId, setMarkingId] = useState<number | null>(null)

  const types = useMemo(() => {
    const s = new Set(leads.map(l => l.form_type_label).filter(Boolean))
    return ['All', ...Array.from(s)]
  }, [leads])

  const filtered = useMemo(() => {
    let rows = leads.filter(l => {
      if (verifiedOnly && !l.verified) return false
      if (typeFilter !== 'All' && l.form_type_label !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !l.name?.toLowerCase().includes(q) &&
          !l.phone?.includes(q) &&
          !l.email?.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
    rows = [...rows].sort((a, b) => {
      const av = new Date(a.created_at || 0).getTime()
      const bv = new Date(b.created_at || 0).getTime()
      return sortDir === 'desc' ? bv - av : av - bv
    })
    return rows
  }, [leads, search, typeFilter, verifiedOnly, sortDir])

  const newCount = leads.filter(l => !contacted.has(l.id)).length
  const verifiedCount = leads.filter(l => l.verified).length

  async function markContacted(id: number) {
    setMarkingId(id)
    try {
      await fetch('/api/agent-portal/leads/contacted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch { /* best-effort */ }
    setContacted(s => new Set([...s, id]))
    setMarkingId(null)
  }

  return (
    <>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Leads</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>
            {filtered.length} leads · {newCount} new
          </p>
        </div>
      </div>

      <div style={{ padding: '0 32px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, margin: '22px 0' }}>
          {[
            ['Total Leads', String(leads.length), 'All time'],
            ['Verified', String(verifiedCount), 'Phone confirmed'],
            ['New', String(newCount), 'Not yet contacted'],
          ].map(([label, val, sub]) => (
            <div key={label} style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: P.muted, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: P.text }}>{val}</div>
              <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {types.length > 1 && (
            <div style={{ display: 'flex', background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {types.map(t => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  style={{ padding: '7px 14px', border: 'none', background: typeFilter === t ? P.primary : 'transparent', color: typeFilter === t ? '#fff' : P.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {t}
                </button>
              ))}
            </div>
          )}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, email…"
            style={{ padding: '7px 13px', border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 13, color: P.text, width: 220, outline: 'none', background: P.white }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: verifiedOnly ? '#e0f7ef' : P.white, border: `1px solid ${verifiedOnly ? P.success : P.border}`, borderRadius: 8, padding: '7px 14px' }}>
            <input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} style={{ width: 14, height: 14, accentColor: P.success, cursor: 'pointer' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: verifiedOnly ? P.success : P.muted }}>Verified only</span>
          </label>
          <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            style={{ marginLeft: 'auto', padding: '7px 14px', background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: P.muted, cursor: 'pointer' }}>
            Date {sortDir === 'desc' ? '↓' : '↑'}
          </button>
        </div>

        {leads.length === 0 ? (
          <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, padding: '60px 20px', textAlign: 'center', color: P.muted }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>No leads yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Leads from your site will appear here.</div>
          </div>
        ) : (
          <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: P.bg }}>
                  {['Name', 'Lead Type', 'Source', 'Date', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: P.muted, borderBottom: `1px solid ${P.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => {
                  const isDone = contacted.has(l.id)
                  const isExpanded = expanded === l.id
                  const typeKey = l.type?.toLowerCase().replace(/\s+/g, '_') ?? 'contact'
                  return (
                    <Fragment key={l.id}>
                      <tr
                        onClick={() => setExpanded(isExpanded ? null : l.id)}
                        style={{ borderBottom: `1px solid ${P.border}`, background: !isDone ? '#f0f9ff' : P.white, cursor: 'pointer' }}
                      >
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: P.text }}>{l.name || '—'}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            {l.verified
                              ? <span style={{ fontSize: 10, fontWeight: 700, color: P.success, background: '#dcfce7', padding: '1px 7px', borderRadius: 8 }}>✓ Verified</span>
                              : <span style={{ fontSize: 10, fontWeight: 600, color: P.muted, background: '#f1f5f9', padding: '1px 7px', borderRadius: 8 }}>Email only</span>}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: typeBg[typeKey] ?? P.primaryLight, color: typeColor[typeKey] ?? P.primary, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                            {l.form_type_label || l.type || 'Contact'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, maxWidth: 200 }}>
                          {(() => {
                            const ctx = formatBrowsingContext(l)
                            return ctx
                              ? <span style={{ color: P.primary, fontWeight: 500 }} title={ctx}>{ctx}</span>
                              : <span style={{ color: P.muted }}>—</span>
                          })()}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: P.text, whiteSpace: 'nowrap' }}>
                          {formatDate(l.created_at)}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {isDone
                            ? <span style={{ fontSize: 11, color: P.success, fontWeight: 600 }}>✓ Contacted</span>
                            : <span style={{ fontSize: 11, color: P.primary, fontWeight: 700 }}>● New</span>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {!isDone && (
                            <button
                              disabled={markingId === l.id}
                              onClick={e => { e.stopPropagation(); markContacted(l.id) }}
                              style={{ padding: '5px 10px', background: P.successLight, color: P.success, border: 'none', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: markingId === l.id ? 0.6 : 1 }}
                            >
                              {markingId === l.id ? '…' : 'Mark contacted'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ background: '#f8faff', borderBottom: `1px solid ${P.border}` }}>
                          <td colSpan={6} style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                              <div>
                                <div style={{ fontSize: 11, color: P.muted, marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Contact</div>
                                {l.phone && <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>📞 {l.phone}</div>}
                                {l.email && <div style={{ fontSize: 12, color: P.primary }}>✉ {l.email}</div>}
                                {!l.phone && !l.email && <div style={{ fontSize: 12, color: P.muted }}>No contact info</div>}
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: P.muted, marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Lead Type</div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{l.form_type_label || l.type}</div>
                                {l.offer_context && <div style={{ fontSize: 12, color: P.muted, marginTop: 2 }}>Context: {l.offer_context}</div>}
                                {formatBrowsingContext(l) && <div style={{ fontSize: 12, color: P.muted, marginTop: 2 }}>Source: {formatBrowsingContext(l)}</div>}
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: P.muted, marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Submitted</div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{l.created_at ? new Date(l.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</div>
                                <div style={{ fontSize: 12, color: !isDone ? P.primary : P.success, marginTop: 2 }}>{!isDone ? 'Not yet contacted' : 'Contacted'}</div>
                              </div>
                            </div>
                            {l.user_id && (
                              <PropertyViewsSection fetchUrl={`/api/agent-portal/leads/${l.user_id}/property-views`} />
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: P.muted, fontSize: 14 }}>
                      No leads match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: 10, fontSize: 12, color: P.muted }}>Click any row to expand contact details</div>
      </div>
    </>
  )
}
