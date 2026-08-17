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
  purple: '#8b5cf6', purpleLight: '#ede9fe',
}

type QueueStatus = 'pending' | 'generating' | 'done' | 'skipped' | 'error'
type GenerateMode = 'description' | 'features' | 'both' | 'tags'

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

const AMENITY_TAGS = [
  { key: 'air_conditioning', label: '❄️ A/C' },
  { key: 'panel_fridge',     label: '🧊 Panel Fridge' },
  { key: 'gas_appliances',   label: '🔥 Gas' },
  { key: 'electric_appliances', label: '⚡ Electric' },
]

interface QueueBuilding {
  id: string
  name: string
  city: string
  subarea: string | null
  units: number | null
  year_built: number | null
  construction: string | null
  strata_no: string | null
  levels: number | null
  active_listings: number
  min_price: number | null
  max_price: number | null
  photo_url: string | null
  slug: string
  amenity_tags?: string[]
}

interface GeneratedContent {
  tagline: string
  description: string
  neighbourhood_context: string
  meta_description: string
  faq: Array<{ question: string; answer: string }>
}

interface FeatureSection {
  title: string
  items: string[]
}

interface QueueItem {
  building: QueueBuilding
  status: QueueStatus
  content: GeneratedContent | null
  featuresContent: FeatureSection[] | null
  featuresType: string | null
  tagsContent: string[] | null
  error: string | null
}

const DEFAULT_DESC_PROMPT = `You are a real estate content writer for a Canadian real estate website covering Metro Vancouver and the Lower Mainland of British Columbia.

LANGUAGE & SPELLING (Canadian English throughout):
- Spelling: neighbourhood, storey, centre, colour, favourite, licence (noun), organise
- Prices always in CAD context
- Geography: use Metro Vancouver, Lower Mainland, Fraser Valley, Sea-to-Sky Corridor — never "the Pacific Northwest" alone
- Refer to suites not units where natural; storeys not floors/stories

TONE:
- Warm, informative, and factual — like a knowledgeable local agent, not an ad copywriter
- No hype words: avoid "stunning", "luxurious", "prestigious", "world-class", "breathtaking"
- Write directly and concisely — BC buyers are skeptical of marketing language
- Be accurate: only describe what is supported by the data provided`

const DEFAULT_FEATURES_PROMPT = `You are a real estate content writer for a Canadian real estate website covering Metro Vancouver and the Lower Mainland of British Columbia.

LANGUAGE & SPELLING (Canadian English throughout):
- Spelling: neighbourhood, storey, centre, colour, favourite, licence (noun), organise
- Canadian English throughout

TONE:
- Factual and direct — no hype words, no marketing language
- Preserve all factual claims: appliance brands, materials, dimensions, named amenities
- One sentence per bullet, clear and specific
- Consolidate section titles into neutral functional categories (Exterior & Arrival, Interior Finishes, Kitchen, Bathrooms, Peace of Mind, Amenities)`

