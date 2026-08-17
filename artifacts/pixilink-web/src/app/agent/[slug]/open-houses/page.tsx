import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getAgentTerritories, getOpenHouses, resolveAgentPrefix, agentAreaDisplay } from '@/lib/api'
import PageQuickLinks from '@/components/PageQuickLinks'
import { formatPrice, formatDate, imgUrl } from '@/lib/types'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const [agent, territories] = await Promise.all([getAgent(slug), getAgentTerritories(slug).catch(() => [])])
  const shortArea = agentAreaDisplay(territories)
  const title = `Open Houses — ${agent?.name || shortArea}`
  const description = `Upcoming open houses in ${shortArea} and surrounding areas. Browse ${agent?.name || 'local'} open house schedule and register to attend.`
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function OpenHousesPage({ params }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const [agent, openHouses] = await Promise.all([getAgent(slug), getOpenHouses(slug)])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const firstName = agent.name.split(' ')[0]

  function dayLabel(iso: string) {
    const d = new Date(iso)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return formatDate(iso, { weekday: 'long', month: 'short', day: 'numeric' })
  }

  const jsonLd = openHouses.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Open Houses — ${agent.name}`,
    itemListElement: openHouses.slice(0, 10).map((oh, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Event',
        name: `Open House — ${oh.address}`,
        startDate: oh.open_house.start,
        endDate: oh.open_house.finish,
        location: { '@type': 'Place', name: oh.address, address: oh.address },
        organizer: { '@type': 'Person', name: agent.name },
      },
    })),
  } : null

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      {/* Hero */}
      <div style={{ background: '#fff', padding: '48px 0 36px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>Open Houses</div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(26px,3.8vw,44px)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', marginBottom: 10 }}>
            Upcoming Open Houses
          </h1>
          <p style={{ color: '#555', fontSize: 14, maxWidth: 600, lineHeight: 1.7, margin: '0 0 20px' }}>
            Browse {firstName}&apos;s upcoming open house schedule. All are welcome — no appointment needed.
          </p>
          <a href={ap('/register')} style={{ display: 'inline-block', background: 'transparent', color: '#1a1a1a', padding: '11px 22px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none', letterSpacing: 0.5, border: '1px solid #d1d5db' }}>
            🔔 Get Notified of New Open Houses
          </a>
        </div>
      </div>

      <div className="container" style={{ padding: '40px var(--container-padding) 72px' }}>
        {openHouses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: '#fff', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 8 }}>No Open Houses Currently Scheduled</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.7 }}>
              Check back soon or contact {firstName} to book a private showing of any property.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={ap('/homes-for-sale')} style={{ background: 'transparent', color: '#1a1a1a', padding: '12px 24px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none', border: '1px solid #d1d5db' }}>Browse Homes For Sale</a>
              <a href={ap('/contact')} style={{ border: '1px solid #d1d5db', color: '#1a1a1a', padding: '12px 24px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>Book a Private Showing</a>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
              <strong style={{ color: 'var(--text)' }}>{openHouses.length}</strong> open house{openHouses.length === 1 ? '' : 's'} scheduled
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 20 }}>
              {openHouses.map(oh => {
                const photoSrc = oh.photo_url || null
                const baths = oh.baths % 1 === 0 ? oh.baths.toFixed(0) : oh.baths.toFixed(1)
                const day = dayLabel(oh.open_house.start)
                const timeStr = `${formatDate(oh.open_house.start, { hour: 'numeric', minute: '2-digit' })} – ${formatDate(oh.open_house.finish, { hour: 'numeric', minute: '2-digit' })}`

                return (
                  <div key={oh.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    {/* Photo */}
                    <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--off-white)' }}>
                      {photoSrc ? (
                        <img src={photoSrc} alt={oh.address} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🏠</div>
                      )}
                      {/* Open house badge */}
                      <div style={{ position: 'absolute', top: 10, left: 10, background: 'var(--accent)', color: 'var(--primary-bg)', padding: '5px 12px', borderRadius: 4, fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Open House
                      </div>
                    </div>

                    {/* Date/time banner */}
                    <div style={{ background: 'var(--primary-bg)', padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 16 }}>📅</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{day}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{timeStr}</div>
                      </div>
                    </div>

                    {/* Listing info */}
                    <div style={{ padding: '16px 18px' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>{formatPrice(oh.list_price)}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{oh.address}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{oh.city}{oh.subarea ? `, ${oh.subarea}` : ''}</div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                        <span>🛏 {oh.beds} bed</span>
                        <span>🛁 {baths} bath</span>
                        {oh.sqft > 0 && <span>📐 {oh.sqft.toLocaleString()} ft²</span>}
                      </div>
                      <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                        {oh.slug && (
                          <a href={ap(`/listing/${oh.slug}`)} style={{ flex: 1, background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none', textAlign: 'center' }}>
                            View Full Listing
                          </a>
                        )}
                        <a href={ap('/contact')} style={{ flex: 1, background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', padding: '10px', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none', textAlign: 'center' }}>
                          Book a Private Showing
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Contact CTA */}
            <div style={{ marginTop: 48, background: 'var(--primary-bg)', borderRadius: 12, padding: '36px 32px', textAlign: 'center' }}>
              <h2 style={{ fontSize: 'clamp(20px,2.8vw,28px)', fontWeight: 700, color: '#fff', marginBottom: 10 }}>
                Want to see a home privately?
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 22, maxWidth: 480, margin: '0 auto 22px' }}>
                {firstName} can arrange a private showing of any listing — open house or not.
              </p>
              <a href={ap('/contact')} className="btn-primary" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
                Book a Showing
              </a>
            </div>
          </div>
        )}
      </div>

      <PageQuickLinks slug={slug} exclude="/open-houses" />
    </div>
  )
}
