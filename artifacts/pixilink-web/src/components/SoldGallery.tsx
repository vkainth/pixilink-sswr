import type { AgentListing, UnifiedSold } from '@/lib/types'
import { imgUrl, formatPrice } from '@/lib/types'

type SoldItem = AgentListing | UnifiedSold

function isUnifiedSold(item: SoldItem): item is UnifiedSold {
  return 'role' in item
}

interface Props {
  soldListings: SoldItem[]
  agentPrefix: string
  firstName: string
}

export default function SoldGallery({ soldListings, agentPrefix, firstName }: Props) {
  if (!soldListings.length) return null

  return (
    <section style={{ padding: '72px 0', background: '#fff' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8, fontWeight: 700 }}>
              Proven Results
            </div>
            <h2 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(22px,2.8vw,34px)', fontWeight: 700, margin: 0, color: 'var(--primary-bg)' }}>
              Recently Sold by {firstName}
            </h2>
          </div>
          <a href={`${agentPrefix}/sold`} style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-bg)', textDecoration: 'none', borderBottom: '2px solid var(--accent)', paddingBottom: 2, whiteSpace: 'nowrap' }}>
            All Sold Homes →
          </a>
        </div>
        <div className="sold-gallery-grid">
          {soldListings.map((item, idx) => {
            const isUnified = isUnifiedSold(item)
            const isBuyer = isUnified && item.role === 'buyer'
            const isPrivate = isUnified && item.is_private_sale

            const photoPath = item.photo_url
            // w=400, not 600. A card is ~293px wide (4 columns inside a 1280px container),
            // so 600 was requesting roughly four times the pixel area actually displayed.
            // ListingCard already asks for 400 for the same card size.
            const photo = photoPath ? imgUrl(photoPath, 400) : null
            const soldPrice = item.sold_price ? formatPrice(item.sold_price) : null
            const rawType = item.type
            const typeLabel = rawType === 'Apartment Unit' ? 'Condo' : rawType === 'House/Single Family' ? 'House' : rawType || ''
            const address = item.address
            const mlsNo = isUnified ? item.mls_id : item.mls_no
            const slug = isUnified ? null : item.slug
            const beds = item.beds
            const baths = item.baths

            // Private sales show as a compact text row, no photo card
            if (isPrivate) {
              return (
                <div
                  key={`private-${idx}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: '#fffbeb', borderRadius: 10, padding: '14px 18px',
                    border: '1px solid #fde68a',
                  }}
                >
                  <span style={{ fontSize: 20 }}>🔒</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>
                      Private Sale
                    </div>
                    <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 600 }}>
                      {address || 'Address withheld'}
                    </div>
                    <div style={{ fontSize: 11, color: '#78716c', marginTop: 2 }}>Buyer Represented</div>
                  </div>
                </div>
              )
            }

            const href = mlsNo ? `${agentPrefix}/listing/${slug || mlsNo}` : '#'

            return (
              <a
                key={isUnified ? `unified-${mlsNo ?? idx}` : item.id}
                href={href}
                style={{ display: 'block', textDecoration: 'none', background: '#fff', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s' }}
                className="sold-gallery-card"
              >
                <div style={{ position: 'relative', height: 200, background: '#f3f4f6' }}>
                  {photo ? (
                    /* This gallery was the single biggest cause of the homepage feeling
                       slow: 16 plain eager <img> tags meant React emitted a
                       <link rel="preload" as="image"> for every one of them, so the browser
                       fetched 979KB of photos at high priority — competing with the hero —
                       for a section that starts below the fold and whose rows 2-4 are far
                       below it. Only the first row is eager now; the rest load lazily, and
                       explicit width/height lets the browser reserve space without them.
                       The card is a fixed 200px tall, so this changes no layout. */
                    <img
                      src={photo}
                      alt={address || 'Sold property'}
                      width={400}
                      height={200}
                      loading={idx < 4 ? 'eager' : 'lazy'}
                      fetchPriority={idx < 4 ? 'auto' : 'low'}
                      decoding="async"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', fontSize: 36 }}>
                      🏠
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: 10, left: 10, background: 'var(--primary-bg)', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 4 }}>
                    Sold
                  </div>
                  {isBuyer && (
                    <div style={{
                      position: 'absolute', top: 10, right: 10,
                      background: '#b8860b', color: '#fff',
                      fontSize: 9, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase',
                      padding: '4px 8px', borderRadius: 4,
                    }}>
                      Buyer Represented
                    </div>
                  )}
                </div>
                <div style={{ padding: '16px 18px' }}>
                  {soldPrice && (
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-bg)', marginBottom: 4 }}>
                      {soldPrice}
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>
                    {address || mlsNo}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                    {typeLabel && <span>{typeLabel}</span>}
                    {beds && <span>· {beds} bd</span>}
                    {baths && <span>· {baths} ba</span>}
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      </div>
      <style>{`
        .sold-gallery-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .sold-gallery-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.12) !important; }
        @media (max-width: 1024px) { .sold-gallery-grid { grid-template-columns: repeat(3,1fr); } }
        @media (max-width: 720px) { .sold-gallery-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 480px) { .sold-gallery-grid { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  )
}
