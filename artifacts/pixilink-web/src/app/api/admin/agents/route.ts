import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { listAgents, createAgent } from '@/lib/admin-api'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agents = await listAgents()
  return NextResponse.json(agents)
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await req.json()
    const agent = await createAgent(data)
    return NextResponse.json(agent, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    try {
      const parsed = JSON.parse(msg)
      return NextResponse.json({ error: 'Validation failed', details: parsed }, { status: 422 })
    } catch {
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }
}
