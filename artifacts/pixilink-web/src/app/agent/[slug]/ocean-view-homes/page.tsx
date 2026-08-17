import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getListings, getAgentTerritories, agentCanonicalBase, resolveAgentPrefix } from '@/lib/api'
import ListingStrip from '@/components/ListingStrip'
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
  const agentName = agent?.name || 'Randy Dyck'
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/ocean-view-homes`
  const title = `Ocean View Homes for Sale in South Surrey & White Rock | ${agentName}`
  const description = `Browse ocean view and waterfront homes for sale in White Rock & South Surrey. Stunning Semiahmoo Bay views, beachfront condos, and seaside detached homes. Live MLS® listings with ${agentName}.`

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

export default async function OceanViewHomesPage({ params }: Props) {
  const { slug } = await params
  if (slug !== 'randy') notFound()
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const [agent, { listings: viewListings, total: viewTotal }, { listings: whiteRockListings, total: wrTotal }, territories] = await Promise.all([
    getAgent(slug),
    getListings(slug, { status: 'Active', subarea: 'White Rock', limit: 12 }),
    getListings(slug, { status: 'Active', subarea: 'Ocean Park', limit: 12 }),
    getAgentTerritories(slug),
  ])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const firstName = agent.name.split(' ')[0]
  const domain = agentCanonicalBase(agent)

  const allListings = [...viewListings, ...whiteRockListings].slice(0, 24)
  const total = viewTotal + wrTotal

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `https://${domain}/` },
      { '@type': 'ListItem', position: 2, name: 'Ocean View Homes', item: `https://${domain}/ocean-view-homes` },
    ],
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Hero */}
      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid var(--border)', borderRadius: 24, padding: 3, marginBottom: 22 }}>
            <a href={ap('/luxury-homes')} style={{ padding: '7px 20px', fontWeight: 500, fontSize: 13, background: 'transparent', color: '#555', borderRadius: 20, textDecoration: 'none', display: 'inline-block' }}>Luxury Homes</a>
            <a href={ap('/ocean-view-homes')} style={{ padding: '7px 20px', fontWeight: 700, fontSize: 13, background: '#1a1a1a', color: '#fff', borderRadius: 20, textDecoration: 'none', display: 'inline-block' }}>Ocean View</a>
          </div>
          <nav aria-label="breadcrumb" style={{ fontSize: 12, color: '#aaa', marginBottom: 14 }}>
            <a href={ap('/')} style={{ color: '#aaa', textDecoration: 'none' }}>Home</a>
            <span style={{ margin: '0 6px' }}>›</span>
            <span>Ocean View Homes</span>
          </nav>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>
            Waterfront &amp; Ocean View
          </div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(28px,4.5vw,52px)', fontWeight: 400, lineHeight: 1.15, maxWidth: 700, color: '#1a1a1a', margin: 0 }}>
            Ocean View Homes for Sale in South Surrey &amp; White Rock
          </h1>
          <p style={{ fontSize: 15, color: '#555', maxWidth: 600, lineHeight: 1.75, marginTop: 14, marginBottom: 0 }}>
            White Rock sits on Semiahmoo Bay — one of the Lower Mainland&apos;s most coveted waterfronts.
            Browse ocean view condos, Marine Drive estates, and beachfront homes currently listed on MLS®.
          </p>
        </div>
      </div>

      {/* About White Rock waterfront */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ padding: '40px var(--container-padding)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 28 }}>
            {[
              {
                title: 'Marine Drive Waterfront',
                body: 'Direct ocean-access homes and condos on Marine Drive — some of BC\'s most coveted addresses. Year-round beach walks, restaurants, and the iconic White Rock Pier steps away.',
              },
              {
                title: 'Ocean View Condos',
                body: 'High-rise and mid-rise condos with Semiahmoo Bay panoramas. Many buildings offer heated pools, concierge, and visitor parking. Ideal for downsizers and retirees.',
              },
              {
                title: 'Ocean Park & Crescent Beach',
                body: 'Quiet seaside enclaves south of White Rock with large lots, beach access lanes, and a village atmosphere. Detached homes from $1.2M.',
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

      {/* Listings */}
      <div className="container" style={{ padding: '40px var(--container-padding) 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', margin: 0 }}>
            White Rock &amp; Ocean Park — Homes For Sale
          </h2>
          <a href={ap('/homes-for-sale?subarea=White+Rock')} style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            View all with filters →
          </a>
        </div>

        {allListings.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '48px 32px', textAlign: 'center' }}>
            <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 16 }}>
              No homes found in this area right now. Check back soon or contact {firstName} for pre-market opportunities.
            </p>
            <a href={ap('/contact')} style={{ display: 'inline-block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '12px 28px', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
              Get notified of new ocean view listings
            </a>
          </div>
        ) : (
          <ListingStrip listings={allListings} isLoggedIn={false} />
        )}

        {/* Agent CTA */}
        <div style={{ marginTop: 48, background: 'var(--primary-bg)', borderRadius: 12, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
              Waterfront &amp; ocean view specialist
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6 }}>
              {firstName} knows White Rock&apos;s waterfront market inside out — which buildings have unobstructed views, which have been redone, and what&apos;s coming to market before it lists.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={`tel:${agent.phone}`} style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '12px 22px', borderRadius: 7, fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              📞 {agent.phone}
            </a>
            <a href={ap('/contact')} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 22px', borderRadius: 7, fontWeight: 600, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Book a Showing
            </a>
          </div>
        </div>

        {/* Internal links */}
        <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { l: 'All White Rock Homes', h: ap('/listings?subarea=White+Rock') },
            { l: 'Luxury Homes', h: ap('/luxury-homes') },
            { l: 'Condos for Sale', h: ap('/listings?type=Apartment') },
            { l: 'Neighbourhood Guide', h: ap('/neighbourhood/white-rock') },
            { l: 'Market Report', h: ap('/market') },
          ].map(x => (
            <a key={x.l} href={x.h} style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>{x.l}</a>
          ))}
        </div>
      </div>
    </div>
  )
}
