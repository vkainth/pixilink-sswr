import type { OpenHouseItem } from '@/lib/types'
import { formatPrice, formatDate, imgUrl } from '@/lib/types'
import { regionSlugForAgent } from '@/lib/api'

interface Props {
  openHouses: OpenHouseItem[]
  agentSlug: string
  neighbourhoodName: string
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return formatDate(iso, { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function NeighbourhoodOpenHouses({ openHouses, agentSlug, neighbourhoodName }: Props) {
  if (openHouses.length === 0) return null

  const regionSlug = regionSlugForAgent(agentSlug)
  const agentPrefix = regionSlug ? `/${regionSlug}` : `/agent/${agentSlug}`
  const ap = (p: string) => `${agentPrefix}${p}`

  const eventJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Open Houses in ${neighbourhoodName}`,
    itemListElement: openHouses.slice(0, 10).map((oh, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Event',
        name: `Open House — ${oh.address}`,
        startDate: oh.open_house.start,
        endDate: oh.open_house.finish,
        location: { '@type': 'Place', name: oh.address, address: oh.address },
      },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }} />
      <div style={{ marginBottom: 44 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Open Houses in {neighbourhoodName}
          </h2>
          <a
            href={ap('/open-houses')}
            style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            See all open houses →
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {openHouses.map(oh => {
            const baths = oh.baths % 1 === 0 ? oh.baths.toFixed(0) : oh.baths.toFixed(1)
            const day = dayLabel(oh.open_house.start)
            const timeStr = `${formatDate(oh.open_house.start, { hour: 'numeric', minute: '2-digit' })} – ${formatDate(oh.open_house.finish, { hour: 'numeric', minute: '2-digit' })}`

            return (
              <a
                key={oh.id}
                href={oh.slug ? ap(`/listing/${oh.slug}`) : ap('/open-houses')}
                style={{
                  display: 'block',
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  textDecoration: 'none',
                  color: 'inherit',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--off-white)', overflow: 'hidden' }}>
                  {oh.photo_url ? (
                    <img
                      src={imgUrl(oh.photo_url, 400, 250)}
                      alt={oh.address}
                      width={400}
                      height={250}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                      🏠
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', top: 10, left: 10,
                    background: 'var(--accent)', color: 'var(--primary-bg)',
                    padding: '4px 10px', borderRadius: 4,
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}>
                    Open House
                  </div>
                </div>

                <div style={{ background: 'var(--primary-bg)', padding: '9px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 15 }}>📅</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{day}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{timeStr}</div>
                  </div>
                </div>

                <div style={{ padding: '14px 16px 16px' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', marginBottom: 3 }}>
                    {formatPrice(oh.list_price)}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {oh.address}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                    {oh.city}{oh.subarea ? `, ${oh.subarea}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>🛏 {oh.beds} bd</span>
                    <span>🛁 {baths} ba</span>
                    {oh.sqft > 0 && <span>📐 {oh.sqft.toLocaleString()} ft²</span>}
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      </div>
    </>
  )
}
