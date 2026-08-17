import { playfair } from '@/lib/fonts'
import { getAgent, getListings, getNeighbourhoodDetail, authMe, resolveAgentPrefix } from '@/lib/api'
import { cookies, headers } from 'next/headers'
import { formatPrice } from '@/lib/types'
import ListingStrip from '@/components/ListingStrip'
import BuildingComparisonTable from '@/components/BuildingComparisonTable'
import ContactSidebarForm from '@/components/ContactSidebarForm'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string; subarea: string }>
  searchParams: Promise<Record<string, string>>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, subarea } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const agent = await getAgent(slug)
  const detail = await getNeighbourhoodDetail(slug, subarea)
  const area = detail?.name || subarea.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const title = `${area} Sold Homes`
  const description = `Browse recently sold properties in ${area}. Real MLS® sold prices, days on market and comparable sales from ${agent?.name || 'your local agent'}.`
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

const PAGE_SIZE = 12

export default async function NeighbourhoodSoldPage({ params, searchParams }: Props) {
  // Auth: verified users see sold prices, guests see blurred prices + sign-in CTA.
  const jar = await cookies()
  const sessionToken = jar.get('pxl_session')?.value
  const user = sessionToken ? await authMe(sessionToken) : null
  const isLoggedIn = user?.next_step === 'done'
  const { slug, subarea } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const sp = await searchParams
  const [agent, detail] = await Promise.all([getAgent(slug), getNeighbourhoodDetail(slug, subarea)])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const type = sp.type || ''
  const page = sp.page ? Math.max(1, parseInt(sp.page)) : 1
  const view = sp.view === 'list' ? 'list' : 'grid'

  const { listings } = await getListings(slug, {
    status: 'Sold',
    subarea: detail?.subarea || undefined,
    type: type || undefined,
    page,
    limit: PAGE_SIZE,
  })

  const areaName = detail?.name || subarea.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const widget = detail?.widget

  function filterLink(overrides: Record<string, string>) {
    const merged: Record<string, string> = { ...sp, ...overrides }
    Object.keys(merged).forEach(k => { if (!merged[k]) delete merged[k] })
    const q = new URLSearchParams(merged).toString()
    return q ? `?${q}` : '?'
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-block', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 500,
    background: active ? 'var(--primary-bg)' : '#fff', color: active ? '#fff' : 'var(--text)',
    border: `1px solid ${active ? 'var(--primary-bg)' : 'var(--border)'}`, textDecoration: 'none', cursor: 'pointer',
  })
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }

  const areaLabel = detail?.name || subarea.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SearchResultsPage',
    name: `${areaLabel} Sold Homes`,
    description: `Recently sold properties in ${areaLabel}. View sold prices (members only), days on market and comparable sales from ${agent.name}.`,
    provider: { '@type': 'RealEstateAgent', name: agent.name },
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Hero */}
      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
            <a href={ap('/neighbourhoods')} style={{ color: '#888', textDecoration: 'none' }}>Neighbourhoods</a>
            {' › '}
            <a href={ap(`/neighbourhood/${subarea}`)} style={{ color: '#888', textDecoration: 'none' }}>{areaName}</a>
            {' › '}<span>Sold</span>
          </div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>Sold Homes</div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(24px,3.5vw,42px)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', margin: 0 }}>
            {areaName} — Recently Sold Properties
          </h1>
          <p style={{ color: '#555', marginTop: 14, fontSize: 15, maxWidth: 660, lineHeight: 1.7, marginBottom: 0 }}>
            Real MLS® sold prices in {areaName} — compare what homes actually sold for, days on market and list-to-sold ratios.
          </p>
        </div>
      </div>

      {/* Neighbourhood widget */}
      {widget && (
        <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '18px 0' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
              {[
                { l: 'Sold · Last 30d', v: String(widget.sold_30d) },
                { l: 'Avg Sold Price', v: widget.avg_sold_price ? formatPrice(widget.avg_sold_price) : '—' },
                { l: 'Avg Days on Market', v: widget.avg_dom != null ? `${widget.avg_dom}d` : '—' },
                { l: 'Homes For Sale', v: String(widget.active) },
              ].map(s => (
                <div key={s.l} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', background: 'var(--off-white)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{s.l}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '14px 0' }}>
        <div className="container" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={labelStyle}>Type</span>
          {['', 'Apartment', 'Townhouse', 'House'].map(t => (
            <a key={t || 'all'} href={filterLink({ type: t, page: '' })} style={chipStyle(type === t)}>
              {t || 'All'}
            </a>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <a href={filterLink({ view: '' })} style={chipStyle(view === 'grid')}>Grid</a>
            <a href={filterLink({ view: 'list' })} style={chipStyle(view === 'list')}>List</a>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container" style={{ padding: '32px var(--container-padding) 64px' }}>
        <div className="nbhd-sold-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 36, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
              {listings.length === 0
                ? 'No sold homes found'
                : <><strong style={{ color: 'var(--text)' }}>{listings.length}</strong> recently sold{page > 1 ? ` · page ${page}` : ''}</>}
            </div>

            {listings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', background: '#fff' }}>
                No sold homes found for these filters.
                <div style={{ marginTop: 10 }}><a href="?" style={{ color: 'var(--accent)', fontWeight: 600 }}>Clear filters</a></div>
              </div>
            ) : (
              <>
                {view === 'list'
                  ? <BuildingComparisonTable rows={listings} sold isLoggedIn={isLoggedIn} slug={slug} />
                  : <ListingStrip listings={listings} showSoldPrice={isLoggedIn} columns={2} />}
                {!isLoggedIn && (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(var(--accent-rgb),0.07)', border: '1px solid rgba(var(--accent-rgb),0.2)', borderRadius: 8, padding: '10px 16px' }}>
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>🔒 Sign in to unlock sold prices</span>
                    <a href={ap('/sign-in')} style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>Sign In →</a>
                  </div>
                )}
                {(page > 1 || listings.length === PAGE_SIZE) && (
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 36 }}>
                    {page > 1 && <a href={filterLink({ page: String(page - 1) })} style={{ padding: '10px 22px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff', textDecoration: 'none', color: 'var(--text)' }}>← Previous</a>}
                    {listings.length === PAGE_SIZE && <a href={filterLink({ page: String(page + 1) })} style={{ padding: '10px 22px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff', textDecoration: 'none', color: 'var(--text)' }}>Next →</a>}
                  </div>
                )}
              </>
            )}

            {/* Internal links */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 22px', marginTop: 32 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Explore {areaName}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { l: `Homes For Sale`, h: ap(`/neighbourhood/${subarea}`) },
                  { l: `Market Report`, h: ap(`/neighbourhood/${subarea}/reports`) },
                  { l: 'All Sold Homes', h: ap('/sold') },
                  { l: 'Condo Buildings', h: ap('/buildings') },
                ].map(x => (
                  <a key={x.l} href={x.h} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 12px', borderRadius: 6, textDecoration: 'none', fontSize: 12 }}>{x.l}</a>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div style={{ background: 'rgba(var(--accent-rgb),0.10)', border: '1px solid var(--accent)', borderRadius: 10, padding: '16px 18px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 4 }}>What&apos;s your {areaName} home worth?</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                Get a free market valuation from {agent.name.split(' ')[0]} based on real recent sales in {areaName}.
              </div>
            </div>
            <ContactSidebarForm agent={agent} mode="contact" />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .nbhd-sold-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
