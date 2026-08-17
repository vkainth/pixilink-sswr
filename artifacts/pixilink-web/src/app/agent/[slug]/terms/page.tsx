import type { Metadata } from 'next'
import TermsContent from '@/components/TermsContent'

export const metadata: Metadata = {
  title: 'Terms & Conditions | Pixilink',
  robots: { index: false, follow: false },
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function AgentTermsPage({ params }: Props) {
  const { slug } = await params
  return <TermsContent backHref={`/agent/${slug}`} />
}
