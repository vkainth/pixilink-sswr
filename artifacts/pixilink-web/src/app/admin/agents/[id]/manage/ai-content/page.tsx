import { notFound } from 'next/navigation'
import { getAgent } from '@/lib/admin-api'
import AiContentPanel from '../../../_components/AiContentPanel'

export const dynamic = 'force-dynamic'

export default async function AgentAiContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const agent = await getAgent(Number(id))

  if (!agent) notFound()

  return <AiContentPanel agent={agent} />
}
