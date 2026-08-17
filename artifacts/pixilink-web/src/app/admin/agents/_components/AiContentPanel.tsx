'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AdminAgent } from '@/lib/admin-api'
import { apiPath } from '@/lib/admin-api-path'

interface AiPage {
  id: number
  page_type: string
  slug: string
  title: string
  content: string | null
  meta_description: string | null
  subarea: string | null
  generated_at: string | null
}

const CONTENT_TYPES: { key: string; featureFlag: string; label: string; description: string }[] = [
  {
    key: 'lifestyle_seo',
    featureFlag: 'lifestyle_seo',
    label: 'Lifestyle SEO Pages',
    description: 'Neighbourhood lifestyle guides for each subarea — high-value SEO pages that rank for "living in [area]" searches.',
  },
  {
    key: 'school_catchment',
    featureFlag: 'school_catchments',
    label: 'School Catchment Pages',
    description: 'School zone and education guides per neighbourhood — helps families understand the local school landscape.',
  },
  {
    key: 'amenities',
    featureFlag: 'amenities_widget',
    label: 'Amenities Widget Content',
    description: 'Walkability and lifestyle summaries for neighbourhood and building pages.',
  },
]

const TERRITORY_SUBAREAS: Record<string, string[]> = {
  'Surrey': ['South Surrey White Rock', 'White Rock', 'Cloverdale BC', 'Morgan Creek', 'Grandview Surrey', 'Ocean Park Surrey', 'Semiahmoo', 'Fleetwood Tynehead'],
  'Vancouver': ['Yaletown', 'Coal Harbour', 'West End', 'Kitsilano', 'Kerrisdale', 'Dunbar'],
  'Burnaby': ['Metrotown', 'Brentwood', 'Edmonds', 'Highgate'],
  'Richmond': ['Steveston', 'Hamilton', 'Broadmoor', 'Brighouse'],
  'Coquitlam': ['Burke Mountain', 'New Horizons', 'Westwood Plateau'],
  'Langley': ['Willoughby Heights', 'Walnut Grove', 'Fort Langley'],
  'Abbotsford': ['Abbotsford West', 'Central Abbotsford'],
  'Chilliwack': ['Chilliwack Proper West', 'Chilliwack Proper East'],
}

function deriveSubareas(agent: AdminAgent): string[] {
  const whitelist = agent.settings?.subarea_whitelist
  if (whitelist && whitelist.length > 0) return whitelist
  const result: string[] = []
  for (const city of agent.territories) {
    const subs = TERRITORY_SUBAREAS[city] ?? []
    if (subs.length > 0) result.push(...subs)
    else result.push(city)
  }
  return result
}

function deriveSubareasByCity(agent: AdminAgent): { city: string; subareas: string[] }[] {
  const whitelist = agent.settings?.subarea_whitelist
  if (whitelist && whitelist.length > 0) {
    return [{ city: agent.territories[0] || 'Territory', subareas: whitelist }]
  }
  const result: { city: string; subareas: string[] }[] = []
  for (const city of agent.territories) {
    const subs = TERRITORY_SUBAREAS[city] ?? []
    if (subs.length > 0) result.push({ city, subareas: subs })
    else result.push({ city, subareas: [city] })
  }
  return result
}

interface Props {
  agent: AdminAgent
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#fff', borderRadius: 8, border: '1px solid #dfe1e6', marginBottom: 20 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f4f5f7', fontSize: 13, fontWeight: 600, color: '#172b4d' }}>
        {title}
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </section>
  )
}

function formatDate(ts: string | null): string {
  if (!ts) return 'Never'
  try {
    return new Date(ts).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts.slice(0, 16)
  }
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 500,
      padding: '2px 8px', borderRadius: 10, background: color + '22', color,
    }}>
      {text}
    </span>
  )
}

