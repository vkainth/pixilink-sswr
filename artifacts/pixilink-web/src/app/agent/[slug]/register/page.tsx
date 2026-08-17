import { getAgent, resolveAgentPrefix } from '@/lib/api'
import { notFound } from 'next/navigation'
import RegisterForm from './RegisterForm.client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a free account to save listings and get notified about new properties.',
  robots: { index: false, follow: false },
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function RegisterPage({ params }: Props) {
  const { slug } = await params
  const agent = await getAgent(slug)
  if (!agent || agent.status !== 'active') notFound()

  const agentPrefix = resolveAgentPrefix(slug, null)

  return <RegisterForm agent={agent} slug={slug} agentPrefix={agentPrefix} />
}
