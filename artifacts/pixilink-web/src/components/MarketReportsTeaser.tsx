import type { MarketStats } from '@/lib/types'
import { formatPrice } from '@/lib/types'

interface Props {
  stats: MarketStats
  agentPrefix: string
  firstName: string
}

export default function MarketReportsTeaser({ stats, agentPrefix, firstName }: Props) {
  const cards = [
    {
      eyebrow: 'Market Intelligence',
      title: 'Market Reports',
      desc: `Monthly snapshots of pricing, sales volume, and inventory across the areas ${firstName} covers.`,
      href: `${agentPrefix}/market?tab=archive`,
      cta: 'Browse Reports',
    },
    {
      eyebrow: 'Sold Data',
      title: 'Recent Solds',
      desc: 'See what homes have actually sold for — neighbourhood-level sold history updated from live MLS® data.',
      href: `${agentPrefix}/sold`,
      cta: 'View Sold Homes',
    },
    {
      eyebrow: 'Pricing Tool',
      title: 'Price Matrix',
      desc: 'Compare average prices by property type and bedroom count side-by-side to find your ideal price range.',
      href: `${agentPrefix}/price-matrix`,
      cta: 'Open Price Matrix',
    },
  ]

  const highlights = [
    stats.active_count ? { v: stats.active_count.toLocaleString(), l: 'Active Listings' } : null,
    stats.sold_last_30_days ? { v: String(stats.sold_last_30_days), l: 'Sold This Month' } : null,
    stats.avg_sold_price ? { v: formatPrice(stats.avg_sold_price), l: 'Avg Sold Price' } : null,
  ].filter(Boolean) as { v: string; l: string }[]

  return (
    <section style={{ padding: '72px 0', background: '#fff' }}>
      <div className="container">
        {highlights.length > 0 && (
          <div style={{ display: 'flex', gap: 32, marginBottom: 40, padding: '20px 28px', background: 'var(--off-white)', borderRadius: 10, border: '1px solid var(--border)' }}>
            {highlights.map(h => (
              <div key={h.l}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-bg)' }}>{h.v}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{h.l}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20 }}>
          {cards.map(card => (
            <div key={card.href} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--off-white)' }}>
              <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>{card.eyebrow}</div>
              <h3 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 22, fontWeight: 700, color: 'var(--primary-bg)', margin: 0 }}>{card.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0, flex: 1 }}>{card.desc}</p>
              <a href={card.href} style={{ display: 'inline-block', marginTop: 8, background: 'var(--primary-bg)', color: '#fff', padding: '10px 22px', borderRadius: 6, fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none', alignSelf: 'flex-start' }}>
                {card.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
