'use client'

import { useState } from 'react'
import type { AdminLead } from '@/lib/admin-api'
import PropertyViewsSection from '@/components/PropertyViewsSection.client'

const P = {
  primary: '#23a9e1', primaryLight: '#e0f2fe',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', success: '#22c55e', successLight: '#dcfce7',
  warning: '#f59e0b', warningLight: '#fffbeb',
  purple: '#7c3aed', purpleLight: '#ede9fe',
  teal: '#0d9488', tealLight: '#ccfbf1',
  slate: '#475569', slateLight: '#f1f5f9',
}

const TYPE_META: Record<string, { label: string; bg: string; text: string }> = {
  w1:      { label: 'Showing Request',        bg: P.primaryLight, text: P.primary },
  w2:      { label: 'Home Evaluation',        bg: P.warningLight, text: '#92400e' },
  w3:      { label: 'Pre-qualification',      bg: P.successLight, text: '#166534' },
  w4:      { label: 'Building Alert',         bg: P.purpleLight,  text: P.purple },
  contact: { label: 'Contact Form',           bg: P.slateLight,   text: P.slate },
  ask:     { label: 'Ask Agent',              bg: P.tealLight,    text: P.teal },
  weekly_deals:     { label: 'Weekly Deals',         bg: P.primaryLight, text: P.primary },
  price_drop:       { label: 'Price Drop Alert',     bg: P.warningLight, text: '#92400e' },
  building_sold:    { label: 'Building Sold Prices', bg: P.successLight, text: '#166534' },
  neighbour_sold:   { label: 'Neighbour Sold',       bg: P.purpleLight,  text: P.purple },
  school_catchment: { label: 'School Catchment',     bg: P.tealLight,    text: P.teal },
}

const FILTER_TYPES = [
  { key: 'all',     label: 'All' },
  { key: 'w1',      label: 'Showing' },
  { key: 'w2',      label: 'Home Eval' },
  { key: 'w3',      label: 'Pre-qual' },
  { key: 'w4',      label: 'Bldg Alert' },
  { key: 'contact', label: 'Contact' },
  { key: 'ask',     label: 'Ask Agent' },
  { key: 'weekly_deals',     label: 'Weekly Deals' },
  { key: 'price_drop',       label: 'Price Drop' },
  { key: 'building_sold',    label: 'Bldg Sold' },
  { key: 'neighbour_sold',   label: 'Neighbour Sold' },
  { key: 'school_catchment', label: 'School' },
]

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })
}

function TypeBadge({ formType }: { formType: string | null }) {
  const meta = TYPE_META[formType ?? ''] ?? { label: formType ?? 'Unknown', bg: P.slateLight, text: P.slate }
  return (
    <span style={{
      background: meta.bg, color: meta.text,
      padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  )
}

/**
 * Mirrors AgentLeadNotification::resolveBrowsingContext() on the PHP side.
 * Builds a human-readable label from listing_slug → source_url parsing.
 */
function formatBrowsingContext(lead: { listing_slug?: string | null; source_url?: string | null }): string | null {
  if (lead.listing_slug) return 'Listing page: ' + lead.listing_slug

  const url = lead.source_url || ''
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
        + (minP && maxP ? '–' : '')
        + (maxP ? '$' + Math.round(maxP / 1000) + 'k' : '')
      : null
    const parts = [subarea, beds ? beds + '+ bed' : null, type, pricePart].filter(Boolean) as string[]
    if (parts.length) return parts.join(' · ')
  }

  return url.length > 70 ? url.slice(0, 67) + '…' : url
}

function parseNotes(raw: string | null): Record<string, string> | null {
  if (!raw) return null
  try {
    const obj = JSON.parse(raw)
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) return obj as Record<string, string>
  } catch {}
  return null
}

function NotesDrawer({ notes }: { notes: string | null }) {
  const parsed = parseNotes(notes)
  if (!parsed) {
    return (
      <td colSpan={10} style={{ padding: '0 14px 14px 48px', background: '#f8fafc' }}>
        <div style={{ fontSize: 12, color: P.muted, fontStyle: 'italic' }}>{notes || 'No details provided.'}</div>
      </td>
    )
  }
  const entries = Object.entries(parsed).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  return (
    <td colSpan={10} style={{ padding: '0 14px 14px 48px', background: '#f8fafc' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '8px 24px', paddingTop: 8,
      }}>
        {entries.map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 10, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
              {k.replace(/_/g, ' ')}
            </div>
            <div style={{ fontSize: 13, color: P.text, fontWeight: 500 }}>{String(v)}</div>
          </div>
        ))}
      </div>
    </td>
  )
}

interface Props {
  leads: AdminLead[]
  agentName: string
}

