import { notFound } from 'next/navigation'
import { getAgent } from '@/lib/admin-api'
import AgentFlagGrid from './_flag-grid.client'

export const dynamic = 'force-dynamic'

export default async function AgentManageFeatureFlagsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const agent = await getAgent(Number(id))

  if (!agent) notFound()

  return <AgentFlagGrid agent={agent} />
}
