import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getNeighbourhoodDetail, getNeighbourhoodReports, getOpenHouses, getNews, getSchoolCatchments, agentCanonicalBase, resolveAgentPrefix } from '@/lib/api'
import type { NewsPost } from '@/lib/types'
import { getCoAgents } from '@/lib/types'
import PageQuickLinks from '@/components/PageQuickLinks'
import { formatPrice, formatPriceFull } from '@/lib/types'
import { marketBadge, marketVerdict, absorptionLabel } from '@/lib/market'
import StatGrid, { type StatItem } from '@/components/StatGrid'
import NeighbourhoodChartsClient from '@/components/NeighbourhoodChartsClient'
import { deriveTrendNarrative } from '@/lib/neighbourhood-narrative'
import ListingStrip from '@/components/ListingStrip'
import W2HomeEvaluation from '@/components/W2HomeEvaluation.client'
import W3MortgagePreQual from '@/components/W3MortgagePreQual.client'
import NeighbourhoodSoldGate from '@/components/NeighbourhoodSoldGate.client'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { NeighbourhoodWidget, NeighbourhoodTypeSection, SchoolCatchmentSummary } from '@/lib/types'
import NeighbourhoodPulse from '@/components/NeighbourhoodPulse'
import GreatBuys from '@/components/GreatBuys'
import NeighbourhoodOpenHouses from '@/components/NeighbourhoodOpenHouses'
import LeadOfferCapture from '@/components/LeadOfferCapture.client'

import { getAiPages, matchAiPageToSubarea } from '@/lib/ai-pages-api'


interface Props {
  params: Promise<{ slug: string; subarea: string }>
  searchParams: Promise<{ show?: string }>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, subarea } = await params
  const [agent, detail, aiPages] = await Promise.all([
    getAgent(slug),
    getNeighbourhoodDetail(slug, subarea),
    getAiPages(slug, 'neighbourhood_description'),
  ])
  if (!detail) return { title: 'Neighbourhood' }
  const agentName = agent?.name || 'Your Local Agent'
  const guideName = agent?.settings?.guide_name?.trim() || null
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/neighbourhood/${subarea}`
  const title = guideName
    ? `${detail.name}, ${detail.city} Real Estate Guide — Homes, Prices & Market Stats | ${guideName}`
    : `${detail.name}, ${detail.city} Real Estate — Homes, Prices & Market Stats | ${agentName}`
  const aiPage = matchAiPageToSubarea(aiPages, subarea)
  const description = aiPage?.meta_description ||
    `${detail.name}, ${detail.city} real estate — active listings, recent sales and current market conditions with ${agentName}.`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, images: [{ url: `https://${domain}/opengraph.jpg`, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description },
  }
}

// ─── FAQ generation from widget data ─────────────────────────────────────────
interface Faq { q: string; a: string }

function buildFaqs(
  name: string,
  city: string,
  w: NeighbourhoodWidget,
  description: string | null | undefined,
  schools: SchoolCatchmentSummary[],
): Faq[] {
  const faqs: Faq[] = []

  if (w.avg_sold_price > 0) {
    faqs.push({
      q: `What is the average home price in ${name}?`,
      a: `The average sold price in ${name} is currently ${formatPriceFull(w.avg_sold_price)}, based on recent sales. Prices vary by property type — condos and townhouses typically start lower, while detached homes command a premium.`,
    })
  }

  faqs.push({
    q: `Is ${name} a buyer's or seller's market right now?`,
    a: `${name} is currently a ${marketBadge(w.market_type).label.toLowerCase()}. There are ${w.active} active home${w.active === 1 ? '' : 's'} for sale and ${w.sold_30d} home${w.sold_30d === 1 ? '' : 's'} sold in the last 30 days.`,
  })

  if (w.avg_dom > 0) {
    faqs.push({
      q: `How long do homes stay on the market in ${name}?`,
      a: `Homes in ${name} sell in an average of ${w.avg_dom} days on market. In a seller's market this can be shorter; homes priced well and in move-in condition typically attract offers quickly.`,
    })
  }

  faqs.push({
    q: `What types of properties are available in ${name}?`,
    a: `${name} offers a mix of detached homes, townhouses, and condominium units. The area is popular with families looking for detached homes and with buyers seeking lower-maintenance strata properties.`,
  })

  if (description) {
    faqs.push({
      q: `What is ${name} like to live in?`,
      a: description,
    })
  }

  if (schools.length > 0) {
    const names = schools.slice(0, 4).map(s => s.name).join(', ')
    faqs.push({
      q: `What schools are near ${name}?`,
      a: `${name} is served by schools including ${names}${schools.length > 4 ? ' and others' : ''} in ${city}. Browse homes by school catchment to see live listing counts for each school.`,
    })
  }

  faqs.push({
    q: `How do I get a free home evaluation in ${name}?`,
    a: `You can request a free, no-obligation home evaluation directly on this page. A local ${city} agent will research comparable recent sales and provide you with an accurate market valuation within 6 hours.`,
  })

  if (w.absorption_rate > 0) {
    const supply = w.absorption_rate.toFixed(1)
    faqs.push({
      q: `How much inventory is available in ${name}?`,
      a: `There is currently ${supply} month${w.absorption_rate === 1 ? '' : 's'} of supply in ${name}, meaning it would take about ${supply} months to sell all active listings at the current pace. Under 3–4 months generally favours sellers; over 6 months tends to favour buyers.`,
    })
  }

  return faqs
}