export default function BatchGeneratePage() {
  const searchParams = useSearchParams()
  const initialSlug = searchParams.get('agentSlug') || 'randy'
  const [agentSlug, setAgentSlug] = useState(initialSlug)
  const [inputSlug, setInputSlug] = useState(initialSlug)
  const [queueLimit, setQueueLimit] = useState(500)
  const [generateMode, setGenerateMode] = useState<GenerateMode>('description')
  const [missingOnly, setMissingOnly] = useState(true)
  const [forceRegenerate, setForceRegenerate] = useState(false)
  const [loadingBuildings, setLoadingBuildings] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'paused' | 'done'>('idle')
  const [concurrency, setConcurrency] = useState<number>(1)
  const [descPromptText, setDescPromptText] = useState(DEFAULT_DESC_PROMPT)
  const [featuresPromptText, setFeaturesPromptText] = useState(DEFAULT_FEATURES_PROMPT)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const pauseRef = useRef(false)
  const activeCountRef = useRef(0)
  const processingRef = useRef(false)

  function loadBuildings(slug: string) {
    if (!slug.trim()) return
    setLoadingBuildings(true)
    setLoadError(null)
    const qs = new URLSearchParams({ agentSlug: slug.trim(), limit: String(queueLimit) })
    if (missingOnly) {
      if (generateMode === 'description') qs.set('missing_only', 'true')
      else if (generateMode === 'features') qs.set('missing_features_only', 'true')
      else if (generateMode === 'both') {
        qs.set('missing_only', 'true')
        qs.set('missing_features_only', 'true')
      }
      // tags mode: server has no missing_tags_only filter yet — filtered client-side below
    }
    fetch(apiPath(`/api/admin/buildings?${qs}`))
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setLoadError(data.error)
        } else {
          let buildings: QueueBuilding[] = (data.buildings || [])
          if (missingOnly && generateMode === 'tags') {
            buildings = buildings.filter(b => !(b.amenity_tags || []).some(t => t in PERSONA_TAG_LABELS))
          }
          setQueue(buildings.map((b: QueueBuilding) => ({
            building: b,
            status: 'pending',
            content: null,
            featuresContent: null,
            featuresType: null,
            tagsContent: null,
            error: null,
          })))
          setAgentSlug(data.agent_slug || slug)
          setRunStatus('idle')
        }
      })
      .catch(() => setLoadError('Network error — could not load buildings'))
      .finally(() => setLoadingBuildings(false))
  }

  useEffect(() => { loadBuildings(initialSlug) }, [])

  const doneCount = queue.filter(q => q.status === 'done' || q.status === 'skipped').length
  const errorCount = queue.filter(q => q.status === 'error').length
  const pendingCount = queue.filter(q => q.status === 'pending').length

  async function generateOneDescription(item: QueueItem): Promise<boolean> {
    const b = item.building
    try {
      const res = await fetch(apiPath(`/api/admin/buildings/${b.id}/generate-description`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: descPromptText,
          agentSlug,
          slug: b.slug,
          name: b.name,
          city: b.city,
          subarea: b.subarea,
          units: b.units,
          year_built: b.year_built,
          construction: b.construction,
          levels: b.levels,
          strata_no: b.strata_no,
          active_count: b.active_listings,
          active_min_price: b.min_price,
          active_max_price: b.max_price,
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
      if (data.skipped) return true
      setQueue(prev => prev.map(q => q.building.id === b.id ? {
        ...q,
        content: {
          tagline: (data.tagline as string) || '',
          description: (data.description as string) || '',
          neighbourhood_context: (data.neighbourhood_context as string) || '',
          meta_description: (data.meta_description as string) || '',
          faq: (data.faq as Array<{ question: string; answer: string }>) || [],
        },
      } : q))
      return false
    } catch (err) {
      throw err
    }
  }

  async function generateOneFeatures(item: QueueItem): Promise<boolean> {
    const b = item.building
    const res = await fetch(apiPath(`/api/admin/buildings/${b.id}/generate-features`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: featuresPromptText,
        agentSlug,
        slug: b.slug,
        name: b.name,
        city: b.city,
        subarea: b.subarea,
        strata_no: b.strata_no,
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
    if (data.skipped) return true
    setQueue(prev => prev.map(q => q.building.id === b.id ? {
      ...q,
      featuresContent: (data.sections as FeatureSection[]) || null,
      featuresType: (data.type as string) || null,
    } : q))
    return false
  }

  async function generateOneTags(item: QueueItem): Promise<boolean> {
    const b = item.building
    const res = await fetch(apiPath(`/api/admin/buildings/${b.id}/generate-tags`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentSlug,
        slug: b.slug,
        name: b.name,
        units: b.units,
        levels: b.levels,
        existingTags: b.amenity_tags && b.amenity_tags.some(t => t in PERSONA_TAG_LABELS) ? b.amenity_tags : [],
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
    setQueue(prev => prev.map(q => q.building.id === b.id ? { ...q, tagsContent: (data.tags as string[]) || [] } : q))
    return Boolean(data.skipped)
  }

  async function generateOne(item: QueueItem): Promise<void> {
    const b = item.building
    setQueue(prev => prev.map(q => q.building.id === b.id ? { ...q, status: 'generating', error: null } : q))
    activeCountRef.current++
    try {
      let skipped = false
      if (generateMode === 'description') {
        skipped = await generateOneDescription(item)
      } else if (generateMode === 'features') {
        skipped = await generateOneFeatures(item)
      } else if (generateMode === 'tags') {
        skipped = await generateOneTags(item)
      } else {
        // both — run description first, then features (parallel would be wasteful on rate limits)
        const descSkipped = await generateOneDescription(item)
        const featSkipped = await generateOneFeatures(item)
        skipped = descSkipped && featSkipped
      }
      setQueue(prev => prev.map(q => q.building.id === b.id ? { ...q, status: skipped ? 'skipped' : 'done' } : q))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error'
      setQueue(prev => prev.map(q => q.building.id === b.id ? { ...q, status: 'error', error: msg } : q))
    } finally {
      activeCountRef.current--
    }
  }

  const runQueue = useCallback(async (queueSnapshot: QueueItem[], concurrencyVal: number) => {
    if (processingRef.current) return
    processingRef.current = true
    pauseRef.current = false

    const getPending = () => {
      return new Promise<QueueItem[]>(resolve => {
        setQueue(current => {
          resolve(current.filter(q => q.status === 'pending'))
          return current
        })
      })
    }

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
      // Fire items without awaiting so the loop keeps polling pauseRef every 200ms.
      // generateOne increments/decrements activeCountRef synchronously, so the slot
      // count stays accurate and we never over-schedule.
      toStart.forEach(item => { generateOne(item) })
      await new Promise(r => setTimeout(r, 200))
      if (pauseRef.current) break
    }

    processingRef.current = false
    if (pauseRef.current) setRunStatus('paused')
  }, [generateMode, agentSlug, descPromptText, featuresPromptText, forceRegenerate])

  function handleStart() {
    if (runStatus === 'running') return
    setRunStatus('running')
    runQueue(queue, concurrency)
  }

  function handlePause() {
    pauseRef.current = true
  }

  function handleResume() {
    if (runStatus !== 'paused') return
    setRunStatus('running')
    runQueue(queue, concurrency)
  }

  function handleReset() {
    pauseRef.current = true
    processingRef.current = false
    activeCountRef.current = 0
    setQueue(prev => prev.map(q => ({ ...q, status: 'pending', content: null, featuresContent: null, featuresType: null, tagsContent: null, error: null })))
    setRunStatus('idle')
  }

  function handleRerunErrors() {
    setQueue(prev => prev.map(q => q.status === 'error' ? { ...q, status: 'pending', error: null } : q))
    if (runStatus === 'idle' || runStatus === 'done' || runStatus === 'paused') {
      setTimeout(() => {
        setRunStatus('running')
        runQueue(queue, concurrency)
      }, 100)
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
      skipped: { label: '⏭ Skipped (already done)', bg: '#f0fdf4', color: '#16a34a' },
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

  const missingOnlyLabel =
    generateMode === 'description' ? 'Missing descriptions only' :
    generateMode === 'features' ? 'Missing features only' :
    generateMode === 'tags' ? 'Missing persona tags only' :
    'Missing content only (both)'

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <a href="/admin/buildings" style={{ color: P.muted, textDecoration: 'none', fontSize: 13 }}>← Buildings</a>
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>✨ Batch Generate</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>Generate SEO + AEO content and/or AI features for multiple buildings using Claude. Start with a small test set to tune the prompt.</p>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>

        {/* Mode selector */}
        <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 10, padding: '18px 24px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: P.text, marginBottom: 12 }}>What to Generate</div>
          <div style={{ display: 'flex', gap: 0, border: `1px solid ${P.border}`, borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
            {(['description', 'features', 'both', 'tags'] as GenerateMode[]).map((mode, i) => {
              const labels: Record<GenerateMode, string> = {
                description: '📄 Description + SEO',
                features: '🏠 Features',
                both: '✨ Both',
                tags: '🏷️ Persona Tags',
              }
              const active = generateMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => { setGenerateMode(mode); setRunStatus('idle') }}
                  style={{
                    padding: '9px 20px',
                    background: active ? P.primary : P.white,
                    color: active ? '#fff' : P.muted,
                    border: 'none',
                    borderLeft: i > 0 ? `1px solid ${P.border}` : 'none',
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 0.1s',
                  }}
                >
                  {labels[mode]}
                </button>
              )
            })}
          </div>
          {generateMode === 'description' && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: P.muted }}>Generates tagline, description, neighbourhood context, meta description, and FAQ for each building.</p>
          )}
          {generateMode === 'features' && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: P.muted }}>Rewrites BCN feature bullets into original Canadian English, preserving factual claims. Plain-tag buildings are wrapped directly without a Claude call.</p>
          )}
          {generateMode === 'both' && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: P.muted }}>Generates both description/SEO content and rewrites features for each building. Two Claude calls per building.</p>
          )}
          {generateMode === 'tags' && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: P.muted }}>Reads each building&apos;s description, amenities, and features and assigns persona tags (elevator, one-level-living, 55+, luxury finishes, appliance brands, etc.) used to drive the Downsizers, Luxury Finishes, and High-End Appliances persona pages. Saved as <code>amenity_tags</code>.</p>
          )}
        </div>

        {/* Filters */}
        <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 10, padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: P.text, marginBottom: 14 }}>Queue Filters</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={inputSlug}
              onChange={e => setInputSlug(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadBuildings(inputSlug)}
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
              <input
                type="checkbox"
                checked={missingOnly}
                onChange={e => setMissingOnly(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              {missingOnlyLabel}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: forceRegenerate ? P.error : P.muted, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={forceRegenerate}
                onChange={e => setForceRegenerate(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: P.error }}
              />
              Force regenerate (overwrite existing)
            </label>
            <button
              onClick={() => loadBuildings(inputSlug)}
              disabled={loadingBuildings}
              style={{ padding: '8px 18px', background: P.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: loadingBuildings ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loadingBuildings ? 'Loading…' : 'Load Queue'}
            </button>
            {loadError && <span style={{ fontSize: 12, color: P.error }}>{loadError}</span>}
            {!loadingBuildings && queue.length > 0 && (
              <span style={{ fontSize: 12, color: P.muted }}>{queue.length} building{queue.length !== 1 ? 's' : ''} in queue</span>
            )}
          </div>
        </div>

        {/* Prompt Editor(s) */}
        {(generateMode === 'description' || generateMode === 'both') && (
          <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 10, padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: P.text, marginBottom: 8 }}>System Prompt — Description &amp; SEO</div>
            <div style={{ fontSize: 12, color: P.muted, marginBottom: 10 }}>Claude's tone and language guide for tagline, description, neighbourhood context, meta description, and FAQ.</div>
            <textarea
              value={descPromptText}
              onChange={e => setDescPromptText(e.target.value)}
              rows={7}
              style={{ width: '100%', padding: '12px 14px', border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 12, fontFamily: 'ui-monospace,monospace', lineHeight: 1.6, outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: P.text }}
            />
          </div>
        )}

        {(generateMode === 'features' || generateMode === 'both') && (
          <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 10, padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: P.text, marginBottom: 8 }}>System Prompt — Features Rewrite</div>
            <div style={{ fontSize: 12, color: P.muted, marginBottom: 10 }}>Claude's guide for rewriting sectioned HTML features into original Canadian English. Plain-tag buildings skip Claude entirely.</div>
            <textarea
              value={featuresPromptText}
              onChange={e => setFeaturesPromptText(e.target.value)}
              rows={6}
              style={{ width: '100%', padding: '12px 14px', border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 12, fontFamily: 'ui-monospace,monospace', lineHeight: 1.6, outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: P.text }}
            />
          </div>
        )}

        {/* Controls */}
        <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 10, padding: '18px 24px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: P.muted, marginRight: 4 }}>Controls:</div>
          <button
            onClick={handleStart}
            disabled={runStatus === 'running' || queue.length === 0 || pendingCount === 0}
            style={{ padding: '8px 18px', background: runStatus === 'running' ? '#e0f2fe' : '#16a34a', color: runStatus === 'running' ? '#7ab3e0' : '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: (runStatus === 'running' || queue.length === 0 || pendingCount === 0) ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            ▶ Start
          </button>
          <button
            onClick={handlePause}
            disabled={runStatus !== 'running'}
            style={{ padding: '8px 18px', background: runStatus === 'running' ? P.warning : P.bg, color: runStatus === 'running' ? '#fff' : P.muted, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: runStatus !== 'running' ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            ⏸ Pause
          </button>
          <button
            onClick={handleResume}
            disabled={runStatus !== 'paused'}
            style={{ padding: '8px 18px', background: runStatus === 'paused' ? P.primary : P.bg, color: runStatus === 'paused' ? '#fff' : P.muted, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: runStatus !== 'paused' ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            ▶ Resume
          </button>
          <button
            onClick={handleReset}
            disabled={runStatus === 'running'}
            style={{ padding: '8px 18px', background: P.bg, color: runStatus === 'running' ? P.muted : P.text, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: runStatus === 'running' ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            ↺ Reset
          </button>
          {errorCount > 0 && (
            <button
              onClick={handleRerunErrors}
              disabled={runStatus === 'running'}
              style={{ padding: '8px 18px', background: P.errorLight, color: P.error, border: `1px solid ${P.error}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: runStatus === 'running' ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              ↺ Re-run Errors ({errorCount})
            </button>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: P.muted }}>Concurrency:</span>
            {[1, 3, 5, 10, 20].map(n => (
              <button
                key={n}
                onClick={() => setConcurrency(n)}
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
                {doneCount + errorCount} / {queue.length} buildings processed
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

        {/* Queue Table */}
        {queue.length === 0 ? (
          <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 10, padding: '40px 24px', textAlign: 'center', color: P.muted, fontSize: 14 }}>
            {loadingBuildings ? 'Loading buildings…' : 'No buildings in queue. Adjust filters and click Load Queue.'}
          </div>
        ) : (
          <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: P.bg }}>
                  {['Building', 'Location', 'Units', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: P.muted, borderBottom: `1px solid ${P.border}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queue.map((item, i) => {
                  const b = item.building
                  const expanded = expandedRows.has(b.id)
                  return (
                    <>
                      <tr key={b.id} style={{ borderBottom: `1px solid ${P.border}`, background: item.status === 'generating' ? '#f0f9ff' : i % 2 === 0 ? P.white : P.bg }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: P.text }}>{b.name}</div>
                          {b.strata_no && <div style={{ fontSize: 10, color: P.muted, marginTop: 2 }}>Strata {b.strata_no}</div>}
                          {(b.amenity_tags || []).length > 0 && (
                            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 3 }}>
                              {(b.amenity_tags || []).map(t => {
                                const tag = AMENITY_TAGS.find(at => at.key === t)
                                return tag ? <span key={t} style={{ padding: '1px 5px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>{tag.label}</span> : null
                              })}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: 13, color: P.text }}>{b.subarea || '—'}</div>
                          <div style={{ fontSize: 11, color: P.muted }}>{b.city}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: P.muted }}>
                          {b.units ?? '—'}
                          {b.year_built && <div style={{ fontSize: 11 }}>Built {b.year_built}</div>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>{statusChip(item.status)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {item.status === 'done' && (
                              <button
                                onClick={() => toggleRow(b.id)}
                                style={{ padding: '5px 11px', background: expanded ? P.primaryLight : P.bg, color: expanded ? P.primary : P.text, border: `1px solid ${expanded ? P.primary : P.border}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                                {expanded ? '▲ Hide' : '▼ Preview'}
                              </button>
                            )}
                            {item.status === 'error' && (
                              <button
                                onClick={() => {
                                  setQueue(prev => prev.map(q => q.building.id === b.id ? { ...q, status: 'pending', error: null } : q))
                                  if (runStatus !== 'running') {
                                    setTimeout(() => { setRunStatus('running'); runQueue(queue, concurrency) }, 100)
                                  }
                                }}
                                style={{ padding: '5px 11px', background: P.errorLight, color: P.error, border: `1px solid ${P.error}`, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                ↺ Retry
                              </button>
                            )}
                          </div>
                          {item.error && <div style={{ fontSize: 11, color: P.error, marginTop: 4, maxWidth: 200 }}>{item.error}</div>}
                        </td>
                      </tr>
                      {expanded && (item.content || item.featuresContent || item.tagsContent) && (
                        <tr key={`${b.id}-preview`} style={{ borderBottom: `1px solid ${P.border}` }}>
                          <td colSpan={5} style={{ padding: '0 16px 16px 32px', background: '#f8fafc' }}>
                            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>

                              {/* Description content */}
                              {item.content && (
                                <>
                                  {generateMode !== 'features' && (
                                    <div style={{ fontSize: 11, fontWeight: 700, color: P.primary, textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: 2, borderBottom: `2px solid ${P.primaryLight}` }}>
                                      Description &amp; SEO
                                    </div>
                                  )}

                                  <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, padding: '14px 16px' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Tagline</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: P.text, fontStyle: 'italic' }}>{item.content.tagline || '—'}</div>
                                  </div>

                                  <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, padding: '14px 16px' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Description</div>
                                    <div style={{ fontSize: 13, color: P.text, lineHeight: 1.8 }}>{item.content.description || '—'}</div>
                                  </div>

                                  <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, padding: '14px 16px' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Neighbourhood Context</div>
                                    <div style={{ fontSize: 13, color: P.text, lineHeight: 1.8 }}>{item.content.neighbourhood_context || '—'}</div>
                                  </div>

                                  <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, padding: '14px 16px' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Meta Description</div>
                                    <div style={{ fontSize: 13, color: P.text }}>{item.content.meta_description || '—'}</div>
                                    <div style={{ fontSize: 11, color: item.content.meta_description.length > 160 ? P.error : P.muted, marginTop: 4 }}>
                                      {item.content.meta_description.length} chars {item.content.meta_description.length > 160 ? '— too long' : ''}
                                    </div>
                                  </div>

                                  {item.content.faq.length > 0 && (
                                    <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, padding: '14px 16px' }}>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>FAQ ({item.content.faq.length} questions)</div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {item.content.faq.map((f, fi) => (
                                          <div key={fi} style={{ borderLeft: `3px solid ${P.primary}`, paddingLeft: 12 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: P.text, marginBottom: 4 }}>Q: {f.question}</div>
                                            <div style={{ fontSize: 12, color: P.muted, lineHeight: 1.6 }}>A: {f.answer}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Persona tags content */}
                              {item.tagsContent && (
                                <>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: 2, borderBottom: '2px solid #fef3c7' }}>
                                    Persona Tags
                                  </div>
                                  <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, padding: '14px 16px' }}>
                                    {item.tagsContent.length === 0 ? (
                                      <div style={{ fontSize: 13, color: P.muted, fontStyle: 'italic' }}>No persona tags matched — no qualifying evidence found in description/amenities/features.</div>
                                    ) : (
                                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {item.tagsContent.map(t => (
                                          <span key={t} style={{ padding: '4px 10px', background: '#fef3c7', color: '#92400e', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                                            {PERSONA_TAG_LABELS[t] || t}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}

                              {/* Features content */}
                              {item.featuresContent && item.featuresContent.length > 0 && (
                                <>
                                  {generateMode === 'both' && (
                                    <div style={{ fontSize: 11, fontWeight: 700, color: P.purple, textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: 2, borderBottom: `2px solid ${P.purpleLight}`, marginTop: 8 }}>
                                      Features {item.featuresType === 'plain' ? '(plain-tag, no Claude)' : '(AI-rewritten)'}
                                    </div>
                                  )}
                                  {generateMode === 'features' && (
                                    <div style={{ fontSize: 11, fontWeight: 700, color: P.purple, textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: 2, borderBottom: `2px solid ${P.purpleLight}` }}>
                                      Features {item.featuresType === 'plain' ? '(plain-tag, stored directly)' : '(AI-rewritten from BCN)'}
                                    </div>
                                  )}
                                  <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 8, padding: '14px 16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                      {item.featuresContent.map((section, si) => (
                                        <div key={si}>
                                          {section.title && (
                                            <div style={{ fontSize: 11, fontWeight: 700, color: P.text, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{section.title}</div>
                                          )}
                                          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {section.items.map((item, ii) => (
                                              <li key={ii} style={{ fontSize: 12, color: P.muted, lineHeight: 1.5 }}>{item}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </>
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
