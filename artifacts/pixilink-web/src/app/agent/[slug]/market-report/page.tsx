import { permanentRedirect, notFound } from 'next/navigation'
import { getAgent } from '@/lib/api'
import { requireNotShowcase } from '@/lib/showcase'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function MarketReportRedirect({ params }: Props) {
  const { slug } = await params
  const agent = await getAgent(slug)
  if (!agent) notFound()
  requireNotShowcase(agent)
  permanentRedirect(`/agent/${slug}/market?tab=archive`)
}
