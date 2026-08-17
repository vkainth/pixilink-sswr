import { NextResponse } from 'next/server'
import { getAgentPortalSession } from '@/lib/agent-portal-auth'

export async function GET() {
  const session = await getAgentPortalSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  return NextResponse.json(session)
}
