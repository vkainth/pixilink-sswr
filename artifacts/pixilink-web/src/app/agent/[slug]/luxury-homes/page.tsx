import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getListings, getTestimonials, getMarketReport, getNeighbourhoods, agentCanonicalBase, resolveAgentPrefix } from '@/lib/api'
import { formatPrice, getCoAgents } from '@/lib/types'
import { marketBadge } from '@/lib/market'
import ListingStrip from '@/components/ListingStrip'
import PageQuickLinks from '@/components/PageQuickLinks'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (slug !== 'randy') notFound()
  const agent = await getAgent(slug)
  const coAgents = agent ? getCoAgents(agent) : []
  const isDual = coAgents.length > 0
  const agentName = isDual
    ? `${agent!.name.split(' ')[0]} & ${coAgents[0].name.split(' ')[0]}`
    : (agent?.name || 'Randy Dyck')
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/luxury-homes`
  const title = `Luxury Homes for Sale in South Surrey & White Rock | ${agentName}`
  const description = `Browse luxury homes for sale in South Surrey & White Rock priced over $1.5M. Oceanfront estates, golf course properties, and executive homes. Live MLS® listings with ${agentName}.`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: canonical,
    provider: {
      '@type': 'RealEstateAgent',
      name: agentName,
      telephone: agent?.phone,
      url: `https://${domain}`,
    },
  }

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: 'website', url: canonical, siteName: agentName },
    twitter: { card: 'summary_large_image', title, description },
    other: { 'script:ld+json': JSON.stringify(jsonLd) },
  }
}

