import { getAgent, regionSlugForAgent } from '@/lib/api'
import { notFound } from 'next/navigation'
import ResetPasswordForm from './ResetPasswordForm.client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Enter a new password to regain access to your account.',
  robots: { index: false, follow: false },
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ResetPasswordPage({ params }: Props) {
  const { slug } = await params
  const agent = await getAgent(slug)
  if (!agent) notFound()
  const regionSlug = regionSlugForAgent(slug)
  const agentPrefix = regionSlug ? `/${regionSlug}` : `/agent/${slug}`
  return <ResetPasswordForm agent={agent} slug={slug} agentPrefix={agentPrefix} />
}
