import { getAgentPortalSession } from '@/lib/agent-portal-auth'
import { getAgentPortalLeads } from '@/lib/agent-portal-api'
import { redirect } from 'next/navigation'
import LeadsTable from './_leads-table'

export default async function AgentPortalLeadsPage() {
  const session = await getAgentPortalSession()
  if (!session) redirect('/agent-portal/login')

  const leads = await getAgentPortalLeads(session.id)

  return <LeadsTable leads={leads} />
}
