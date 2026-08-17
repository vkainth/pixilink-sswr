import { getAgent, resolveAgentPrefix } from '@/lib/api'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import OtpForm from './OtpForm.client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Enter Verification Code',
  description: 'Enter the verification code sent to your phone to confirm your number.',
  robots: { index: false, follow: false },
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function VerifyPhoneOtpPage({ params }: Props) {
  const { slug } = await params
  const [agent, hdrs] = await Promise.all([getAgent(slug), headers()])
  if (!agent || agent.status !== 'active') notFound()

  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))

  return <OtpForm agent={agent} slug={slug} agentPrefix={agentPrefix} />
}
