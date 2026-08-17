'use client'

import { useState } from 'react'
import type { AllLeadsResponse, AdminLeadWithAgent } from '@/lib/admin-api'

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
  w1:      { label: 'Showing Request',   bg: P.primaryLight, text: P.primary },
  w2:      { label: 'Home Evaluation',   bg: P.warningLight, text: '#92400e' },
  w3:      { label: 'Pre-qualification', bg: P.successLight, text: '#166534' },
  w4:      { label: 'Building Alert',    bg: P.purpleLight,  text: P.purple },
  contact: { label: 'Contact Form',      bg: P.slateLight,   text: P.slate },
  ask:     { label: 'Ask Agent',         bg: P.tealLight,    text: P.teal },
  weekly_deals:     { label: 'Weekly Deals',       bg: P.primaryLight, text: P.primary },
  price_drop:       { label: 'Price Drop Alert',   bg: P.warningLight, text: '#92400e' },
  building_sold:    { label: 'Building Sold Prices', bg: P.successLight, text: '#166534' },
  neighbour_sold:   { label: 'Neighbour Sold',     bg: P.purpleLight,  text: P.purple },
  school_catchment: { label: 'School Catchment',   bg: P.tealLight,    text: P.teal },
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })
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

function TypeBadge({ formType }: { formType: string | null }) {
  const meta = TYPE_META[formType ?? ''] ?? { label: formType ?? 'Unknown', bg: P.slateLight, text: P.slate }
  return (
    <span style={{ background: meta.bg, color: meta.text, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {meta.label}
    </span>
  )
}

function exportCsv(leads: AdminLeadWithAgent[]) {
  const rows = [
    ['Date', 'Agent', 'Lead Name', 'Phone', 'Email', 'Type', 'Context', 'Property / Page', 'Offer Context', 'Message', 'Contacted'],
    ...leads.map(l => [
      formatDate(l.created_at),
      l.agent_name,
      l.name || '—',
      l.phone || '',
      l.email || '',
      TYPE_META[l.form_type ?? '']?.label ?? l.form_type ?? '',
      formatBrowsingContext(l) || '',
      l.property_address || '',
      l.offer_context || '',
      l.message || '',
      l.contacted_at ? formatDate(l.contacted_at) : 'No',
    ]),
  ]
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  data: AllLeadsResponse
}

export default function AdminLeadsClient({ data }: Props) {
  const { leads, by_agent } = data

  const agentOptions = ['All Agents', ...Array.from(new Set(leads.map(l => l.agent_name)))]
  const [agentFilter, setAgentFilter] = useState('All Agents')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = leads
    .filter(l => agentFilter === 'All Agents' || l.agent_name === agentFilter)
    .filter(l => typeFilter === 'all' || l.form_type === typeFilter)
    .filter(l => {
      if (!search) return true
      const q = search.toLowerCase()
      return [l.name, l.email, l.phone, l.property_address, l.agent_name]
        .some(v => v?.toLowerCase().includes(q))
    })

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Leads</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>
            {leads.length} total lead{leads.length !== 1 ? 's' : ''} across all agents (last 30 days)
          </p>
        </div>
        <button
          onClick={() => exportCsv(filtered)}
          style={{ padding: '7px 14px', background: P.white, border: `1px solid ${P.border}`, borderRadius: 7, fontSize: 12, fontWeight: 600, color: P.text, cursor: 'pointer' }}
        >
          ⬇ Export CSV
        </button>
      </div>

      <div style={{ padding: '20px 32px' }}>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
          <div style={{ background: P.white, borderRadius: 10, padding: '16px 18px', border: `1px solid ${P.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Total Leads</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: P.primary }}>{leads.length}</div>
          </div>
          {by_agent.map(a => (
            <div key={a.agent_id} style={{ background: P.white, borderRadius: 10, padding: '16px 18px', border: `1px solid ${P.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{a.agent_name}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e' }}>{a.total}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={agentFilter}
            onChange={e => setAgentFilter(e.target.value)}
            style={{ padding: '8px 12px', border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 13, color: P.text, background: P.white, fontFamily: 'inherit' }}
          >
            {agentOptions.map(a => <option key={a}>{a}</option>)}
          </select>
          <div style={{ display: 'flex', background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, overflow: 'hidden' }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'w1', label: 'Showing' },
              { key: 'w2', label: 'Home Eval' },
              { key: 'w3', label: 'Pre-qual' },
              { key: 'w4', label: 'Bldg Alert' },
              { key: 'contact', label: 'Contact' },
              { key: 'ask', label: 'Ask Agent' },
              { key: 'weekly_deals', label: 'Weekly Deals' },
              { key: 'price_drop', label: 'Price Drop' },
              { key: 'building_sold', label: 'Bldg Sold' },
              { key: 'neighbour_sold', label: 'Neighbour Sold' },
              { key: 'school_catchment', label: 'School' },
            ].map(t => (
              <button key={t.key} onClick={() => setTypeFilter(t.key)} style={{
                padding: '7px 12px', border: 'none',
                background: typeFilter === t.key ? P.primary : 'transparent',
                color: typeFilter === t.key ? '#fff' : P.muted,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                borderRight: `1px solid ${P.border}`,
              }}>
                {t.label}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            style={{ padding: '7px 14px', border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 13, width: 220, outline: 'none', fontFamily: 'inherit', color: P.text }}
          />
          <span style={{ fontSize: 12, color: P.muted, marginLeft: 'auto' }}>
            {filtered.length} of {leads.length} leads
          </span>
        </div>

        {/* Table */}
        <div style={{ background: P.white, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: P.bg }}>
                {['Date', 'Lead Name', 'Phone', 'Email', 'Type', 'Agent', 'Context', 'Property / Page', 'Offer Context', 'Message', 'Contacted'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: P.muted, borderBottom: `1px solid ${P.border}`, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: '40px', textAlign: 'center', color: P.muted, fontSize: 14 }}>
                    {leads.length === 0 ? 'No leads found. Leads will appear here when visitors submit forms on agent sites.' : 'No leads match the current filters.'}
                  </td>
                </tr>
              ) : filtered.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${P.border}` : 'none' }}>
                  <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 11, color: P.muted }}>{formatDate(l.created_at)}</span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: P.text }}>{l.name || '—'}</span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 12, color: P.muted }}>{l.phone || '—'}</span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    {l.email
                      ? <a href={`mailto:${l.email}`} style={{ fontSize: 12, color: P.primary }}>{l.email}</a>
                      : <span style={{ fontSize: 12, color: P.muted }}>—</span>}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <TypeBadge formType={l.form_type} />
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: P.primary }}>{l.agent_name}</span>
                  </td>
                  <td style={{ padding: '11px 14px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(() => {
                      const ctx = formatBrowsingContext(l)
                      return ctx
                        ? <span style={{ fontSize: 12, color: P.primary, fontWeight: 500 }} title={ctx}>{ctx}</span>
                        : <span style={{ fontSize: 12, color: P.muted }}>—</span>
                    })()}
                  </td>
                  <td style={{ padding: '11px 14px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 12, color: P.muted }}>{l.property_address || '—'}</span>
                  </td>
                  <td style={{ padding: '11px 14px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 12, color: P.muted }}>{l.offer_context || '—'}</span>
                  </td>
                  <td style={{ padding: '11px 14px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 12, color: P.muted }}>{l.message || '—'}</span>
                  </td>
                  <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 11, color: l.contacted_at ? '#166534' : P.muted }}>
                      {l.contacted_at ? formatDate(l.contacted_at) : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
