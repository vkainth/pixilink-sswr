import { notFound } from 'next/navigation'
import { getAgent, getTerritoryCities } from '@/lib/admin-api'
import AgentEditorForm from '../../../_components/AgentEditorForm'

export const dynamic = 'force-dynamic'

export default async function AgentManageSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [agent, { cities, subareas }] = await Promise.all([
    getAgent(Number(id)),
    getTerritoryCities(),
  ])

  if (!agent) notFound()

  return (
    <div style={{ padding: '28px 32px', maxWidth: 860 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#172b4d', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 13, color: '#7b8fa0', marginTop: 4 }}>Edit {agent.name}&apos;s profile, branding, domain, and territory.</p>
      </div>

      <AgentEditorForm agent={agent} cities={cities} subareas={subareas} />
    </div>
  )
}
