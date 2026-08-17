import { notFound } from 'next/navigation'
import { getAgent } from '@/lib/admin-api'
import { getAdminSession } from '@/lib/admin-auth'
import AgentContextShell from './_agent-shell'

export default async function AgentManageLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [agent, session] = await Promise.all([
    getAgent(Number(id)),
    getAdminSession(),
  ])

  if (!agent) notFound()
  if (!session) notFound()

  return (
    <AgentContextShell agentId={agent.id} agentName={agent.name} adminName={session.name ?? ''}>
      {children}
    </AgentContextShell>
  )
}
