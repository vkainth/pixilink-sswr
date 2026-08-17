import { getAgent, agentCanonicalBase, getAgentTerritories, agentAreaDisplay } from '@/lib/api'
import { ListingsCore } from '../homes-for-sale/ListingsCore'
import { notFound } from 'next/navigation'
import { requireNotShowcase } from '@/lib/showcase'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string>>
}

export const revalidate = 300

function fmtMonth(m: string): string {
  const [y, mo] = m.split('-')
  const d = new Date(Number(y), Number(mo) - 1, 1)
  return d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const [agent, territories] = await Promise.all([
    getAgent(slug),
    getAgentTerritories(slug).catch(() => []),
  ])
  const agentName = agent?.name || 'Your Agent'
  const shortArea = agentAreaDisplay(territories)
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/sold`

  const monthParam = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : null
  const monthLabel = monthParam ? fmtMonth(monthParam) : null

  const title = monthLabel
    ? `Homes Sold in ${monthLabel} — ${shortArea} | ${agentName}`
    : `Recently Sold — ${shortArea} | ${agentName}`
  const description = monthLabel
    ? `View homes sold in ${monthLabel} in ${shortArea}. Sold prices, days on market and real MLS® data with ${agentName}.`
    : `Browse recently sold properties in ${shortArea}. View sold data, days on market and neighbourhood trends from ${agentName}. Sign in to unlock sold prices.`

  // Belt-and-suspenders noindex for decorative-only param pages (sort/view/page).
  // On the sold page, 'status' is also decorative (it's always sold here).
  // 'month' is a meaningful content filter — keep those indexable.
  const DECORATIVE_KEYS = new Set(['sort', 'view', 'page', 'status'])
  const MEANINGFUL_KEYS = new Set(['month'])
  const spKeys = Object.keys(sp)
  const hasDecorativeOnly = spKeys.length > 0
    && !spKeys.some(k => MEANINGFUL_KEYS.has(k))
    && spKeys.every(k => DECORATIVE_KEYS.has(k))

  return {
    title,
    description,
    alternates: { canonical },
    ...(hasDecorativeOnly ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, type: 'website', url: canonical },
    twitter: { card: 'summary', title, description },
  }
}

export default async function SoldPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const agent = await getAgent(slug)
  if (!agent) notFound()
  requireNotShowcase(agent)
  return <ListingsCore slug={slug} sp={{ ...sp, status: 'sold' }} />
}
