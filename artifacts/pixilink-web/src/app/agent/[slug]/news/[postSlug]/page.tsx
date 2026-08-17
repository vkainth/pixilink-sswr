import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getNewsPost, getNews, getNeighbourhoods, agentCanonicalBase, resolveAgentPrefix, getAgentTerritories, agentAreaDisplay } from '@/lib/api'
import { formatDate, imgUrl } from '@/lib/types'
import type { NeighbourhoodSummary } from '@/lib/types'
import ContactSidebarForm from '@/components/ContactSidebarForm'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string; postSlug: string }>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, postSlug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const post = await getNewsPost(slug, postSlug)
  if (!post) return { title: 'Article Not Found' }
  return {
    title: post.title,
    description: post.excerpt || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      images: post.photo_url ? [{ url: post.photo_url }] : undefined,
      type: 'article',
    },
  }
}

function findRelatedNeighbourhoods(
  neighbourhoods: NeighbourhoodSummary[],
  title: string,
  excerpt: string | null,
  category: string | null,
  tags: string[],
): NeighbourhoodSummary[] {
  const haystack = [title, excerpt ?? '', category ?? '', ...tags].join(' ').toLowerCase()
  return neighbourhoods
    .filter(n => haystack.includes(n.name.toLowerCase()))
    .slice(0, 3)
}

