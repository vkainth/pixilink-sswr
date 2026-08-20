import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin-auth'
import { getAgent } from '@/lib/admin-api'
import AgentContextShell from '../_agent-shell'
import TestimonialsPanel from './_testimonials.client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TestimonialsPage({ params }: Props) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const { id } = await params
  const agentId = Number(id)
  const agent = await getAgent(agentId)
  if (!agent) redirect('/admin/agents')

  return (
    <AgentContextShell agentId={agentId} agentName={agent.name} adminName={session.name ?? ''}>
      <TestimonialsPanel agentId={agentId} agentName={agent.name} />
    </AgentContextShell>
  )
}
