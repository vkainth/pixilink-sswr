import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getPage, getListings, getMarketStats, resolveAgentPrefix } from '@/lib/api'
import type { ListingsParams } from '@/lib/api'
import ContactSidebarForm from '@/components/ContactSidebarForm'
import ListingStrip from '@/components/ListingStrip'
import { formatPrice } from '@/lib/types'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string; page: string[] }>
  searchParams: Promise<Record<string, string>>
}

export const revalidate = 300

function parseSeoFilter(segment: string): { subarea: string; type?: string; status: 'Active' | 'Sold' } | null {
  // Check more-specific patterns FIRST to avoid -for-sale swallowing typed variants
  if (segment.endsWith('-condos-for-sale')) {
    const sub = segment.slice(0, -16).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    return { subarea: sub, type: 'Apartment', status: 'Active' }
  }
  if (segment.endsWith('-townhouses-for-sale')) {
    const sub = segment.slice(0, -20).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    return { subarea: sub, type: 'Townhouse', status: 'Active' }
  }
  if (segment.endsWith('-houses-for-sale')) {
    const sub = segment.slice(0, -16).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    return { subarea: sub, type: 'House', status: 'Active' }
  }
  if (segment.endsWith('-for-sale')) {
    const sub = segment.slice(0, -9).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    return { subarea: sub, status: 'Active' }
  }
  if (segment.endsWith('-sold')) {
    const sub = segment.slice(0, -5).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    return { subarea: sub, status: 'Sold' }
  }
  return null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params
  // No headers() here: this used to read x-agent-prefix into an agentPrefix/ap
  // pair that the function never referenced — dead code left from the
  // header-derived prefix scheme, and a needless dynamic access in a route that
  // Next may render statically. Removed as cleanup only; it was NOT the cause of
  // the 500s on unmatched paths (that was the [filter]/[city] routes — see the
  // force-dynamic comment there). Verified by removing this alone and observing
  // no behaviour change. If this ever genuinely needs a per-agent URL, derive it
  // from the agent record, never from a request header.
  const pageSlug = page.join('/')
  if (page.length === 1) {
    const filter = parseSeoFilter(page[0])
    if (filter) {
      const agent = await getAgent(slug)
      const typeLabel = filter.type ? ` ${filter.type === 'Apartment' ? 'Condos' : filter.type + 's'}` : ''
      const statusLabel = filter.status === 'Sold' ? 'Sold' : 'For Sale'
      const title = `${filter.subarea}${typeLabel} ${statusLabel}`
      const description = `Browse ${statusLabel.toLowerCase()} properties in ${filter.subarea}${typeLabel ? ` — ${typeLabel.trim().toLowerCase()}` : ''}. Real MLS® data from ${agent?.name || 'your local agent'}.`
      return {
        title,
        description,
        openGraph: { title, description },
        twitter: { card: 'summary_large_image', title, description },
      }
    }
  }
  const [agent, pageData] = await Promise.all([getAgent(slug), getPage(slug, pageSlug)])
  if (!pageData) return { title: 'Page Not Found' }
  const title = pageData.meta_title || pageData.title || `${agent?.name} | ${pageSlug}`
  const description = pageData.meta_description || undefined
  return {
    title,
    description,
    openGraph: { title, description: description ?? '' },
    twitter: { card: 'summary_large_image', title, description: description ?? '' },
  }
}

interface TextBlock { type: 'text'; content: string }
interface HeadingBlock { type: 'heading'; level?: number; content: string }
interface ImageBlock { type: 'image'; url: string; caption?: string; alt?: string }
interface ListBlock { type: 'list'; items: string[] }
interface CtaBlock { type: 'cta'; label: string; url: string; style?: 'primary' | 'outline' }
interface DividerBlock { type: 'divider' }

type Block = TextBlock | HeadingBlock | ImageBlock | ListBlock | CtaBlock | DividerBlock

