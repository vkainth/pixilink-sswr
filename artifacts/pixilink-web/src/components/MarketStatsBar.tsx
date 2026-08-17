import type { MarketStats } from '@/lib/types'
import { formatPrice } from '@/lib/types'

interface Props {
  stats: MarketStats
}

export default function MarketStatsBar({ stats }: Props) {
  const items = [
    { label: 'Homes For Sale', value: stats.active_count.toLocaleString() },
    { label: 'Avg List Price', value: formatPrice(stats.avg_list_price) },
    { label: 'Sold Last 30 Days', value: stats.sold_last_30_days.toLocaleString() },
    { label: 'Avg Sold Price', value: formatPrice(stats.avg_sold_price) },
  ]

  return (
    <div style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderLeft: '1px solid var(--border)' }}>
          {items.map(item => (
            <div key={item.label} style={{ padding: '18px 24px', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary-bg)', lineHeight: 1 }}>
                {item.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 640px) {
          .market-stats-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>
    </div>
  )
}
