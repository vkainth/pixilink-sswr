import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getAgentTerritories, getPriceMatrix, getNeighbourhoods, resolveAgentPrefix, agentAreaDisplay } from '@/lib/api'
import { formatPriceFull } from '@/lib/types'
import ContactSidebarForm from '@/components/ContactSidebarForm'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ subarea?: string }>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const [agent, territories] = await Promise.all([getAgent(slug), getAgentTerritories(slug).catch(() => [])])
  const shortArea = agentAreaDisplay(territories)
  const title = `Home Price Matrix — ${shortArea}`
  const description = `Average home prices by property type and bedroom count in ${shortArea} and surrounding areas. Real MLS® data from ${agent?.name || 'your local agent'}.`
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

const TYPES = ['Apartment', 'Townhouse', 'House']
const BEDS = [1, 2, 3, 4]

// Editorial blue heat-map palette — a fixed, brand-neutral data scale that works
// white-label on every agent site (NOT tied to the per-agent --accent, which is black).
const HEAT_RGB = '47, 111, 176'

export default async function PriceMatrixPage({ params, searchParams }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const sp = await searchParams
  const subarea = typeof sp.subarea === 'string' && sp.subarea ? sp.subarea : undefined

  const [agent, matrix, neighbourhoods, territories] = await Promise.all([
    getAgent(slug),
    getPriceMatrix(slug, subarea),
    getNeighbourhoods(slug),
    getAgentTerritories(slug).catch(() => []),
  ])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const firstName = agent.name.split(' ')[0]
  const shortArea = agentAreaDisplay(territories)
  const areaLabel = subarea || shortArea

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Table',
    name: `${areaLabel} Home Price Matrix`,
    description: `Average sold prices for condos, townhouses and houses in ${areaLabel} by number of bedrooms. MLS® data from ${agent.name}.`,
    provider: { '@type': 'RealEstateAgent', name: agent.name },
  }

  function getCell(type: string, beds: number) {
    return matrix.rows.find(r => r.type === type && r.beds === beds) ?? null
  }

  // Heat-map ranges — computed only over cells visible in each grid, scaled independently.
  const priceVals: number[] = []
  const ppsfVals: number[] = []
  for (const type of TYPES) {
    for (const beds of BEDS) {
      const c = getCell(type, beds)
      if (c && c.avg_price > 0) priceVals.push(c.avg_price)
      if (c && c.avg_ppsf && c.avg_ppsf > 0) ppsfVals.push(c.avg_ppsf)
    }
  }
  const priceMin = priceVals.length ? Math.min(...priceVals) : 0
  const priceMax = priceVals.length ? Math.max(...priceVals) : 0
  const ppsfMin = ppsfVals.length ? Math.min(...ppsfVals) : 0
  const ppsfMax = ppsfVals.length ? Math.max(...ppsfVals) : 0

  // Map a value to a blue-tinted background (light = lower, deeper blue = higher).
  // Tints over white keep dark cell text legible even at the high end.
  function heatBg(value: number | null | undefined, min: number, max: number): string {
    if (!value || value <= 0) return 'var(--off-white)'
    const t = max > min ? (value - min) / (max - min) : 0.5
    const opacity = (0.06 + t * 0.39).toFixed(3)
    return `rgba(${HEAT_RGB}, ${opacity})`
  }

  const renderHeatLegend = () => (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
      <span>Lower</span>
      <span style={{ width: 96, height: 10, borderRadius: 5, border: '1px solid var(--border)', background: `linear-gradient(90deg, rgba(${HEAT_RGB},0.06), rgba(${HEAT_RGB},0.45))` }} />
      <span>Higher</span>
    </div>
  )

  const th: React.CSSProperties = {
    textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.05em', padding: '13px 16px', whiteSpace: 'nowrap',
    background: 'var(--off-white)',
  }
  const tdBase: React.CSSProperties = { fontSize: 14, padding: '14px 16px', verticalAlign: 'top' }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-block', padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: active ? 700 : 500,
    background: active ? 'var(--primary-bg)' : '#fff', color: active ? '#fff' : 'var(--text)',
    border: `1px solid ${active ? 'var(--primary-bg)' : 'var(--border)'}`, textDecoration: 'none',
  })

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Hero */}
      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>Price Matrix</div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(24px,3.6vw,44px)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', marginBottom: 10, marginTop: 0 }}>
            {areaLabel} Home Prices by Type &amp; Size
          </h1>
          <p style={{ color: '#555', fontSize: 15, maxWidth: 640, lineHeight: 1.7, margin: 0 }}>
            Average sold prices by property type and bedroom count, based on recent MLS® transactions. Use this as a quick benchmark when researching what to expect at your budget.
          </p>
        </div>
      </div>

      {/* Area filter */}
      {neighbourhoods.length > 0 && (
        <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '14px 0' }}>
          <div className="container" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>Area</span>
            <a href={ap('/price-matrix')} style={chipStyle(!subarea)}>All Areas</a>
            {neighbourhoods.map(n => (
              <a key={n.slug} href={ap(`/price-matrix?subarea=${encodeURIComponent(n.subarea || n.name)}`)} style={chipStyle(subarea === (n.subarea || n.name))}>
                {n.name}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="container" style={{ padding: '40px var(--container-padding) 72px' }}>
        <div className="matrix-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 48, alignItems: 'start' }}>
          <div>
            {/* Main table: type × beds */}
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 6 }}>
                Average Sold Price — {areaLabel}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
                Based on recent MLS® sales tracked by {firstName}. Heat-map shading shows relative pricing — deeper blue = higher.
              </p>

              {matrix.rows.length > 0 && (
                <div style={{ marginBottom: 16 }}>{renderHeatLegend()}</div>
              )}

              {matrix.rows.length === 0 ? (
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '40px 28px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No price data available for this area yet.
                </div>
              ) : (
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ ...th, minWidth: 130 }}>Type</th>
                          {BEDS.map(b => (
                            <th key={b} style={{ ...th, textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                              {b === 4 ? '4+ Beds' : `${b} Bed`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {TYPES.map((type, ti) => (
                          <tr key={type} style={{ borderTop: ti > 0 ? '2px solid var(--border)' : undefined }}>
                            <td style={{ ...tdBase, fontWeight: 700, color: 'var(--primary-bg)', background: 'var(--off-white)', borderRight: '1px solid var(--border)', fontSize: 13 }}>
                              {type === 'Apartment' ? 'Condos / Apt' : type === 'House' ? 'Detached' : type}
                            </td>
                            {BEDS.map(beds => {
                              const cell = getCell(type, beds)
                              return (
                                <td key={beds} style={{ ...tdBase, textAlign: 'center', borderLeft: '1px solid rgba(0,0,0,0.05)', background: cell ? heatBg(cell.avg_price, priceMin, priceMax) : 'var(--off-white)' }}>
                                  {cell ? (
                                    <>
                                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary-bg)', lineHeight: 1 }}>
                                        {formatPriceFull(cell.avg_price)}
                                      </div>
                                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                                        {cell.count} sale{cell.count !== 1 ? 's' : ''}
                                        {cell.avg_dom ? ` · ${cell.avg_dom}d DOM` : ''}
                                      </div>
                                    </>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>—</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ padding: '10px 20px', background: 'var(--off-white)', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
                    MLS® sold data. Not intended to solicit properties already listed. Prices reflect averages — individual properties vary.
                  </div>
                </div>
              )}
            </section>

            {/* $/sqft table */}
            {matrix.rows.some(r => r.avg_ppsf) && (
              <section style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 12 }}>Average Price per Square Foot</h2>
                <div style={{ marginBottom: 16 }}>{renderHeatLegend()}</div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ ...th, minWidth: 130 }}>Type</th>
                          {BEDS.map(b => (
                            <th key={b} style={{ ...th, textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                              {b === 4 ? '4+' : `${b} Bed`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {TYPES.map((type, ti) => (
                          <tr key={type} style={{ borderTop: ti > 0 ? '2px solid var(--border)' : undefined }}>
                            <td style={{ ...tdBase, fontWeight: 700, color: 'var(--primary-bg)', background: 'var(--off-white)', borderRight: '1px solid var(--border)', fontSize: 13 }}>
                              {type === 'Apartment' ? 'Condos / Apt' : type === 'House' ? 'Detached' : type}
                            </td>
                            {BEDS.map(beds => {
                              const cell = getCell(type, beds)
                              return (
                                <td key={beds} style={{ ...tdBase, textAlign: 'center', borderLeft: '1px solid rgba(0,0,0,0.05)', background: heatBg(cell?.avg_ppsf, ppsfMin, ppsfMax) }}>
                                  {cell?.avg_ppsf
                                    ? <span style={{ fontWeight: 700, color: 'var(--text)' }}>${Math.round(cell.avg_ppsf).toLocaleString('en-CA')}</span>
                                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* Internal links */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 22px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>More Market Data</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { l: 'Condos for Sale', h: ap('/homes-for-sale?type=Apartment') },
                  { l: 'Townhouses for Sale', h: ap('/homes-for-sale?type=Townhouse') },
                  { l: 'Houses for Sale', h: ap('/homes-for-sale?type=House') },
                  { l: 'Market Report', h: ap('/market-report') },
                  { l: 'Sold Homes', h: ap('/sold') },
                  { l: 'Neighbourhood Stats', h: ap('/neighbourhoods') },
                ].map(x => (
                  <a key={x.l} href={x.h} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 12px', borderRadius: 6, textDecoration: 'none', fontSize: 12 }}>{x.l}</a>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div style={{ background: 'var(--primary-bg)', borderRadius: 10, padding: '20px 18px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Looking for the right price point?</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55 }}>
                {firstName} can show you exactly what is available at your budget — active listings, recent solds, and off-market opportunities.
              </div>
            </div>
            <ContactSidebarForm agent={agent} mode="contact" />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .matrix-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
