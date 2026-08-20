import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getListings, resolveAgentPrefix } from '@/lib/api'
import { getAiPage, getAiPages } from '@/lib/ai-pages-api'
import { toHomesForSaleHref } from '../../homes-for-sale/subareaUtils'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ContactSidebarForm from '@/components/ContactSidebarForm'
import ListingStrip from '@/components/ListingStrip'


interface Props {
  params: Promise<{ slug: string; pageSlug: string }>
}

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, pageSlug } = await params
  const [agent, page] = await Promise.all([getAgent(slug), getAiPage(slug, pageSlug)])
  if (!page) return { title: 'Guide' }
  const agentName = agent?.name || 'Your Local Agent'
  return {
    title: `${page.title} | ${agentName}`,
    description: page.meta_description || undefined,
    openGraph: { title: page.title, description: page.meta_description || undefined },
  }
}

function readingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const words = text.split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

interface FaqEntry {
  question: string
  answer: string
}

function extractFaqEntries(html: string): FaqEntry[] {
  const entries: FaqEntry[] = []
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi
  let match: RegExpExecArray | null
  const positions: { question: string; index: number; end: number }[] = []

  while ((match = h2Regex.exec(html)) !== null) {
    const question = match[1].replace(/<[^>]+>/g, '').trim()
    positions.push({ question, index: match.index, end: match.index + match[0].length })
  }

  for (let i = 0; i < positions.length; i++) {
    const { question, end } = positions[i]
    const nextStart = i + 1 < positions.length ? positions[i + 1].index : html.length
    const between = html.slice(end, nextStart)
    const pMatch = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(between)
    const answer = pMatch ? pMatch[1].replace(/<[^>]+>/g, '').trim() : ''
    if (question && answer) entries.push({ question, answer })
  }

  return entries
}

