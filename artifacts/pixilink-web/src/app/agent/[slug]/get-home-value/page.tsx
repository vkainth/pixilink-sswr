import { getAgent, getMarketStats, getTopRealtor, getTestimonials } from '@/lib/api'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getHeroCredentials } from '@/lib/types'
import GetHomeValueLanding from '@/components/GetHomeValueLanding.client'

interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 300

// Ad-only landing page — never wanted in search results (avoids duplicate
// content with the full /home-evaluation page, which is the organic/site version).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const agent = await getAgent(slug)
  const title = `Free Home Value Estimate — ${agent?.name || 'Get Your Home Value'}`
  return {
    title,
    description: `Get a free, no-obligation estimate of your home's current market value from ${agent?.name || 'a local real estate expert'}.`,
    robots: { index: false, follow: false },
  }
}

export default async function GetHomeValuePage({ params }: Props) {
  const { slug } = await params
  const [agent, stats, topRealtor, testimonials] = await Promise.all([
    getAgent(slug),
    getMarketStats(slug),
    getTopRealtor(slug),
    getTestimonials(slug),
  ])
  if (!agent) notFound()

  const trustLine = topRealtor?.sold_count
    ? `Trusted by ${topRealtor.sold_count.toLocaleString()}+ homeowners`
    : agent.settings?.hero_stats?.stat1_value
      ? `Trusted by ${agent.settings.hero_stats.stat1_value} homeowners`
      : 'Trusted local real estate expert'

  const statLine = stats.avg_sold_price
    ? `Recent avg. sold price in the area — see how your home compares`
    : null

  const yearsExperience = agent.settings?.hero_stats?.years_experience?.trim() || null
  const blurb = agent.settings?.hero_stats?.value_prop_blurb?.trim() || agent.bio?.trim() || null
  const credentials = getHeroCredentials(agent).slice(0, 4)
  const soldCount = topRealtor?.sold_count || null
  const testimonial = testimonials.find(t => t.text && t.rating >= 4) || testimonials[0] || null

  return (
    <GetHomeValueLanding
      agent={agent}
      trustLine={trustLine}
      statLine={statLine}
      yearsExperience={yearsExperience}
      blurb={blurb}
      credentials={credentials}
      soldCount={soldCount}
      testimonial={testimonial ? { name: testimonial.name, text: testimonial.text, rating: testimonial.rating } : null}
    />
  )
}
