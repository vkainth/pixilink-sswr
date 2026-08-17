import { getAgent, resolveAgentPrefix } from '@/lib/api'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import LoginForm from './LoginForm.client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to access your saved listings and receive property alerts.',
  robots: { index: false, follow: false },
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function LoginPage({ params }: Props) {
  const { slug } = await params
  const agent = await getAgent(slug)
  if (!agent || agent.status !== 'active') notFound()

  const agentPrefix = resolveAgentPrefix(slug, null)

  return (
    <Suspense>
      <LoginForm agent={agent} slug={slug} agentPrefix={agentPrefix} />
    </Suspense>
  )
}
