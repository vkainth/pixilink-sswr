import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getNeighbourhoods, getAreaIntro, getNeighbourhoodAiContent, agentCanonicalBase, resolveAgentPrefix } from '@/lib/api'
import { marketBadge, normalizeCity } from '@/lib/market'
import { formatPrice } from '@/lib/types'
import type { NeighbourhoodSummary, BuyerPersonaContent, NeighbourhoodAiContent } from '@/lib/types'
import { notFound } from 'next/navigation'
import { requireNotShowcase } from '@/lib/showcase'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 300

function buildAreaLabel(neighbourhoods: NeighbourhoodSummary[]): string {
  const cities = [...new Set(neighbourhoods.map(n => normalizeCity(n.city)))]
  if (cities.length === 0) return 'Local Area'
  return cities.join(' & ')
}

function parseBuyerPersonas(raw: unknown): BuyerPersonaContent | null {
  if (!raw) return null
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (obj && Array.isArray(obj.best_for) && Array.isArray(obj.pros)) {
      return obj as BuyerPersonaContent
    }
  } catch {
    // fall through
  }
  return null
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function firstTwoSentences(text: string): string {
  const matches = text.match(/[^.!?]+[.!?]+/g)
  if (!matches) return text.slice(0, 200)
  return matches.slice(0, 2).join(' ').trim()
}

function getLifestyleExcerpt(content: string | null | undefined): string | null {
  if (!content) return null
  const text = stripHtml(content)
  if (!text) return null
  return firstTwoSentences(text)
}

