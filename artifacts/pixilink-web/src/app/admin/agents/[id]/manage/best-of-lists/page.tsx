import { notFound, redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin-auth'
import { getAgent } from '@/lib/admin-api'
import AgentContextShell from '../_agent-shell'
import BestOfListsPanel from '@/components/top-realtor/BestOfListsPanel'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BestOfListsPage({ params }: Props) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const { id } = await params
  const agentId = Number(id)
  const agent = await getAgent(agentId)
  if (!agent) notFound()

  return (
    <AgentContextShell agentId={agentId} agentName={agent.name} adminName={session.name}>
      <BestOfListsPanel agentId={agentId} />
    </AgentContextShell>
  )
}
