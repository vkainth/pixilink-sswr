import { notFound } from 'next/navigation'
import { getAgent, getAgentUsers } from '@/lib/admin-api'
import AgentUsersClient from './_users.client'

export const dynamic = 'force-dynamic'

export default async function AgentManageUsersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [agent, data] = await Promise.all([
    getAgent(Number(id)),
    getAgentUsers(Number(id)).catch(() => null),
  ])

  if (!agent) notFound()

  return (
    <div>
      <div style={{
        padding: '28px 32px 20px', borderBottom: '1px solid #e2e8f0',
        background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Registered Users</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            {data ? `${data.total} user${data.total !== 1 ? 's' : ''} registered on ${agent.name}'s site` : `Users for ${agent.name}`}
          </p>
        </div>
      </div>

      <div style={{ padding: '20px 32px' }}>
        {!data ? (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
            Could not load user data. Check API connectivity.
          </div>
        ) : (
          <AgentUsersClient data={data} />
        )}
      </div>
    </div>
  )
}