function firstParagraphText(html: string): string {
  const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
  const raw = match ? match[1] : html
  const text = stripHtml(raw)
  const sentences = text.match(/[^.!?]+[.!?]+/g)
  if (sentences && sentences.length >= 2) {
    const two = sentences.slice(0, 2).join(' ').trim()
    return two.length <= 300 ? two : two.slice(0, two.lastIndexOf(' ', 300)) + '…'
  }
  if (text.length <= 250) return text
  const cut = text.lastIndexOf(' ', 250)
  return (cut > 80 ? text.slice(0, cut) : text.slice(0, 250)) + '…'
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [agent, neighbourhoods, areaIntro] = await Promise.all([
    getAgent(slug),
    getNeighbourhoods(slug),
    getAreaIntro(slug),
  ])
  const area = buildAreaLabel(neighbourhoods)
  const agentName = agent?.name || 'Your Local Agent'
  const domain = agentCanonicalBase(agent)
  const title = `${area} Neighbourhood Guide — Who Lives Here & Real Estate | ${agentName}`

  let desc: string
  if (areaIntro?.content) {
    const plain = stripHtml(areaIntro.content)
    desc = plain.length > 155 ? plain.slice(0, 152) + '…' : plain
  } else {
    const count = neighbourhoods.length
    const active = neighbourhoods.reduce((s, n) => s + n.active_count, 0)
    desc = `Explore ${count} ${area} neighbourhoods with ${agentName} — buyer personas, local fit, ${active.toLocaleString()} active listings and recent sold data.`
    if (desc.length > 155) desc = desc.slice(0, 152) + '…'
  }

  return {
    title,
    description: desc,
    alternates: { canonical: `https://${domain}/neighbourhoods` },
    openGraph: { title, description: desc, images: [{ url: `https://${domain}/opengraph.jpg`, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description: desc },
  }
}

function marketBorderColor(marketType: string | undefined): string {
  switch (marketType) {
    case 'strong-sellers': return '#c0341a'
    case 'sellers':        return '#b45309'
    case 'buyers':         return '#1d4ed8'
    case 'balanced':
    default:               return '#6b7280'
  }
}

function buildFaqItems(
  neighbourhoods: NeighbourhoodSummary[],
  aiMap: Record<string, NeighbourhoodAiContent>,
  ap: (path: string) => string,
): Array<{ q: string; a: string }> {
  const faqs: Array<{ q: string; a: string }> = []
  for (const n of neighbourhoods) {
    const ai = aiMap[n.slug]
    const personas = ai ? parseBuyerPersonas(ai.buyer_personas) : null
    if (personas && personas.best_for.length > 0) {
      const topPersona = personas.best_for[0]
      const proLine = personas.pros.length > 0 ? ` ${personas.pros[0].replace(/^✓\s*/, '')}.` : ''
      faqs.push({
        q: `Is ${n.name} good for ${topPersona.toLowerCase()}?`,
        a: `Yes — ${n.name} is one of the top choices for ${topPersona.toLowerCase()} in ${n.city}.${proLine} ${personas.best_for.length > 1 ? `It also suits ${personas.best_for.slice(1).join(' and ').toLowerCase()}.` : ''} Browse current listings at ${ap(`/neighbourhood/${n.slug}`)}.`,
      })
    } else if ((n.avg_sold_price ?? 0) > 0) {
      faqs.push({
        q: `What is the average home price in ${n.name}?`,
        a: `The average sold price in ${n.name} over the last 30 days is ${formatPrice(n.avg_sold_price!)}${(n.sold_30d ?? 0) > 0 ? `, based on ${n.sold_30d} sales` : ''}. See live listings at ${ap(`/neighbourhood/${n.slug}`)}.`,
      })
    }
    if (faqs.length >= 8) break
  }
  return faqs
}

export default async function NeighbourhoodsPage({ params }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const [agent, neighbourhoods, areaIntro] = await Promise.all([
    getAgent(slug),
    getNeighbourhoods(slug),
    getAreaIntro(slug),
  ])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const subareaSlugsList = neighbourhoods.map(n => n.slug)
  const aiMap = await getNeighbourhoodAiContent(slug, subareaSlugsList)

  const areaLabel = buildAreaLabel(neighbourhoods)

  const byCity = new Map<string, NeighbourhoodSummary[]>()
  for (const n of neighbourhoods) {
    const arr = byCity.get(n.city) || []
    arr.push(n)
    byCity.set(n.city, arr)
  }

  const faqItems = buildFaqItems(neighbourhoods, aiMap, ap)

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${areaLabel} Neighbourhood Guides`,
    description: `Buyer personas, local market stats and home listings for every neighbourhood ${agent.name} serves in ${areaLabel}.`,
    numberOfItems: neighbourhoods.length,
    itemListElement: neighbourhoods.map((n, i) => {
      const ai = aiMap[n.slug]
      const excerpt = getLifestyleExcerpt(ai?.lifestyle_seo)
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Place',
          name: n.name,
          url: ap(`/neighbourhood/${n.slug}`),
          ...(excerpt ? { description: excerpt } : {}),
          containedInPlace: { '@type': 'City', name: n.city },
        },
      }
    }),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: ap('/') },
      { '@type': 'ListItem', position: 2, name: 'Neighbourhood Guides', item: ap('/neighbourhoods') },
    ],
  }

  const faqJsonLd = faqItems.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  } : null

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}

      {/* Hero */}
      <div style={{ background: '#fff', padding: '56px 0', borderBottom: '1px solid #e5e7eb' }}>
        <div className="container">
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>
            Neighbourhood Guides
          </div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 400, lineHeight: 1.15, marginBottom: 14, color: '#1a1a1a' }}>
            {areaLabel} Neighbourhoods
          </h1>
          {areaIntro?.content ? (
            <p className="area-intro-prose" style={{ margin: 0 }}>
              {firstParagraphText(areaIntro.content)}
            </p>
          ) : (
            <p style={{ fontSize: 15, color: '#555', lineHeight: 1.7, maxWidth: 560 }}>
              Get to know each community {agent.name.split(' ')[0]} serves — who lives there, why they chose it,
              and what the market looks like right now.
            </p>
          )}
        </div>
      </div>

      <div className="container" style={{ padding: '48px var(--container-padding) 72px' }}>
        {neighbourhoods.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Neighbourhood guides are coming soon.</p>
        ) : (
          [...byCity.entries()].map(([city, areas]) => (
            <section key={city} style={{ marginBottom: 56 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 20 }}>
                {city}
              </h2>
              <div className="nb-card-grid">
                {areas.map(n => {
                  const mt = n.market_type
                  const badge = mt ? marketBadge(mt) : null
                  const borderColor = marketBorderColor(mt)
                  const hasPrice = (n.avg_sold_price ?? 0) > 0
                  const hasAbsorption = (n.absorption_rate ?? 0) > 0
                  const ai = aiMap[n.slug]
                  const personas = ai ? parseBuyerPersonas(ai.buyer_personas) : null
                  return (
                    <a
                      key={n.slug}
                      href={ap(`/neighbourhood/${n.slug}`)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0,
                        background: '#fff',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        textDecoration: 'none',
                        borderLeft: `4px solid ${borderColor}`,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Card header */}
                      <div style={{ padding: '20px 20px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--primary-bg)', lineHeight: 1.25 }}>{n.name}</div>
                          {badge && (
                            <span style={{
                              background: badge.bg,
                              color: badge.color,
                              padding: '3px 9px',
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}>
                              {badge.label}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.city}</div>

                        {/* Buyer persona "Best for:" pills */}
                        {personas && personas.best_for.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center', marginRight: 2 }}>Best for:</span>
                            {personas.best_for.slice(0, 3).map(label => (
                              <span
                                key={label}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: 'var(--off-white)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 20,
                                  padding: '2px 8px',
                                  color: 'var(--text)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Price highlight */}
                      {hasPrice && (
                        <div style={{ padding: '0 20px 14px', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', lineHeight: 1 }}>
                            {formatPrice(n.avg_sold_price!)}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>avg sold price (30d)</div>
                        </div>
                      )}

                      {/* Top 2 pros */}
                      {personas && personas.pros.length > 0 && (
                        <div style={{ padding: '12px 20px 0', borderBottom: '1px solid var(--border)' }}>
                          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {personas.pros.slice(0, 2).map((pro, i) => (
                              <li key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                                <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
                                <span style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.45 }}>
                                  {pro.replace(/^✓\s*/, '')}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <div style={{ height: 12 }} />
                        </div>
                      )}

                      {/* Stats row */}
                      <div style={{ padding: '12px 20px 16px', display: 'flex', gap: 20 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{n.active_count.toLocaleString()}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>active</div>
                        </div>
                        {(n.sold_30d ?? 0) > 0 && (
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{n.sold_30d}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>sold 30d</div>
                          </div>
                        )}
                        {hasAbsorption && (
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{n.absorption_rate!.toFixed(1)} mo</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>supply</div>
                          </div>
                        )}
                        {(n.avg_dom ?? 0) > 0 && (
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{n.avg_dom}d</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>avg DOM</div>
                          </div>
                        )}
                      </div>

                      {/* Footer CTA */}
                      <div style={{
                        padding: '11px 20px',
                        background: 'var(--off-white)',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginTop: 'auto',
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>
                          Explore →
                        </span>
                      </div>
                    </a>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>

      <style>{`
        .nb-card-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        @media (max-width: 900px) {
          .nb-card-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 540px) {
          .nb-card-grid { grid-template-columns: 1fr; }
        }
        .area-intro-prose {
          font-size: 15px;
          color: #555;
          line-height: 1.7;
          max-width: 600px;
        }
        .area-intro-prose p {
          margin: 0 0 12px;
        }
        .area-intro-prose p:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  )
}
