import { getAgentPortalSession } from '@/lib/agent-portal-auth'
import AgentPortalShell from './_shell'

export default async function AgentPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getAgentPortalSession()
  return (
    <AgentPortalShell session={session}>
      {children}
    </AgentPortalShell>
  )
}
