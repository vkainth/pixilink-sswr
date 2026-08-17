import { playfair } from '@/lib/fonts'
import { getAgent, getSchoolCatchmentDetail, agentCanonicalBase } from '@/lib/api'
import PageQuickLinks from '@/components/PageQuickLinks'
import ListingStrip from '@/components/ListingStrip'
import StatGrid, { type StatItem } from '@/components/StatGrid'
import { formatPrice } from '@/lib/types'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string; schoolSlug: string }>
}

export const revalidate = 1800

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, schoolSlug } = await params
  const [agent, detail] = await Promise.all([getAgent(slug), getSchoolCatchmentDetail(slug, schoolSlug)])
  if (!detail) return { title: 'School Catchment' }
  const agentName = agent?.name || 'Your Local Agent'
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/schools/${schoolSlug}`
  const title = `${detail.school.name} Catchment Homes for Sale, ${detail.school.city} | ${agentName}`
  const description = detail.active_count > 0
    ? `${detail.active_count} active listings in the ${detail.school.name} catchment, ${detail.school.city}. Avg list price ${detail.avg_list_price ? formatPrice(detail.avg_list_price) : 'varies'} with ${agentName}.`
    : `Homes for sale in the ${detail.school.name} catchment, ${detail.school.city}, with ${agentName}.`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, images: [{ url: `https://${domain}/opengraph.jpg`, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function SchoolCatchmentPage({ params }: Props) {
  const { slug, schoolSlug } = await params
  const ap = (p: string) => `/agent/${slug}${p}`

  const [agent, detail] = await Promise.all([getAgent(slug), getSchoolCatchmentDetail(slug, schoolSlug)])
  if (!agent || !detail) notFound()

  const { school } = detail
  const domain = agentCanonicalBase(agent)
  const canonicalUrl = `https://${domain}/schools/${schoolSlug}`

  const stats: StatItem[] = [
    { label: 'Homes For Sale', value: detail.active_count.toLocaleString() },
    { label: 'Recently Sold (6mo)', value: detail.sold_count.toLocaleString() },
    ...(detail.avg_list_price ? [{ label: 'Avg List Price', value: formatPrice(detail.avg_list_price) }] : []),
    ...(detail.avg_sold_price ? [{ label: 'Avg Sold Price', value: formatPrice(detail.avg_sold_price) }] : []),
  ]

  const schoolJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'School',
    name: school.name,
    address: school.address || undefined,
    url: canonicalUrl,
    containedInPlace: { '@type': 'City', name: school.city },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: ap('/') },
      { '@type': 'ListItem', position: 2, name: 'School Catchments', item: ap('/schools') },
      { '@type': 'ListItem', position: 3, name: school.name, item: ap(`/schools/${schoolSlug}`) },
    ],
  }

  const faqJsonLd = detail.active_count > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How many homes for sale are in the ${school.name} catchment?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `There are currently ${detail.active_count} active listings within the ${school.name} catchment in ${school.city}.${detail.avg_list_price ? ` The average list price is ${formatPrice(detail.avg_list_price)}.` : ''}`,
        },
      },
    ],
  } : null

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schoolJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}

      {/* Hero */}
      <div style={{ background: '#fff', padding: '56px 0', borderBottom: '1px solid #e5e7eb' }}>
        <div className="container">
          <nav style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            <a href={ap('/schools')} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>School Catchments</a>
            <span style={{ margin: '0 6px' }}>/</span>
            <span>{school.name}</span>
          </nav>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>
            {school.school_type ? `${school.school_type} School Catchment` : 'School Catchment'}
          </div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 400, lineHeight: 1.15, marginBottom: 14, color: '#1a1a1a' }}>
            {school.name} Catchment Homes for Sale
          </h1>
          <p style={{ fontSize: 15, color: '#555', lineHeight: 1.7, maxWidth: 600 }}>
            {school.address ? `${school.address}, ` : ''}{school.city}
            {school.district_name ? ` · ${school.district_name}` : ''}
            {!detail.has_boundary && (
              <span style={{ display: 'block', marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
                Catchment boundary coming soon — listings shown are near this school.
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '40px var(--container-padding) 0' }}>
        {stats.length > 0 && <StatGrid items={stats} />}
      </div>

      <div className="container" style={{ padding: '40px var(--container-padding) 72px' }}>
        <div style={{ marginBottom: 44 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
            Homes For Sale in the {school.name} Catchment
          </h2>
          {detail.active.length > 0 ? (
            <ListingStrip listings={detail.active} />
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              No active listings in this catchment right now. Check back soon or{' '}
              <a href={ap('/contact')} style={{ color: 'var(--accent)' }}>contact {agent.name.split(' ')[0]}</a> to be notified.
            </p>
          )}
        </div>

        {detail.recent_sold.length > 0 && (
          <div style={{ marginBottom: 44 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
              Recently Sold in This Catchment
            </h2>
            <ListingStrip listings={detail.recent_sold} showSoldPrice />
          </div>
        )}

        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Catchment boundaries are approximate and may change. Always verify current school assignment with the school district before purchasing.
        </p>
      </div>

      <PageQuickLinks slug={slug} context="schools" />
    </div>
  )
}