export default async function LuxuryHomesPage({ params }: Props) {
  const { slug } = await params
  if (slug !== 'randy') notFound()
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const [agent, { listings, total }, testimonials, marketReport, neighbourhoods] = await Promise.all([
    getAgent(slug),
    getListings(slug, { status: 'Active', min_price: 1500000, limit: 24 }),
    getTestimonials(slug),
    getMarketReport(slug),
    getNeighbourhoods(slug),
  ])
  const typeStats = marketReport.overall
  const typeBadge = marketBadge(typeStats.market_type)
  if (!agent) notFound()
  requireNotShowcase(agent)

  const coAgents = getCoAgents(agent)
  const isDual = coAgents.length > 0
  const firstName = agent.name.split(' ')[0]
  const agentLabel = isDual
    ? `${firstName} & ${coAgents[0].name.split(' ')[0]}`
    : firstName
  const subareas = agent.settings?.subarea_whitelist ?? []
  const location = subareas.length > 0 ? subareas.join(' & ') : 'South Surrey & White Rock'

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `https://${agent.settings?.custom_domain || 'southsurreywhiterock.com'}/` },
      { '@type': 'ListItem', position: 2, name: 'Luxury Homes', item: `https://${agent.settings?.custom_domain || 'southsurreywhiterock.com'}/luxury-homes` },
    ],
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Hero */}
      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid var(--border)', borderRadius: 24, padding: 3, marginBottom: 22 }}>
            <a href={ap('/luxury-homes')} style={{ padding: '7px 20px', fontWeight: 700, fontSize: 13, background: '#1a1a1a', color: '#fff', borderRadius: 20, textDecoration: 'none', display: 'inline-block' }}>Luxury Homes</a>
            <a href={ap('/ocean-view-homes')} style={{ padding: '7px 20px', fontWeight: 500, fontSize: 13, background: 'transparent', color: '#555', borderRadius: 20, textDecoration: 'none', display: 'inline-block' }}>Ocean View</a>
          </div>
          <nav aria-label="breadcrumb" style={{ fontSize: 12, color: '#aaa', marginBottom: 14 }}>
            <a href={ap('/')} style={{ color: '#aaa', textDecoration: 'none' }}>Home</a>
            <span style={{ margin: '0 6px' }}>›</span>
            <span>Luxury Homes</span>
          </nav>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>
            Luxury Real Estate
          </div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(28px,4.5vw,52px)', fontWeight: 400, lineHeight: 1.15, maxWidth: 680, color: '#1a1a1a', margin: 0 }}>
            Luxury Homes for Sale in South Surrey &amp; White Rock
          </h1>
          <p style={{ fontSize: 15, color: '#555', maxWidth: 600, lineHeight: 1.75, marginTop: 14, marginBottom: 0 }}>
            {total > 0
              ? `${total} luxury properties currently listed in ${location} — from oceanfront estates to custom golf course homes priced over $1.5M.`
              : `Explore luxury properties in ${location} — oceanfront estates, custom golf course homes, and executive residences.`}
          </p>
        </div>
      </div>

      {/* Intro content */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ padding: '40px var(--container-padding)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 28 }}>
            {[
              {
                title: 'South Surrey Estates',
                body: 'Morgan Creek, Elgin Chantrell, and Hazelmere offer large-lot executive homes from $1.5M–$5M+. Custom builds, golf course frontage, and gated communities.',
              },
              {
                title: 'White Rock Oceanfront',
                body: 'White Rock\'s Marine Drive offers some of BC\'s most sought-after waterfront and ocean-view properties. Ocean views from $1.6M, direct waterfront from $3M+.',
              },
              {
                title: 'Grandview Heights',
                body: 'Newer luxury builds with panoramic valley views. Contemporary architecture, triple-car garages, and resort-style outdoor spaces. From $1.8M.',
              },
            ].map(card => (
              <div key={card.title} style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 8 }}>{card.title}</div>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.75, margin: 0 }}>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Market Snapshot */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ padding: '20px var(--container-padding)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {([
                { label: 'Avg Sold Price', value: typeStats.avg_sold_price ? formatPrice(typeStats.avg_sold_price) : '—' },
                { label: 'Homes For Sale', value: String(typeStats.active) },
                { label: 'Avg Days on Market', value: `${typeStats.avg_dom}d` },
                { label: 'Absorption Rate', value: `${typeStats.absorption_rate.toFixed(1)} mo` },
              ] as { label: string; value: string }[]).map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary-bg)', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
              <span style={{ background: typeBadge.bg, color: typeBadge.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', alignSelf: 'center' }}>
                {typeBadge.label}
              </span>
            </div>
            <a href={ap('/market')} style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>
              What this means →
            </a>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className="container" style={{ padding: '40px var(--container-padding) 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', margin: 0 }}>
            {total > 0 ? `${total} Luxury Homes` : 'Current Luxury Homes'}
          </h2>
          <a href={ap('/homes-for-sale?min_price=1500000')} style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            View all with filters →
          </a>
        </div>

        {listings.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '48px 32px', textAlign: 'center' }}>
            <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 16 }}>
              No luxury listings currently active. New properties come to market regularly.
            </p>
            <a href={ap('/contact')} style={{ display: 'inline-block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '12px 28px', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
              Get notified when luxury homes list
            </a>
          </div>
        ) : (
          <ListingStrip listings={listings} isLoggedIn={false} />
        )}

        {/* Agent CTA */}
        <div style={{ marginTop: 48, background: 'var(--primary-bg)', borderRadius: 12, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
              Looking for an off-market luxury property?
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6 }}>
              {isDual
                ? `${agentLabel} have access to exclusive pre-market opportunities and pocket listings across South Surrey & White Rock.`
                : `${agentLabel} has access to exclusive pre-market opportunities and pocket listings across South Surrey & White Rock.`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={`tel:${agent.phone}`} style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '12px 22px', borderRadius: 7, fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              📞 {agent.phone}
            </a>
            <a href={ap('/contact')} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 22px', borderRadius: 7, fontWeight: 600, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Private Inquiry
            </a>
          </div>
        </div>

        {/* Browse by Neighbourhood */}
        {neighbourhoods.length > 0 && (
          <div style={{ marginTop: 36 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--primary-bg)', marginBottom: 14 }}>Browse by Neighbourhood</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {neighbourhoods.slice(0, 6).map(n => (
                <a key={n.slug} href={ap(`/neighbourhood/${n.slug}`)}
                  style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', textDecoration: 'none', color: 'var(--text)', display: 'block' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{n.subarea || n.name}</div>
                  {n.active_count > 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{n.active_count} active listings</div>}
                </a>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <a href={ap('/market')} style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                What this means for buyers &amp; sellers →
              </a>
            </div>
          </div>
        )}

        {testimonials[0]?.text && (
          <blockquote style={{ marginTop: 28, background: 'var(--off-white)', borderLeft: '4px solid var(--accent)', padding: '16px 20px', borderRadius: '0 8px 8px 0' }}>
            <p style={{ fontSize: 15, fontStyle: 'italic', color: 'var(--text)', lineHeight: 1.75, margin: '0 0 10px' }}>"{testimonials[0].text}"</p>
            <cite style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', fontStyle: 'normal' }}>— {testimonials[0].name}</cite>
          </blockquote>
        )}
        {/* Internal links */}
        <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { l: 'All Homes', h: ap('/listings') },
            { l: 'Ocean View Homes', h: ap('/ocean-view-homes') },
            { l: 'South Surrey Homes', h: ap('/listings?subarea=South+Surrey') },
            { l: 'White Rock Homes', h: ap('/listings?subarea=White+Rock') },
            { l: 'Home Evaluation', h: ap('/home-evaluation') },
          ].map(x => (
            <a key={x.l} href={x.h} style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>{x.l}</a>
          ))}
        </div>
      </div>

      <PageQuickLinks slug={slug} exclude="/luxury" context="luxury" />
    </div>
  )
}
