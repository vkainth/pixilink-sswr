import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { listAgents, createAgent, AdminApiError } from '@/lib/admin-api'

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
    if (e instanceof AdminApiError) {
      const body = e.body as { errors?: Record<string, string[]>; message?: string } | null

      // Only a genuine 422 carrying field errors is a validation failure.
      if (e.status === 422 && body?.errors) {
        return NextResponse.json({ error: 'Validation failed', details: body }, { status: 422 })
      }

      // Anything else (500, 404, 401, ...) is a backend fault. Report it as
      // itself — labelling it "Validation failed" sends people looking for bad
      // input when the real cause is server-side.
      const detail = body?.message || 'unexpected response from the backend'
      return NextResponse.json(
        { error: `Create failed — ${detail} (HTTP ${e.status})`, details: body },
        { status: e.status },
      )
    }

    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
