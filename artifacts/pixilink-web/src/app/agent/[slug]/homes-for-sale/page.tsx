import { getAgent, getAgentTerritories, agentCanonicalBase, agentAreaDisplay } from '@/lib/api'
import { buildListingsTitle, buildListingsDesc, normalizeType } from './ListingsCore'
import { ListingsCore } from './ListingsCore'
import { subareaDisplayName, normalizeToSubareaSlug, SUBAREA_MAP } from './subareaUtils'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string>>
}

export const revalidate = 300

// ── metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams

  const [agent, territories] = await Promise.all([
    getAgent(slug),
    getAgentTerritories(slug),
  ])

  const agentName  = agent?.name || 'Your Local Realtor'
  const shortArea  = agentAreaDisplay(territories)

  const location = sp.subarea ? subareaDisplayName(sp.subarea) : shortArea

  const cleanSp: Record<string, string> = { ...sp }
  if (cleanSp.type)    cleanSp.type    = cleanSp.type.toLowerCase()
  if (cleanSp.subarea) cleanSp.subarea = normalizeToSubareaSlug(cleanSp.subarea)

  const title = buildListingsTitle(cleanSp, location, agentName)
  const desc  = buildListingsDesc(cleanSp, location, agentName)

  const domain = agentCanonicalBase(agent)

  const TYPE_TO_SEGMENT: Record<string, string> = {
    house:     'houses',
    apartment: 'condos',
    townhouse: 'townhouses',
    duplex:    'duplexes',
  }

  const typeParam    = cleanSp.type ? cleanSp.type.toLowerCase() : ''
  const typeSegment  = TYPE_TO_SEGMENT[typeParam] ?? ''
  const subSlug      = cleanSp.subarea ? normalizeToSubareaSlug(cleanSp.subarea) : ''
  const knownSubarea = subSlug ? SUBAREA_MAP.some(e => e.slug === subSlug) : false

  let canonPath: string
  if (typeSegment && knownSubarea && !cleanSp.status) {
    const bedsN = cleanSp.beds ? parseInt(cleanSp.beds) : 0
    if (bedsN > 0) {
      canonPath = `/${typeSegment}/${subSlug}/${bedsN}-bedroom`
    } else {
      canonPath = `/${typeSegment}/${subSlug}`
    }
  } else if (subSlug && knownSubarea && !cleanSp.status) {
    canonPath = `/homes-for-sale/${subSlug}`
  } else {
    canonPath = '/homes-for-sale'
  }
  const canonical = `https://${domain}${canonPath}`

  // Belt-and-suspenders noindex for decorative-only param pages (sort/view/page).
  // Middleware 301-redirects page=1 variants; page>1 and edge cases that survive
  // get this tag so Googlebot treats them as non-indexable crawl-budget savers.
  const DECORATIVE_KEYS = new Set(['sort', 'view', 'page'])
  const MEANINGFUL_KEYS = new Set(['beds', 'min_price', 'max_price', 'subarea', 'type', 'price_reduced'])
  const spKeys = Object.keys(sp)
  const hasDecorativeOnly = spKeys.length > 0
    && !spKeys.some(k => MEANINGFUL_KEYS.has(k))
    && spKeys.every(k => DECORATIVE_KEYS.has(k))

  return {
    title,
    description: desc,
    alternates:  { canonical },
    ...(hasDecorativeOnly ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description: desc,
      type:        'website',
      url:         canonical,
      siteName:    agentName,
      images: [{ url: `https://${domain}/opengraph.jpg`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description: desc,
    },
  }
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function ListingsPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  return <ListingsCore slug={slug} sp={sp} />
}
