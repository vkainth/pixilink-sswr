import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getAdminSession } from '@/lib/admin-auth'
import { getAgent } from '@/lib/admin-api'
import AgentContextShell from '../_agent-shell'
import LandingPagesPanel from '@/components/top-realtor/LandingPagesPanel'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LandingPagesPage({ params }: Props) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const { id } = await params
  const agentId = Number(id)
  const agent = await getAgent(agentId)
  if (!agent) notFound()

  return (
    <AgentContextShell agentId={agentId} agentName={agent.name} adminName={session.name}>
      <LandingPagesPanel agentId={agentId} />
    </AgentContextShell>
  )
}
