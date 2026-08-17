import type { AgentListing } from '@/lib/types'
import { formatPrice, imgUrl } from '@/lib/types'
import { detectGreatBuys } from '@/lib/great-buys'
import { regionSlugForAgent } from '@/lib/api'

interface Props {
  listings: AgentListing[]
  agentSlug: string
  agentLabel?: string
}

export default function GreatBuys({ listings, agentSlug, agentLabel }: Props) {
  const deals = detectGreatBuys(listings, 3)
  if (deals.length < 2) return null

  const regionSlug = regionSlugForAgent(agentSlug)
  const agentPrefix = regionSlug ? `/${regionSlug}` : `/agent/${agentSlug}`
  const ap = (p: string) => `${agentPrefix}${p}`

  return (
    <div style={{ marginBottom: 44 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {agentLabel ? (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Why Work With {agentLabel}
            </h2>
            <span style={{ fontSize: 12, background: '#dcfce7', color: '#15803d', fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Great Buys
            </span>
          </>
        ) : (
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Great Buys
          </h2>
        )}
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Active listings priced well below the neighbourhood average
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
        {deals.map(({ listing, reason }) => {
          const href = ap(`/listing/${listing.slug || listing.mls_no}`)
          const baths = listing.baths % 1 === 0 ? listing.baths.toFixed(0) : listing.baths.toFixed(1)

          return (
            <a
              key={listing.id}
              href={href}
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
                {listing.photo_url ? (
                  <img
                    src={imgUrl(listing.photo_url, 400, 250)}
                    alt={listing.address}
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
                  background: '#15803d', color: '#fff',
                  padding: '4px 10px', borderRadius: 4,
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                  Great Buy
                </div>
              </div>

              <div style={{ padding: '14px 16px 16px' }}>
                <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 3 }}>
                  {formatPrice(listing.list_price)}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {listing.address}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                  {listing.city}{listing.subarea ? `, ${listing.subarea}` : ''}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 10, marginBottom: 10 }}>
                  <span>{listing.beds} bd</span>
                  <span>{baths} ba</span>
                  {listing.sqft > 0 && <span>{listing.sqft.toLocaleString()} ft²</span>}
                </div>
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 6,
                  padding: '7px 10px',
                  fontSize: 12,
                  color: '#15803d',
                  fontWeight: 600,
                  lineHeight: 1.45,
                }}>
                  ✓ {reason}
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
