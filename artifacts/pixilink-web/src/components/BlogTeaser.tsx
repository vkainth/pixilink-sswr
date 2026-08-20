import type { NewsPost } from '@/lib/types'
import { imgUrl } from '@/lib/types'

interface Props {
  posts: NewsPost[]
  agentPrefix: string
}

function formatPostDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function BlogTeaser({ posts, agentPrefix }: Props) {
  if (!posts.length) return null

  return (
    <section style={{ padding: '72px 0', background: 'var(--off-white)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8, fontWeight: 700 }}>
              Latest News
            </div>
            <h2 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(22px,2.8vw,34px)', fontWeight: 700, margin: 0, color: 'var(--primary-bg)' }}>
              Market Insights & News
            </h2>
          </div>
          <a href={`${agentPrefix}/news`} style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-bg)', textDecoration: 'none', borderBottom: '2px solid var(--accent)', paddingBottom: 2, whiteSpace: 'nowrap' }}>
            All Articles →
          </a>
        </div>
        <div className="blog-teaser-grid">
          {posts.map(post => {
            const photo = post.photo_url ? imgUrl(post.photo_url, 600) : null
            return (
              <a
                key={post.id}
                href={`${agentPrefix}/news/${post.slug}`}
                style={{ display: 'block', textDecoration: 'none', background: '#fff', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s' }}
                className="blog-teaser-card"
              >
                {photo && (
                  <div style={{ height: 180, overflow: 'hidden', background: '#f3f4f6' }}>
                    <img src={photo} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }} className="blog-teaser-img" />
                  </div>
                )}
                <div style={{ padding: '20px 22px' }}>
                  {post.category && (
                    <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: 8 }}>
                      {post.category}
                    </div>
                  )}
                  <h3 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 17, fontWeight: 700, color: 'var(--primary-bg)', margin: '0 0 8px', lineHeight: 1.3 }}>
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 12px' }}>
                      {post.excerpt.slice(0, 120)}{post.excerpt.length > 120 ? '…' : ''}
                    </p>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {formatPostDate(post.published_at)}
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      </div>
      <style>{`
        .blog-teaser-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .blog-teaser-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.10) !important; }
        .blog-teaser-card:hover .blog-teaser-img { transform: scale(1.03); }
        @media (max-width: 900px) { .blog-teaser-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 560px) { .blog-teaser-grid { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  )
}
