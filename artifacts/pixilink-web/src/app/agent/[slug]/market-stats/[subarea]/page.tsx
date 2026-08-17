import { permanentRedirect } from 'next/navigation'
import { requireNotShowcase } from '@/lib/showcase'

interface Props {
  params: Promise<{ slug: string; subarea: string }>
}

export default async function SubareaMarketStatsRedirect({ params }: Props) {
  const { slug, subarea } = await params
  permanentRedirect(`/agent/${slug}/market?tab=overview&subarea=${encodeURIComponent(subarea)}`)
}
