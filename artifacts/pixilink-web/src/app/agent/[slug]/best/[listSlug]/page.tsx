import { headers } from 'next/headers'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getAgent, getBestOfList, regionSlugForAgent, resolveAgentPrefix } from '@/lib/api'
import PageQuickLinks from '@/components/PageQuickLinks'

interface Props {
  params: Promise<{ slug: string; listSlug: string }>
}

export const revalidate = 1800

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, listSlug } = await params
  const [agent, list] = await Promise.all([getAgent(slug), getBestOfList(slug, listSlug)])
  if (!agent || !list || list.status !== 'published') return {}

  const title = list.meta_title || `${list.title} | ${agent.name}`
  const description = list.meta_description || list.intro.slice(0, 155)
  const regionSlug = regionSlugForAgent(slug)
  const path = regionSlug ? `/${regionSlug}/best/${listSlug}` : `/agent/${slug}/best/${listSlug}`
  const canonical = agent.settings?.custom_domain
    ? `https://${agent.settings.custom_domain}/best/${listSlug}`
    : `https://website.pixilink.com${path}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: 'article' },
  }
}

export default async function BestOfListPage({ params }: Props) {
  const { slug, listSlug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const [agent, list] = await Promise.all([getAgent(slug), getBestOfList(slug, listSlug)])
  if (!agent || !list || list.status !== 'published') notFound()
  requireNotShowcase(agent)

  const siteUrl = agent.settings?.custom_domain ? `https://${agent.settings.custom_domain}` : ''

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'Best Of', item: `${siteUrl}/best` },
          { '@type': 'ListItem', position: 3, name: list.title, item: `${siteUrl}/best/${list.slug}` },
        ],
      },
      {
        '@type': 'ItemList',
        name: list.title,
        description: list.intro,
        itemListElement: list.items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.label,
          ...(item.type === 'building'
            ? { url: `${siteUrl}${ap(`/building/${item.slug}`)}` }
            : { url: `${siteUrl}${ap(`/neighbourhood/${item.slug}`)}` }),
        })),
      },
    ],
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ background: '#fff', padding: '40px 0 32px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <nav aria-label="breadcrumb" style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
            <a href={ap('/')} style={{ color: '#888', textDecoration: 'none' }}>Home</a>
            <span style={{ margin: '0 6px' }}>›</span>
            <a href={ap('/best')} style={{ color: '#888', textDecoration: 'none' }}>Best Of</a>
            <span style={{ margin: '0 6px' }}>›</span>
            <span>{list.title}</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(26px,3.6vw,40px)', fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 16px', lineHeight: 1.15 }}>
            {list.title}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', maxWidth: 760, lineHeight: 1.8, margin: 0 }}>
            {list.intro}
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '48px var(--container-padding) 64px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {list.items.map((item, i) => {
            const href = item.type === 'building' ? ap(`/building/${item.slug}`) : ap(`/neighbourhood/${item.slug}`)
            return (
              <a key={item.slug} href={href} style={{
                background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
                padding: '24px 26px', textDecoration: 'none', display: 'flex', gap: 20, alignItems: 'flex-start',
              }}>
                <div style={{
                  flexShrink: 0, width: 44, height: 44, borderRadius: '50%', background: 'var(--primary-bg)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 800,
                }}>
                  {i + 1}
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary-bg)', margin: '0 0 8px' }}>
                    {item.label}
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
                    {item.blurb}
                  </p>
                </div>
                <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: 18, flexShrink: 0 }}>→</span>
              </a>
            )
          })}
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '28px 26px', textAlign: 'center', marginTop: 40 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 8 }}>
            Want a personal walkthrough of these options?
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 18 }}>
            {agent.name} can help you tour, compare and shortlist the right fit for your budget and lifestyle.
          </p>
          <a href={ap('/contact')} className="btn-primary" style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Talk to {agent.name.split(' ')[0]}
          </a>
        </div>
      </div>

      <PageQuickLinks slug={slug} />
    </div>
  )
}
