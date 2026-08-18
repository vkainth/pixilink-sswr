import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { getAgent, updateAgent, deleteAgent, AdminApiError } from '@/lib/admin-api'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const agent = await getAgent(Number(id))
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(agent)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const data = await req.json()
    // Send all fields directly to the admin endpoint — it validates ga4_id, fb_pixel_id,
    // fub_enabled, fub_api_key natively. Do NOT route through the agent-portal integrations
    // endpoint, which requires agent session auth and always fails from the admin flow.
    await updateAgent(Number(id), data)

    const agent = await getAgent(Number(id))
    return NextResponse.json(agent)
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
        { error: `Save failed — ${detail} (HTTP ${e.status})`, details: body },
        { status: e.status },
      )
    }

    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await deleteAgent(Number(id))
  return NextResponse.json({ success: true })
}
