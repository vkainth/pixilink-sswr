import { getAgent, resolveAgentPrefix } from '@/lib/api'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import VerifyPhoneForm from './VerifyPhoneForm.client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Verify Phone',
  description: 'Verify your phone number to complete your account setup.',
  robots: { index: false, follow: false },
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function VerifyPhonePage({ params }: Props) {
  const { slug } = await params
  const [agent, hdrs] = await Promise.all([getAgent(slug), headers()])
  if (!agent || agent.status !== 'active') notFound()

  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))

  return <VerifyPhoneForm agent={agent} slug={slug} agentPrefix={agentPrefix} />
}