function renderBlock(block: Block, i: number) {
  switch (block.type) {
    case 'heading': {
      const size = block.level === 2 ? 26 : block.level === 3 ? 20 : 16
      const Tag = `h${block.level ?? 2}` as 'h2' | 'h3' | 'h4'
      return (
        <Tag key={i} style={{ fontSize: size, fontWeight: 700, color: 'var(--primary-bg)', margin: '32px 0 14px', lineHeight: 1.3 }}>
          {block.content}
        </Tag>
      )
    }
    case 'text':
      return (
        <p key={i} style={{ marginBottom: 18, color: 'var(--text)', lineHeight: 1.8, fontSize: 15 }}>
          {block.content}
        </p>
      )
    case 'image':
      return (
        <figure key={i} style={{ margin: '32px 0' }}>
          <img src={block.url} alt={block.alt || block.caption || ''} style={{ width: '100%', borderRadius: 8, objectFit: 'cover', maxHeight: 480 }} />
          {block.caption && (
            <figcaption style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>{block.caption}</figcaption>
          )}
        </figure>
      )
    case 'list':
      return (
        <ul key={i} style={{ paddingLeft: 20, marginBottom: 18 }}>
          {block.items.map((item, j) => (
            <li key={j} style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.8, marginBottom: 6 }}>{item}</li>
          ))}
        </ul>
      )
    case 'cta':
      return (
        <div key={i} style={{ margin: '28px 0' }}>
          <a href={block.url}
            style={block.style === 'outline'
              ? { display: 'inline-block', border: '1.5px solid var(--cta-secondary-border)', color: 'var(--cta-secondary-text)', padding: '12px 28px', borderRadius: 6, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' as const, textDecoration: 'none' }
              : { display: 'inline-block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '12px 28px', borderRadius: 6, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' as const, textDecoration: 'none' }
            }>
            {block.label}
          </a>
        </div>
      )
    case 'divider':
      return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '40px 0' }} />
    default:
      return null
  }
}