export default function AiContentPanel({ agent }: Props) {
  const features = agent.features ?? {}
  const enabledTypes = CONTENT_TYPES.filter((t) => features[t.featureFlag])
  const hasLifestyle = features['lifestyle_seo'] === true

  const subareas = deriveSubareas(agent)
  const subareasByCity = deriveSubareasByCity(agent)

  const [pagesByType, setPagesByType] = useState<Record<string, AiPage[]>>({})
  const [generating, setGenerating] = useState<Record<string, boolean>>({})
  const [messages, setMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({})
  const [collapsedCities, setCollapsedCities] = useState<Record<string, boolean>>({})
  const [expandedContent, setExpandedContent] = useState<Record<string, boolean>>({})

  const fetchPages = useCallback(async (type: string) => {
    try {
      const res = await fetch(apiPath(`/api/admin/agents/${agent.id}/ai-pages?type=${type}`))
      if (res.ok) {
        const data = await res.json()
        setPagesByType((prev) => ({ ...prev, [type]: Array.isArray(data) ? data : [] }))
      }
    } catch {}
  }, [agent.id])

  useEffect(() => {
    for (const t of enabledTypes) {
      fetchPages(t.key)
    }
    if (hasLifestyle) {
      fetchPages('buyer_personas')
      fetchPages('area_intro')
    }
    fetchPages('neighbourhood_description')
  }, [agent.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleCity(city: string) {
    setCollapsedCities((prev) => ({ ...prev, [city]: !prev[city] }))
  }

  function toggleContent(key: string) {
    setExpandedContent((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function renderContentPreview(content: string | null, key: string, type: 'text' | 'json' = 'text') {
    if (!content) return null
    const isExpanded = expandedContent[key] ?? false
    let display: React.ReactNode

    if (type === 'json') {
      let parsed: { best_for?: string[]; personas?: { type: string; description: string; why_they_chose_it: string }[]; pros?: string[] } = {}
      try { parsed = JSON.parse(content) } catch { parsed = {} }
      display = (
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          {(parsed.best_for ?? []).length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 600, color: '#172b4d' }}>Best for: </span>
              {parsed.best_for!.join(' · ')}
            </div>
          )}
          {(parsed.personas ?? []).map((p, i) => (
            <div key={i} style={{ marginBottom: 10, paddingLeft: 12, borderLeft: '3px solid #0052cc33' }}>
              <div style={{ fontWeight: 600, color: '#172b4d' }}>{p.type}</div>
              <div style={{ color: '#5e6c84', marginTop: 2 }}>{p.description}</div>
              <div style={{ color: '#5e6c84', marginTop: 2, fontStyle: 'italic' }}>{p.why_they_chose_it}</div>
            </div>
          ))}
          {(parsed.pros ?? []).length > 0 && (
            <div>
              <span style={{ fontWeight: 600, color: '#172b4d' }}>Pros: </span>
              {parsed.pros!.join(' · ')}
            </div>
          )}
        </div>
      )
    } else {
      const preview = content.slice(0, 200) + (content.length > 200 ? '…' : '')
      display = (
        <div style={{ fontSize: 12, color: '#5e6c84', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {isExpanded ? content : preview}
        </div>
      )
    }

    return (
      <div style={{ marginTop: 8, padding: '10px 12px', background: '#f8f9fb', borderRadius: 4, border: '1px solid #eaecef' }}>
        {display}
        {type === 'text' && content.length > 200 && (
          <button
            type="button"
            onClick={() => toggleContent(key)}
            style={{ marginTop: 6, background: 'none', border: 'none', color: '#0052cc', fontSize: 11, cursor: 'pointer', padding: 0 }}
          >
            {isExpanded ? '▲ Show less' : '▼ Show full text'}
          </button>
        )}
      </div>
    )
  }

  async function handleGenerate(type: string, subarea?: string) {
    const key = subarea ? `${type}__${subarea}` : type
    if (generating[key]) return
    setGenerating((prev) => ({ ...prev, [key]: true }))
    setMessages((prev) => ({ ...prev, [key]: { type: 'success', text: 'Generating… this may take several minutes for a full batch.' } }))

    try {
      const body: Record<string, string> = { type }
      if (subarea) body.subarea = subarea

      const res = await fetch(apiPath(`/api/admin/agents/${agent.id}/generate-ai-content`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setMessages((prev) => ({ ...prev, [key]: { type: 'error', text: data.error || 'Generation failed' } }))
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalResult: { done?: boolean; generated?: number; errors?: string[]; error?: string } = {}

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line) as {
              done?: boolean
              generated?: number
              errors?: string[]
              error?: string
              progress?: { subarea: string; saved: boolean; count?: number; total?: number; error?: string }
            }
            if (data.progress) {
              if (data.progress.saved && data.progress.total && data.progress.total > 1) {
                setMessages((prev) => ({
                  ...prev,
                  [key]: { type: 'success', text: `Generating… ${data.progress!.count} of ${data.progress!.total} done` },
                }))
              }
            } else if (data.done !== undefined || data.error) {
              finalResult = data
            }
          } catch {}
        }
      }

      if (finalResult.error && !finalResult.done) {
        setMessages((prev) => ({ ...prev, [key]: { type: 'error', text: finalResult.error || 'Generation failed' } }))
      } else {
        const count = finalResult.generated ?? 0
        setMessages((prev) => ({
          ...prev,
          [key]: {
            type: count > 0 ? 'success' : 'error',
            text: count > 0
              ? `Generated ${count} page${count !== 1 ? 's' : ''} successfully.${finalResult.errors?.length ? ` (${finalResult.errors.length} skipped)` : ''}`
              : 'Generation failed — no pages were saved.',
          },
        }))
        if (count > 0) {
          const refreshType = type === 'all_lifestyle' ? 'lifestyle_seo' : type === 'all_buyer_personas' ? 'buyer_personas' : type
          await fetchPages(refreshType)
        }
      }
    } catch {
      setMessages((prev) => ({ ...prev, [key]: { type: 'error', text: 'Connection lost — check if pages were saved by refreshing.' } }))
    } finally {
      setGenerating((prev) => ({ ...prev, [key]: false }))
    }
  }

  function renderMessage(key: string) {
    const msg = messages[key]
    if (!msg) return null
    return (
      <div style={{
        padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13,
        background: msg.type === 'success' ? '#e3fcef' : '#ffebe6',
        color: msg.type === 'success' ? '#006644' : '#bf2600',
        border: `1px solid ${msg.type === 'success' ? '#6ee7b7' : '#ffbdad'}`,
      }}>
        {msg.text}
      </div>
    )
  }

  function renderGenerateButton(label: string, key: string, type: string, subarea?: string, small?: boolean) {
    const isGenerating = generating[key] ?? false
    return (
      <button
        type="button"
        disabled={isGenerating}
        onClick={() => handleGenerate(type, subarea)}
        style={{
          background: isGenerating ? '#7ab3e0' : '#0052cc',
          color: '#fff', border: 'none', borderRadius: 4,
          padding: small ? '6px 12px' : '9px 20px',
          fontSize: small ? 12 : 13,
          fontWeight: 600,
          cursor: isGenerating ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {isGenerating ? '…' : label}
      </button>
    )
  }

  if (enabledTypes.length === 0 && !hasLifestyle) {
    return (
      <Section title="AI Content">
        <div style={{ fontSize: 13, color: '#5e6c84', padding: '8px 0' }}>
          No AI content features are enabled for this agent. Enable <strong>Lifestyle SEO Pages</strong>, <strong>School Catchment Pages</strong>, or <strong>Amenities Widget</strong> in Feature Flags above, then save — the generation buttons will appear here.
        </div>
      </Section>
    )
  }

  return (
    <>
      {hasLifestyle && (
        <>
          {/* Area Overview */}
          <Section title="AI Content — Area Overview">
            <p style={{ fontSize: 13, color: '#5e6c84', marginBottom: 16, lineHeight: 1.6 }}>
              A 500–700 word editorial covering the agent&apos;s full coverage region — neighbourhood variety, lifestyle themes, and why buyers choose this area. Used in the page hero.
            </p>
            {renderMessage('area_intro')}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              {renderGenerateButton(
                (pagesByType['area_intro'] ?? []).length > 0 ? 'Regenerate Area Overview' : 'Generate Area Overview',
                'area_intro',
                'area_intro',
              )}
              {(() => {
                const page = (pagesByType['area_intro'] ?? [])[0]
                return page ? (
                  <Badge text={`Generated ${formatDate(page.generated_at)}`} color="#0052cc" />
                ) : (
                  <span style={{ fontSize: 12, color: '#7b8fa0', fontStyle: 'italic' }}>Not yet generated</span>
                )
              })()}
            </div>
            {(pagesByType['area_intro'] ?? []).length > 0 && (
              <div style={{ border: '1px solid #dfe1e6', borderRadius: 6, overflow: 'hidden', fontSize: 13 }}>
                {(pagesByType['area_intro'] ?? []).map((page) => (
                  <div key={page.id} style={{ padding: '12px 16px', background: '#fff' }}>
                    <div style={{ fontWeight: 600, color: '#172b4d', marginBottom: 2 }}>{page.title}</div>
                    <div style={{ fontSize: 11, color: '#7b8fa0', marginBottom: 4 }}>
                      /{page.slug} · Generated {formatDate(page.generated_at)}
                    </div>
                    {renderContentPreview(page.content, `area_intro_${page.id}`, 'text')}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Buyer Personas */}
          <Section title="AI Content — Buyer Personas">
            <p style={{ fontSize: 13, color: '#5e6c84', marginBottom: 16, lineHeight: 1.6 }}>
              For each neighbourhood: 2–3 buyer types, why they choose the area, and top pros — all grounded in live MLS stats fetched at generation time. Output is structured JSON for rendering pills and Q&amp;A.
            </p>

            {renderMessage('all_buyer_personas')}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              {renderGenerateButton(
                `Generate All — Buyer Personas (${subareas.length})`,
                'all_buyer_personas',
                'all_buyer_personas',
              )}
              {(() => {
                const pages = pagesByType['buyer_personas'] ?? []
                return pages.length > 0 ? (
                  <Badge text={`${pages.length} of ${subareas.length} generated`} color="#006644" />
                ) : null
              })()}
            </div>

            {subareas.length > 0 && (
              <div style={{ border: '1px solid #dfe1e6', borderRadius: 6, overflow: 'hidden', fontSize: 13 }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto',
                  gap: 12, padding: '9px 16px',
                  background: '#f4f5f7', borderBottom: '1px solid #dfe1e6',
                  fontSize: 11, fontWeight: 700, color: '#5e6c84', textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  <span>Neighbourhood</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                {subareas.map((sub, i) => {
                  const existing = (pagesByType['buyer_personas'] ?? []).find((p) => p.subarea === sub)
                  const rowKey = `buyer_personas__${sub}`
                  const isGenerating = generating[rowKey] ?? false
                  const rowMsg = messages[rowKey]
                  return (
                    <div key={sub}>
                      <div
                        style={{
                          display: 'grid', gridTemplateColumns: '1fr auto auto',
                          gap: 12, padding: '10px 16px', alignItems: 'center',
                          borderBottom: i < subareas.length - 1 ? '1px solid #f4f5f7' : 'none',
                          background: i % 2 === 0 ? '#fff' : '#f8f9fb',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#172b4d' }}>{sub}</div>
                          {existing && (
                            <div style={{ fontSize: 11, color: '#7b8fa0', marginTop: 2 }}>
                              Generated {formatDate(existing.generated_at)}
                            </div>
                          )}
                        </div>
                        <div>
                          {existing ? (
                            <Badge text="Generated" color="#006644" />
                          ) : (
                            <Badge text="Not generated" color="#7b8fa0" />
                          )}
                        </div>
                        <div>
                          {renderGenerateButton(
                            isGenerating ? 'Generating…' : existing ? 'Regenerate' : 'Generate',
                            rowKey,
                            'buyer_personas',
                            sub,
                            true,
                          )}
                        </div>
                      </div>
                      {existing && (
                        <div style={{ padding: '0 16px 10px', background: i % 2 === 0 ? '#fff' : '#f8f9fb' }}>
                          {renderContentPreview(existing.content, `bp_${sub}`, 'json')}
                        </div>
                      )}
                      {rowMsg && (
                        <div style={{
                          padding: '7px 16px', fontSize: 12,
                          background: rowMsg.type === 'success' ? '#e3fcef' : '#ffebe6',
                          color: rowMsg.type === 'success' ? '#006644' : '#bf2600',
                          borderBottom: i < subareas.length - 1 ? '1px solid #f4f5f7' : 'none',
                        }}>
                          {rowMsg.text}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Section>
        </>
      )}

      {/* ── Neighbourhood Descriptions ──────────────────────────────── */}
      {(() => {
        const ndPages = pagesByType['neighbourhood_description'] ?? []
        const allSubareas = subareasByCity.flatMap((g) => g.subareas)
        const allKey = 'all_neighbourhood_descriptions'
        const isAllGenerating = generating[allKey] ?? false
        const allMsg = messages[allKey]
        const generatedCount = ndPages.length

        return (
          <Section title="AI Content — Neighbourhood Descriptions">
            <p style={{ fontSize: 13, color: '#5e6c84', marginBottom: 16, lineHeight: 1.6 }}>
              A 3-paragraph SEO description for each neighbourhood page hero — grounded in live MLS data. Covers community character, housing types, and why buyers choose the area. Replaces the built-in static descriptions.
            </p>

            {allMsg && (
              <div style={{
                padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13,
                background: allMsg.type === 'success' ? '#e3fcef' : '#ffebe6',
                color: allMsg.type === 'success' ? '#006644' : '#bf2600',
                border: `1px solid ${allMsg.type === 'success' ? '#6ee7b7' : '#ffbdad'}`,
              }}>
                {allMsg.text}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              {renderGenerateButton(
                isAllGenerating ? 'Generating…' : `Generate All (${allSubareas.length})`,
                allKey,
                'all_neighbourhood_descriptions',
              )}
              {generatedCount > 0 && (
                <Badge text={`${generatedCount} of ${allSubareas.length} generated`} color="#006644" />
              )}
            </div>

            {subareasByCity.map(({ city, subareas: citySubs }) => {
              const isCollapsed = collapsedCities[city] ?? false
              const cityGeneratedCount = citySubs.filter((s) =>
                ndPages.some((p) => p.subarea === s)
              ).length
              return (
                <div key={city} style={{ marginBottom: 12 }}>
                  <button
                    type="button"
                    onClick={() => toggleCity(city)}
                    style={{
                      width: '100%', textAlign: 'left', background: '#f4f5f7',
                      border: '1px solid #dfe1e6', borderRadius: isCollapsed ? 6 : '6px 6px 0 0',
                      padding: '10px 16px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#172b4d' }}>
                      {city}
                      <span style={{ fontWeight: 400, color: '#7b8fa0', marginLeft: 8 }}>
                        ({citySubs.length} neighbourhood{citySubs.length !== 1 ? 's' : ''})
                      </span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {cityGeneratedCount > 0 && (
                        <Badge
                          text={cityGeneratedCount === citySubs.length ? 'All generated' : `${cityGeneratedCount}/${citySubs.length} done`}
                          color={cityGeneratedCount === citySubs.length ? '#006644' : '#0052cc'}
                        />
                      )}
                      <span style={{ fontSize: 12, color: '#7b8fa0' }}>{isCollapsed ? '▼' : '▲'}</span>
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div style={{ border: '1px solid #dfe1e6', borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'hidden' }}>
                      <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 90px 110px',
                        gap: 12, padding: '8px 16px',
                        background: '#f8f9fb', borderBottom: '1px solid #dfe1e6',
                        fontSize: 11, fontWeight: 700, color: '#5e6c84',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        <span>Neighbourhood</span>
                        <span>Status</span>
                        <span>Action</span>
                      </div>
                      {citySubs.map((sub, i) => {
                        const existing = ndPages.find((p) => p.subarea === sub)
                        const rowKey = `neighbourhood_description__${sub}`
                        const isGenerating = generating[rowKey] ?? false
                        const rowMsg = messages[rowKey]
                        const preview = existing?.content
                          ? existing.content.replace(/\n+/g, ' ').slice(0, 120) + (existing.content.length > 120 ? '…' : '')
                          : null
                        return (
                          <div key={sub}>
                            <div
                              style={{
                                display: 'grid', gridTemplateColumns: '1fr 90px 110px',
                                gap: 12, padding: '10px 16px', alignItems: 'center',
                                borderBottom: i < citySubs.length - 1 ? '1px solid #f4f5f7' : 'none',
                                background: i % 2 === 0 ? '#fff' : '#f8f9fb',
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 600, color: '#172b4d', fontSize: 13 }}>{sub}</div>
                                {existing && (
                                  <div style={{ fontSize: 11, color: '#7b8fa0', marginTop: 2 }}>
                                    Generated {formatDate(existing.generated_at)}
                                  </div>
                                )}
                                {preview && (
                                  <div style={{
                                    fontSize: 11, color: '#5e6c84', marginTop: 4,
                                    fontStyle: 'italic', lineHeight: 1.5,
                                  }}>
                                    {preview}
                                  </div>
                                )}
                              </div>
                              <div>
                                {existing
                                  ? <Badge text="Generated" color="#006644" />
                                  : <Badge text="Not generated" color="#7b8fa0" />}
                              </div>
                              <div>
                                {renderGenerateButton(
                                  isGenerating ? '…' : existing ? 'Regenerate' : 'Generate',
                                  rowKey,
                                  'neighbourhood_description',
                                  sub,
                                  true,
                                )}
                              </div>
                            </div>
                            {rowMsg && (
                              <div style={{
                                padding: '7px 16px', fontSize: 12,
                                background: rowMsg.type === 'success' ? '#e3fcef' : '#ffebe6',
                                color: rowMsg.type === 'success' ? '#006644' : '#bf2600',
                                borderBottom: '1px solid #f4f5f7',
                              }}>
                                {rowMsg.text}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </Section>
        )
      })()}

      {enabledTypes.map((ct) => {
        const pages = pagesByType[ct.key] ?? []
        const isGenerating = generating[ct.key] ?? false
        const msg = messages[ct.key]

        const isLifestyle = ct.key === 'lifestyle_seo'
        const allKey = 'all_lifestyle'
        const isAllGenerating = generating[allKey] ?? false
        const allMsg = messages[allKey]

        return (
          <Section key={ct.key} title={`AI Content — ${ct.label}`}>
            <p style={{ fontSize: 13, color: '#5e6c84', marginBottom: 16, lineHeight: 1.6 }}>{ct.description}</p>

            {msg && (
              <div style={{
                padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13,
                background: msg.type === 'success' ? '#e3fcef' : '#ffebe6',
                color: msg.type === 'success' ? '#006644' : '#bf2600',
                border: `1px solid ${msg.type === 'success' ? '#6ee7b7' : '#ffbdad'}`,
              }}>
                {msg.text}
              </div>
            )}

            {isLifestyle && allMsg && allMsg !== msg && (
              <div style={{
                padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13,
                background: allMsg.type === 'success' ? '#e3fcef' : '#ffebe6',
                color: allMsg.type === 'success' ? '#006644' : '#bf2600',
                border: `1px solid ${allMsg.type === 'success' ? '#6ee7b7' : '#ffbdad'}`,
              }}>
                {allMsg.text}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => handleGenerate(ct.key)}
                style={{
                  background: isGenerating ? '#7ab3e0' : '#0052cc',
                  color: '#fff', border: 'none', borderRadius: 4,
                  padding: '9px 20px', fontSize: 13, fontWeight: 600,
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                }}
              >
                {isGenerating
                  ? 'Generating… (up to 60s)'
                  : pages.length > 0
                    ? `Regenerate ${ct.label}`
                    : `Generate ${ct.label}`}
              </button>

              {isLifestyle && (
                <button
                  type="button"
                  disabled={isAllGenerating}
                  onClick={() => handleGenerate('all_lifestyle')}
                  style={{
                    background: isAllGenerating ? '#7ab3e0' : '#0052cc',
                    color: '#fff', border: 'none', borderRadius: 4,
                    padding: '9px 20px', fontSize: 13, fontWeight: 600,
                    cursor: isAllGenerating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isAllGenerating ? 'Generating… (up to 60s)' : `Generate All — Lifestyle Guides (${subareas.length})`}
                </button>
              )}
            </div>

            {pages.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#5e6c84', marginBottom: 8 }}>
                  {pages.length} page{pages.length !== 1 ? 's' : ''} generated
                </div>
                <div style={{ border: '1px solid #dfe1e6', borderRadius: 6, overflow: 'hidden', fontSize: 13 }}>
                  {pages.map((page, i) => (
                    <div
                      key={page.id}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr auto',
                        gap: 12, padding: '11px 16px', alignItems: 'center',
                        borderBottom: i < pages.length - 1 ? '1px solid #f4f5f7' : 'none',
                        background: i % 2 === 0 ? '#fff' : '#f8f9fb',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#172b4d', marginBottom: 2 }}>{page.title}</div>
                        <div style={{ fontSize: 11, color: '#7b8fa0' }}>
                          /{page.slug}
                          {page.subarea ? ` · ${page.subarea}` : ''}
                          {' · '}Generated {formatDate(page.generated_at)}
                        </div>
                      </div>
                      {page.page_type === 'lifestyle_seo' ? (
                        <a
                          href={`/agent/${agent.slug}/guide/${page.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: 12, color: '#0052cc', textDecoration: 'none',
                            whiteSpace: 'nowrap', fontWeight: 500,
                          }}
                        >
                          View →
                        </a>
                      ) : (
                        <span style={{ fontSize: 11, color: '#7b8fa0', whiteSpace: 'nowrap' }}>
                          {page.page_type === 'school_catchment' ? 'On neighbourhood pages' : 'On neighbourhood & building pages'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pages.length === 0 && !isGenerating && (
              <div style={{ fontSize: 13, color: '#7b8fa0', fontStyle: 'italic' }}>
                No pages generated yet. Click the button above to generate content based on this agent&apos;s territory.
              </div>
            )}
          </Section>
        )
      })}
    </>
  )
}
