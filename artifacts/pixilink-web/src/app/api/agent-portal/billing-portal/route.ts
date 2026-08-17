import { NextResponse } from 'next/server'
import { getAgentPortalSession } from '@/lib/agent-portal-auth'
import { getAgentPortalBillingPortalUrl } from '@/lib/agent-portal-api'

export async function POST() {
  const session = await getAgentPortalSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await getAgentPortalBillingPortalUrl(session.id)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 404 })
  return NextResponse.json({ url: result.url })
}
