import type { Metadata } from 'next'
import PrivacyContent from '@/components/PrivacyContent'

export const metadata: Metadata = {
  title: 'Privacy Policy | Pixilink',
  robots: { index: false, follow: false },
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function AgentPrivacyPage({ params }: Props) {
  const { slug } = await params
  return <PrivacyContent backHref={`/agent/${slug}`} />
}
