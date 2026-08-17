import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getListings, getNeighbourhoodDetail, agentCanonicalBase, resolveAgentPrefix } from '@/lib/api'
import ListingStrip from '@/components/ListingStrip'
import ContactSidebarForm from '@/components/ContactSidebarForm'
import { formatPrice } from '@/lib/types'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { fromSubareaSlug, subareaDisplayName, SUBAREA_MAP } from '../../homes-for-sale/subareaUtils'


interface Props {
  params: Promise<{ slug: string; filter: string; city: string }>
  searchParams: Promise<Record<string, string>>
}

export const revalidate = 300

const TYPE_MAP: Record<string, { schema: string; label: string; plural: string; h1Type: string }> = {
  condos:      { schema: 'Apartment', label: 'Condo',     plural: 'Condos',      h1Type: 'Condos & Apartments' },
  apartments:  { schema: 'Apartment', label: 'Apartment', plural: 'Apartments',  h1Type: 'Condos & Apartments' },
  houses:      { schema: 'House',     label: 'House',     plural: 'Houses',      h1Type: 'Houses' },
  townhouses:  { schema: 'Townhouse', label: 'Townhouse', plural: 'Townhouses',  h1Type: 'Townhouses' },
  townhomes:   { schema: 'Townhouse', label: 'Townhome',  plural: 'Townhomes',   h1Type: 'Townhouses' },
  duplexes:    { schema: 'Duplex',    label: 'Duplex',    plural: 'Duplexes',    h1Type: 'Duplexes' },
}

const PAGE_SIZE = 12

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, filter, city } = await params
  const meta = TYPE_MAP[filter.toLowerCase()]
  if (!meta) return { title: 'Page Not Found' }
  const agent = await getAgent(slug)
  const cityDisplay = subareaDisplayName(city)
  const title = `${cityDisplay} ${meta.plural} for Sale — ${agent?.name || 'Your Agent'}`
  const description = `Browse ${meta.plural.toLowerCase()} for sale in ${cityDisplay}. Real MLS® listings with photos, prices and open house dates from ${agent?.name || 'your local agent'}.`
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/${filter}/${city}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: 'website', url: canonical },
    twitter: { card: 'summary', title, description },
  }
}

export const dynamicParams = true

export async function generateStaticParams() {
  return []
}

