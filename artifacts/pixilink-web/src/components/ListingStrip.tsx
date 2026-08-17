import type { AgentListing } from '@/lib/types'
import ListingCard from './ListingCard'

interface Props {
  listings: AgentListing[]
  showSoldPrice?: boolean
  isLoggedIn?: boolean
  columns?: number
}

export default function ListingStrip({ listings, showSoldPrice, isLoggedIn, columns = 3 }: Props) {
  if (!listings.length) return null
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${columns >= 3 ? 260 : 300}px, 1fr))`,
        gap: 16,
      }}
    >
      {listings.map((l, i) => (
        <ListingCard key={l.id || l.mls_no} listing={l} showSoldPrice={showSoldPrice} isLoggedIn={isLoggedIn} priority={i < 4} />
      ))}
    </div>
  )
}
