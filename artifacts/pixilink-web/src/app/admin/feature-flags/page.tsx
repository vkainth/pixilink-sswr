import { listAgents, getAgent } from '@/lib/admin-api'
import FlagGrid from './FlagGrid.client'

export const dynamic = 'force-dynamic'

export default async function AdminFeatureFlagsPage() {
  const agents = await listAgents()
  const agentsWithFeatures = await Promise.all(
    agents.map(a => getAgent(a.id).then(full => full ?? a))
  )

  return <FlagGrid agents={agentsWithFeatures} />
}