// ─── Type display label ───────────────────────────────────────────────────────
const TYPE_LABEL: Record<string, string> = {
  Apartment: 'Condos',
  Townhouse: 'Townhouses',
  House: 'Houses',
}
const TYPE_SLUG: Record<string, string> = {
  Apartment: 'condos',
  Townhouse: 'townhouses',
  House: 'houses',
}
function typeDisplayLabel(t: string): string { return TYPE_LABEL[t] ?? t }

// ─── Related news articles (matched by name/city/subarea mention) ───────────
function findRelatedArticles(posts: NewsPost[], name: string, city: string, subareaSlug: string): NewsPost[] {
  const needles = [name, city, subareaSlug.replace(/-/g, ' ')]
    .filter(Boolean)
    .map(s => s.toLowerCase())
  return posts
    .filter(p => {
      const haystack = [p.title, p.excerpt ?? '', p.category ?? '', ...(p.tags ?? [])].join(' ').toLowerCase()
      return needles.some(n => n.length > 2 && haystack.includes(n))
    })
    .slice(0, 3)
}


export default async function NeighbourhoodDetailPage({ params, searchParams }: Props) {
  const { slug, subarea } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const sp = await searchParams
  const show = sp.show === 'sold' ? 'sold' : 'active'

  const [agent, detail, reports24, allOpenHouses, newsResult, allSchools] = await Promise.all([
    getAgent(slug),
    getNeighbourhoodDetail(slug, subarea),
    getNeighbourhoodReports(slug, subarea),
    getOpenHouses(slug),
    getNews(slug, 1, 24),
    getSchoolCatchments(slug),
  ])
  if (!agent || !detail) notFound()
  requireNotShowcase(agent)

  const coAgents = getCoAgents(agent)
  const isDualAgent = coAgents.length > 0
  const agentLabel = isDualAgent
    ? `${agent.name.split(' ')[0]} & ${coAgents[0].name.split(' ')[0]}`
    : agent.name

  const relatedArticles = findRelatedArticles(newsResult.posts, detail.name, detail.city, subarea)
  const schools = allSchools.filter(
    s => s.city && detail.city && s.city.toLowerCase() === detail.city.toLowerCase(),
  )

  const now = new Date()
  const neighbourhoodSubarea = (detail.subarea ?? '').toLowerCase()
  const neighbourhoodOpenHouses = allOpenHouses.filter(oh => {
    if (new Date(oh.open_house.start) <= now) return false
    const ohSubarea = (oh.subarea ?? '').toLowerCase()
    return ohSubarea !== '' && ohSubarea === neighbourhoodSubarea
  })

  const trend24 = reports24.length > 0 ? reports24 : detail.monthly_trend
  const narrative = deriveTrendNarrative(trend24, detail.name)

  const features = agent.features ?? {}
  const schoolAiPages = features.school_catchments
    ? await getAiPages(slug, 'school_catchment')
    : []
  const amenityAiPages = features.amenities_widget
    ? await getAiPages(slug, 'amenities')
    : []
  const aiSchoolPage = matchAiPageToSubarea(schoolAiPages, subarea)
  const aiAmenityPage = matchAiPageToSubarea(amenityAiPages, subarea)

  const w = detail.widget
  const badge = w ? marketBadge(w.market_type) : null

  const stats: StatItem[] = w
    ? [
        { label: 'Avg Sold Price', value: formatPrice(w.avg_sold_price) },
        { label: 'Homes Sold (30d)', value: w.sold_30d.toLocaleString() },
        { label: 'Homes For Sale', value: w.active.toLocaleString() },
        {
          label: 'Avg Days on Market',
          value: `${w.avg_dom}`,
          sub: absorptionLabel(w.absorption_rate) ?? undefined,
        },
      ]
    : []

  const activeListings = detail.active
  const tabBase = `${agentPrefix}/neighbourhood/${subarea}`
  const byType: NeighbourhoodTypeSection[] = detail.by_type ?? []

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '12px 20px',
    fontSize: 14,
    fontWeight: active ? 700 : 500,
    color: active ? 'var(--primary-bg)' : 'var(--text-muted)',
    borderBottom: active ? '2.5px solid var(--accent)' : '2.5px solid transparent',
    textDecoration: 'none',
  })

  const faqs = w ? buildFaqs(detail.name, detail.city, w, detail.description, schools) : []

  const faqJsonLd = faqs.length > 0
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      })
    : null

  const domain = agentCanonicalBase(agent)
  const siteUrl = `https://${domain}`
  const canonicalUrl = `${siteUrl}/neighbourhood/${subarea}`

  const placeJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: detail.name,
    url: canonicalUrl,
    description: detail.description || `Real estate listings, market stats and sold data for ${detail.name}. Browse condos, townhouses and houses from ${agent.name}.`,
    containedInPlace: { '@type': 'City', name: detail.city },
  })

  const breadcrumbJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Neighbourhoods', item: `${siteUrl}/neighbourhoods` },
      { '@type': 'ListItem', position: 3, name: detail.name, item: canonicalUrl },
    ],
  })

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: placeJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      )}

      {/* Hero */}
      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          {/* Breadcrumb */}
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
            <a href={ap('/')} style={{ color: '#888', textDecoration: 'none' }}>
              Home
            </a>
            <span style={{ margin: '0 8px' }}>›</span>
            <a href={ap('/neighbourhoods')} style={{ color: '#888', textDecoration: 'none' }}>
              Neighbourhoods
            </a>
            <span style={{ margin: '0 8px' }}>›</span>
            <span>{detail.name}</span>
          </div>

          <h1 className={playfair.className} style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 400, lineHeight: 1.1, color: '#1a1a1a', marginBottom: 12, marginTop: 0 }}>
            {detail.name}
          </h1>

          {/* Badge + city + active count */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            {badge && (
              <span style={{ background: badge.bg, color: badge.color, padding: '4px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
                {badge.label}
              </span>
            )}
            <span style={{ color: '#888', fontSize: 13 }}>
              {detail.city}
              {w ? ` · ${w.active.toLocaleString()} active ${w.active === 1 ? 'listing' : 'listings'}` : ''}
            </span>
          </div>

          {/* Description intro */}
          {detail.description && (
            <p style={{ fontSize: 15, color: '#555', lineHeight: 1.75, maxWidth: 640, marginBottom: 22 }}>
              {detail.description}
            </p>
          )}

          {/* CTA action buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href={ap('/homes-for-sale')}
              style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}
            >
              View all {w ? w.active.toLocaleString() + ' ' : ''}homes for sale →
            </a>
            <a
              href={ap(`/market/${subarea}`)}
              style={{ background: 'var(--off-white)', color: 'var(--text)', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1px solid var(--border)' }}
            >
              Market Stats →
            </a>
            <a
              href={ap(`/neighbourhood/${subarea}/reports`)}
              style={{ background: 'var(--off-white)', color: 'var(--text)', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1px solid var(--border)' }}
            >
              Market Reports
            </a>
          </div>
        </div>
      </div>

      {/* Market snapshot table — by type */}
      {byType.length > 0 && (
        <div style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}>
          <div className="container" style={{ padding: '0 var(--container-padding)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Type
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Avg Sold Price
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Sold (30d)
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Avg DOM
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Active
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Condition
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byType.map((section, i) => {
                    const tb = marketBadge(section.widget.market_type)
                    return (
                      <tr key={section.type} style={{ borderBottom: i < byType.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary-bg)' }}>
                          {TYPE_SLUG[section.type] ? (
                            <a href={ap(`/market/${subarea}/${TYPE_SLUG[section.type]}`)} style={{ color: 'var(--primary-bg)', fontWeight: 700, textDecoration: 'none' }}>
                              {typeDisplayLabel(section.type)}
                            </a>
                          ) : typeDisplayLabel(section.type)}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text)', fontWeight: 600 }}>
                          {section.widget.avg_sold_price > 0 ? formatPrice(section.widget.avg_sold_price) : '—'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text)' }}>
                          {section.widget.sold_30d}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text)' }}>
                          {section.widget.avg_dom > 0 ? `${section.widget.avg_dom}d` : '—'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text)' }}>
                          {section.widget.active}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{ background: tb.bg, color: tb.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {tb.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="container" style={{ padding: '40px var(--container-padding) 72px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div>

            {/* Overall market summary: verdict + 4-stat grid */}
            {w && (
              <div style={{ marginBottom: 32 }}>
                <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.8, marginBottom: 20 }}>
                  {marketVerdict(w, detail.name)}
                </p>
                <StatGrid items={stats} />
              </div>
            )}

            {/* ── Neighbourhood Pulse ────────────────────────────────────────── */}
            {detail.pulse && (
              <NeighbourhoodPulse
                pulse={detail.pulse}
                name={detail.name}
                monthlyTrend={trend24}
              />
            )}

            {/* ── AI Weekly Market Pulse ─────────────────────────────────────── */}
            {detail.pulse_body && (
              <div style={{ marginBottom: 32, background: 'var(--primary-bg)', borderRadius: 10, padding: '20px 24px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>
                    This Week in {detail.name}
                  </div>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 1.75, margin: 0 }}>
                    {detail.pulse_body}
                  </p>
                  {detail.pulse_generated_at && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>
                      Updated {new Date(detail.pulse_generated_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Listings tab block ─────────────────────────────────────────── */}
            <div style={{ marginBottom: 44 }}>
              {/* Tab bar */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
                <a href={tabBase} style={tabStyle(show === 'active')}>
                  Active ({activeListings.length})
                </a>
                <a href={`${tabBase}?show=sold`} style={tabStyle(show === 'sold')}>
                  Recently Sold ({detail.recent_sold.length})
                </a>
              </div>

              {show === 'active' && (
                <div style={{ paddingTop: 20 }}>
                  {activeListings.length > 0 ? (
                    <>
                      {/* Count + view-all link */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          Showing <strong style={{ color: 'var(--text)' }}>{activeListings.length}</strong> active{' '}
                          {activeListings.length === 1 ? 'home' : 'homes'} in {detail.name}
                        </span>
                        <a
                          href={ap('/homes-for-sale')}
                          style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}
                        >
                          View all listings →
                        </a>
                      </div>
                      <ListingStrip listings={activeListings} />
                    </>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: '24px 0' }}>
                      No active listings in {detail.name} right now.
                    </p>
                  )}
                </div>
              )}

              {show === 'sold' && (
                <div style={{ paddingTop: 20 }}>
                  {detail.recent_sold.length > 0 ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          Showing <strong style={{ color: 'var(--text)' }}>{detail.recent_sold.length}</strong> recent{' '}
                          {detail.recent_sold.length === 1 ? 'sale' : 'sales'} in {detail.name}
                        </span>
                        <a
                          href={ap(`/neighbourhood/${subarea}/sold`)}
                          style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}
                        >
                          Full sold history →
                        </a>
                      </div>
                      <NeighbourhoodSoldGate
                        listings={detail.recent_sold}
                        agentSlug={slug}
                        agentPrefix={agentPrefix}
                        city={detail.city}
                      />
                    </>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: '24px 0' }}>
                      No recent sales recorded in {detail.name}.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── Open Houses ────────────────────────────────────────────────── */}
            <NeighbourhoodOpenHouses
              openHouses={neighbourhoodOpenHouses}
              agentSlug={slug}
              neighbourhoodName={detail.name}
            />

            {/* ── Great Buys ─────────────────────────────────────────────────── */}
            <GreatBuys listings={activeListings} agentSlug={slug} agentLabel={agentLabel} />

            {/* ── Why Work With ──────────────────────────────────────────────── */}
            <div style={{ marginBottom: 44, background: 'var(--primary-bg)', borderRadius: 10, padding: '24px 28px', display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
                  Local Expertise
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                  Why Work With {agentLabel}?
                </div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', margin: 0, lineHeight: 1.7 }}>
                  {isDualAgent
                    ? `${agentLabel} bring combined local knowledge and a wider network to help you find the best opportunities in ${detail.name} — from value listings to negotiating the strongest terms.`
                    : `${agentLabel} specializes in ${detail.name} — from identifying hidden-value listings early to negotiating the best possible terms for buyers and sellers.`}
                </p>
              </div>
              <a
                href={ap('/contact')}
                style={{ display: 'inline-block', background: 'var(--accent)', color: '#1a1a1a', padding: '12px 22px', borderRadius: 7, fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                Connect with {agentLabel} →
              </a>
            </div>

            {/* ── Weekly deals / price drop offers ────────────────────────────── */}
            <div style={{ display: 'grid', gap: 14, marginBottom: 44 }}>
              <LeadOfferCapture
                slug={slug}
                offerType="weekly_deals"
                offerContext={detail.name}
                title={`Get weekly ${detail.name} deals`}
                subtitle="New and price-reduced listings in your inbox every week."
                buttonLabel="Get Weekly Deals"
              />
              <LeadOfferCapture
                slug={slug}
                offerType="price_drop"
                offerContext={detail.name}
                title={`Send me price drops in ${detail.name}`}
                subtitle="Be the first to know when a listing's price is reduced."
                buttonLabel="Alert Me on Price Drops"
              />
            </div>

            {/* ── 24-Month Market Trends charts ──────────────────────────────── */}
            {trend24.length > 0 && (
              <div style={{ marginBottom: 44 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
                  24-Month Market Trends — {detail.name}
                </h2>
                <NeighbourhoodChartsClient trend={trend24} />
                {narrative && (
                  <p style={{ marginTop: 18, fontSize: 14, color: 'var(--text)', lineHeight: 1.85 }}>
                    {narrative}
                  </p>
                )}
              </div>
            )}

            {/* ── About the Neighbourhood ───────────────────────────────────── */}
            {detail.description && (
              <div style={{ marginBottom: 44 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
                  About {detail.name}
                </h2>
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '24px 28px' }}>
                  <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.85, margin: 0 }}>
                    {detail.description}
                  </p>
                </div>
              </div>
            )}

            {/* ── AI Lifestyle Narrative ─────────────────────────────────────── */}
            {detail.lifestyle_body && (() => {
              const paras = detail.lifestyle_body!.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
              const [first, ...rest] = paras
              return (
                <div style={{ marginBottom: 44 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                    Living in {detail.name}
                  </h2>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                    Community character, lifestyle and what makes this neighbourhood distinct.
                  </div>
                  <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '24px 28px' }}>
                    <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.85, margin: rest.length > 0 ? '0 0 16px' : 0 }}>
                      {first}
                    </p>
                    {rest.length > 0 && (
                      <details>
                        <summary style={{ padding: '12px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, userSelect: 'none', borderTop: '1px solid var(--border)' }}>
                          <span>Read more</span>
                          <span style={{ color: 'var(--accent)', fontSize: 18, flexShrink: 0, lineHeight: 1 }}>+</span>
                        </summary>
                        <div style={{ paddingTop: 16 }}>
                          {rest.map((p, i) => (
                            <p key={i} style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.85, margin: i < rest.length - 1 ? '0 0 14px' : 0 }}>
                              {p}
                            </p>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* ── Schools ───────────────────────────────────────────────────── */}
            {schools.length > 0 && (
              <div style={{ marginBottom: 44 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Nearby Schools</h2>
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', fontSize: 14 }}>
                  {schools.map((s, i) => (
                    <a
                      key={s.slug}
                      href={ap(`/schools/${s.slug}`)}
                      style={{ display: 'flex', alignItems: 'center', padding: '13px 18px', borderBottom: i < schools.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? '#fff' : 'var(--off-white)', gap: 12, textDecoration: 'none', color: 'inherit' }}
                    >
                      <div style={{ flex: 1, fontWeight: 600, color: 'var(--primary-bg)' }}>{s.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, minWidth: 100 }}>{s.school_type ?? 'Public'}</div>
                      <div style={{ color: 'var(--accent)', fontSize: 12, minWidth: 90, textAlign: 'right', fontWeight: 600 }}>{s.active_count.toLocaleString()} active</div>
                    </a>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                  Listing counts are based on school catchment boundaries and update automatically. Always verify current catchment boundaries with the school district.
                </p>
              </div>
            )}

            {/* ── School catchment offer ─────────────────────────────────────── */}
            {schools.length > 0 && (
              <div style={{ marginBottom: 44 }}>
                <LeadOfferCapture
                  slug={slug}
                  offerType="school_catchment"
                  offerContext={`${detail.name} — ${schools[0]?.name ?? ''}`}
                  title={`Find out what's in ${schools[0]?.name ?? 'your'} catchment`}
                  subtitle="Get homes for sale in this school's catchment area sent to your inbox."
                  buttonLabel="Get Homes in This Catchment"
                />
              </div>
            )}

            {/* ── AI School Catchment Guide ──────────────────────────────────── */}
            {features.school_catchments && aiSchoolPage && (() => {
              const schoolParas = (aiSchoolPage.content || '').split(/\n+/).filter(Boolean)
              const [schoolFirst, ...schoolRest] = schoolParas
              return (
                <div style={{ marginBottom: 44 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                    School Catchment Guide — {detail.name}
                  </h2>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                    Understanding school catchments when buying in {detail.name}.
                  </div>
                  <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '24px 28px' }}>
                    <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.85, margin: schoolRest.length > 0 ? '0 0 16px' : 0 }}>
                      {schoolFirst}
                    </p>
                    {schoolRest.length > 0 && (
                      <details style={{ borderTop: '1px solid var(--border)', marginTop: 16 }}>
                        <summary style={{ padding: '12px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, userSelect: 'none' }}>
                          <span>Show full guide</span>
                          <span style={{ color: 'var(--accent)', fontSize: 18, flexShrink: 0, lineHeight: 1 }}>+</span>
                        </summary>
                        <div style={{ paddingTop: 16 }}>
                          {schoolRest.map((p, i) => (
                            <p key={i} style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.85, margin: i < schoolRest.length - 1 ? '0 0 16px' : 0 }}>
                              {p}
                            </p>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* ── AI Amenities Widget ────────────────────────────────────────── */}
            {features.amenities_widget && aiAmenityPage && (() => {
              const amenityParas = (aiAmenityPage.content || '').split(/\n+/).filter(Boolean)
              const [amenityFirst, ...amenityRest] = amenityParas
              return (
                <div style={{ marginBottom: 44 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                    Walkability &amp; Amenities
                  </h2>
                  <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '24px 28px' }}>
                    <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.85, margin: amenityRest.length > 0 ? '0 0 14px' : 0 }}>
                      {amenityFirst}
                    </p>
                    {amenityRest.length > 0 && (
                      <details style={{ borderTop: '1px solid var(--border)', marginTop: 16 }}>
                        <summary style={{ padding: '12px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, userSelect: 'none' }}>
                          <span>Read more</span>
                          <span style={{ color: 'var(--accent)', fontSize: 18, flexShrink: 0, lineHeight: 1 }}>+</span>
                        </summary>
                        <div style={{ paddingTop: 16 }}>
                          {amenityRest.map((p, i) => (
                            <p key={i} style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.85, margin: i < amenityRest.length - 1 ? '0 0 14px' : 0 }}>
                              {p}
                            </p>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* ── Lifestyle Guide CTA ───────────────────────────────────────── */}
            {features.lifestyle_seo && (
              <div style={{ marginBottom: 44, background: 'var(--primary-bg)', borderRadius: 10, padding: '28px 32px', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
                    Neighbourhood Guide
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.25, marginBottom: 8 }}>
                    Living in {detail.name}
                  </div>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.7 }}>
                    Schools, lifestyle, walkability and what makes this neighbourhood unique — an in-depth local guide.
                  </p>
                </div>
                <a
                  href={ap(`/guide/living-in-${subarea}`)}
                  style={{ display: 'inline-block', background: 'var(--accent)', color: '#1a1a1a', padding: '12px 22px', borderRadius: 7, fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  Read the Guide →
                </a>
              </div>
            )}

            {/* ── FAQ accordion ─────────────────────────────────────────────── */}
            {faqs.length > 0 && (
              <div style={{ marginBottom: 44 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
                  Frequently Asked Questions
                </h2>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  {faqs.map((faq, i) => (
                    <details key={i} style={{ borderBottom: i < faqs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <summary style={{ padding: '16px 20px', fontSize: 14, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', background: '#fff', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <span>{faq.q}</span>
                        <span style={{ color: 'var(--accent)', fontSize: 20, flexShrink: 0, lineHeight: 1 }}>+</span>
                      </summary>
                      <div style={{ padding: '0 20px 18px', background: 'var(--off-white)', fontSize: 14, color: 'var(--text)', lineHeight: 1.8 }}>
                        {faq.a}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* ── W2 — Home Evaluation ──────────────────────────────────────── */}
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
                Free Home Evaluation
              </h2>
              <W2HomeEvaluation agent={agent} neighbourhood={detail.name} />
            </div>

            {/* ── W3 — Mortgage Pre-Qualification ───────────────────────────── */}
            <div style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
                Mortgage Pre-Qualification
              </h2>
              <W3MortgagePreQual agent={agent} />
            </div>

            {/* ── Related Articles ─────────────────────────────────────────── */}
            {relatedArticles.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
                  Recent Articles About {detail.name}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
                  {relatedArticles.map(post => (
                    <a
                      key={post.id}
                      href={ap(`/news/${post.slug}`)}
                      style={{ textDecoration: 'none', background: '#fff', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                    >
                      {post.photo_url && (
                        <img src={post.photo_url} alt={post.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                      )}
                      <div style={{ padding: '14px 16px' }}>
                        {post.category && (
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{post.category}</div>
                        )}
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-bg)', lineHeight: 1.4 }}>{post.title}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ── Buy / Sell CTA strip ─────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, marginBottom: 32 }}>
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 24px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>For Buyers</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 8 }}>Thinking of buying in {detail.name}?</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 16px' }}>
                  Learn what to look for, how to make a strong offer, and what the buying process looks like in BC.
                </p>
                <a href={ap('/buyers')} style={{ display: 'inline-block', background: 'var(--primary-bg)', color: '#fff', padding: '10px 18px', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                  Buyer&apos;s Guide →
                </a>
              </div>
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '22px 24px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>For Sellers</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 8 }}>Thinking of selling in {detail.name}?</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 16px' }}>
                  Find out what your home is worth with a free evaluation based on real comparable sales in this neighbourhood.
                </p>
                <a href={ap('/home-evaluation')} style={{ display: 'inline-block', background: 'var(--accent)', color: '#1a1a1a', padding: '10px 18px', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                  Free Home Evaluation →
                </a>
              </div>
            </div>

            {/* ── Internal links ────────────────────────────────────────────── */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px', background: '#fff' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-bg)', marginBottom: 14 }}>Keep exploring</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { label: `${detail.name} Market Report`, href: ap(`/market-report?subarea=${encodeURIComponent(detail.subarea || detail.name)}`) },
                  { label: `${detail.name} Sold History`, href: ap(`/neighbourhood/${subarea}/sold`) },
                  { label: `${detail.name} Report Archive`, href: ap(`/neighbourhood/${subarea}/reports`) },
                  ...(features.lifestyle_seo ? [{ label: `${detail.name} Lifestyle Guide`, href: ap(`/guide/living-in-${subarea}`) }] : []),
                  ...(subarea === 'white-rock' ? [{ label: 'White Rock Lifestyle & Landmarks', href: ap('/white-rock') }] : []),
                  ...(['grandview-heights', 'grandview-surrey', 'pacific-douglas', 'sunnyside-park'].includes(subarea) ? [{ label: 'New Construction in South Surrey', href: ap('/new-construction') }] : []),
                  { label: 'All Homes For Sale', href: ap('/homes-for-sale') },
                  { label: 'Recently Sold', href: ap('/sold') },
                  { label: 'All Neighbourhoods', href: ap('/neighbourhoods') },
                  { label: 'Buyers Guide', href: ap('/buyers') },
                  { label: 'Sellers Guide', href: ap('/sellers') },
                  { label: 'News & Market Updates', href: ap('/news') },
                ].map(l => (
                  <a
                    key={l.href}
                    href={l.href}
                    style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <PageQuickLinks slug={slug} context="market" exclude="/neighbourhood" />
      <style>{`
        @media (max-width:640px){.type-stat-grid{grid-template-columns:repeat(2,1fr)!important}}
        details summary::-webkit-details-marker{display:none}
        details[open] summary span:last-child{transform:rotate(45deg);display:inline-block}
      `}</style>
    </div>
  )
}