export default async function PropertyTypeCityPage({ params, searchParams }: Props) {
  const { slug, filter, city } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const sp = await searchParams

  const meta = TYPE_MAP[filter.toLowerCase()]
  if (!meta) notFound()

  const cityDisplay = subareaDisplayName(city)
  const cityMls = fromSubareaSlug(city)

  const page = sp.page ? Math.max(1, parseInt(sp.page)) : 1
  const minPrice = sp.min ? parseInt(sp.min) : undefined
  const maxPrice = sp.max ? parseInt(sp.max) : undefined

  const [agent, neighbourhood, listings] = await Promise.all([
    getAgent(slug),
    getNeighbourhoodDetail(slug, city),
    getListings(slug, {
      status: 'Active',
      type: meta.schema as 'Apartment' | 'Townhouse' | 'House',
      subarea: cityMls,
      min_price: minPrice,
      max_price: maxPrice,
      page,
      limit: PAGE_SIZE,
    }).then(r => r.listings),
  ])
  if (!agent) notFound()

  const firstName = agent.name.split(' ')[0]
  const domain = agentCanonicalBase(agent)

  function bedLink(bedsVal: string) {
    const base = ap(`/${filter}/${city}`)
    const priceParams = new URLSearchParams()
    if (sp.min) priceParams.set('min', sp.min)
    if (sp.max) priceParams.set('max', sp.max)
    const qs = priceParams.toString()
    if (!bedsVal) return qs ? `${base}?${qs}` : base
    return qs ? `${base}/${bedsVal}-bedroom?${qs}` : `${base}/${bedsVal}-bedroom`
  }

  function filterLink(overrides: Record<string, string>) {
    const merged: Record<string, string> = {}
    if (sp.min) merged.min = sp.min
    if (sp.max) merged.max = sp.max
    Object.assign(merged, overrides)
    Object.keys(merged).forEach(k => { if (!merged[k]) delete merged[k] })
    const q = new URLSearchParams(merged).toString()
    return q ? `?${q}` : ''
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-block', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 500,
    background: active ? '#1a1a1a' : '#fff', color: active ? '#fff' : 'var(--text)',
    border: `1px solid ${active ? '#1a1a1a' : 'var(--border)'}`, textDecoration: 'none', whiteSpace: 'nowrap',
  })

  const bedOpts = [{ l: 'Any', v: '' }, { l: '1+', v: '1' }, { l: '2+', v: '2' }, { l: '3+', v: '3' }, { l: '4+', v: '4' }]
  const priceOpts = [
    { l: 'Any Price', min: '', max: '' },
    { l: 'Under $600K', min: '', max: '600000' },
    { l: '$600K–$900K', min: '600000', max: '900000' },
    { l: '$900K–$1.3M', min: '900000', max: '1300000' },
    { l: '$1.3M+', min: '1300000', max: '' },
  ]
  const selectStyle: React.CSSProperties = {
    padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 6,
    background: '#fff', fontSize: 13, color: 'var(--text)', cursor: 'pointer',
  }

  const nbActive = neighbourhood?.active ?? []
  const nbSold = neighbourhood?.recent_sold ?? []
  const avgListPrice = nbActive.length
    ? Math.round(nbActive.reduce((s, l) => s + (l.list_price ?? 0), 0) / nbActive.length)
    : 0
  const avgDom = nbActive.length
    ? Math.round(nbActive.reduce((s, l) => s + (l.dom ?? 0), 0) / nbActive.length)
    : 0
  const stats = neighbourhood ? [
    { l: 'Active', v: String(nbActive.length) },
    { l: 'Avg List Price', v: avgListPrice ? formatPrice(avgListPrice) : '—' },
    { l: 'Avg Days on Mkt', v: avgDom ? `${avgDom}d` : '—' },
    { l: 'Sold 30d', v: String(nbSold.length) },
  ] : []

  const pageUrl = `https://${domain}/${filter}/${city}`

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `https://${domain}/` },
      { '@type': 'ListItem', position: 2, name: `${meta.plural} for Sale`, item: `https://${domain}/${filter}` },
      { '@type': 'ListItem', position: 3, name: `${cityDisplay} ${meta.plural}`, item: pageUrl },
    ],
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SearchResultsPage',
    name: `${cityDisplay} ${meta.plural} for Sale`,
    description: `Active ${meta.plural.toLowerCase()} for sale in ${cityDisplay} — MLS® listings from ${agent.name}.`,
    url: pageUrl,
    numberOfItems: listings.length,
    provider: { '@type': 'RealEstateAgent', name: agent.name, telephone: agent.phone },
    ...(listings.length > 0 && {
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: listings.length,
        itemListElement: listings.slice(0, 10).map((l, i) => ({
          '@type': 'ListItem',
          position: (page - 1) * PAGE_SIZE + i + 1,
          item: {
            '@type': 'RealEstateListing',
            name: l.address,
            url: `https://${domain}/listing/${l.mls_no}`,
            address: { '@type': 'PostalAddress', streetAddress: l.address },
            numberOfRooms: l.beds,
            offers: l.list_price ? { '@type': 'Offer', price: l.list_price, priceCurrency: 'CAD' } : undefined,
          },
        })),
      },
    }),
  }

  const card: React.CSSProperties = { background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px' }
  const sectionTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 12, marginTop: 0 }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>
            {cityDisplay} · {meta.h1Type}
          </div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(24px,3.5vw,44px)', fontWeight: 400, lineHeight: 1.15, maxWidth: 680, color: '#1a1a1a', marginBottom: 10 }}>
            {cityDisplay} {meta.plural} for Sale
          </h1>
          <p style={{ color: '#555', fontSize: 14, maxWidth: 600, lineHeight: 1.7, margin: 0 }}>
            Browse all active {meta.plural.toLowerCase()} in {cityDisplay}. Updated in real time from the MLS® — photos, floor plans, open house dates and contact {firstName} direct.
          </p>
        </div>
      </div>

      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '10px 0', position: 'sticky', top: 0, zIndex: 20 }}>
        <div className="container" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {bedOpts.map(b => (
              <a key={b.v} href={bedLink(b.v)} style={chipStyle(b.v === '')}>
                {b.l} bd
              </a>
            ))}
          </div>
          <div style={{ width: 1, height: 22, background: 'var(--border)', flexShrink: 0 }} />
          <select style={selectStyle} id="price-hub-select" defaultValue={`${sp.min || ''}__${sp.max || ''}`}>
            {priceOpts.map(p => (
              <option key={p.l} value={`${p.min}__${p.max}`}>{p.l}</option>
            ))}
          </select>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            {listings.length > 0 ? <span><strong>{listings.length}</strong>{listings.length === PAGE_SIZE ? '+' : ''} {meta.plural.toLowerCase()}</span> : null}
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          var sel = document.getElementById('price-hub-select');
          if (!sel) return;
          var sp = new URLSearchParams(location.search);
          sel.value = (sp.get('min') || '') + '__' + (sp.get('max') || '');
          sel.addEventListener('change', function() {
            var parts = sel.value.split('__');
            if (parts[0]) sp.set('min', parts[0]); else sp.delete('min');
            if (parts[1]) sp.set('max', parts[1]); else sp.delete('max');
            sp.delete('page');
            location.href = location.pathname + (sp.toString() ? '?' + sp.toString() : '');
          });
        })();
      `}} />

      <div className="container" style={{ padding: '28px var(--container-padding) 72px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>
        <div>
          {stats.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
              {stats.map(s => (
                <div key={s.l} style={{ ...card, textAlign: 'center', padding: '12px 8px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 2 }}>{s.l}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--accent)' }}>{s.v}</div>
                </div>
              ))}
            </div>
          )}

          {listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 24px', background: '#fff', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>🏠</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 8 }}>
                No {meta.plural} Available
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 340, margin: '0 auto 20px' }}>
                There are no active {meta.plural.toLowerCase()} in {cityDisplay} right now. Check back soon or contact {firstName} to be notified when new listings hit the market.
              </p>
              <a href={ap('/homes-for-sale')} style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '10px 22px', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                Browse All Homes
              </a>
            </div>
          ) : (
            <>
              <ListingStrip listings={listings} columns={2} />
              {(page > 1 || listings.length === PAGE_SIZE) && (
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 36 }}>
                  {page > 1 && <a href={filterLink({ page: String(page - 1) })} style={{ padding: '10px 22px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff', textDecoration: 'none', color: 'var(--text)' }}>← Previous</a>}
                  {listings.length === PAGE_SIZE && <a href={filterLink({ page: String(page + 1) })} style={{ padding: '10px 22px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff', textDecoration: 'none', color: 'var(--text)' }}>Next →</a>}
                </div>
              )}
            </>
          )}

          <div style={{ ...card, marginTop: 32 }}>
            <h3 style={{ ...sectionTitle }}>Explore More in {cityDisplay}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { l: `All ${cityDisplay} Homes`, h: ap(`/homes-for-sale?subarea=${encodeURIComponent(city)}`) },
                { l: `Sold in ${cityDisplay}`, h: ap(`/sold?subarea=${encodeURIComponent(city)}`) },
                { l: `${cityDisplay} Market Report`, h: ap(`/neighbourhood/${city}`) },
                { l: `Top Realtor in ${cityDisplay}`, h: ap(`/top-realtor/${city}`) },
                { l: 'Home Evaluation', h: ap('/home-evaluation') },
                { l: "Buyer's Guide", h: ap('/buyers-guide') },
              ].map(x => (
                <a key={x.l} href={x.h} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 14px', borderRadius: 20, textDecoration: 'none', fontSize: 12 }}>{x.l}</a>
              ))}
            </div>
          </div>
        </div>

        <div className="sold-detail-sidebar">
          <ContactSidebarForm agent={agent} mode="showing" />
          <div style={{ ...card, marginTop: 16 }}>
            <h3 style={{ ...sectionTitle }}>Browse by Type</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { l: `${cityDisplay} Condos`, h: ap(`/condos/${city}`) },
                { l: `${cityDisplay} Townhouses`, h: ap(`/townhouses/${city}`) },
                { l: `${cityDisplay} Houses`, h: ap(`/houses/${city}`) },
              ].map(x => (
                <a key={x.l} href={x.h} style={{ fontSize: 13, color: 'var(--text)', textDecoration: 'none', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>{x.l}</a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
