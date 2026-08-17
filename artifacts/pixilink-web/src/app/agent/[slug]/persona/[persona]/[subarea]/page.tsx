import { playfair } from '@/lib/fonts'
import { getAgent, getPersonaListings, agentCanonicalBase } from '@/lib/api'
import { getPersona } from '@/lib/personas'
import ListingStrip from '@/components/ListingStrip'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string; persona: string; subarea: string }>
}

export const revalidate = 600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, persona: personaSlug, subarea: rawSubarea } = await params
  const persona = getPersona(personaSlug)
  if (!persona) return {}
  const subarea = decodeURIComponent(rawSubarea)
  const agent = await getAgent(slug)
  const agentName = agent?.name || 'our agent'
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/persona/${personaSlug}/${encodeURIComponent(subarea)}`
  const title = `${persona.label} Homes in ${subarea} | ${agentName}`
  const description = `Browse ${persona.label.toLowerCase()} homes for sale in ${subarea}. Live MLS® listings with ${agentName}.`

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

export default async function PersonaAreaPage({ params }: Props) {
  const { slug, persona: personaSlug, subarea: rawSubarea } = await params
  const persona = getPersona(personaSlug)
  if (!persona) notFound()
  const subarea = decodeURIComponent(rawSubarea)

  const ap = (p: string) => `/agent/${slug}${p}`

  const [agent, { listings, total }] = await Promise.all([
    getAgent(slug),
    getPersonaListings(slug, personaSlug, subarea),
  ])
  if (!agent) notFound()
  requireNotShowcase(agent)
  // A subarea page with no matching inventory shouldn't exist as a live URL.
  if (total === 0) notFound()

  const firstName = agent.name.split(' ')[0]
  const domain = agentCanonicalBase(agent)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `https://${domain}/` },
      { '@type': 'ListItem', position: 2, name: persona.label, item: `https://${domain}/persona/${personaSlug}` },
      { '@type': 'ListItem', position: 3, name: subarea, item: `https://${domain}/persona/${personaSlug}/${encodeURIComponent(subarea)}` },
    ],
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <nav aria-label="breadcrumb" style={{ fontSize: 12, color: '#aaa', marginBottom: 14 }}>
            <a href={ap('/')} style={{ color: '#aaa', textDecoration: 'none' }}>Home</a>
            <span style={{ margin: '0 6px' }}>›</span>
            <a href={ap(`/persona/${personaSlug}`)} style={{ color: '#aaa', textDecoration: 'none' }}>{persona.label}</a>
            <span style={{ margin: '0 6px' }}>›</span>
            <span>{subarea}</span>
          </nav>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>
            {persona.eyebrow} · {subarea}
          </div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(28px,4.5vw,52px)', fontWeight: 400, lineHeight: 1.15, maxWidth: 680, color: '#1a1a1a', margin: 0 }}>
            {persona.label} Homes in {subarea}
          </h1>
          <p style={{ fontSize: 15, color: '#555', maxWidth: 640, lineHeight: 1.75, marginTop: 14, marginBottom: 0 }}>
            {total} matching {total === 1 ? 'listing' : 'listings'} currently active in {subarea}. {persona.description}
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '40px var(--container-padding) 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', margin: 0 }}>
            {total} Home{total !== 1 ? 's' : ''} in {subarea}
          </h2>
          <a href={ap(`/persona/${personaSlug}`)} style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            All {persona.label} areas →
          </a>
        </div>

        <ListingStrip listings={listings} isLoggedIn={false} />

        <div style={{ marginTop: 48, background: 'var(--primary-bg)', borderRadius: 12, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
              Want to see these in person?
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6 }}>
              {firstName} knows {subarea} well and can help you tour these properties.
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
      </div>
    </div>
  )
}
