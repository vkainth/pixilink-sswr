import { getTerritoryCities } from '@/lib/admin-api'
import AgentEditorForm from '../_components/AgentEditorForm'

export const dynamic = 'force-dynamic'

export default async function NewAgentPage() {
  const { cities, subareas } = await getTerritoryCities()

  return (
    <div style={{ padding: '32px 36px', maxWidth: 820 }}>
      <nav style={{ fontSize: 12, color: '#7b8fa0', marginBottom: 20 }}>
        <a href="/admin/agents" style={{ color: '#0052cc' }}>Agents</a>
        {' / New Agent'}
      </nav>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#172b4d', marginBottom: 28 }}>
        New Agent
      </h1>
      <AgentEditorForm cities={cities} subareas={subareas} />
    </div>
  )
}
