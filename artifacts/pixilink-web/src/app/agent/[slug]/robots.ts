import type { MetadataRoute } from 'next'
import { getAgent, agentCanonicalBase} from '@/lib/api'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function robots({ params }: Props): Promise<MetadataRoute.Robots> {
  const { slug } = await params
  const agent = await getAgent(slug)

  const noindex = agent?.settings?.seo_noindex ?? false

  if (noindex) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    }
  }

  const domain = agentCanonicalBase(agent)
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `https://${domain}/sitemap.xml`,
  }
}