export default async function NewsPostPage({ params }: Props) {
  const { slug, postSlug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const [agent, post, { posts: relatedPosts }, neighbourhoods, territories] = await Promise.all([
    getAgent(slug),
    getNewsPost(slug, postSlug),
    getNews(slug, 1, 4),
    getNeighbourhoods(slug),
    getAgentTerritories(slug).catch(() => []),
  ])
  if (!agent || !post) notFound()
  requireNotShowcase(agent)

  const shortArea = agentAreaDisplay(territories)
  const firstName = agent.name.split(' ')[0]
  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 400) : null
  const related = relatedPosts.filter(p => p.slug !== post.slug).slice(0, 3)
  const relatedNeighbourhoods = findRelatedNeighbourhoods(neighbourhoods, post.title, post.excerpt, post.category, post.tags)
  const domain = agentCanonicalBase(agent)
  const canonicalUrl = `https://${domain}/news/${post.slug}`

  const paragraphs = post.body
    ? post.body.split('\n\n').filter(Boolean)
    : post.excerpt
      ? [post.excerpt]
      : []

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.title,
    datePublished: post.published_at,
    image: post.photo_url ? [post.photo_url] : undefined,
    author: { '@type': 'Person', name: agent.name },
    mainEntityOfPage: canonicalUrl,
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: ap('/') },
      { '@type': 'ListItem', position: 2, name: 'News & Updates', item: ap('/news') },
      { '@type': 'ListItem', position: 3, name: post.title, item: ap(`/news/${post.slug}`) },
    ],
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {/* Hero */}
      <div style={{ background: '#fff', padding: '48px 0 32px', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
            <a href={ap('/')} style={{ color: '#888', textDecoration: 'none' }}>Home</a>
            <span style={{ margin: '0 8px' }}>›</span>
            <a href={ap('/news')} style={{ color: '#888', textDecoration: 'none' }}>News &amp; Updates</a>
            {post.category && (
              <>{' › '}<span>{post.category}</span></>
            )}
          </div>
          {post.category && (
            <div style={{ marginBottom: 12 }}>
              <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {post.category}
              </span>
            </div>
          )}
          <h1 className={playfair.className} style={{ fontSize: 'clamp(24px,4vw,44px)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', marginBottom: 16, marginTop: 0 }}>
            {post.title}
          </h1>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', paddingBottom: 8, flexWrap: 'wrap' }}>
            {photoSrc && (
              <img src={photoSrc} alt={agent.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '2px solid var(--accent)' }} />
            )}
            <span style={{ fontSize: 13, color: '#555' }}>{agent.name}</span>
            <span style={{ fontSize: 13, color: '#ccc' }}>·</span>
            <span style={{ fontSize: 13, color: '#888' }}>{formatDate(post.published_at)}</span>
            {post.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {post.tags.map(t => (
                  <span key={t} style={{ fontSize: 11, background: 'var(--off-white)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', color: '#555' }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero image */}
      {post.photo_url && (
        <div style={{ width: '100%', maxHeight: 480, overflow: 'hidden' }}>
          <img src={post.photo_url} alt={post.title} style={{ width: '100%', objectFit: 'cover', maxHeight: 480, display: 'block' }} />
        </div>
      )}

      <div className="container" style={{ padding: '48px var(--container-padding) 72px', maxWidth: 1080 }}>
        <div className="post-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 56, alignItems: 'start' }}>
          {/* Article */}
          <article>
            {paragraphs.length > 0 ? (
              paragraphs.map((p, i) => {
                if (p.startsWith('## ')) {
                  return <h2 key={i} style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', margin: '32px 0 14px', lineHeight: 1.3 }}>{p.slice(3)}</h2>
                }
                if (p.startsWith('### ')) {
                  return <h3 key={i} style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary-bg)', margin: '24px 0 10px' }}>{p.slice(4)}</h3>
                }
                return <p key={i} style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--text)', marginBottom: 20 }}>{p}</p>
              })
            ) : (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Full article content coming soon.</p>
            )}

            {/* Author bio footer */}
            <div style={{ marginTop: 48, background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px', display: 'flex', gap: 18, alignItems: 'flex-start' }}>
              {photoSrc && (
                <img src={photoSrc} alt={agent.name} style={{ width: 60, height: 72, objectFit: 'cover', objectPosition: 'top', borderRadius: 8, border: '2px solid var(--accent)', flexShrink: 0 }} />
              )}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>About the Author</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 2 }}>{agent.name}</div>
                <div style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 8 }}>{agent.brokerage}</div>
                <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, margin: 0 }}>
                  {firstName} is a REALTOR® serving {shortArea} with deep local market expertise. Questions about the market? {firstName} picks up the phone.
                </p>
              </div>
            </div>

            {/* Related articles */}
            {related.length > 0 && (
              <section style={{ marginTop: 48 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 20 }}>More Articles</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
                  {related.map(rp => (
                    <a key={rp.id} href={ap(`/news/${rp.slug}`)} style={{ textDecoration: 'none', background: '#fff', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                      {rp.photo_url && <img src={rp.photo_url} alt={rp.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />}
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-bg)', lineHeight: 1.4 }}>{rp.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{formatDate(rp.published_at)}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </article>

          {/* Sidebar */}
          <aside>
            <div style={{ position: 'sticky', top: 'calc(var(--nav-height,64px) + 16px)' }}>
              <div style={{ background: 'rgba(var(--accent-rgb),0.10)', border: '1px solid var(--accent)', borderRadius: 10, padding: '16px 18px', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 4 }}>Questions about the market?</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                  {firstName} is happy to talk through what any of this means for your situation.
                </div>
              </div>
              <ContactSidebarForm agent={agent} mode="contact" />

              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>More from {firstName}</div>
                {[
                  { l: 'Market Report', h: ap('/market-report') },
                  { l: 'All News', h: ap('/news') },
                  { l: 'Price Matrix', h: ap('/price-matrix') },
                  { l: 'Homes For Sale', h: ap('/homes-for-sale') },
                ].map(x => (
                  <a key={x.l} href={x.h} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text)', textDecoration: 'none', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <span>{x.l}</span><span style={{ color: 'var(--accent)' }}>→</span>
                  </a>
                ))}
              </div>

              {relatedNeighbourhoods.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Related Neighbourhoods</div>
                  {relatedNeighbourhoods.map(n => (
                    <a key={n.slug} href={ap(`/neighbourhood/${n.slug}`)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text)', textDecoration: 'none', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>{n.name}</span><span style={{ color: 'var(--accent)' }}>→</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .post-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