export default function LeadsTable({ leads, agentName }: Props) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggle = (id: number) => setExpanded(prev => {
    const s = new Set(prev)
    s.has(id) ? s.delete(id) : s.add(id)
    return s
  })

  const filtered = leads
    .filter(l => typeFilter === 'all' || l.form_type === typeFilter)
    .filter(l => !search || [l.name, l.email, l.phone, l.property_address]
      .some(v => v?.toLowerCase().includes(search.toLowerCase())))

  const typeCounts = Object.fromEntries(
    FILTER_TYPES.slice(1).map(t => [t.key, leads.filter(l => l.form_type === t.key).length])
  )

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div style={{ background: P.white, borderRadius: 10, padding: '16px 18px', border: `1px solid ${P.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Total Leads</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: P.primary }}>{leads.length}</div>
        </div>
        {(['w1', 'w2', 'w3'] as const).map(key => {
          const m = TYPE_META[key]
          return (
            <div key={key} style={{ background: P.white, borderRadius: 10, padding: '16px 18px', border: `1px solid ${P.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: m.text }}>{typeCounts[key] ?? 0}</div>
            </div>
          )
        })}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, overflow: 'hidden' }}>
          {FILTER_TYPES.map(t => {
            const active = typeFilter === t.key
            return (
              <button key={t.key} onClick={() => setTypeFilter(t.key)} style={{
                padding: '7px 12px', border: 'none',
                background: active ? P.primary : 'transparent',
                color: active ? '#fff' : P.muted,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                borderRight: `1px solid ${P.border}`,
              }}>
                {t.label}
                {t.key !== 'all' && typeCounts[t.key] ? (
                  <span style={{
                    marginLeft: 5, fontSize: 10, background: active ? 'rgba(255,255,255,0.25)' : P.border,
                    color: active ? '#fff' : P.muted, borderRadius: 10, padding: '1px 5px',
                  }}>
                    {typeCounts[t.key]}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, phone…"
          style={{
            padding: '7px 14px', border: `1px solid ${P.border}`, borderRadius: 8,
            fontSize: 13, width: 220, outline: 'none', fontFamily: 'inherit', color: P.text,
          }}
        />
        <span style={{ fontSize: 12, color: P.muted, marginLeft: 'auto' }}>
          {filtered.length} of {leads.length} lead{leads.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: P.bg }}>
              <th style={th()}>Date</th>
              <th style={th()}>Name</th>
              <th style={th()}>Phone</th>
              <th style={th()}>Email</th>
              <th style={th()}>Type</th>
              <th style={th()}>Context</th>
              <th style={th()}>Property</th>
              <th style={th()}>Message</th>
              <th style={th()}>Contacted</th>
              <th style={th()}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: P.muted, fontSize: 14 }}>
                  {leads.length === 0 ? `No leads yet for ${agentName}.` : 'No leads match the current filters.'}
                </td>
              </tr>
            )}
            {filtered.map((lead, i) => {
              const isLast = i === filtered.length - 1
              const isExpanded = expanded.has(lead.id)
              const hasPrequal = lead.form_type === 'w3' && (lead.notes || lead.message)
              const canExpand = hasPrequal || !!lead.user_id
              return (
                <>
                  <tr key={lead.id} style={{ borderBottom: (!isLast || isExpanded) ? `1px solid ${P.border}` : 'none', background: isExpanded ? '#f8fafc' : P.white }}>
                    <td style={td()}><span style={{ color: P.muted, fontSize: 11, whiteSpace: 'nowrap' }}>{formatDate(lead.created_at)}</span></td>
                    <td style={td()}><span style={{ fontWeight: 600, color: P.text, fontSize: 13 }}>{lead.name || '—'}</span></td>
                    <td style={td()}><span style={{ fontSize: 12, color: P.muted }}>{lead.phone || '—'}</span></td>
                    <td style={td()}>
                      {lead.email
                        ? <a href={`mailto:${lead.email}`} style={{ fontSize: 12, color: P.primary }}>{lead.email}</a>
                        : <span style={{ fontSize: 12, color: P.muted }}>—</span>}
                    </td>
                    <td style={td()}><TypeBadge formType={lead.form_type} /></td>
                    <td style={td()}>
                      {(() => {
                        const ctx = formatBrowsingContext(lead)
                        return ctx
                          ? <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180, fontSize: 12, color: P.primary, fontWeight: 500 }} title={ctx}>{ctx}</span>
                          : <span style={{ fontSize: 12, color: P.muted }}>—</span>
                      })()}
                    </td>
                    <td style={td()}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160, fontSize: 12, color: P.muted }}>
                        {lead.property_address || lead.offer_context || '—'}
                      </span>
                    </td>
                    <td style={td()}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180, fontSize: 12, color: P.muted }}>
                        {lead.message || '—'}
                      </span>
                    </td>
                    <td style={td()}>
                      <span style={{ fontSize: 11, color: lead.contacted_at ? '#166534' : P.muted }}>
                        {lead.contacted_at ? formatDate(lead.contacted_at) : 'No'}
                      </span>
                    </td>
                    <td style={{ ...td(), textAlign: 'center', width: 36 }}>
                      {canExpand && (
                        <button onClick={() => toggle(lead.id)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 16, color: P.muted, padding: '2px 4px', lineHeight: 1,
                          transform: isExpanded ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.15s',
                        }} title={hasPrequal ? 'Show pre-qual details' : 'Show viewed properties'}>
                          ▾
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && hasPrequal && (
                    <tr key={`${lead.id}-prequal`} style={{ background: '#f8fafc', borderBottom: `1px solid ${P.border}` }}>
                      <td style={{ padding: '4px 0 0 14px', verticalAlign: 'top', color: '#166534', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        Pre-qual Details
                      </td>
                      <NotesDrawer notes={lead.notes || lead.message} />
                    </tr>
                  )}
                  {isExpanded && lead.user_id && (
                    <tr key={`${lead.id}-views`} style={{ background: '#f0f9ff', borderBottom: isLast ? 'none' : `1px solid ${P.border}` }}>
                      <td colSpan={10} style={{ padding: '10px 14px 14px' }}>
                        <PropertyViewsSection fetchUrl={`/api/admin/leads/${lead.user_id}/property-views`} />
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function th() {
  return {
    padding: '10px 14px', textAlign: 'left' as const,
    fontSize: 11, fontWeight: 600, color: P.muted,
    borderBottom: `1px solid ${P.border}`, whiteSpace: 'nowrap' as const,
  }
}

function td() {
  return { padding: '11px 14px' }
}
