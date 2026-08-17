import type { NeighbourhoodWidget, MarketType } from '@/lib/types'
import { formatPrice } from '@/lib/types'

interface Props {
  data: NeighbourhoodWidget
}

const MARKET_LABEL: Record<MarketType, string> = {
  'strong-sellers': "Strong Seller's Market",
  sellers: "Seller's Market",
  balanced: 'Balanced Market',
  buyers: "Buyer's Market",
}
const MARKET_COLOR: Record<MarketType, string> = {
  'strong-sellers': '#b91c1c',
  sellers: '#dc4a26',
  balanced: '#059669',
  buyers: '#0369a1',
}

export default function InsightBar({ data }: Props) {
  const label = MARKET_LABEL[data.market_type] ?? 'Market'
  const color = MARKET_COLOR[data.market_type] ?? 'var(--accent)'

  const listToSaleRatio =
    typeof data.sale_to_list === 'number' && data.sale_to_list > 0
      ? `${data.sale_to_list.toFixed(1)}%`
      : null

  return (
    <div style={{ background: 'rgba(var(--accent-rgb),0.10)', borderLeft: '4px solid var(--accent)', borderRadius: '0 8px 8px 0', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap', fontSize: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ background: color, color: '#fff', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{label}</span>
        <span style={{ color: 'var(--text-muted)' }}>in {data.subarea || data.city}</span>
      </div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {typeof data.active === 'number' && <span style={{ color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text)' }}>{data.active}</strong> active listings</span>}
        {typeof data.sold_30d === 'number' && <span style={{ color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text)' }}>{data.sold_30d}</strong> sold last 30 days</span>}
        {data.avg_dom > 0 && <span style={{ color: 'var(--text-muted)' }}>avg <strong style={{ color: 'var(--text)' }}>{data.avg_dom} days</strong> on market</span>}
        {listToSaleRatio && <span style={{ color: 'var(--text-muted)' }}>sale-to-list <strong style={{ color: 'var(--text)' }}>{listToSaleRatio}</strong></span>}
      </div>
    </div>
  )
}