export default async function GuideDetailPage({ params }: Props) {
  const { slug, pageSlug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const [agent, page] = await Promise.all([getAgent(slug), getAiPage(slug, pageSlug)])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const lifestyleEnabled = agent.features?.lifestyle_seo ?? false
  if (!lifestyleEnabled || !page || page.page_type !== 'lifestyle_seo') notFound()

  const [allPages, listingsResult] = await Promise.all([
    getAiPages(slug, 'lifestyle_seo'),
    page.subarea
      ? getListings(slug, { status: 'Active', subarea: page.subarea, limit: 4 })
      : Promise.resolve({ listings: [], total: 0 }),
  ])

  const otherPages = allPages.filter((p) => p.slug !== pageSlug)
  const listings = listingsResult.listings
  const listingTotal = listingsResult.total

  const breadcrumbLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: ap('/') },
      { '@type': 'ListItem', position: 2, name: 'Neighbourhood Guides', item: ap('/guide') },
      { '@type': 'ListItem', position: 3, name: page.title, item: ap(`/guide/${pageSlug}`) },
    ],
  })

  const articleLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    description: page.meta_description || undefined,
    author: { '@type': 'Person', name: agent.name },
    publisher: { '@type': 'Organization', name: agent.brokerage || agent.name },
    dateModified: page.generated_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
  })

  const content = page.content || ''
  const faqEntries = extractFaqEntries(content)
  const faqLd = faqEntries.length > 0
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqEntries.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      })
    : null

  const isHtml = /<h2|<p>/i.test(content)
  const subareaLabel = page.subarea || ''
  const listingsHref = subareaLabel ? ap(toHomesForSaleHref(subareaLabel)) : ap('/homes-for-sale')
  const marketHref = subareaLabel
    ? ap(`/neighbourhood/${subareaLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)
    : ap('/market')

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleLd }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} />}

      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
            <a href={ap('/guide')} style={{ color: '#888', textDecoration: 'none' }}>
              Neighbourhood Guides
            </a>
            <span style={{ margin: '0 8px' }}>›</span>
            <span>{page.subarea || page.title}</span>
          </div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>Neighbourhood Guide</div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(24px,3.5vw,42px)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', margin: 0, maxWidth: 680 }}>
            {page.title}
          </h1>
          {page.meta_description && (
            <p style={{ color: '#555', fontSize: 15, marginTop: 14, maxWidth: 600, lineHeight: 1.7, marginBottom: 0 }}>
              {page.meta_description}
            </p>
          )}
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>🕐</span> {readingTime(content)} min read
            </span>
            {subareaLabel && (
              <a href={marketHref}
                style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                {subareaLabel} Overview →
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '48px var(--container-padding) 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 48, alignItems: 'start' }} className="guide-layout">

          <article>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '32px 36px', marginBottom: 32 }} className="guide-content">
              {isHtml ? (
                <div dangerouslySetInnerHTML={{ __html: content }} />
              ) : (
                content.split(/\n+/).filter(Boolean).map((p, i, arr) => (
                  <p key={i} style={{ fontSize: 16, color: 'var(--text)', lineHeight: 1.85, marginBottom: i < arr.length - 1 ? 20 : 0 }}>
                    {p}
                  </p>
                ))
              )}
            </div>

            {subareaLabel && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 40 }}>
                <a
                  href={listingsHref}
                  className="btn-primary"
                  style={{ fontSize: 13, letterSpacing: 0.3, textTransform: 'uppercase' }}
                >
                  Browse {subareaLabel} Homes{listingTotal > 0 ? ` (${listingTotal})` : ''}
                </a>
                <a
                  href={marketHref}
                  style={{
                    border: '1.5px solid var(--accent)', color: 'var(--accent)',
                    padding: '11px 18px', borderRadius: 6, fontWeight: 600,
                    fontSize: 13, textDecoration: 'none',
                  }}
                >
                  Market Report
                </a>
                <a
                  href={ap('/neighbourhoods')}
                  style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500 }}
                >
                  All Neighbourhoods →
                </a>
              </div>
            )}

            {listings.length > 0 && subareaLabel && (
              <section style={{ marginTop: 0, marginBottom: 40 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)', margin: 0 }}>
                    Homes for Sale in {subareaLabel}
                    {listingTotal > 0 && (
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 10 }}>
                        {listingTotal} active
                      </span>
                    )}
                  </h2>
                  <a href={listingsHref} style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                    View all →
                  </a>
                </div>
                <ListingStrip listings={listings} columns={2} />
                {listingTotal > listings.length && (
                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <a
                      href={listingsHref}
                      style={{
                        display: 'inline-block', border: '1.5px solid var(--accent)',
                        color: 'var(--accent)', padding: '10px 22px', borderRadius: 6,
                        fontSize: 13, fontWeight: 600, textDecoration: 'none',
                      }}
                    >
                      View all {listingTotal} homes for sale in {subareaLabel} →
                    </a>
                  </div>
                )}
              </section>
            )}

          </article>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <ContactSidebarForm agent={agent} />
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px', background: 'var(--primary-bg)' }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Ready to Buy or Sell?
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, marginBottom: 16, margin: '0 0 16px' }}>
                Get expert guidance from pre-approval through possession — or learn what your home is worth today.
              </p>
              <a href={ap('/buyers')} style={{ display: 'block', background: 'var(--accent)', color: '#1a1a1a', textAlign: 'center', padding: '10px 0', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none', marginBottom: 8 }}>
                Buyer&apos;s Guide →
              </a>
              <a href={ap('/sellers')} style={{ display: 'block', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', textAlign: 'center', padding: '10px 0', borderRadius: 6, fontWeight: 600, fontSize: 12, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)' }}>
                Seller&apos;s Guide →
              </a>
            </div>
            {otherPages.length > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px', background: '#fff' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-bg)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  More Guides
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {otherPages.slice(0, 8).map((p) => (
                    <a
                      key={p.slug}
                      href={ap(`/guide/${p.slug}`)}
                      style={{ color: 'var(--text)', textDecoration: 'none', fontSize: 14, lineHeight: 1.4, borderBottom: '1px solid var(--border)', paddingBottom: 10, display: 'block' }}
                    >
                      {p.title}
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginTop: 3 }}>Read →</span>
                    </a>
                  ))}
                </div>
                <a href={ap('/guide')} style={{ display: 'block', marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}>
                  View all guides →
                </a>
              </div>
            )}
          </aside>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) { .guide-layout { grid-template-columns: 1fr !important } }
        .guide-content h2 {
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(18px, 2vw, 24px);
          font-weight: 500;
          color: var(--primary-bg, #14213d);
          margin: 36px 0 12px;
          line-height: 1.25;
        }
        .guide-content h2:first-child { margin-top: 0; }
        .guide-content h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin: 24px 0 8px;
        }
        .guide-content p {
          font-size: 16px;
          color: var(--text);
          line-height: 1.85;
          margin-bottom: 16px;
        }
        .guide-content p:last-child { margin-bottom: 0; }
        .guide-content ul, .guide-content ol {
          font-size: 15px;
          color: var(--text);
          line-height: 1.8;
          margin: 0 0 20px 20px;
          padding: 0;
        }
        .guide-content ul { list-style-type: disc; }
        .guide-content ol { list-style-type: decimal; }
        .guide-content li { margin-bottom: 6px; }
        .guide-content li:last-child { margin-bottom: 0; }
        .guide-content blockquote {
          border-left: 4px solid var(--accent);
          margin: 20px 0;
          padding: 12px 20px;
          background: var(--off-white);
          border-radius: 0 6px 6px 0;
          font-style: italic;
          color: var(--text);
          font-size: 15px;
          line-height: 1.75;
        }
        .guide-content a {
          color: var(--accent);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
    </div>
  )
}
