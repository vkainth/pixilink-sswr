import { headers } from 'next/headers'
import { regionSlugForAgent, resolveAgentPrefix } from '@/lib/api'

type PageContext = 'condos' | 'houses' | 'townhouses' | 'luxury' | 'sold' | 'listing' | 'about' | 'market' | 'buildings' | 'search' | 'schools'

interface Props {
  slug: string
  exclude?: string
  context?: PageContext
  isShowcase?: boolean
}

const DEFAULT_LINKS = [
  { label: 'Homes For Sale', path: '/homes-for-sale' },
  { label: 'Recently Sold', path: '/sold' },
  { label: 'Market Stats & Reports', path: '/market' },
  { label: 'Neighbourhoods', path: '/neighbourhoods' },
  { label: 'Condo Buildings', path: '/buildings' },
  { label: 'Open Houses', path: '/open-houses' },
  { label: 'Contact', path: '/contact' },
]

const CONTEXT_LINKS: Partial<Record<PageContext, Array<{ label: string; path: string }>>> = {
  condos: [
    { label: 'Houses for Sale', path: '/houses-for-sale' },
    { label: 'Townhouses for Sale', path: '/townhouses-for-sale' },
    { label: 'Condo Buildings', path: '/buildings' },
    { label: 'Recently Sold', path: '/sold' },
    { label: 'Market Stats & Reports', path: '/market' },
    { label: 'Neighbourhoods', path: '/neighbourhoods' },
    { label: 'Contact', path: '/contact' },
  ],
  houses: [
    { label: 'Condos for Sale', path: '/condos-for-sale' },
    { label: 'Townhouses for Sale', path: '/townhouses-for-sale' },
    { label: 'Luxury Homes', path: '/luxury-homes' },
    { label: 'Recently Sold', path: '/sold' },
    { label: 'Market Stats & Reports', path: '/market' },
    { label: 'Neighbourhoods', path: '/neighbourhoods' },
    { label: 'Contact', path: '/contact' },
  ],
  townhouses: [
    { label: 'Condos for Sale', path: '/condos-for-sale' },
    { label: 'Houses for Sale', path: '/houses-for-sale' },
    { label: 'Condo Buildings', path: '/buildings' },
    { label: 'Recently Sold', path: '/sold' },
    { label: 'Market Stats & Reports', path: '/market' },
    { label: 'Neighbourhoods', path: '/neighbourhoods' },
    { label: 'Contact', path: '/contact' },
  ],
  luxury: [
    { label: 'Homes For Sale', path: '/homes-for-sale' },
    { label: 'Ocean View Homes', path: '/ocean-view-homes' },
    { label: 'Market Stats & Reports', path: '/market' },
    { label: 'Neighbourhoods', path: '/neighbourhoods' },
    { label: 'Recently Sold', path: '/sold' },
    { label: 'Monthly Reports', path: '/market?tab=archive' },
    { label: 'Contact', path: '/contact' },
  ],
  sold: [
    { label: 'Homes For Sale', path: '/homes-for-sale' },
    { label: 'Condos for Sale', path: '/condos-for-sale' },
    { label: 'Monthly Market Reports', path: '/market?tab=archive' },
    { label: 'Market Stats', path: '/market?tab=overview' },
    { label: 'Neighbourhoods', path: '/neighbourhoods' },
    { label: 'Open Houses', path: '/open-houses' },
    { label: 'Contact', path: '/contact' },
  ],
  listing: [
    { label: 'All Homes', path: '/homes-for-sale' },
    { label: 'Recently Sold', path: '/sold' },
    { label: 'Book a Showing', path: '/contact' },
    { label: 'Open Houses', path: '/open-houses' },
    { label: 'Monthly Market Reports', path: '/market?tab=archive' },
    { label: 'Neighbourhoods', path: '/neighbourhoods' },
    { label: 'Condo Buildings', path: '/buildings' },
  ],
  about: [
    { label: 'Homes For Sale', path: '/homes-for-sale' },
    { label: 'Recently Sold', path: '/sold' },
    { label: 'Market Stats & Reports', path: '/market' },
    { label: 'Neighbourhoods', path: '/neighbourhoods' },
    { label: 'Open Houses', path: '/open-houses' },
    { label: 'Contact', path: '/contact' },
  ],
  market: [
    { label: 'Homes For Sale', path: '/homes-for-sale' },
    { label: 'Recently Sold', path: '/sold' },
    { label: 'Neighbourhoods', path: '/neighbourhoods' },
    { label: 'Condo Buildings', path: '/buildings' },
    { label: 'Home Evaluation', path: '/home-evaluation' },
    { label: 'Price Matrix', path: '/price-matrix' },
    { label: 'Contact', path: '/contact' },
  ],
  buildings: [
    { label: 'Condos for Sale', path: '/condos-for-sale' },
    { label: 'Homes For Sale', path: '/homes-for-sale' },
    { label: 'Neighbourhoods', path: '/neighbourhoods' },
    { label: 'Market Stats & Reports', path: '/market' },
    { label: 'Recently Sold', path: '/sold' },
    { label: 'Contact', path: '/contact' },
  ],
  search: [
    { label: 'Homes For Sale', path: '/homes-for-sale' },
    { label: 'Recently Sold', path: '/sold' },
    { label: 'Condo Buildings', path: '/buildings' },
    { label: 'Open Houses', path: '/open-houses' },
    { label: 'Monthly Market Reports', path: '/market?tab=archive' },
    { label: 'Neighbourhoods', path: '/neighbourhoods' },
    { label: 'Contact', path: '/contact' },
  ],
  schools: [
    { label: 'Homes For Sale', path: '/homes-for-sale' },
    { label: 'Neighbourhoods', path: '/neighbourhoods' },
    { label: 'Recently Sold', path: '/sold' },
    { label: 'Market Stats & Reports', path: '/market' },
    { label: 'Condo Buildings', path: '/buildings' },
    { label: 'Contact', path: '/contact' },
  ],
}

export default async function PageQuickLinks({ slug, exclude, context, isShowcase }: Props) {
  if (isShowcase) return null
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const baseLinks = (context && CONTEXT_LINKS[context]) ?? DEFAULT_LINKS
  const links = baseLinks.filter(l => !exclude || !l.path.startsWith(exclude))

  return (
    <div style={{ background: 'var(--off-white)', borderTop: '1px solid var(--border)', padding: '28px 0' }}>
      <div className="container">
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          Keep Exploring
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {links.map(l => (
            <a
              key={l.path}
              href={ap(l.path)}
              style={{
                display: 'inline-block',
                padding: '6px 14px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 20,
                fontSize: 12,
                color: 'var(--cta-chip)',
                textDecoration: 'none',
                fontWeight: 400,
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
