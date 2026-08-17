'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiPath } from '@/lib/admin-api-path'

const P = {
  primary: '#23a9e1', primaryLight: '#e0f2fe',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', success: '#22c55e', successLight: '#dcfce7',
  warning: '#f59e0b', warningLight: '#fffbeb',
  error: '#ef4444', errorLight: '#fee2e2',
}

const PERSONA_TAG_LABELS: Record<string, string> = {
  'elevator': '🛗 Elevator',
  'one-level-living': '🏡 One-Level Living',
  'age-55-plus': '👴 55+',
  'low-strata-fee': '💰 Low Strata Fee',
  'small-complex': '🏘️ Small Complex',
  'pet-friendly': '🐾 Pet-Friendly',
  'luxury-finishes': '✨ Luxury Finishes',
  'custom-millwork': '🪚 Custom Millwork',
  'spa-ensuite': '🛁 Spa Ensuite',
  'high-end-renovation': '🔨 High-End Reno',
  'designer-kitchen': '🍽️ Designer Kitchen',
  'high-end-appliances': '🍳 High-End Appliances',
  'sub-zero': 'Sub-Zero', 'wolf': 'Wolf', 'viking': 'Viking', 'miele': 'Miele',
  'thermador': 'Thermador', 'fisher-paykel': 'Fisher & Paykel', 'bosch': 'Bosch',
}

type QueueStatus = 'pending' | 'generating' | 'done' | 'skipped' | 'error'

interface QueueListing {
  id: string
  mls: string
  address: string
  city: string
  subarea: string | null
  price: number | null
  remarks: string | null
  features: string | null
  amenity: string | null
  ai_tags?: string[]
}

interface QueueItem {
  listing: QueueListing
  status: QueueStatus
  tags: string[] | null
  error: string | null
}

