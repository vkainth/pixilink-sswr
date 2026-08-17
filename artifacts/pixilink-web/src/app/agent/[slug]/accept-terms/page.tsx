import { getAgent } from '@/lib/api'
import { notFound } from 'next/navigation'
import AcceptTermsForm from './AcceptTermsForm.client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Review and accept the terms of use to continue.',
  robots: { index: false, follow: false },
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function AcceptTermsPage({ params }: Props) {
  const { slug } = await params
  const agent = await getAgent(slug)
  if (!agent || agent.status !== 'active') notFound()

  return <AcceptTermsForm agent={agent} slug={slug} />
}
