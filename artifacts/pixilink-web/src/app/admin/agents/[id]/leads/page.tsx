import { notFound } from 'next/navigation'
import { getAgent, getAgentLeads } from '@/lib/admin-api'
import LeadsTable from '../_components/LeadsTable.client'

export const dynamic = 'force-dynamic'

export default async function AgentLeadsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [agent, leads] = await Promise.all([
    getAgent(Number(id)),
    getAgentLeads(Number(id)),
  ])

  if (!agent) notFound()

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1200 }}>
      <nav style={{ fontSize: 12, color: '#7b8fa0', marginBottom: 20 }}>
        <a href="/admin/agents" style={{ color: '#0052cc' }}>Agents</a>
        {' / '}
        <a href={`/admin/agents/${id}`} style={{ color: '#0052cc' }}>{agent.name}</a>
        {' / Leads'}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#172b4d', margin: 0 }}>
            Leads — {agent.name}
          </h1>
        </div>
        <a
          href={`/admin/agents/${id}`}
          style={{
            fontSize: 13, background: '#f4f5f7', color: '#172b4d',
            padding: '7px 14px', borderRadius: 4, border: '1px solid #dfe1e6',
            textDecoration: 'none',
          }}
        >
          ← Edit Agent
        </a>
      </div>

      <LeadsTable leads={leads} agentName={agent.name} />
    </div>
  )
}
