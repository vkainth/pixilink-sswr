import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { updateAgentFeatures } from '@/lib/admin-api'

export async function PUT(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { agentId, features } = await req.json()
  if (!agentId || typeof features !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const ok = await updateAgentFeatures(Number(agentId), features)
  if (!ok) return NextResponse.json({ error: 'Failed to update features' }, { status: 502 })
  return NextResponse.json({ success: true })
}
