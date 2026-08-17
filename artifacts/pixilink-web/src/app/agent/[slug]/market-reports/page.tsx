import { permanentRedirect } from 'next/navigation'
import { requireNotShowcase } from '@/lib/showcase'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function MarketReportsRedirect({ params }: Props) {
  const { slug } = await params
  permanentRedirect(`/agent/${slug}/market?tab=archive`)
}
