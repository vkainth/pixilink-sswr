import { playfair } from '@/lib/fonts'
import { getAgent, getSchoolCatchments, agentCanonicalBase } from '@/lib/api'
import PageQuickLinks from '@/components/PageQuickLinks'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { SchoolCatchmentSummary } from '@/lib/types'


interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 1800

function buildAreaLabel(schools: SchoolCatchmentSummary[]): string {
  const cities = [...new Set(schools.map(s => s.city).filter(Boolean))]
  if (cities.length === 0) return 'Local Area'
  return cities.join(' & ')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [agent, schools] = await Promise.all([getAgent(slug), getSchoolCatchments(slug)])
  const agentName = agent?.name || 'Your Local Agent'
  const domain = agentCanonicalBase(agent)
  const area = buildAreaLabel(schools)
  const title = `${area} School Catchments — Homes by School District | ${agentName}`
  const description = schools.length > 0
    ? `Browse ${area} homes for sale by school catchment with ${agentName} — ${schools.length} schools, live active listing counts and catchment boundaries.`
    : `Explore ${area} school catchments and nearby homes for sale with ${agentName}.`
  const canonical = `https://${domain}/schools`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, images: [{ url: `https://${domain}/opengraph.jpg`, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description },
  }
}

function schoolTypeBadgeColor(type: string | null): string {
  switch ((type || '').toLowerCase()) {
    case 'secondary': return '#b45309'
    case 'elementary': return '#1d4ed8'
    case 'middle': return '#7c3aed'
    default: return '#6b7280'
  }
}

export default async function SchoolsPage({ params }: Props) {
  const { slug } = await params
  const ap = (p: string) => `/agent/${slug}${p}`

  const [agent, schools] = await Promise.all([getAgent(slug), getSchoolCatchments(slug)])
  if (!agent) notFound()

  const areaLabel = buildAreaLabel(schools)

  const byCity = new Map<string, SchoolCatchmentSummary[]>()
  for (const s of schools) {
    const arr = byCity.get(s.city) || []
    arr.push(s)
    byCity.set(s.city, arr)
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${areaLabel} School Catchments`,
    description: `Homes for sale near every school ${agent.name} covers in ${areaLabel}.`,
    numberOfItems: schools.length,
    itemListElement: schools.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'School',
        name: s.name,
        url: ap(`/schools/${s.slug}`),
        address: s.address || undefined,
        containedInPlace: { '@type': 'City', name: s.city },
      },
    })),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: ap('/') },
      { '@type': 'ListItem', position: 2, name: 'School Catchments', item: ap('/schools') },
    ],
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Hero */}
      <div style={{ background: '#fff', padding: '56px 0', borderBottom: '1px solid #e5e7eb' }}>
        <div className="container">
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>
            School Catchments
          </div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 400, lineHeight: 1.15, marginBottom: 14, color: '#1a1a1a' }}>
            {areaLabel} Schools &amp; Catchment Homes
          </h1>
          <p style={{ fontSize: 15, color: '#555', lineHeight: 1.7, maxWidth: 600 }}>
            Browse homes for sale by school catchment across the areas {agent.name.split(' ')[0]} serves — see how many
            active listings fall within each school&apos;s boundary today.
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '48px var(--container-padding) 72px' }}>
        {schools.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>School catchment guides are coming soon.</p>
        ) : (
          [...byCity.entries()].map(([city, list]) => (
            <section key={city} style={{ marginBottom: 56 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 20 }}>
                {city}
              </h2>
              <div className="sc-card-grid">
                {list.map(s => {
                  const badgeColor = schoolTypeBadgeColor(s.school_type)
                  return (
                    <a
                      key={s.slug}
                      href={ap(`/schools/${s.slug}`)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        background: '#fff',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        textDecoration: 'none',
                        borderLeft: `4px solid ${badgeColor}`,
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ padding: '20px 20px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--primary-bg)', lineHeight: 1.25 }}>{s.name}</div>
                          {s.school_type && (
                            <span style={{
                              background: `${badgeColor}1a`,
                              color: badgeColor,
                              padding: '3px 9px',
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              textTransform: 'capitalize',
                            }}>
                              {s.school_type}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {s.district_name || s.city}
                        </div>
                      </div>

                      <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 20 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{s.active_count.toLocaleString()}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>active in catchment</div>
                        </div>
                      </div>

                      <div style={{
                        padding: '11px 20px',
                        background: 'var(--off-white)',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginTop: 'auto',
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>
                          View Homes →
                        </span>
                      </div>
                    </a>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>

      <PageQuickLinks slug={slug} context="schools" exclude="/schools" />

      <style>{`
        .sc-card-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        @media (max-width: 900px) {
          .sc-card-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 540px) {
          .sc-card-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
