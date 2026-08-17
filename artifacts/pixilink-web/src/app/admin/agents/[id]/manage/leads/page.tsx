import { notFound } from 'next/navigation'
import { getAgent, getAgentLeads } from '@/lib/admin-api'
import LeadsTable from '../../_components/LeadsTable.client'

export const dynamic = 'force-dynamic'

export default async function AgentManageLeadsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [agent, leads] = await Promise.all([
    getAgent(Number(id)),
    getAgentLeads(Number(id)).catch(() => []),
  ])

  if (!agent) notFound()

  return (
    <div>
      <div style={{
        padding: '28px 32px 20px', borderBottom: '1px solid #e2e8f0',
        background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Leads</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            {leads.length} total lead{leads.length !== 1 ? 's' : ''} for {agent.name}
          </p>
        </div>
      </div>

      <div style={{ padding: '20px 32px' }}>
        <LeadsTable leads={leads} agentName={agent.name} />
      </div>
    </div>
  )
}
