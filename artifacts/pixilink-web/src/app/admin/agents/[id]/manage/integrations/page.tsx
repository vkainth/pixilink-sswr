import { notFound } from 'next/navigation'
import { getAgent } from '@/lib/admin-api'
import AgentIntegrationsClient from './_integrations.client'

export const dynamic = 'force-dynamic'

export default async function AgentManageIntegrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const agent = await getAgent(Number(id))

  if (!agent) notFound()

  return (
    <AgentIntegrationsClient
      agentId={agent.id}
      agentName={agent.name}
      initialGa4Id={agent.settings?.ga4_id ?? ''}
      initialFbPixelId={agent.settings?.fb_pixel_id ?? ''}
      initialFubEnabled={agent.settings?.fub_enabled ?? false}
      initialGhlEnabled={agent.settings?.ghl_enabled ?? false}
      initialGhlApiKeySet={agent.settings?.ghl_api_key_set ?? false}
      initialGhlLocationIdSet={agent.settings?.ghl_location_id_set ?? false}
      initialLoftyEnabled={agent.settings?.lofty_enabled ?? false}
      initialLoftyApiKeySet={agent.settings?.lofty_api_key_set ?? false}
    />
  )
}
