import { headers } from 'next/headers'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getAgent, getAreaComparison, regionSlugForAgent, resolveAgentPrefix } from '@/lib/api'
import PageQuickLinks from '@/components/PageQuickLinks'

interface Props {
  params: Promise<{ slug: string; comparisonSlug: string }>
}

export const revalidate = 1800

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, comparisonSlug } = await params
  const [agent, comparison] = await Promise.all([getAgent(slug), getAreaComparison(slug, comparisonSlug)])
  if (!agent || !comparison || comparison.status !== 'published') return {}

  const title = comparison.meta_title || `${comparison.title} | ${agent.name}`
  const description = comparison.meta_description || comparison.intro.slice(0, 155)
  const regionSlug = regionSlugForAgent(slug)
  const path = regionSlug ? `/${regionSlug}/compare/${comparisonSlug}` : `/agent/${slug}/compare/${comparisonSlug}`
  const canonical = agent.settings?.custom_domain
    ? `https://${agent.settings.custom_domain}/compare/${comparisonSlug}`
    : `https://website.pixilink.com${path}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: 'article' },
  }
}

export default async function AreaComparisonPage({ params }: Props) {
  const { slug, comparisonSlug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const [agent, comparison] = await Promise.all([getAgent(slug), getAreaComparison(slug, comparisonSlug)])
  if (!agent || !comparison || comparison.status !== 'published') notFound()
  requireNotShowcase(agent)

  const siteUrl = agent.settings?.custom_domain ? `https://${agent.settings.custom_domain}` : ''

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'Area Comparisons', item: `${siteUrl}/compare` },
          { '@type': 'ListItem', position: 3, name: comparison.title, item: `${siteUrl}/compare/${comparison.slug}` },
        ],
      },
      {
        '@type': 'Article',
        headline: comparison.title,
        description: comparison.intro,
        author: { '@type': 'Person', name: agent.name },
        publisher: { '@type': 'Organization', name: agent.brokerage },
        datePublished: comparison.created_at,
        dateModified: comparison.updated_at,
      },
    ],
  }

  const sides = [
    { label: comparison.area_a_label, subarea: comparison.area_a_subarea_slug, buyerProfile: comparison.area_a_buyer_profile, pros: comparison.area_a_pros, cons: comparison.area_a_cons },
    { label: comparison.area_b_label, subarea: comparison.area_b_subarea_slug, buyerProfile: comparison.area_b_buyer_profile, pros: comparison.area_b_pros, cons: comparison.area_b_cons },
  ]

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ background: '#fff', padding: '40px 0 32px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <nav aria-label="breadcrumb" style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
            <a href={ap('/')} style={{ color: '#888', textDecoration: 'none' }}>Home</a>
            <span style={{ margin: '0 6px' }}>›</span>
            <a href={ap('/compare')} style={{ color: '#888', textDecoration: 'none' }}>Area Comparisons</a>
            <span style={{ margin: '0 6px' }}>›</span>
            <span>{comparison.area_a_label} vs {comparison.area_b_label}</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(26px,3.6vw,40px)', fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 16px', lineHeight: 1.15 }}>
            {comparison.title}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', maxWidth: 760, lineHeight: 1.8, margin: 0 }}>
            {comparison.intro}
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '48px var(--container-padding) 64px' }}>
        <div className="compare-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 48 }}>
          {sides.map(side => (
            <div key={side.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '28px 26px' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 12px' }}>{side.label}</h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20 }}>
                <strong style={{ color: 'var(--text)' }}>Best for:</strong> {side.buyerProfile}
              </p>

              {side.pros.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Pros</div>
                  <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {side.pros.map((p, i) => (
                      <li key={i} style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {side.cons.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Cons</div>
                  <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {side.cons.map((c, i) => (
                      <li key={i} style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              <a href={ap(`/neighbourhood/${side.subarea}`)} style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>
                See {side.label} market data →
              </a>
            </div>
          ))}
        </div>

        {comparison.verdict && (
          <div style={{ background: 'var(--primary-bg)', borderRadius: 12, padding: '32px 30px', marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              The Verdict
            </div>
            <p style={{ fontSize: 16, color: '#fff', lineHeight: 1.8, margin: 0 }}>{comparison.verdict}</p>
          </div>
        )}

        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '28px 26px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 8 }}>
            Still not sure which area is right for you?
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 18 }}>
            {agent.name} can walk you through both neighbourhoods and help you decide based on your priorities and budget.
          </p>
          <a href={ap('/contact')} className="btn-primary" style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Talk to {agent.name.split(' ')[0]}
          </a>
        </div>
      </div>

      <PageQuickLinks slug={slug} />
      <style>{`
        @media (max-width: 800px) {
          .compare-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