export default function ListingsBatchGeneratePage() {
  const searchParams = useSearchParams()
  const initialSlug = searchParams.get('agentSlug') || 'randy'
  const [agentSlug, setAgentSlug] = useState(initialSlug)
  const [inputSlug, setInputSlug] = useState(initialSlug)
  const [queueLimit, setQueueLimit] = useState(250)
  const [missingOnly, setMissingOnly] = useState(true)
  const [forceRegenerate, setForceRegenerate] = useState(false)
  const [loadingListings, setLoadingListings] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'paused' | 'done'>('idle')
  const [concurrency, setConcurrency] = useState<1 | 2 | 3>(2)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const pauseRef = useRef(false)
  const activeCountRef = useRef(0)
  const processingRef = useRef(false)

  function loadListings(slug: string) {
    if (!slug.trim()) return
    setLoadingListings(true)
    setLoadError(null)
    const qs = new URLSearchParams({ agentSlug: slug.trim(), limit: String(queueLimit) })
    if (missingOnly) qs.set('missing_only', 'true')
    fetch(apiPath(`/api/admin/listings?${qs}`))
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setLoadError(data.error)
        } else {
          const listings: QueueListing[] = data.listings || []
          setQueue(listings.map((l: QueueListing) => ({
            listing: l,
            status: 'pending',
            tags: null,
            error: null,
          })))
          setAgentSlug(data.agent_slug || slug)
          setRunStatus('idle')
        }
      })
      .catch(() => setLoadError('Network error — could not load listings'))
      .finally(() => setLoadingListings(false))
  }

  useEffect(() => { loadListings(initialSlug) }, [])

  const doneCount = queue.filter(q => q.status === 'done' || q.status === 'skipped').length
  const errorCount = queue.filter(q => q.status === 'error').length
  const pendingCount = queue.filter(q => q.status === 'pending').length

  async function generateOne(item: QueueItem): Promise<void> {
    const l = item.listing
    setQueue(prev => prev.map(q => q.listing.id === l.id ? { ...q, status: 'generating', error: null } : q))
    activeCountRef.current++
    try {
      const res = await fetch(apiPath(`/api/admin/listings/${l.id}/generate-tags`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remarks: l.remarks,
          features: l.features,
          amenity: l.amenity,
          existingTags: l.ai_tags || [],
          force: forceRegenerate,
        }),
      })
      const text = await res.text()
      let data: Record<string, unknown>
      try {
        data = JSON.parse(text) as Record<string, unknown>
      } catch {
        throw new Error(`HTTP ${res.status} — ${text.slice(0, 300)}`)
      }
      if (!res.ok) throw new Error((data.error as string) || `HTTP ${res.status}`)
      const tags = (data.tags as string[]) || []
      const skipped = Boolean(data.skipped)
      setQueue(prev => prev.map(q => q.listing.id === l.id ? { ...q, tags, status: skipped ? 'skipped' : 'done' } : q))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error'
      setQueue(prev => prev.map(q => q.listing.id === l.id ? { ...q, status: 'error', error: msg } : q))
    } finally {
      activeCountRef.current--
    }
  }

  const runQueue = useCallback(async (concurrencyVal: number) => {
    if (processingRef.current) return
    processingRef.current = true
    pauseRef.current = false

    const getPending = () => new Promise<QueueItem[]>(resolve => {
      setQueue(current => {
        resolve(current.filter(q => q.status === 'pending'))
        return current
      })
    })

    while (true) {
      if (pauseRef.current) break
      const pending = await getPending()
      if (pending.length === 0 && activeCountRef.current === 0) {
        setRunStatus('done')
        break
      }
      const slots = concurrencyVal - activeCountRef.current
      const toStart = pending.slice(0, Math.max(0, slots))
      if (toStart.length === 0) {
        await new Promise(r => setTimeout(r, 200))
        continue
      }
      await Promise.all(toStart.map(item => generateOne(item)))
      if (pauseRef.current) break
    }

    processingRef.current = false
    if (pauseRef.current) setRunStatus('paused')
  }, [forceRegenerate])

  function handleStart() {
    if (runStatus === 'running') return
    setRunStatus('running')
    runQueue(concurrency)
  }
  function handlePause() { pauseRef.current = true }
  function handleResume() {
    if (runStatus !== 'paused') return
    setRunStatus('running')
    runQueue(concurrency)
  }
  function handleReset() {
    pauseRef.current = true
    processingRef.current = false
    activeCountRef.current = 0
    setQueue(prev => prev.map(q => ({ ...q, status: 'pending', tags: null, error: null })))
    setRunStatus('idle')
  }
  function handleRerunErrors() {
    setQueue(prev => prev.map(q => q.status === 'error' ? { ...q, status: 'pending', error: null } : q))
    if (runStatus === 'idle' || runStatus === 'done' || runStatus === 'paused') {
      setTimeout(() => { setRunStatus('running'); runQueue(concurrency) }, 100)
    }
  }
  function toggleRow(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const statusChip = (status: QueueStatus) => {
    const map: Record<QueueStatus, { label: string; bg: string; color: string }> = {
      pending: { label: 'Pending', bg: P.bg, color: P.muted },
      generating: { label: '⟳ Generating…', bg: P.primaryLight, color: P.primary },
      done: { label: '✓ Done', bg: P.successLight, color: '#15803d' },
      skipped: { label: '⏭ Skipped (already tagged)', bg: '#f0fdf4', color: '#16a34a' },
      error: { label: '✗ Error', bg: P.errorLight, color: P.error },
    }
    const s = map[status]
    return (
      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
        {s.label}
      </span>
    )
  }

  const progressPct = queue.length > 0 ? Math.round(((doneCount + errorCount) / queue.length) * 100) : 0

  return (
    <div>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <a href="/admin/buildings" style={{ color: P.muted, textDecoration: 'none', fontSize: 13 }}>← Admin</a>
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>🏷️ Listings — Batch AI Tagging</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>
            Reads each listing&apos;s remarks, features, and amenities and assigns persona tags with Claude. Drives the Downsizers, Luxury Finishes, and High-End Appliances persona pages.
          </p>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>

        {/* Filters */}
        <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 10, padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: P.text, marginBottom: 14 }}>Queue Filters</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={inputSlug}
              onChange={e => setInputSlug(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadListings(inputSlug)}
              placeholder="Agent slug…"
              style={{ padding: '8px 12px', border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 13, width: 160, fontFamily: 'inherit', outline: 'none' }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: P.text }}>
              Limit
              <input
                type="number"
                min={1}
                value={queueLimit}
                onChange={e => setQueueLimit(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{ padding: '8px 10px', border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 13, width: 80, fontFamily: 'inherit', outline: 'none' }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: P.text, cursor: 'pointer' }}>
              <input type="checkbox" checked={missingOnly} onChange={e => setMissingOnly(e.target.checked)} style={{ width: 16, height: 16 }} />
              Missing persona tags only
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: forceRegenerate ? P.error : P.muted, cursor: 'pointer' }}>
              <input type="checkbox" checked={forceRegenerate} onChange={e => setForceRegenerate(e.target.checked)} style={{ width: 16, height: 16, accentColor: P.error }} />
              Force regenerate (overwrite existing)
            </label>
            <button
              onClick={() => loadListings(inputSlug)}
              disabled={loadingListings}
              style={{ padding: '8px 18px', background: P.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: loadingListings ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loadingListings ? 'Loading…' : 'Load Queue'}
            </button>
            {loadError && <span style={{ fontSize: 12, color: P.error }}>{loadError}</span>}
            {!loadingListings && queue.length > 0 && (
              <span style={{ fontSize: 12, color: P.muted }}>{queue.length} listing{queue.length !== 1 ? 's' : ''} in queue</span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 10, padding: '18px 24px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: P.muted, marginRight: 4 }}>Controls:</div>
          <button
            onClick={handleStart}
            disabled={runStatus === 'running' || queue.length === 0 || pendingCount === 0}
            style={{ padding: '8px 18px', background: runStatus === 'running' ? '#e0f2fe' : '#16a34a', color: runStatus === 'running' ? '#7ab3e0' : '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: (runStatus === 'running' || queue.length === 0 || pendingCount === 0) ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            ▶ Start
          </button>
          <button onClick={handlePause} disabled={runStatus !== 'running'}
            style={{ padding: '8px 18px', background: runStatus === 'running' ? P.warning : P.bg, color: runStatus === 'running' ? '#fff' : P.muted, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: runStatus !== 'running' ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            ⏸ Pause
          </button>
          <button onClick={handleResume} disabled={runStatus !== 'paused'}
            style={{ padding: '8px 18px', background: runStatus === 'paused' ? P.primary : P.bg, color: runStatus === 'paused' ? '#fff' : P.muted, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: runStatus !== 'paused' ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            ▶ Resume
          </button>
          <button onClick={handleReset} disabled={runStatus === 'running'}
            style={{ padding: '8px 18px', background: P.bg, color: runStatus === 'running' ? P.muted : P.text, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: runStatus === 'running' ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            ↺ Reset
          </button>
          {errorCount > 0 && (
            <button onClick={handleRerunErrors} disabled={runStatus === 'running'}
              style={{ padding: '8px 18px', background: P.errorLight, color: P.error, border: `1px solid ${P.error}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: runStatus === 'running' ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              ↺ Re-run Errors ({errorCount})
            </button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: P.muted }}>Concurrency:</span>
            {([1, 2, 3] as const).map(n => (
              <button key={n} onClick={() => setConcurrency(n)}
                style={{ padding: '6px 14px', background: concurrency === n ? P.primary : P.bg, color: concurrency === n ? '#fff' : P.muted, border: `1px solid ${concurrency === n ? P.primary : P.border}`, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Progress */}
        {queue.length > 0 && (runStatus !== 'idle' || doneCount > 0 || errorCount > 0) && (
          <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 10, padding: '16px 24px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: P.text }}>
                {doneCount + errorCount} / {queue.length} listings processed
                {runStatus === 'running' && <span style={{ color: P.primary, marginLeft: 8, fontSize: 12 }}>• Running</span>}
                {runStatus === 'paused' && <span style={{ color: P.warning, marginLeft: 8, fontSize: 12 }}>• Paused</span>}
                {runStatus === 'done' && <span style={{ color: '#16a34a', marginLeft: 8, fontSize: 12 }}>• Complete</span>}
              </div>
              <div style={{ fontSize: 12, color: P.muted }}>
                {queue.filter(q => q.status === 'done').length > 0 && <span style={{ color: '#15803d', marginRight: 12 }}>✓ {queue.filter(q => q.status === 'done').length} done</span>}
                {queue.filter(q => q.status === 'skipped').length > 0 && <span style={{ color: '#16a34a', marginRight: 12 }}>⏭ {queue.filter(q => q.status === 'skipped').length} skipped</span>}
                {errorCount > 0 && <span style={{ color: P.error, marginRight: 12 }}>✗ {errorCount} errors</span>}
                {pendingCount > 0 && <span>{pendingCount} pending</span>}
              </div>
            </div>
            <div style={{ background: P.bg, borderRadius: 6, height: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 6, background: errorCount > 0 && doneCount === 0 ? P.error : '#16a34a', width: `${progressPct}%`, transition: 'width 0.3s ease' }} />
            </div>
          </div>
        )}

        {/* Queue table */}
        {queue.length === 0 ? (
          <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 10, padding: '40px 24px', textAlign: 'center', color: P.muted, fontSize: 14 }}>
            {loadingListings ? 'Loading listings…' : 'No listings in queue. Adjust filters and click Load Queue.'}
          </div>
        ) : (
          <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: P.bg }}>
                  {['MLS #', 'Address', 'Price', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: P.muted, borderBottom: `1px solid ${P.border}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queue.map((item, i) => {
                  const l = item.listing
                  const expanded = expandedRows.has(l.id)
                  return (
                    <>
                      <tr key={l.id} style={{ borderBottom: `1px solid ${P.border}`, background: item.status === 'generating' ? '#f0f9ff' : i % 2 === 0 ? P.white : P.bg }}>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: P.muted, fontFamily: 'ui-monospace,monospace' }}>{l.mls}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: P.text }}>{l.address}</div>
                          <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>{l.subarea || l.city}</div>
                          {(l.ai_tags || []).length > 0 && (
                            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 3 }}>
                              {(l.ai_tags || []).map(t => (
                                <span key={t} style={{ padding: '1px 5px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>{PERSONA_TAG_LABELS[t] || t}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: P.muted }}>{l.price ? `$${l.price.toLocaleString()}` : '—'}</td>
                        <td style={{ padding: '12px 16px' }}>{statusChip(item.status)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {item.status === 'done' && (
                              <button onClick={() => toggleRow(l.id)}
                                style={{ padding: '5px 11px', background: expanded ? P.primaryLight : P.bg, color: expanded ? P.primary : P.text, border: `1px solid ${expanded ? P.primary : P.border}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                                {expanded ? '▲ Hide' : '▼ Preview'}
                              </button>
                            )}
                            {item.status === 'error' && (
                              <button
                                onClick={() => {
                                  setQueue(prev => prev.map(q => q.listing.id === l.id ? { ...q, status: 'pending', error: null } : q))
                                  if (runStatus !== 'running') setTimeout(() => { setRunStatus('running'); runQueue(concurrency) }, 100)
                                }}
                                style={{ padding: '5px 11px', background: P.errorLight, color: P.error, border: `1px solid ${P.error}`, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                ↺ Retry
                              </button>
                            )}
                          </div>
                          {item.error && <div style={{ fontSize: 11, color: P.error, marginTop: 4, maxWidth: 200 }}>{item.error}</div>}
                        </td>
                      </tr>
                      {expanded && item.tags && (
                        <tr key={`${l.id}-preview`} style={{ borderBottom: `1px solid ${P.border}` }}>
                          <td colSpan={5} style={{ padding: '0 16px 16px 32px', background: '#f8fafc' }}>
                            <div style={{ marginTop: 12, background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, padding: '14px 16px' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Assigned Persona Tags</div>
                              {item.tags.length === 0 ? (
                                <div style={{ fontSize: 13, color: P.muted, fontStyle: 'italic' }}>No persona tags matched — no qualifying evidence found in remarks/features/amenities.</div>
                              ) : (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  {item.tags.map(t => (
                                    <span key={t} style={{ padding: '4px 10px', background: '#fef3c7', color: '#92400e', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                                      {PERSONA_TAG_LABELS[t] || t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