export default async function CustomPage({ params, searchParams }: Props) {
  const { slug, page } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const sp = await searchParams

  // SEO filter pages: e.g. /south-surrey-for-sale, /morgan-creek-condos-for-sale
  if (page.length === 1) {
    const filter = parseSeoFilter(page[0])
    if (filter) {
      const agent = await getAgent(slug)
      if (!agent) notFound()

      const pageNum = sp.page ? Math.max(1, parseInt(sp.page)) : 1
      const listParams: ListingsParams = {
        status: filter.status,
        type: filter.type,
        subarea: filter.subarea,
        page: pageNum,
        limit: 12,
      }

      const [listings, stats] = await Promise.all([
        getListings(slug, listParams).then(r => r.listings),
        getMarketStats(slug),
      ])

      const typeLabel = filter.type ? ` ${filter.type === 'Apartment' ? 'Condos' : filter.type + 's'}` : ''
      const statusLabel = filter.status === 'Sold' ? 'Sold' : 'For Sale'
      const headingArea = filter.subarea
      const firstName = agent.name.split(' ')[0]

      const statCards = filter.status === 'Active'
        ? [
            { l: 'Homes For Sale', v: String(stats.active_count) },
            { l: 'Avg List Price', v: stats.avg_list_price ? formatPrice(stats.avg_list_price) : '—' },
            { l: 'Avg Days on Market', v: stats.avg_dom != null ? `${stats.avg_dom}d` : '—' },
            { l: 'Sold Last 30d', v: String(stats.sold_last_30_days) },
          ]
        : [
            { l: 'Sold Last 30d', v: String(stats.sold_last_30_days) },
            { l: 'Avg Sold Price', v: stats.avg_sold_price ? formatPrice(stats.avg_sold_price) : '—' },
            { l: 'Avg Days on Market', v: stats.avg_dom != null ? `${stats.avg_dom}d` : '—' },
            { l: 'Homes For Sale', v: String(stats.active_count) },
          ]

      const seoJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${headingArea}${typeLabel} ${statusLabel}`,
        description: filter.status === 'Active'
          ? `Active MLS® listings in ${headingArea}${typeLabel ? ` — ${typeLabel.trim().toLowerCase()}` : ''}.`
          : `Recently sold properties in ${headingArea}${typeLabel ? ` — ${typeLabel.trim().toLowerCase()}` : ''}.`,
        url: `https://${agent.settings?.custom_domain || 'bccondosandhomes.com'}${ap(`/${page[0]}`)}`,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: listings.slice(0, 20).map((l, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `https://${agent.settings?.custom_domain || 'bccondosandhomes.com'}${ap(`/${filter.status === 'Sold' ? 'sold' : 'listing'}/${l.mls_no}`)}`,
          })),
        },
      }

      return (
        <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(seoJsonLd) }} />
          <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
            <div className="container">
              <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 10, fontWeight: 500 }}>
                {headingArea}
              </div>
              <h1 className={playfair.className} style={{ fontSize: 'clamp(22px,3.2vw,40px)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', marginBottom: 10, marginTop: 0 }}>
                {headingArea}{typeLabel} {statusLabel}
              </h1>
              <p style={{ color: '#555', fontSize: 15, maxWidth: 640, lineHeight: 1.7, margin: 0 }}>
                {filter.status === 'Active'
                  ? `Browse active MLS® listings in ${headingArea}${typeLabel ? ` — ${typeLabel.trim().toLowerCase()} only` : ''}. Updated in real-time from ${firstName}.`
                  : `See what properties have recently sold for in ${headingArea}${typeLabel ? ` — ${typeLabel.trim().toLowerCase()}` : ''}. Real MLS® transaction prices.`}
              </p>
            </div>
          </div>

          <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '18px 0' }}>
            <div className="container">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12 }}>
                {statCards.map(s => (
                  <div key={s.l} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', background: 'var(--off-white)', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{s.l}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="container" style={{ padding: '36px var(--container-padding) 64px' }}>
            <div className="seo-filter-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 40, alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
                  {listings.length === 0
                    ? `No ${statusLabel.toLowerCase()} listings found`
                    : <><strong style={{ color: 'var(--text)' }}>{listings.length}</strong> {statusLabel.toLowerCase()} {typeLabel.trim() || 'properties'}{pageNum > 1 ? ` · page ${pageNum}` : ''}</>}
                </div>

                {listings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 24px', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', background: '#fff' }}>
                    No results found.
                    <div style={{ marginTop: 10 }}><a href={ap('/homes-for-sale')} style={{ color: 'var(--accent)', fontWeight: 600 }}>Browse all listings →</a></div>
                  </div>
                ) : (
                  <>
                    <ListingStrip listings={listings} showSoldPrice={false} columns={2} />
                    {filter.status === 'Sold' && (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(var(--accent-rgb),0.07)', border: '1px solid rgba(var(--accent-rgb),0.2)', borderRadius: 8, padding: '10px 16px' }}>
                        <span style={{ fontSize: 13, color: 'var(--text)' }}>🔒 Sign in to unlock sold prices</span>
                        <a href={ap('/sign-in')} style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>Sign In →</a>
                      </div>
                    )}
                    {(pageNum > 1 || listings.length === 12) && (
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 36 }}>
                        {pageNum > 1 && <a href={`?page=${pageNum - 1}`} style={{ padding: '10px 22px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff', textDecoration: 'none', color: 'var(--text)' }}>← Previous</a>}
                        {listings.length === 12 && <a href={`?page=${pageNum + 1}`} style={{ padding: '10px 22px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff', textDecoration: 'none', color: 'var(--text)' }}>Next →</a>}
                      </div>
                    )}
                  </>
                )}

                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 22px', marginTop: 32 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Explore More</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      { l: 'All Homes For Sale', h: ap('/homes-for-sale') },
                      { l: 'Sold Homes', h: ap('/sold') },
                      { l: 'Condo Buildings', h: ap('/buildings') },
                      { l: 'Market Report', h: ap('/market-report') },
                      { l: 'Neighbourhoods', h: ap('/neighbourhoods') },
                    ].map(x => (
                      <a key={x.l} href={x.h} style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '7px 12px', borderRadius: 6, textDecoration: 'none', fontSize: 12 }}>{x.l}</a>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ background: 'rgba(var(--accent-rgb),0.10)', border: '1px solid var(--accent)', borderRadius: 10, padding: '16px 18px', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 4 }}>
                    {filter.status === 'Active' ? 'Book a showing' : 'What\'s your home worth?'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                    {filter.status === 'Active'
                      ? `${firstName} can arrange a private showing for any listing in ${headingArea}.`
                      : `Get a free CMA from ${firstName} based on recent sales like these.`}
                  </div>
                </div>
                <ContactSidebarForm agent={agent} mode="contact" />
              </div>
            </div>
          </div>

          <style>{`
            @media (max-width: 900px) {
              .seo-filter-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      )
    }
  }

  // Multi-segment URL → join into slug (e.g. ['buying', 'guide'] → 'buying/guide')
  const pageSlug = page.join('/')
  const [agent, pageData] = await Promise.all([getAgent(slug), getPage(slug, pageSlug)])

  if (!agent || !pageData) notFound()

  const blocks = (pageData.blocks || []) as Block[]
  const bodyParagraphs = pageData.body?.split('\n\n').filter(Boolean) ?? []
  const hasBlocks = blocks.length > 0
  const hasCta = pageData.cta_label && pageData.cta_url

  const cmsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageData.meta_title || pageData.title || pageSlug,
    description: pageData.meta_description || pageData.subtitle || undefined,
    url: `https://${agent.settings?.custom_domain || 'bccondosandhomes.com'}${ap(`/${pageSlug}`)}`,
    author: { '@type': 'Person', name: agent.name },
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(cmsJsonLd) }} />

      {/* Hero */}
      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          {pageData.hero_image_url && (
            <div style={{ marginBottom: 24, borderRadius: 10, overflow: 'hidden', maxHeight: 240 }}>
              <img src={pageData.hero_image_url} alt={pageData.title || pageSlug} style={{ width: '100%', objectFit: 'cover', maxHeight: 240, display: 'block' }} />
            </div>
          )}
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>
            {agent.name}
          </div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(26px,4vw,48px)', fontWeight: 400, lineHeight: 1.1, color: '#1a1a1a', marginBottom: 14, marginTop: 0 }}>
            {pageData.title || pageSlug}
          </h1>
          {pageData.subtitle && (
            <p style={{ fontSize: 15, color: '#555', lineHeight: 1.75, maxWidth: 540, marginBottom: hasCta ? 24 : 0 }}>
              {pageData.subtitle}
            </p>
          )}
          {hasCta && (
            <a href={pageData.cta_url!}
              style={{ display: 'inline-block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '12px 24px', borderRadius: 6, fontWeight: 700, fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase', textDecoration: 'none' }}>
              {pageData.cta_label}
            </a>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="container" style={{ padding: '64px var(--container-padding)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 56 }}>
          <article>
            {/* Structured blocks (primary) */}
            {hasBlocks && blocks.map((block, i) => renderBlock(block, i))}

            {/* Plain body text fallback */}
            {!hasBlocks && bodyParagraphs.map((para, i) => (
              <p key={i} style={{ marginBottom: 18, color: 'var(--text)', lineHeight: 1.8, fontSize: 15 }}>{para}</p>
            ))}

            {/* Empty state */}
            {!hasBlocks && bodyParagraphs.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Content coming soon.</p>
            )}

            {agent.license_number && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 40 }}>
                BC Real Estate License #{agent.license_number} · {agent.brokerage}
              </p>
            )}
          </article>

          {/* Sidebar */}
          <aside>
            <div style={{ position: 'sticky', top: 24 }}>
              <ContactSidebarForm agent={agent} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
