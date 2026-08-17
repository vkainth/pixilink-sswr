import { NextRequest, NextResponse } from 'next/server'
import { getAgentPortalSession } from '@/lib/agent-portal-auth'

const LARAVEL_URL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'http://127.0.0.1:8082'
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null
const ADMIN_SECRET = process.env.ADMIN_API_SECRET || ''

export async function PUT(req: NextRequest) {
  const session = await getAgentPortalSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { agentId, name, title, brokerage, phone, bio } = body

  if (agentId !== session.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Admin-Secret': ADMIN_SECRET,
  }
  if (LARAVEL_HOST) headers['Host'] = LARAVEL_HOST

  try {
    const res = await fetch(`${LARAVEL_URL}/api-internal/agent-portal/${session.id}/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ name, title, brokerage, phone, bio }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json({ error: 'Backend error', detail: text }, { status: res.status })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to reach API' }, { status: 502 })
  }
}
