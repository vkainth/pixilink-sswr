'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiPath } from '@/lib/admin-api-path'
import type { BuyerSold, BuyerSoldMatch } from '@/lib/types'

const P = {
  primary: '#23a9e1',
  border: '#e2e8f0',
  bg: '#f8fafc',
  gold: '#b8860b',
  goldBg: '#fffbeb',
  green: '#16a34a',
  greenBg: '#f0fdf4',
  red: '#dc2626',
  redBg: '#fef2f2',
  amber: '#d97706',
  amberBg: '#fffbeb',
  muted: '#64748b',
  text: '#1e293b',
}

const CONFIDENCE_DISPLAY: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  high:   { label: 'HIGH',   color: P.green,  bg: P.greenBg, icon: '✅' },
  medium: { label: 'MED',    color: P.amber,  bg: P.amberBg, icon: '⚠️' },
  low:    { label: 'LOW',    color: P.amber,  bg: P.amberBg, icon: '⚠️' },
  none:   { label: 'NONE',   color: P.red,    bg: P.redBg,   icon: '❌' },
}

function formatPrice(p: number | null | undefined): string {
  if (!p) return '—'
  if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
  return `$${Math.round(p).toLocaleString('en-CA')}`
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

interface ReviewRow {
  match: BuyerSoldMatch
  action: 'confirm' | 'private_sale' | 'skip'
  overrideMlsId: string
  overrideMode: boolean
  notes: string
}

interface Props {
  agentId: number
  agentName: string
}

export default function BuyerSoldsPanel({ agentId, agentName }: Props) {
  const [tab, setTab] = useState<'import' | 'confirmed'>('import')

  // Import tab state
  const [addressText, setAddressText] = useState('')
  const [matching, setMatching] = useState(false)
  const [matchError, setMatchError] = useState('')
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Confirmed tab state
  const [confirmed, setConfirmed] = useState<BuyerSold[]>([])
  const [loadingConfirmed, setLoadingConfirmed] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const basePath = apiPath(`/api/admin/agents/${agentId}/buyer-solds`)

  const loadConfirmed = useCallback(async () => {
    setLoadingConfirmed(true)
    try {
      const res = await fetch(basePath)
      if (res.ok) {
        const data = await res.json()
        setConfirmed(data.items || [])
      }
    } catch {
      // ignore
    }
    setLoadingConfirmed(false)
  }, [basePath])

  useEffect(() => {
    if (tab === 'confirmed') loadConfirmed()
  }, [tab, loadConfirmed])

  async function handleMatch() {
    const lines = addressText.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) return
    setMatching(true)
    setMatchError('')
    setReviewRows([])
    setSaveMsg('')
    try {
      const res = await fetch(`${basePath}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: lines }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMatchError(data.error || 'Matching failed')
        return
      }
      const results: BuyerSoldMatch[] = data.results || []
      setReviewRows(results.map(match => ({
        match,
        action: match.confidence === 'none' && match.normalized?.is_private_sale
          ? 'private_sale'
          : match.mls_id ? 'confirm' : 'skip',
        overrideMlsId: '',
        overrideMode: false,
        notes: '',
      })))
    } catch {
      setMatchError('Network error. Please try again.')
    }
    setMatching(false)
  }

  function updateRow(i: number, patch: Partial<ReviewRow>) {
    setReviewRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  async function handleSave() {
    const toSave = reviewRows.filter(r => r.action !== 'skip')
    if (!toSave.length) {
      setSaveMsg('Nothing to save — all rows are set to Skip.')
      return
    }
    setSaving(true)
    setSaveMsg('')
    try {
      const items = toSave.map(r => ({
        address_raw:    r.match.raw,
        mls_id:         r.action === 'private_sale' ? null : (r.overrideMode ? r.overrideMlsId : r.match.mls_id),
        is_private_sale:r.action === 'private_sale' || (r.match.normalized?.is_private_sale ?? false),
        ai_confidence:  r.match.confidence,
        ai_reason:      r.match.reason,
        notes:          r.notes || null,
      }))
      const res = await fetch(basePath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const data = await res.json()
      if (res.ok) {
        setSaveMsg(`✅ Saved ${data.saved ?? toSave.length} entries.`)
        setReviewRows([])
        setAddressText('')
      } else {
        setSaveMsg(`Error: ${data.error || 'Save failed'}`)
      }
    } catch {
      setSaveMsg('Network error during save.')
    }
    setSaving(false)
  }

  async function handleDelete(rowId: number) {
    if (!confirm('Delete this buyer-represented sold entry?')) return
    setDeletingId(rowId)
    try {
      const res = await fetch(basePath, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowId }),
      })
      if (res.ok) {
        setConfirmed(prev => prev.filter(r => r.id !== rowId))
      }
    } catch {
      // ignore
    }
    setDeletingId(null)
  }

  const cell: React.CSSProperties = {
    padding: '10px 14px',
    borderBottom: `1px solid ${P.border}`,
    fontSize: 13,
    verticalAlign: 'top',
  }

  const headerCell: React.CSSProperties = {
    ...cell,
    fontWeight: 700,
    background: P.bg,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: P.muted,
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: P.text, margin: '0 0 6px' }}>
          Buyer-Represented Solds — {agentName}
        </h1>
        <p style={{ fontSize: 13, color: P.muted, margin: 0 }}>
          Import addresses where {agentName} represented the buyer. AI matches each address to an MLS record for review before saving.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: `2px solid ${P.border}` }}>
        {(['import', 'confirmed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? `3px solid ${P.primary}` : '3px solid transparent',
              color: tab === t ? P.primary : P.muted,
              fontWeight: tab === t ? 700 : 400,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginBottom: -2,
            }}
          >
            {t === 'import' ? '+ AI Import' : `Confirmed Entries${confirmed.length ? ` (${confirmed.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* ── IMPORT TAB ── */}
      {tab === 'import' && (
        <div>
          {/* Paste area */}
          {!reviewRows.length && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: P.text }}>
                Paste addresses (one per line):
              </label>
              <textarea
                value={addressText}
                onChange={e => setAddressText(e.target.value)}
                rows={12}
                placeholder={`610-8180 Lansdowne Richmond\n5922 Chancellor Blvd Vancouver\n12-5650 Hampton Place Van ( private sale )\n101-2288 west 40th ave Van\n...`}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '12px 14px', fontSize: 13, fontFamily: 'monospace',
                  border: `1px solid ${P.border}`, borderRadius: 8,
                  resize: 'vertical', lineHeight: 1.6,
                  outline: 'none', color: P.text,
                }}
              />
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={handleMatch}
                  disabled={matching || !addressText.trim()}
                  style={{
                    background: matching ? '#94a3b8' : P.primary,
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '10px 24px', fontSize: 14, fontWeight: 700,
                    cursor: matching ? 'default' : 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {matching ? '⏳ Matching with AI…' : '✨ AI Match Addresses'}
                </button>
                {matchError && <span style={{ color: P.red, fontSize: 13 }}>{matchError}</span>}
              </div>
              {matching && (
                <p style={{ fontSize: 12, color: P.muted, marginTop: 8 }}>
                  Claude is normalizing addresses and querying MLS candidates. This may take 20–60 seconds for large batches…
                </p>
              )}
            </div>
          )}

          {/* Review table */}
          {reviewRows.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: P.text }}>
                  Review AI Matches ({reviewRows.length} addresses)
                </h2>
                <button
                  onClick={() => { setReviewRows([]); setMatchError(''); setSaveMsg('') }}
                  style={{ background: 'none', border: `1px solid ${P.border}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: P.muted, fontFamily: 'inherit' }}
                >
                  ← Back to Import
                </button>
              </div>
              <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${P.border}`, marginBottom: 20 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={headerCell}>Raw Address</th>
                      <th style={headerCell}>AI Match</th>
                      <th style={headerCell}>Sold Price</th>
                      <th style={headerCell}>Sold Date</th>
                      <th style={headerCell}>Confidence</th>
                      <th style={headerCell}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewRows.map((row, i) => {
                      const conf = CONFIDENCE_DISPLAY[row.match.confidence] ?? CONFIDENCE_DISPLAY.none
                      return (
                        <tr key={i} style={{ background: row.action === 'skip' ? '#fafafa' : '#fff' }}>
                          {/* Raw address */}
                          <td style={{ ...cell, fontFamily: 'monospace', fontSize: 12, maxWidth: 200 }}>
                            {row.match.raw}
                            {row.match.normalized?.is_private_sale && (
                              <span style={{ display: 'inline-block', marginLeft: 6, fontSize: 10, background: P.goldBg, color: P.gold, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                                PRIVATE
                              </span>
                            )}
                          </td>
                          {/* AI match */}
                          <td style={{ ...cell, maxWidth: 240 }}>
                            {row.match.candidate ? (
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13, color: P.text }}>{row.match.candidate.mls_id}</div>
                                <div style={{ fontSize: 12, color: P.muted, marginTop: 2 }}>{row.match.candidate.address}, {row.match.candidate.city}</div>
                                <div
                                  title={row.match.reason}
                                  style={{ fontSize: 11, color: P.muted, marginTop: 3, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'help' }}
                                >
                                  💬 {row.match.reason}
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: P.muted, fontStyle: 'italic' }}>
                                {row.match.normalized?.is_private_sale ? 'Private sale — no MLS' : 'No candidate found'}
                              </span>
                            )}
                          </td>
                          {/* Sold price */}
                          <td style={cell}>{formatPrice(row.match.candidate?.sold_price)}</td>
                          {/* Sold date */}
                          <td style={cell}>{formatDate(row.match.candidate?.sold_date)}</td>
                          {/* Confidence badge */}
                          <td style={cell}>
                            <span style={{
                              display: 'inline-block', padding: '3px 8px', borderRadius: 12,
                              fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                              background: conf.bg, color: conf.color,
                            }}>
                              {conf.icon} {conf.label}
                            </span>
                          </td>
                          {/* Action column */}
                          <td style={{ ...cell, minWidth: 200 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {/* Action buttons */}
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {(['confirm', 'private_sale', 'skip'] as const).map(act => (
                                  <button
                                    key={act}
                                    onClick={() => updateRow(i, { action: act, overrideMode: act !== 'confirm' ? false : row.overrideMode })}
                                    style={{
                                      padding: '4px 10px', fontSize: 11, fontWeight: 600,
                                      border: `1px solid ${row.action === act ? P.primary : P.border}`,
                                      borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                                      background: row.action === act ? P.primary : '#fff',
                                      color: row.action === act ? '#fff' : P.muted,
                                    }}
                                  >
                                    {act === 'confirm' ? '✓ Confirm' : act === 'private_sale' ? '🔒 Private' : '— Skip'}
                                  </button>
                                ))}
                              </div>
                              {/* Override MLS# toggle */}
                              {row.action === 'confirm' && (
                                <div>
                                  {!row.overrideMode ? (
                                    <button
                                      onClick={() => updateRow(i, { overrideMode: true })}
                                      style={{ fontSize: 11, color: P.primary, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', textDecoration: 'underline' }}
                                    >
                                      Override MLS#
                                    </button>
                                  ) : (
                                    <input
                                      type="text"
                                      placeholder="Enter MLS# e.g. R2XXXXXX"
                                      value={row.overrideMlsId}
                                      onChange={e => updateRow(i, { overrideMlsId: e.target.value })}
                                      style={{
                                        fontSize: 12, padding: '4px 8px',
                                        border: `1px solid ${P.primary}`, borderRadius: 6,
                                        width: '100%', fontFamily: 'monospace', boxSizing: 'border-box',
                                      }}
                                    />
                                  )}
                                </div>
                              )}
                              {/* Notes */}
                              <input
                                type="text"
                                placeholder="Notes (optional)"
                                value={row.notes}
                                onChange={e => updateRow(i, { notes: e.target.value })}
                                style={{
                                  fontSize: 11, padding: '3px 8px',
                                  border: `1px solid ${P.border}`, borderRadius: 6,
                                  width: '100%', fontFamily: 'inherit', color: P.muted,
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary + Save */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, color: P.muted }}>
                  <strong style={{ color: P.green }}>{reviewRows.filter(r => r.action === 'confirm').length}</strong> confirm ·{' '}
                  <strong style={{ color: P.gold }}>{reviewRows.filter(r => r.action === 'private_sale').length}</strong> private ·{' '}
                  <strong style={{ color: '#94a3b8' }}>{reviewRows.filter(r => r.action === 'skip').length}</strong> skip
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving || reviewRows.every(r => r.action === 'skip')}
                  style={{
                    background: saving ? '#94a3b8' : P.green,
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '10px 28px', fontSize: 14, fontWeight: 700,
                    cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {saving ? 'Saving…' : `Save ${reviewRows.filter(r => r.action !== 'skip').length} Entries`}
                </button>
                {saveMsg && <span style={{ fontSize: 13, color: saveMsg.startsWith('✅') ? P.green : P.red }}>{saveMsg}</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIRMED TAB ── */}
      {tab === 'confirmed' && (
        <div>
          {loadingConfirmed ? (
            <p style={{ color: P.muted, fontSize: 14 }}>Loading…</p>
          ) : confirmed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: P.muted, fontSize: 14 }}>
              No confirmed buyer-represented solds yet. Use the &quot;AI Import&quot; tab to add entries.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${P.border}` }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={headerCell}>Raw Address</th>
                    <th style={headerCell}>MLS ID</th>
                    <th style={headerCell}>Type</th>
                    <th style={headerCell}>AI Confidence</th>
                    <th style={headerCell}>Notes</th>
                    <th style={headerCell}>Added</th>
                    <th style={headerCell}></th>
                  </tr>
                </thead>
                <tbody>
                  {confirmed.map(row => {
                    const conf = CONFIDENCE_DISPLAY[row.ai_confidence ?? 'none'] ?? CONFIDENCE_DISPLAY.none
                    return (
                      <tr key={row.id}>
                        <td style={{ ...cell, fontFamily: 'monospace', fontSize: 12 }}>
                          {row.address_raw}
                          {row.is_private_sale && (
                            <span style={{ display: 'inline-block', marginLeft: 6, fontSize: 10, background: P.goldBg, color: P.gold, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>PRIVATE</span>
                          )}
                        </td>
                        <td style={{ ...cell, fontFamily: 'monospace', fontSize: 12 }}>{row.mls_id || '—'}</td>
                        <td style={{ ...cell }}>
                          <span style={{ fontSize: 11, background: row.is_private_sale ? P.goldBg : P.greenBg, color: row.is_private_sale ? P.gold : P.green, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                            {row.is_private_sale ? 'Private Sale' : 'MLS Match'}
                          </span>
                        </td>
                        <td style={cell}>
                          {row.ai_confidence && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: conf.bg, color: conf.color, padding: '2px 8px', borderRadius: 10 }}>
                              {conf.icon} {conf.label}
                            </span>
                          )}
                        </td>
                        <td style={{ ...cell, fontSize: 12, color: P.muted }}>{row.notes || '—'}</td>
                        <td style={{ ...cell, fontSize: 12, color: P.muted }}>{formatDate(row.created_at)}</td>
                        <td style={cell}>
                          <button
                            onClick={() => handleDelete(row.id)}
                            disabled={deletingId === row.id}
                            style={{
                              background: 'none', border: `1px solid ${P.border}`,
                              borderRadius: 6, padding: '4px 10px', fontSize: 11,
                              cursor: 'pointer', color: P.red, fontFamily: 'inherit',
                            }}
                          >
                            {deletingId === row.id ? '…' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <button
              onClick={loadConfirmed}
              style={{ background: 'none', border: `1px solid ${P.border}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: P.muted, fontFamily: 'inherit' }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
