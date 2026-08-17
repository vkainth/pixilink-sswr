import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getNews, getNeighbourhoods, resolveAgentPrefix, getAgentTerritories, agentAreaDisplay } from '@/lib/api'
import { formatDate } from '@/lib/types'
import ContactSidebarForm from '@/components/ContactSidebarForm'
import { notFound } from 'next/navigation'
import { requireNotShowcase } from '@/lib/showcase'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string; category?: string }>
}

export const revalidate = 300

const PAGE_SIZE = 9

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const [agent, territories] = await Promise.all([
    getAgent(slug),
    getAgentTerritories(slug).catch(() => []),
  ])
  const shortArea = agentAreaDisplay(territories)
  const title = `News & Market Updates — ${agent?.name || 'Your Agent'}`
  const description = `Local real estate news, market updates and neighbourhood insights for ${shortArea} from ${agent?.name || 'your local agent'}.`
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function NewsPage({ params, searchParams }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const sp = await searchParams
  const page = sp.page ? Math.max(1, parseInt(sp.page)) : 1

  const [agent, { posts, total }, neighbourhoods, territories] = await Promise.all([
    getAgent(slug),
    getNews(slug, page, PAGE_SIZE),
    getNeighbourhoods(slug),
    getAgentTerritories(slug).catch(() => []),
  ])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const shortArea = agentAreaDisplay(territories)
  const firstName = agent.name.split(' ')[0]
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const topNeighbourhoods = neighbourhoods.slice(0, 6)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${agent.name} — Real Estate News & Insights`,
    description: `Real estate news, market updates and buying/selling tips from ${agent.name}. ${shortArea}.`,
    author: { '@type': 'RealEstateAgent', name: agent.name },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: ap('/') },
      { '@type': 'ListItem', position: 2, name: 'News & Updates', item: ap('/news') },
    ],
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {/* Hero */}
      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
            <a href={ap('/')} style={{ color: '#888', textDecoration: 'none' }}>Home</a>
            <span style={{ margin: '0 8px' }}>›</span>
            <span>News &amp; Updates</span>
          </div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>News &amp; Updates</div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(26px,3.8vw,44px)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', marginBottom: 10, marginTop: 0 }}>
            Local Market News &amp; Insights
          </h1>
          <p style={{ color: '#555', fontSize: 15, maxWidth: 580, lineHeight: 1.7, margin: 0 }}>
            {firstName}&apos;s take on what is happening in the {shortArea} real estate market.
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '40px var(--container-padding) 72px' }}>
        <div className="news-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 48, alignItems: 'start' }}>
          {/* Posts */}
          <div>
            {posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 24px', background: '#fff', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>📰</div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 8 }}>No Articles Yet</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 340, margin: '0 auto' }}>
                  Market updates and neighbourhood insights coming soon from {firstName}.
                </p>
              </div>
            ) : (
              <>
                {/* Featured first post */}
                {page === 1 && posts[0] && (
                  <a href={ap(`/news/${posts[0].slug}`)} style={{ display: 'block', textDecoration: 'none', marginBottom: 28 }}>
                    <article style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      {posts[0].photo_url && (
                        <img src={posts[0].photo_url} alt={posts[0].title} style={{ width: '100%', aspectRatio: '16/7', objectFit: 'cover', display: 'block' }} />
                      )}
                      <div style={{ padding: '24px 28px' }}>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                          {posts[0].category && (
                            <span style={{ background: 'var(--accent)', color: 'var(--primary-bg)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {posts[0].category}
                            </span>
                          )}
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(posts[0].published_at)}</span>
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 10px', lineHeight: 1.3 }}>{posts[0].title}</h2>
                        {posts[0].excerpt && (
                          <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.75, margin: 0 }}>{posts[0].excerpt}</p>
                        )}
                        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>Read more →</div>
                      </div>
                    </article>
                  </a>
                )}

                {/* Remaining posts grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 18 }}>
                  {posts.slice(page === 1 ? 1 : 0).map(post => (
                    <a key={post.id} href={ap(`/news/${post.slug}`)} style={{ textDecoration: 'none' }}>
                      <article style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {post.photo_url && (
                          <img src={post.photo_url} alt={post.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                        )}
                        <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                          {post.category && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{post.category}</span>
                          )}
                          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-bg)', margin: '0 0 8px', lineHeight: 1.4, flex: 1 }}>{post.title}</h3>
                          {post.excerpt && (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {post.excerpt}
                            </p>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(post.published_at)}</div>
                        </div>
                      </article>
                    </a>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 36 }}>
                    {page > 1 && (
                      <a href={`?page=${page - 1}`} style={{ padding: '10px 22px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff', textDecoration: 'none', color: 'var(--text)' }}>← Previous</a>
                    )}
                    {page < totalPages && (
                      <a href={`?page=${page + 1}`} style={{ padding: '10px 22px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff', textDecoration: 'none', color: 'var(--text)' }}>Next →</a>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 12 }}>Quick Links</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { l: 'Market Report', h: ap('/market-report') },
                  { l: 'Homes For Sale', h: ap('/homes-for-sale') },
                  { l: 'Sold Homes', h: ap('/sold') },
                  { l: 'Price Matrix', h: ap('/price-matrix') },
                  { l: 'Neighbourhood Guides', h: ap('/neighbourhoods') },
                ].map(x => (
                  <a key={x.l} href={x.h} style={{ fontSize: 13, color: 'var(--text)', textDecoration: 'none', padding: '6px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{x.l}</span><span style={{ color: 'var(--accent)' }}>→</span>
                  </a>
                ))}
              </div>
            </div>
            {topNeighbourhoods.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 12 }}>Browse by Neighbourhood</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {topNeighbourhoods.map(n => (
                    <a key={n.slug} href={ap(`/neighbourhood/${n.slug}`)} style={{ fontSize: 13, color: 'var(--text)', textDecoration: 'none', padding: '6px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{n.name}</span><span style={{ color: 'var(--accent)' }}>→</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            <ContactSidebarForm agent={agent} mode="contact" />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .news-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
