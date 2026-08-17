import { NextRequest, NextResponse } from 'next/server'
import { getAgentPortalSession } from '@/lib/agent-portal-auth'

const LARAVEL_URL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'http://127.0.0.1:8082'
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null
const ADMIN_SECRET = process.env.ADMIN_API_SECRET || ''

function makeHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Admin-Secret': ADMIN_SECRET,
  }
  if (LARAVEL_HOST) h['Host'] = LARAVEL_HOST
  return h
}

export async function GET() {
  const session = await getAgentPortalSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const res = await fetch(
      `${LARAVEL_URL}/api-internal/agent-portal/${session.id}/integrations`,
      { headers: makeHeaders(), next: { revalidate: 0 } }
    )
    if (!res.ok) {
      return NextResponse.json({ error: 'Backend error' }, { status: res.status })
    }
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: 'Failed to reach API' }, { status: 502 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getAgentPortalSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { ga4_id, fub_enabled, fub_api_key, ghl_enabled, ghl_api_key, lofty_enabled, lofty_api_key } = body

  try {
    const res = await fetch(
      `${LARAVEL_URL}/api-internal/agent-portal/${session.id}/integrations`,
      {
        method: 'PUT',
        headers: makeHeaders(),
        body: JSON.stringify({ ga4_id, fub_enabled, fub_api_key, ghl_enabled, ghl_api_key, lofty_enabled, lofty_api_key }),
      }
    )
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json({ error: 'Backend error', detail: text }, { status: res.status })
    }
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: 'Failed to reach API' }, { status: 502 })
  }
}
