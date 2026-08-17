import { playfair } from '@/lib/fonts'
import { getAgent, getPersonaListings, agentCanonicalBase } from '@/lib/api'
import { getCoAgents } from '@/lib/types'
import { getPersona } from '@/lib/personas'
import ListingStrip from '@/components/ListingStrip'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string; persona: string }>
}

// NOTE: no generateStaticParams here — the parent AgentLayout always calls
// cookies()/headers(), which forces this whole subtree to dynamic rendering.
// Attempting to prerender via generateStaticParams conflicts with that and
// throws DYNAMIC_SERVER_USAGE at build time. Sibling hub pages (houses-for-sale,
// homes-for-sale, etc.) follow the same pattern: revalidate for ISR caching,
// rendered on-demand per request, no static params.
export const revalidate = 600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, persona: personaSlug } = await params
  const persona = getPersona(personaSlug)
  if (!persona) return {}
  const agent = await getAgent(slug)
  const coAgents = agent ? getCoAgents(agent) : []
  const isDual = coAgents.length > 0
  const agentName = isDual
    ? `${agent!.name.split(' ')[0]} & ${coAgents[0].name.split(' ')[0]}`
    : (agent?.name || 'our agent')
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/persona/${personaSlug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: persona.metaTitle,
    description: persona.metaDesc,
    url: canonical,
    provider: {
      '@type': 'RealEstateAgent',
      name: agentName,
      telephone: agent?.phone,
      url: `https://${domain}`,
    },
  }

  return {
    title: persona.metaTitle,
    description: persona.metaDesc,
    alternates: { canonical },
    openGraph: { title: persona.metaTitle, description: persona.metaDesc, type: 'website', url: canonical, siteName: agentName },
    twitter: { card: 'summary_large_image', title: persona.metaTitle, description: persona.metaDesc },
    other: { 'script:ld+json': JSON.stringify(jsonLd) },
  }
}

export default async function PersonaHubPage({ params }: Props) {
  const { slug, persona: personaSlug } = await params
  const persona = getPersona(personaSlug)
  if (!persona) notFound()

  const ap = (p: string) => `/agent/${slug}${p}`

  const [agent, { listings, areas, total }] = await Promise.all([
    getAgent(slug),
    getPersonaListings(slug, personaSlug),
  ])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const coAgents = getCoAgents(agent)
  const isDual = coAgents.length > 0
  const firstName = agent.name.split(' ')[0]
  const agentLabel = isDual
    ? `${firstName} & ${coAgents[0].name.split(' ')[0]}`
    : firstName
  const domain = agentCanonicalBase(agent)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `https://${domain}/` },
      { '@type': 'ListItem', position: 2, name: persona.label, item: `https://${domain}/persona/${personaSlug}` },
    ],
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Hero */}
      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <nav aria-label="breadcrumb" style={{ fontSize: 12, color: '#aaa', marginBottom: 14 }}>
            <a href={ap('/')} style={{ color: '#aaa', textDecoration: 'none' }}>Home</a>
            <span style={{ margin: '0 6px' }}>›</span>
            <span>{persona.label}</span>
          </nav>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>
            {persona.eyebrow}
          </div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(28px,4.5vw,52px)', fontWeight: 400, lineHeight: 1.15, maxWidth: 680, color: '#1a1a1a', margin: 0 }}>
            {persona.h1}
          </h1>
          <p style={{ fontSize: 15, color: '#555', maxWidth: 640, lineHeight: 1.75, marginTop: 14, marginBottom: 0 }}>
            {total > 0 ? `${total} matching ${total === 1 ? 'listing' : 'listings'} currently active. ${persona.description}` : persona.description}
          </p>
        </div>
      </div>

      {/* Intro / highlight cards */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ padding: '40px var(--container-padding)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 28 }}>
            {persona.highlights.map(card => (
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
            {total > 0 ? `${total} ${persona.label} Homes` : `Current ${persona.label} Homes`}
          </h2>
          <a href={ap('/homes-for-sale')} style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            View all homes →
          </a>
        </div>

        {listings.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '48px 32px', textAlign: 'center' }}>
            <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 16 }}>
              No {persona.label.toLowerCase()} listings currently active. New properties come to market regularly.
            </p>
            <a href={ap('/contact')} style={{ display: 'inline-block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '12px 28px', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
              Get notified when new listings match
            </a>
          </div>
        ) : (
          <ListingStrip listings={listings} isLoggedIn={false} />
        )}

        {/* Agent CTA */}
        <div style={{ marginTop: 48, background: 'var(--primary-bg)', borderRadius: 12, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
              Looking for a home like this?
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6 }}>
              {isDual
                ? `${agentLabel} can set up alerts and share off-market opportunities matching your criteria.`
                : `${agentLabel} can set up alerts and share off-market opportunities matching your criteria.`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={`tel:${agent.phone}`} style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '12px 22px', borderRadius: 7, fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              📞 {agent.phone}
            </a>
            <a href={ap('/contact')} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 22px', borderRadius: 7, fontWeight: 600, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Get in Touch
            </a>
          </div>
        </div>

        {/* Browse by area */}
        {areas.length > 0 && (
          <div style={{ marginTop: 36 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--primary-bg)', marginBottom: 14 }}>Browse by Area</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
              {areas.map(a => (
                <a key={a.subarea} href={ap(`/persona/${personaSlug}/${encodeURIComponent(a.subarea)}`)}
                  style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', textDecoration: 'none', color: 'var(--text)', display: 'block' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.subarea}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{a.count} home{a.count !== 1 ? 's' : ''}</div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
