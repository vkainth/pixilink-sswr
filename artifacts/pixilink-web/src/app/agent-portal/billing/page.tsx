import { getAgentPortalSession } from '@/lib/agent-portal-auth'
import { redirect } from 'next/navigation'
import { getAgentPortalBillingStatus } from '@/lib/agent-portal-api'
import AgentBillingClient from './_billing-client'

export default async function AgentPortalBillingPage() {
  const session = await getAgentPortalSession()
  if (!session) redirect('/agent-portal/login')

  const billing = await getAgentPortalBillingStatus(session.id)

  return <AgentBillingClient billing={billing} agentName={session.name} />
}
